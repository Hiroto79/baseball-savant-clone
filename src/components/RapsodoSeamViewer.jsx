import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Rapsodo Pitching 準拠の 3D Baseball Seam & Spin Visualizer Component
 * 
 * 【Rapsodo 3D Diamond 仕様の超リアル描画アップグレード版】
 * - 本物の硬式球の革テクスチャ（PBR微細バンプ・ラフネスマップ）
 * - 108本の立体V字ステッチ（赤い縫い糸）＆ 立体シームリッジ
 * - スタジオ3点ライティング ＋ リムライト
 * - 4シーム・2シーム・1シームの完全正確な初期姿勢行列
 * - リセット時に確実に初期回転角（spinAngle=0）へ戻す resetTrigger 対応
 */

// プロシージャル硬式球レザーテクスチャ生成
function createProceduralLeatherTextures() {
  const width = 1024;
  const height = 512;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bumpCtx = bumpCanvas.getContext('2d');

  if (bumpCtx) {
    const imgData = bumpCtx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const n1 = Math.sin(x * 0.45) * Math.cos(y * 0.45);
        const n2 = Math.sin(x * 0.9 + y * 0.6) * Math.cos(y * 0.9 - x * 0.6);
        const n3 = (Math.random() - 0.5) * 0.4;
        const val = Math.floor(128 + (n1 * 0.35 + n2 * 0.25 + n3) * 50);
        const clamped = Math.max(0, Math.min(255, val));

        data[idx] = clamped;
        data[idx + 1] = clamped;
        data[idx + 2] = clamped;
        data[idx + 3] = 255;
      }
    }
    bumpCtx.putImageData(imgData, 0, 0);
  }

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const roughCtx = roughCanvas.getContext('2d');
  if (roughCtx) {
    const imgData = roughCtx.createImageData(width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(155 + (Math.random() - 0.5) * 40);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
    roughCtx.putImageData(imgData, 0, 0);
  }
  const roughTexture = new THREE.CanvasTexture(roughCanvas);
  roughTexture.wrapS = THREE.RepeatWrapping;
  roughTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { bumpTexture, roughTexture };
}

// 本物の硬式球の縫い目シーム3D曲線（球面上パラメータ方程式）
function getSeamCurvePoints(r = 1.0, count = 360) {
  const alpha = 0.60;
  const points = [];

  for (let i = 0; i <= count; i++) {
    const t = (i / count) * Math.PI * 2;
    const theta = alpha * Math.sin(2 * t);
    const phi = t;

    const x = r * Math.cos(theta) * Math.cos(phi);
    const y = r * Math.cos(theta) * Math.sin(phi);
    const z = r * Math.sin(theta);

    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

// 4シーム / 2シーム / 1シームの初期回転行列 (InitRotation_Matrix)
export function getInitRotationMatrix(seamType = '4-seam') {
  const m = new THREE.Matrix4();
  if (seamType === '2-seam') {
    // 2-Seam: 屈曲のない滑らかな2本の縦円弧レール (Z軸 45度)
    m.makeRotationZ(Math.PI / 4);
  } else if (seamType === '1-seam') {
    // 1-Seam: 1本の縦シームラインが中央(X=0)を通り、12:00の純粋な縦回転で垂直に1本通る姿勢
    const mZ = new THREE.Matrix4().makeRotationZ(Math.PI / 4);
    const mX = new THREE.Matrix4().makeRotationX(Math.PI / 2);
    m.multiplyMatrices(mZ, mX);
  } else {
    // 4-Seam: 馬蹄形(Cの字)が正面を向き、1回転で4回通過する王道のフォーシーム (Y軸 90度)
    m.makeRotationY(Math.PI / 2);
  }
  return m;
}

// 本物の硬式球の108本立体V字ステッチ＆シームリッジ複合ジオメトリを生成
function createRealisticBaseballSeams(arg1 = 1.0, arg2 = 1.0) {
  const radius = typeof arg1 === 'number' ? arg1 : (typeof arg2 === 'number' ? arg2 : 1.0);
  const group = new THREE.Group();
  group.name = 'seamCompositeGroup';

  const curvePoints = getSeamCurvePoints(radius, 360);
  const curve = new THREE.CatmullRomCurve3(curvePoints, true, 'centripetal');

  // 1. シーム溝・革合わせ目の立体リッジ
  const seamTubeGeo = new THREE.TubeGeometry(curve, 300, 0.024, 12, true);
  const seamRidgeMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.50,
    metalness: 0.02,
  });
  const seamRidgeMesh = new THREE.Mesh(seamTubeGeo, seamRidgeMat);
  group.add(seamRidgeMesh);

  // 2. 108組（計216本）の立体V字赤ステッチ
  const stitchCount = 108;
  const stitchRadius = 0.009;
  const stitchWidth = 0.054;
  const stitchLength = 0.022;

  const cylinderGeo = new THREE.CylinderGeometry(stitchRadius, stitchRadius, 1, 6, 1, true);
  const posAttr = cylinderGeo.attributes.position;
  const normalAttr = cylinderGeo.attributes.normal;
  const indexAttr = cylinderGeo.index;

  const totalStitches = stitchCount * 2;
  const vertsPerCyl = posAttr.count;
  const indicesPerCyl = indexAttr.count;

  const mergedPositions = new Float32Array(totalStitches * vertsPerCyl * 3);
  const mergedNormals = new Float32Array(totalStitches * vertsPerCyl * 3);
  const mergedIndices = new Uint32Array(totalStitches * indicesPerCyl);

  let stitchIndex = 0;

  for (let i = 0; i < stitchCount; i++) {
    const u = i / stitchCount;
    const pt = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const radialNormal = pt.clone().normalize();
    const binormal = new THREE.Vector3().crossVectors(radialNormal, tangent).normalize();

    const leftOuter = pt.clone()
      .addScaledVector(binormal, stitchWidth)
      .addScaledVector(tangent, -stitchLength)
      .addScaledVector(radialNormal, 0.001);

    const leftInner = pt.clone()
      .addScaledVector(binormal, 0.008)
      .addScaledVector(radialNormal, 0.008);

    const rightOuter = pt.clone()
      .addScaledVector(binormal, -stitchWidth)
      .addScaledVector(tangent, -stitchLength)
      .addScaledVector(radialNormal, 0.001);

    const rightInner = pt.clone()
      .addScaledVector(binormal, -0.008)
      .addScaledVector(radialNormal, 0.008);

    addStitchSegment(leftOuter, leftInner, stitchIndex++);
    addStitchSegment(rightOuter, rightInner, stitchIndex++);
  }

  function addStitchSegment(startPt, endPt, idx) {
    const vOffset = idx * vertsPerCyl;
    const iOffset = idx * indicesPerCyl;

    const dir = new THREE.Vector3().subVectors(endPt, startPt);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(startPt, endPt).multiplyScalar(0.5);

    const rotMatrix = new THREE.Matrix4();
    const yAxis = new THREE.Vector3(0, 1, 0);
    const targetDir = dir.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(yAxis, targetDir);
    rotMatrix.makeRotationFromQuaternion(quat);

    const tempV = new THREE.Vector3();
    const tempN = new THREE.Vector3();

    for (let j = 0; j < vertsPerCyl; j++) {
      tempV.set(posAttr.getX(j), posAttr.getY(j) * length, posAttr.getZ(j));
      tempV.applyMatrix4(rotMatrix);
      tempV.add(mid);

      tempN.set(normalAttr.getX(j), normalAttr.getY(j), normalAttr.getZ(j));
      tempN.applyMatrix4(rotMatrix);

      const pIdx = (vOffset + j) * 3;
      mergedPositions[pIdx] = tempV.x;
      mergedPositions[pIdx + 1] = tempV.y;
      mergedPositions[pIdx + 2] = tempV.z;

      mergedNormals[pIdx] = tempN.x;
      mergedNormals[pIdx + 1] = tempN.y;
      mergedNormals[pIdx + 2] = tempN.z;
    }

    for (let j = 0; j < indicesPerCyl; j++) {
      mergedIndices[iOffset + j] = vOffset + indexAttr.getX(j);
    }
  }

  const mergedStitchesGeo = new THREE.BufferGeometry();
  mergedStitchesGeo.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
  mergedStitchesGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
  mergedStitchesGeo.setIndex(new THREE.BufferAttribute(mergedIndices, 1));

  const stitchMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.38,
    metalness: 0.05,
  });
  const stitchesMesh = new THREE.Mesh(mergedStitchesGeo, stitchMat);
  group.add(stitchesMesh);

  return group;
}

export const SingleBallCanvas = ({
  seamType = '4-seam',
  rpm = 2200,
  tiltClock = '1:30',
  tiltDegrees = 45,
  gyroDegrees = 15,
  isPlaying = true,
  playbackSpeed = 0.03,
  viewAngle = 'pitcher',
  title = 'Ball',
  accentColor = '#3b82f6',
  resetKey = 0,
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const ballGroupRef = useRef(null);
  const spinAxisGroupRef = useRef(null);
  const animFrameRef = useRef(null);
  const spinAngleRef = useRef(0);

  // リセットトリガーで自転角をゼロ（初期位置）に戻す
  useEffect(() => {
    spinAngleRef.current = 0;
  }, [resetKey]);

  // マウスドラッグ自由回転用の制御
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: 0, phi: 0 });
  const viewAngleRef = useRef(viewAngle);

  const calculatedTiltDeg = useMemo(() => {
    if (typeof tiltDegrees === 'number' && !isNaN(tiltDegrees)) {
      return tiltDegrees;
    }
    if (typeof tiltClock === 'string' && tiltClock.includes(':')) {
      const [h, m] = tiltClock.split(':').map(Number);
      const totalMinutes = (h % 12) * 60 + (m || 0);
      return (totalMinutes / 720) * 360;
    }
    return 45;
  }, [tiltClock, tiltDegrees]);

  // Three.js 初期化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    if (viewAngle === 'catcher') {
      camera.position.set(0, 0, 5.4);
    } else if (viewAngle === 'pitcher') {
      camera.position.set(0, 0, -5.4);
    } else if (viewAngle === 'side') {
      camera.position.set(5.4, 0, 0);
    } else if (viewAngle === 'top') {
      camera.position.set(0, 5.4, 0.001);
    } else {
      camera.position.set(0, 0, -5.4);
    }
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 💡 スタジオ3点ライティング & リムライト
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.1);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.3);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.2);
    rimLight.position.set(-3, 4, -6);
    scene.add(rimLight);

    // 背景同心円グリッド
    const gridGroup = new THREE.Group();
    [1.3, 1.7, 2.1].forEach(r => {
      const ringGeo = new THREE.RingGeometry(r, r + 0.015, 64);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide, transparent: true, opacity: 0.25 }));
      gridGroup.add(ring);
    });
    const crossMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.3 });
    const crossPoints = [
      new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(2.2, 0, 0),
      new THREE.Vector3(0, -2.2, 0), new THREE.Vector3(0, 2.2, 0)
    ];
    const crossGeo = new THREE.BufferGeometry().setFromPoints(crossPoints);
    const crossLines = new THREE.LineSegments(crossGeo, crossMat);
    gridGroup.add(crossLines);
    scene.add(gridGroup);

    // ボール本体グループ
    const ballGroup = new THREE.Group();
    ballGroupRef.current = ballGroup;

    // ⚾ PBR硬式球リアルレザー球体
    const { bumpTexture, roughTexture } = createProceduralLeatherTextures();
    const sphereGeo = new THREE.SphereGeometry(0.995, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xfafaf9,
      roughness: 0.62,
      metalness: 0.02,
      bumpMap: bumpTexture,
      bumpScale: 0.006,
      roughnessMap: roughTexture,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    ballGroup.add(sphereMesh);

    // ⚾ 108本立体V字ステッチ ＆ シームリッジ
    const realisticSeams = createRealisticBaseballSeams(1.0);
    ballGroup.add(realisticSeams);

    scene.add(ballGroup);

    // スピン軸ライン（矢印＋軸棒）
    const spinAxisGroup = new THREE.Group();
    spinAxisGroupRef.current = spinAxisGroup;

    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 16);
    poleGeo.rotateZ(Math.PI / 2);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    spinAxisGroup.add(new THREE.Mesh(poleGeo, poleMat));

    const arrowGeo = new THREE.ConeGeometry(0.06, 0.18, 12);
    arrowGeo.rotateZ(-Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.x = -1.4;
    spinAxisGroup.add(arrowMesh);

    const spinRingPoints = new THREE.Path().absarc(0, 0, 0.45, 0, Math.PI * 1.6, false).getPoints(24);
    const spinRingGeo = new THREE.BufferGeometry().setFromPoints(spinRingPoints.map(p => new THREE.Vector3(0, p.x, p.y)));
    const spinRing = new THREE.Line(spinRingGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    spinRing.position.x = -1.15;
    spinAxisGroup.add(spinRing);

    scene.add(spinAxisGroup);

    // リサイズハンドラ
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const applyPresetCamera = (angle) => {
      if (angle === 'catcher') {
        camera.position.set(0, 0, 5.4);
      } else if (angle === 'pitcher') {
        camera.position.set(0, 0, -5.4);
      } else if (angle === 'side') {
        camera.position.set(5.4, 0, 0);
      } else if (angle === 'top') {
        camera.position.set(0, 5.4, 0.001);
      }
      camera.lookAt(0, 0, 0);
    };

    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
      const cam = cameraRef.current;
      if (cam) {
        const r = cam.position.length() || 5.4;
        orbitAnglesRef.current.theta = Math.atan2(cam.position.x, cam.position.z);
        orbitAnglesRef.current.phi = Math.asin(Math.max(-1, Math.min(1, cam.position.y / r)));
      }
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      orbitAnglesRef.current.theta += deltaX * 0.01;
      orbitAnglesRef.current.phi = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, orbitAnglesRef.current.phi + deltaY * 0.01));

      const r = 5.4;
      const t = orbitAnglesRef.current.theta;
      const p = orbitAnglesRef.current.phi;

      camera.position.x = r * Math.sin(t) * Math.cos(p);
      camera.position.y = r * Math.sin(p);
      camera.position.z = r * Math.cos(t) * Math.cos(p);
      camera.lookAt(0, 0, 0);
    };

    const onMouseUp = () => { isDraggingRef.current = false; };

    const onDoubleClick = () => {
      orbitAnglesRef.current = { theta: 0, phi: 0 };
      applyPresetCamera(viewAngleRef.current);
      spinAngleRef.current = 0;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('dblclick', onDoubleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('dblclick', onDoubleClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // シームタイプの変更時にジオメトリを更新
  useEffect(() => {
    const ballGroup = ballGroupRef.current;
    if (!ballGroup) return;

    const oldSeams = ballGroup.getObjectByName('seamCompositeGroup');
    if (oldSeams) {
      ballGroup.remove(oldSeams);
    }

    const newRealisticSeams = createRealisticBaseballSeams(1.0);
    ballGroup.add(newRealisticSeams);
  }, [seamType]);

  // 視点切り替え
  useEffect(() => {
    viewAngleRef.current = viewAngle;
    const camera = cameraRef.current;
    if (!camera) return;

    orbitAnglesRef.current = { theta: 0, phi: 0 };

    if (viewAngle === 'catcher') {
      camera.position.set(0, 0, 5.4);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'pitcher') {
      camera.position.set(0, 0, -5.4);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'side') {
      camera.position.set(5.4, 0, 0);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'top') {
      camera.position.set(0, 5.4, 0.001);
      camera.lookAt(0, 0, 0);
    }
  }, [viewAngle]);

  // アニメーションループ & Rapsodo行列力学合成
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying) {
        const radPerSec = (rpm * (2 * Math.PI) / 60) * playbackSpeed;
        spinAngleRef.current += radPerSec * deltaSec;
      }

      const ballGroup = ballGroupRef.current;
      const spinAxisGroup = spinAxisGroupRef.current;

      if (ballGroup && spinAxisGroup) {
        // 1. InitRotation_Matrix: 4/2/1シームの初期姿勢
        const matInit = getInitRotationMatrix(seamType);

        // 2. SpinAnimation_Matrix: 基準スピン軸（横X軸 3:00〜9:00）周りのバックスピン自転
        const matSpin = new THREE.Matrix4().makeRotationX(-spinAngleRef.current);

        // 3. GyroAngle_Matrix: Rapsodo準拠ジャイロ傾斜角（符号付き）
        const gyroRad = (gyroDegrees * Math.PI) / 180;
        const matGyro = new THREE.Matrix4().makeRotationY(gyroRad);

        // 4. AxisTilt_Matrix: 投手視点で 12:00=上, 3:00=右, 6:00=下, 9:00=左
        const tiltRad = (calculatedTiltDeg * Math.PI) / 180;
        const matAxisTilt = new THREE.Matrix4().makeRotationZ(tiltRad);

        // 5. 行列合成: FinalTransform = AxisTilt * GyroAngle * SpinAnimation * InitRotation
        const matFinal = new THREE.Matrix4();
        matFinal.multiply(matAxisTilt);
        matFinal.multiply(matGyro);
        matFinal.multiply(matSpin);
        matFinal.multiply(matInit);

        ballGroup.matrixAutoUpdate = false;
        ballGroup.matrix.copy(matFinal);

        // 回転軸ラインの同期: AxisTilt * GyroAngle
        const matAxisOnly = new THREE.Matrix4();
        matAxisOnly.multiply(matAxisTilt);
        matAxisOnly.multiply(matGyro);
        spinAxisGroup.matrixAutoUpdate = false;
        spinAxisGroup.matrix.copy(matAxisOnly);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, rpm, playbackSpeed, calculatedTiltDeg, gyroDegrees, seamType]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-950/80 rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
      {/* Title badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-md border border-zinc-800 backdrop-blur pointer-events-none">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
        <span className="text-[11px] font-black tracking-wider text-zinc-200">{title}</span>
        <span className="text-[9px] font-mono text-zinc-400">({seamType.toUpperCase()})</span>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full min-h-[280px] cursor-grab active:cursor-grabbing" />
    </div>
  );
};

export const PITCH_PRESETS = [
  { name: '4-Seam (直球 1:15)', seamType: '4-seam', rpm: 2350, tiltClock: '1:15', tiltDegrees: 37.5, gyroDegrees: 8 },
  { name: '2-Seam / Sinker (2:15)', seamType: '2-seam', rpm: 2200, tiltClock: '2:15', tiltDegrees: 67.5, gyroDegrees: 18 },
  { name: '1-Seam Sinker (2:30)', seamType: '1-seam', rpm: 2150, tiltClock: '2:30', tiltDegrees: 75, gyroDegrees: 30 },
  { name: 'Cutter (11:45)', seamType: '4-seam', rpm: 2450, tiltClock: '11:45', tiltDegrees: -7.5, gyroDegrees: 25 },
  { name: 'Slider (10:30)', seamType: '4-seam', rpm: 2550, tiltClock: '10:30', tiltDegrees: -45, gyroDegrees: 48 },
  { name: 'Sweeper (9:00)', seamType: '2-seam', rpm: 2700, tiltClock: '9:00', tiltDegrees: -90, gyroDegrees: 25 },
  { name: 'Curveball (6:30)', seamType: '4-seam', rpm: 2750, tiltClock: '6:30', tiltDegrees: 195, gyroDegrees: 12 },
  { name: 'Changeup (2:45)', seamType: '2-seam', rpm: 1750, tiltClock: '2:45', tiltDegrees: 82.5, gyroDegrees: 28 },
  { name: 'Gyro Slider (純ジャイロ)', seamType: '4-seam', rpm: 2400, tiltClock: '12:00', tiltDegrees: 0, gyroDegrees: 85 },
];

export default SingleBallCanvas;

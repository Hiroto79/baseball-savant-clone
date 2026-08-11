import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Rapsodo-style 3D Baseball Seam & Spin Visualizer Component
 * 
 * 1. ジオメトリ: 本物の野球ボールシーム方程式（2つの馬蹄形ウイング＋2本の平行レール）
 * 2. 4シーム / 2シーム / 1シーム の初期姿勢（InitRotation_Matrix）
 * 3. 厳密な行列合成: FinalTransform = AxisTilt_Matrix * GyroAngle_Matrix * SpinAnimation_Matrix * InitRotation_Matrix
 */

// 正確な野球ボールのシーム曲線を生成する（球面上の馬蹄形幾何学）
function createBaseballSeamGeometry(radius = 1.0) {
  const points = [];
  const stitches = []; // 赤いステッチの座標ペア
  const segments = 240;

  // 正確な野球シーム方程式 (球座標パラメータ: 緯度θ, 経度φ)
  // c=0.68 (馬蹄形の深さ), d=0.10 (頭部フラット補正), e=0.25 (レール平行補正)
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const theta = Math.PI / 2 + 0.68 * Math.sin(2 * t) + 0.08 * Math.sin(6 * t);
    const phi = t + 0.26 * Math.cos(4 * t);

    const r = radius * 1.003;
    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.cos(theta);
    const z = r * Math.sin(theta) * Math.sin(phi);

    const pt = new THREE.Vector3(x, y, z);
    points.push(pt);

    // ステッチのV字針目（約108組）
    if (i % 2 === 0 && i < segments) {
      // 接線ベクトルと法線ベクトルからステッチ方向を計算
      const dt = 0.01;
      const thetaNext = Math.PI / 2 + 0.68 * Math.sin(2 * (t + dt)) + 0.08 * Math.sin(6 * (t + dt));
      const phiNext = (t + dt) + 0.26 * Math.cos(4 * (t + dt));
      const xNext = r * Math.sin(thetaNext) * Math.cos(phiNext);
      const yNext = r * Math.cos(thetaNext);
      const zNext = r * Math.sin(thetaNext) * Math.sin(phiNext);

      const tangent = new THREE.Vector3(xNext - x, yNext - y, zNext - z).normalize();
      const normal = pt.clone().normalize();
      const cross = new THREE.Vector3().crossVectors(tangent, normal).normalize().multiplyScalar(0.045);

      // ステッチの左右端
      stitches.push(pt.clone().add(cross));
      stitches.push(pt.clone().sub(cross));
    }
  }

  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const tubeGeo = new THREE.TubeGeometry(curve, 180, 0.022, 6, true);

  // ステッチラインジオメトリ
  const stitchGeo = new THREE.BufferGeometry().setFromPoints(stitches);

  return { tubeGeo, stitchGeo };
}

// シームジオメトリのキャッシュ（メモリ節約＆高速リロード）
let cachedSeamGeo = null;
function getSeamGeometries() {
  if (!cachedSeamGeo) {
    cachedSeamGeo = createBaseballSeamGeometry(1.0);
  }
  return cachedSeamGeo;
}

// 4シーム / 2シーム / 1シームの初期回転行列 (InitRotation_Matrix)
export function getInitRotationMatrix(seamType = '4-seam') {
  const m = new THREE.Matrix4();
  if (seamType === '2-seam') {
    // 2シーム: 馬蹄形の横にある「2本の平行レール」が正面を向く姿勢 (Y軸90度回転)
    m.makeRotationY(Math.PI / 2);
  } else if (seamType === '1-seam') {
    // 1シーム: シームの頂点（ループの極）が回転軸の近くに配置される姿勢 (X軸45度 + Y軸45度)
    const mX = new THREE.Matrix4().makeRotationX(Math.PI / 4);
    const mY = new THREE.Matrix4().makeRotationY(Math.PI / 4);
    m.multiplyMatrices(mY, mX);
  } else {
    // 4シーム (デフォルト): 馬蹄形（ウイング）が正面を向く基準姿勢
    m.identity();
  }
  return m;
}

export const SingleBallCanvas = ({
  seamType = '4-seam',
  rpm = 2200,
  tiltClock = '1:30',
  tiltDegrees = 45,
  gyroDegrees = 15,
  arm = 'R',
  isPlaying = true,
  playbackSpeed = 0.25,
  viewAngle = 'catcher',
  title = 'Ball A',
  accentColor = '#ef4444',
}) => {
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const spinAngleRef = useRef(0);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const ballGroupRef = useRef(null);
  const spinAxisGroupRef = useRef(null);
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: 0, phi: 0 });

  const calculatedTiltDeg = useMemo(() => {
    if (typeof tiltDegrees === 'number' && !isNaN(tiltDegrees)) {
      return tiltDegrees;
    }
    if (typeof tiltClock === 'string' && tiltClock.includes(':')) {
      const [h, m] = tiltClock.split(':').map(Number);
      return ((h % 12) + m / 60) * 30;
    }
    return 45;
  }, [tiltDegrees, tiltClock]);

  // Three.js 初期化 (超軽量 & 高速化)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 340;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x09090b);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.0);
    cameraRef.current = camera;

    // 3. Renderer (最適化)
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(3, 4, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-4, -2, -3);
    scene.add(dirLight2);

    // 5. Background Grid / Rapsodo Concentric Rings
    const bgGroup = new THREE.Group();
    const ringMat = new THREE.LineBasicMaterial({ color: 0x27272a, transparent: true, opacity: 0.5 });
    for (let r = 0.8; r <= 2.2; r += 0.4) {
      const ringGeo = new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, r, 0, Math.PI * 2, true).getPoints(48)
      );
      bgGroup.add(new THREE.LineLoop(ringGeo, ringMat));
    }
    const crossMat = new THREE.LineBasicMaterial({ color: 0x3f3f46, transparent: true, opacity: 0.35 });
    bgGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(2.2, 0, 0)]), crossMat));
    bgGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2.2, 0), new THREE.Vector3(0, 2.2, 0)]), crossMat));
    bgGroup.position.z = -1.2;
    scene.add(bgGroup);

    // 6. Ball Model (White Sphere)
    const ballGroup = new THREE.Group();
    ballGroupRef.current = ballGroup;

    const ballRadius = 1.0;
    const sphereGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f7,
      roughness: 0.3,
      metalness: 0.02,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    ballGroup.add(sphereMesh);

    // 7. Seam Model & Stitches (本物の野球ボール縫い目)
    const { tubeGeo, stitchGeo } = getSeamGeometries();

    // 赤いメインシームチューブ
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // 鮮やかな赤
      roughness: 0.25,
      metalness: 0.1,
    });
    const seamMesh = new THREE.Mesh(tubeGeo, seamMat);
    ballGroup.add(seamMesh);

    // 赤いステッチ（縫い針のライン）
    const stitchMat = new THREE.LineBasicMaterial({
      color: 0xdc2626,
      linewidth: 1.5,
    });
    const stitchLines = new THREE.LineSegments(stitchGeo, stitchMat);
    ballGroup.add(stitchLines);

    scene.add(ballGroup);

    // 8. Spin Axis Vector Visualizer (Rapsodo Green Axis Line & Ring)
    const spinAxisGroup = new THREE.Group();
    spinAxisGroupRef.current = spinAxisGroup;

    // Axis pole
    const poleGeo = new THREE.CylinderGeometry(0.016, 0.016, 2.8, 12);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    spinAxisGroup.add(poleMesh);

    // Arrow tip
    const arrowGeo = new THREE.ConeGeometry(0.06, 0.18, 12);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.y = 1.4;
    spinAxisGroup.add(arrowMesh);

    // Spin Direction Ring
    const spinRingPoints = new THREE.Path().absarc(0, 0, 0.45, 0, Math.PI * 1.6, false).getPoints(24);
    const spinRingGeo = new THREE.BufferGeometry().setFromPoints(spinRingPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const spinRingMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const spinRing = new THREE.Line(spinRingGeo, spinRingMat);
    spinRing.position.y = 1.15;
    spinAxisGroup.add(spinRing);

    scene.add(spinAxisGroup);

    // 9. Window Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Mouse Drag Controls
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMousePosRef.current.x;
      const dy = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      orbitAnglesRef.current.theta += dx * 0.01;
      orbitAnglesRef.current.phi = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, orbitAnglesRef.current.phi + dy * 0.01));
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // Update Camera View Angle
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (viewAngle === 'catcher') {
      camera.position.set(0, 0, 5.0);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'pitcher') {
      camera.position.set(0, 0, -5.0);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'side') {
      camera.position.set(5.0, 0, 0);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'top') {
      camera.position.set(0, 5.0, 0.001);
      camera.lookAt(0, 0, 0);
    }
  }, [viewAngle]);

  // Animation Loop: FinalTransform = AxisTilt * GyroAngle * SpinAnimation * InitRotation
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
        // 1. InitRotation_Matrix (4/2/1シーム初期姿勢)
        const matInit = getInitRotationMatrix(seamType);

        // 2. SpinAnimation_Matrix (自転回転)
        const matSpin = new THREE.Matrix4().makeRotationY(spinAngleRef.current);

        // 3. GyroAngle_Matrix (ジャイロ傾斜)
        const gyroRad = (gyroDegrees * Math.PI) / 180;
        const matGyro = new THREE.Matrix4().makeRotationZ(gyroRad);

        // 4. AxisTilt_Matrix (回転軸チルト)
        const tiltRad = -(calculatedTiltDeg * Math.PI) / 180;
        const matAxisTilt = new THREE.Matrix4().makeRotationZ(tiltRad);

        // 5. 行列合成
        const matFinal = new THREE.Matrix4();
        matFinal.multiply(matAxisTilt);
        matFinal.multiply(matGyro);
        matFinal.multiply(matSpin);
        matFinal.multiply(matInit);

        ballGroup.matrixAutoUpdate = false;
        ballGroup.matrix.copy(matFinal);

        spinAxisGroup.matrixAutoUpdate = false;
        spinAxisGroup.matrix.copy(matAxisTilt);
      }

      const camera = cameraRef.current;
      if (camera && isDraggingRef.current) {
        const r = 5.0;
        const theta = orbitAnglesRef.current.theta;
        const phi = orbitAnglesRef.current.phi;
        camera.position.x = r * Math.sin(theta) * Math.cos(phi);
        camera.position.y = r * Math.sin(phi);
        camera.position.z = r * Math.cos(theta) * Math.cos(phi);
        camera.lookAt(0, 0, 0);
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
  }, [seamType, rpm, calculatedTiltDeg, gyroDegrees, isPlaying, playbackSpeed]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
      {/* Header Tag */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span
          className="px-2.5 py-1 rounded-lg text-xs font-black text-white shadow"
          style={{ backgroundColor: accentColor }}
        >
          {title}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-750 text-[10px] font-bold text-zinc-300 backdrop-blur">
          {seamType.toUpperCase()}
        </span>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-0.5 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1.5 rounded-xl border border-zinc-800 backdrop-blur">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span className="text-emerald-400">RPM:</span>
          <span>{rpm}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sky-400">Tilt:</span>
          <span>{tiltClock} ({Math.round(calculatedTiltDeg)}°)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400">Gyro:</span>
          <span>{gyroDegrees}° ({Math.round(Math.cos((gyroDegrees * Math.PI) / 180) * 100)}% 効率)</span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[300px]" />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 pointer-events-none bg-zinc-950/70 px-3 py-0.5 rounded-full border border-zinc-850">
        🖱️ ドラッグで視点を360°回転
      </div>
    </div>
  );
};

export const PITCH_PRESETS = [
  { name: '4-Seam Fastball (4シーム)', seamType: '4-seam', rpm: 2350, tiltClock: '1:15', tiltDegrees: 37.5, gyroDegrees: 10, desc: 'ホップ成分最大の王道直球' },
  { name: '2-Seam / Sinker (2シーム)', seamType: '2-seam', rpm: 2150, tiltClock: '2:15', tiltDegrees: 67.5, gyroDegrees: 18, desc: '平行レールで横滑り＆沈む' },
  { name: '1-Seam Gyro Sinker (1シーム)', seamType: '1-seam', rpm: 2100, tiltClock: '2:30', tiltDegrees: 75, gyroDegrees: 35, desc: 'SSW効果を最大化する斜め縫い目' },
  { name: 'Sweeper (スイーパー)', seamType: '2-seam', rpm: 2600, tiltClock: '9:00', tiltDegrees: 270, gyroDegrees: 30, desc: '強烈な横滑りスイーパー' },
  { name: 'Gyro Slider (縦スラ/ジャイロ)', seamType: '4-seam', rpm: 2400, tiltClock: '10:30', tiltDegrees: 315, gyroDegrees: 65, desc: 'ライフル回転で急降下' },
  { name: '12-6 Curveball (ドロップカーブ)', seamType: '4-seam', rpm: 2700, tiltClock: '6:00', tiltDegrees: 180, gyroDegrees: 8, desc: '純粋トップスピン' },
  { name: 'Circle Changeup (チェンジアップ)', seamType: '2-seam', rpm: 1750, tiltClock: '2:45', tiltDegrees: 82.5, gyroDegrees: 28, desc: '減速＆ブレーキ' },
];

export default SingleBallCanvas;

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Rapsodo-style 3D Baseball Seam & Spin Visualizer Component
 * 
 * ユーザー指定の3要素を精密実装:
 * 1. ジオメトリ & マテリアル: クリーンで強調されたラプソード風のSeamModel（赤チューブ）+ 白球体
 * 2. 4/2/1シームの初期姿勢: InitRotation_Matrix
 * 3. 回転行列合成: FinalTransform = AxisTilt_Matrix * GyroAngle_Matrix * SpinAnimation_Matrix * InitRotation_Matrix
 */

// 正確な野球ボールのシーム曲線を生成する関数 (球面パラメータ方程式)
function generateSeamCurvePoints(radius = 1.0, segments = 360) {
  const points = [];
  const a = 0.38; // 野球ボールのシーム形状を決定する幾何パラメータ (二重馬蹄形)

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    // 球面上の野球シームパラメータ方程式
    const x0 = Math.cos(t) - a * Math.cos(3 * t);
    const y0 = Math.sin(t) + a * Math.sin(3 * t);
    const z0 = 2 * Math.sqrt(a * (1 - a)) * Math.sin(2 * t);

    // 半径に合わせて正規化
    const len = Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0);
    const x = (x0 / len) * radius * 1.004; // 球面からわずかに浮かせた位置
    const y = (y0 / len) * radius * 1.004;
    const z = (z0 / len) * radius * 1.004;

    points.push(new THREE.Vector3(x, y, z));
  }
  return points;
}

// 4シーム / 2シーム / 1シームの初期回転行列 (InitRotation_Matrix)
export function getInitRotationMatrix(seamType = '4-seam') {
  const m = new THREE.Matrix4();
  if (seamType === '2-seam') {
    // 2シーム: Y軸 (上下軸) で 90度回転。馬蹄形の平らな面 (平行レール) が正面
    m.makeRotationY(Math.PI / 2);
  } else if (seamType === '1-seam') {
    // 1シーム: X軸・Y軸の両方で 45度傾け、シームの頂点が極近くに来る姿勢
    const mX = new THREE.Matrix4().makeRotationX(Math.PI / 4);
    const mY = new THREE.Matrix4().makeRotationY(Math.PI / 4);
    m.multiplyMatrices(mY, mX);
  } else {
    // 4シーム (デフォルト): 馬蹄形 (ウイング) が正面を向く基準姿勢
    m.identity();
  }
  return m;
}

export const SingleBallCanvas = ({
  seamType = '4-seam',
  rpm = 2200,
  tiltClock = '1:30', // '1:30', '12:00' etc. or tiltDegrees
  tiltDegrees = 45,   // 0~360 deg
  gyroDegrees = 15,   // 0~90 deg (0=Pure Spin, 90=Gyro)
  arm = 'R',          // 'R' or 'L'
  isPlaying = true,
  playbackSpeed = 0.25, // 0.1x ~ 1.0x (スローモーションでシーム観察)
  viewAngle = 'catcher', // 'catcher', 'pitcher', 'side', 'top', 'orbit'
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

  // 時計の文字盤 (例: 1:30) から角度 (度数法) への変換
  const calculatedTiltDeg = useMemo(() => {
    if (typeof tiltDegrees === 'number' && !isNaN(tiltDegrees)) {
      return tiltDegrees;
    }
    if (typeof tiltClock === 'string' && tiltClock.includes(':')) {
      const [h, m] = tiltClock.split(':').map(Number);
      const totalMinutes = ((h % 12) + m / 60) * 30; // 1時間 = 30度
      return totalMinutes;
    }
    return 45;
  }, [tiltDegrees, tiltClock]);

  // Three.js 初期化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x09090b); // クリーンなダーク/ラプソードスタイル

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights (Rapsodo clean studio lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(3, 4, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-4, -2, -3);
    scene.add(dirLight2);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
    backLight.position.set(0, 0, -5);
    scene.add(backLight);

    // 5. Background Grid / Rapsodo Concentric Rings & Clock dial
    const bgGroup = new THREE.Group();
    const ringMat = new THREE.LineBasicMaterial({ color: 0x27272a, transparent: true, opacity: 0.6 });
    for (let r = 0.8; r <= 2.2; r += 0.4) {
      const ringGeo = new THREE.RingGeometry(r - 0.003, r, 64);
      const ringMesh = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, r, 0, Math.PI * 2, true).getPoints(64)
      ), ringMat);
      bgGroup.add(ringMesh);
    }
    // 十字グリッド線
    const crossMat = new THREE.LineBasicMaterial({ color: 0x3f3f46, transparent: true, opacity: 0.4 });
    const crossPointsH = [new THREE.Vector3(-2.2, 0, 0), new THREE.Vector3(2.2, 0, 0)];
    const crossPointsV = [new THREE.Vector3(0, -2.2, 0), new THREE.Vector3(0, 2.2, 0)];
    bgGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(crossPointsH), crossMat));
    bgGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(crossPointsV), crossMat));
    bgGroup.position.z = -1.2;
    scene.add(bgGroup);

    // 6. Ball Model (White Sphere)
    const ballGroup = new THREE.Group();
    ballGroupRef.current = ballGroup;

    const ballRadius = 1.0;
    const sphereGeo = new THREE.SphereGeometry(ballRadius, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f5,
      roughness: 0.35,
      metalness: 0.05,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    ballGroup.add(sphereMesh);

    // 7. SeamModel (Red Tube Geometry along Baseball Parametric Curve)
    const seamPoints = generateSeamCurvePoints(ballRadius, 360);
    const seamCurve = new THREE.CatmullRomCurve3(seamPoints, true, 'catmullrom', 0.1);
    const tubeGeo = new THREE.TubeGeometry(seamCurve, 360, 0.024, 8, true);
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Rapsodo-style visually emphasized bright red seam
      roughness: 0.2,
      metalness: 0.1,
    });
    const seamMesh = new THREE.Mesh(tubeGeo, seamMat);
    ballGroup.add(seamMesh);

    scene.add(ballGroup);

    // 8. Spin Axis Vector Visualizer (Rapsodo Green/Cyan Axis Line)
    const spinAxisGroup = new THREE.Group();
    spinAxisGroupRef.current = spinAxisGroup;

    // Axis cylinder pole
    const poleGeo = new THREE.CylinderGeometry(0.016, 0.016, 2.8, 16);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Lime green axis
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    spinAxisGroup.add(poleMesh);

    // Arrow pointer at positive spin axis pole
    const arrowGeo = new THREE.ConeGeometry(0.06, 0.18, 16);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.y = 1.4;
    spinAxisGroup.add(arrowMesh);

    // Spin Direction Ring (Orbit indicator)
    const spinRingPoints = new THREE.Path().absarc(0, 0, 0.45, 0, Math.PI * 1.6, false).getPoints(32);
    const spinRingGeo = new THREE.BufferGeometry().setFromPoints(spinRingPoints.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const spinRingMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 });
    const spinRing = new THREE.Line(spinRingGeo, spinRingMat);
    spinRing.position.y = 1.15;
    spinAxisGroup.add(spinRing);

    scene.add(spinAxisGroup);

    // 9. Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Mouse interaction for manual rotation (Orbit)
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

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // Update Camera based on View Angle
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (viewAngle === 'catcher') {
      // 捕手視点 (正面)
      camera.position.set(0, 0, 5.2);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'pitcher') {
      // 投手視点 (背後から本塁を見る)
      camera.position.set(0, 0, -5.2);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'side') {
      // 側面視点 (三塁側/一塁側)
      camera.position.set(5.2, 0, 0);
      camera.lookAt(0, 0, 0);
    } else if (viewAngle === 'top') {
      // 真上視点
      camera.position.set(0, 5.2, 0.001);
      camera.lookAt(0, 0, 0);
    }
  }, [viewAngle]);

  // Animation Loop: FinalTransform = AxisTilt_Matrix * GyroAngle_Matrix * SpinAnimation_Matrix * InitRotation_Matrix
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying) {
        // 自転角の増分 (RPM -> rad/s -> rad/frame)
        const radPerSec = (rpm * (2 * Math.PI) / 60) * playbackSpeed;
        spinAngleRef.current += radPerSec * deltaSec;
      }

      const ballGroup = ballGroupRef.current;
      const spinAxisGroup = spinAxisGroupRef.current;

      if (ballGroup && spinAxisGroup) {
        // -------------------------------------------------------------
        // 行列合成の計算 (指示例3の厳密な行列計算式)
        // FinalTransform = AxisTilt_Matrix * GyroAngle_Matrix * SpinAnimation_Matrix * InitRotation_Matrix
        // -------------------------------------------------------------

        // 1. InitRotation_Matrix: ユーザーが選択したシーム (4/2/1) の初期姿勢
        const matInit = getInitRotationMatrix(seamType);

        // 2. SpinAnimation_Matrix: 時間経過とともに増加する自転角
        const matSpin = new THREE.Matrix4().makeRotationY(spinAngleRef.current);

        // 3. GyroAngle_Matrix: 回転軸に対するジャイロ傾き (0°〜90°)
        const gyroRad = (gyroDegrees * Math.PI) / 180;
        const matGyro = new THREE.Matrix4().makeRotationZ(gyroRad);

        // 4. AxisTilt_Matrix: 回転軸自体のチルト向き (時計の針 / 角度)
        // 野球座標: 12:00 = 0° (バックスピン), 3:00 = 90° (サイド), 6:00 = 180° (トップスピン)
        const tiltRad = -(calculatedTiltDeg * Math.PI) / 180;
        const matAxisTilt = new THREE.Matrix4().makeRotationZ(tiltRad);

        // 5. 行列合成: FinalTransform = AxisTilt * GyroAngle * SpinAnimation * InitRotation
        const matFinal = new THREE.Matrix4();
        matFinal.multiply(matAxisTilt);
        matFinal.multiply(matGyro);
        matFinal.multiply(matSpin);
        matFinal.multiply(matInit);

        // ボールモデルに行列を直接適用
        ballGroup.matrixAutoUpdate = false;
        ballGroup.matrix.copy(matFinal);

        // 6. 回転軸ラインの向きを AxisTilt_Matrix に同期
        spinAxisGroup.matrixAutoUpdate = false;
        spinAxisGroup.matrix.copy(matAxisTilt);
      }

      // Orbit camera rotation if dragged
      const camera = cameraRef.current;
      if (camera && isDraggingRef.current) {
        const r = 5.2;
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

      {/* Tilt & Spin Info overlay */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2.5 py-1.5 rounded-xl border border-zinc-800 backdrop-blur">
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
          <span>{gyroDegrees}° ({Math.round(Math.cos((gyroDegrees * Math.PI) / 180) * 100)}% Eff)</span>
        </div>
      </div>

      {/* 3D Canvas Mount Point */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[300px]" />

      {/* Drag instruction footer */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 pointer-events-none bg-zinc-950/60 px-3 py-0.5 rounded-full border border-zinc-850">
        🖱️ ドラッグで視点を360°回転
      </div>
    </div>
  );
};

// Preset Pitches Library
export const PITCH_PRESETS = [
  { name: '4-Seam Fastball (4シーム)', seamType: '4-seam', rpm: 2350, tiltClock: '1:15', tiltDegrees: 37.5, gyroDegrees: 10, desc: 'ホップ成分最大の王道直球' },
  { name: '2-Seam / Sinker (2シーム/シンカー)', seamType: '2-seam', rpm: 2150, tiltClock: '2:15', tiltDegrees: 67.5, gyroDegrees: 18, desc: '縫い目剥離でシュート＆沈む' },
  { name: '1-Seam Gyro Sinker (1シーム)', seamType: '1-seam', rpm: 2100, tiltClock: '2:30', tiltDegrees: 75, gyroDegrees: 35, desc: 'SSW効果を最大化する斜め縫い目' },
  { name: 'Sweeper (スイーパー)', seamType: '2-seam', rpm: 2600, tiltClock: '9:00', tiltDegrees: 270, gyroDegrees: 30, desc: '強烈な横滑りスイーパー' },
  { name: 'Gyro Slider (縦スラ/ジャイロ)', seamType: '4-seam', rpm: 2400, tiltClock: '10:30', tiltDegrees: 315, gyroDegrees: 65, desc: 'ライフル回転で急降下' },
  { name: '12-6 Curveball (ドロップカーブ)', seamType: '4-seam', rpm: 2700, tiltClock: '6:00', tiltDegrees: 180, gyroDegrees: 8, desc: '純粋トップスピン' },
  { name: 'Circle Changeup (チェンジアップ)', seamType: '2-seam', rpm: 1750, tiltClock: '2:45', tiltDegrees: 82.5, gyroDegrees: 28, desc: '減速＆ブレーキ' },
];

export default SingleBallCanvas;

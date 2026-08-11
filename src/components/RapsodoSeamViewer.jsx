import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Rapsodo Pitching 準拠の 3D Baseball Seam & Spin Visualizer Component
 * 
 * ラプソード公式のスピン軸＆ジャイロ定義:
 * - 12:00 (0°): 矢印の刺さる方向は 3:00〜9:00 の水平線。
 *   右投手(RHP)なら矢印先端は 9:00 (三塁側) を向き、ボールは真上(12:00)へバックスピン。
 *   左投手(LHP)なら矢印先端は 3:00 (一塁側) を向き、ボールは真上(12:00)へバックスピン。
 * - ジャイロ角度 (Gyro Degree):
 *   右投手なら 9:00 方向の矢印が、進行方向(+Z 捕手側)に向かって角度がついていく。
 *   90° で完全なライフルスピン（弾丸渦巻き回転）。
 * - チルト (Tilt / 時計の針):
 *   1:15〜1:30 (右投直球): 矢印は 10:30〜4:30 に刺さり、右上(1:30)へ向かうバックスピン＋シュート。
 */

// ユーザー指定の数式に従ってシームジオメトリを生成 (太さ 0.042 で強調)
function createParametricSeamGeometry(seamType = '4-seam', radius = 1.0) {
  const points = [];
  const segments = 360;
  const a = seamType === '1-seam' ? 0.40 : 0.35;
  const r = radius * 1.004;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const theta = a * Math.sin(2 * t);
    const phi = t;

    // 直交座標変換
    const x = r * Math.cos(theta) * Math.cos(phi);
    const y = r * Math.cos(theta) * Math.sin(phi);
    const z = r * Math.sin(theta);

    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const tubeGeo = new THREE.TubeGeometry(curve, 240, 0.042, 10, true);

  return tubeGeo;
}

// 4シーム / 2シーム / 1シームの初期回転行列 (InitRotation_Matrix)
export function getInitRotationMatrix(seamType = '4-seam') {
  const m = new THREE.Matrix4();
  if (seamType === '2-seam') {
    // 2-Seam: Yaw(Y軸) 90度回転。縫い目のすき間（平行レール）が正面
    m.makeRotationY(Math.PI / 2);
  } else if (seamType === '1-seam') {
    // 1-Seam: Yaw(Y軸) 45度、Pitch(X軸) 45度。頂点がポール寄りに斜め
    const mX = new THREE.Matrix4().makeRotationX(Math.PI / 4);
    const mY = new THREE.Matrix4().makeRotationY(Math.PI / 4);
    m.multiplyMatrices(mY, mX);
  } else {
    // 4-Seam: (0°, 0°, 0°) 馬蹄形が正面
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
  arm = 'R', // 'R' = 右投手, 'L' = 左投手
  isPlaying = true,
  playbackSpeed = 0.03, // 超低速・じっくり観察用の速度
  viewAngle = 'catcher',
  title = 'Ball A',
  accentColor = '#3b82f6',
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

  // Three.js 初期化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 340;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x09090b);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 0, 5.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ライト
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight1.position.set(3, 4, 5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-4, -2, -3);
    scene.add(dirLight2);

    // ラプソード風 同心円グリッド＆十字線
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

    // ボールグループ
    const ballGroup = new THREE.Group();
    ballGroupRef.current = ballGroup;

    // 白い球体
    const sphereGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f5,
      roughness: 0.28,
      metalness: 0.02,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    ballGroup.add(sphereMesh);

    // 太めの赤い立体チューブ縫い目
    const tubeGeo = createParametricSeamGeometry(seamType, 1.0);
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.2,
      metalness: 0.1,
    });
    const seamMesh = new THREE.Mesh(tubeGeo, seamMat);
    seamMesh.name = 'seamMesh';
    ballGroup.add(seamMesh);

    scene.add(ballGroup);

    // 回転軸ベクトルライン（Rapsodo Green Axis Line）
    // 基準スピン軸（Tilt 12:00 = 水平X軸 3:00〜9:00）に合わせたシリンダー
    const spinAxisGroup = new THREE.Group();
    spinAxisGroupRef.current = spinAxisGroup;

    const poleGeo = new THREE.CylinderGeometry(0.016, 0.016, 2.8, 12);
    poleGeo.rotateZ(Math.PI / 2); // X軸（3:00〜9:00）に寝かせる
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    spinAxisGroup.add(new THREE.Mesh(poleGeo, poleMat));

    // 右投手なら9:00 (-X方向)、左投手なら3:00 (+X方向) に矢印
    const isLeft = arm === 'L';
    const arrowGeo = new THREE.ConeGeometry(0.06, 0.18, 12);
    arrowGeo.rotateZ(isLeft ? Math.PI / 2 : -Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.x = isLeft ? 1.4 : -1.4;
    spinAxisGroup.add(arrowMesh);

    // 回転方向を示すスピンリング
    const spinRingPoints = new THREE.Path().absarc(0, 0, 0.45, 0, Math.PI * 1.6, false).getPoints(24);
    const spinRingGeo = new THREE.BufferGeometry().setFromPoints(spinRingPoints.map(p => new THREE.Vector3(0, p.x, p.y)));
    const spinRing = new THREE.Line(spinRingGeo, new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    spinRing.position.x = isLeft ? 1.15 : -1.15;
    spinAxisGroup.add(spinRing);

    scene.add(spinAxisGroup);

    // リサイズ
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // マウスドラッグ
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
  }, [arm]);

  // シームタイプの変更時にジオメトリを更新
  useEffect(() => {
    const ballGroup = ballGroupRef.current;
    if (!ballGroup) return;

    const oldSeam = ballGroup.getObjectByName('seamMesh');
    if (oldSeam) {
      ballGroup.remove(oldSeam);
      oldSeam.geometry.dispose();
    }

    const newTubeGeo = createParametricSeamGeometry(seamType, 1.0);
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.2,
      metalness: 0.1,
    });
    const newSeamMesh = new THREE.Mesh(newTubeGeo, seamMat);
    newSeamMesh.name = 'seamMesh';
    ballGroup.add(newSeamMesh);
  }, [seamType]);

  // 視点切り替え
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

  // アニメーションループ: Rapsodo公式の厳密なスピン軸・チルト・ジャイロ回転
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
        const isLeft = arm === 'L';

        // 1. InitRotation_Matrix: 4/2/1シームの初期姿勢
        const matInit = getInitRotationMatrix(seamType);

        // 2. SpinAnimation_Matrix: 基準スピン軸（横X軸 3:00〜9:00）周りのバックスピン自転
        const spinDir = isLeft ? 1 : -1;
        const matSpin = new THREE.Matrix4().makeRotationX(spinDir * spinAngleRef.current);

        // 3. GyroAngle_Matrix: Rapsodo準拠ジャイロ傾斜角
        // 矢印方向（右投なら9:00、左投なら3:00）から、進行軸(+Z 捕手側)に向かって角度がついていく
        const gyroRad = (gyroDegrees * Math.PI) / 180;
        const matGyro = new THREE.Matrix4().makeRotationY(isLeft ? gyroRad : -gyroRad);

        // 4. AxisTilt_Matrix: Rapsodo時計盤チルト (12:00 = 0° バックスピン, 1:30 = 45° シュート回転, 6:00 = 180° トップスピン)
        const tiltRad = -(calculatedTiltDeg * Math.PI) / 180;
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
  }, [seamType, rpm, calculatedTiltDeg, gyroDegrees, arm, isPlaying, playbackSpeed]);

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
        <span className="px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-750 text-[10px] font-bold text-amber-300 backdrop-blur">
          {arm === 'L' ? '左投 (LHP)' : '右投 (RHP)'}
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
  { name: '4-Seam Fastball (4シーム)', seamType: '4-seam', rpm: 2350, tiltClock: '1:15', tiltDegrees: 37.5, gyroDegrees: 10, desc: '馬蹄形が正面' },
  { name: '2-Seam / Sinker (2シーム)', seamType: '2-seam', rpm: 2150, tiltClock: '2:15', tiltDegrees: 67.5, gyroDegrees: 18, desc: '縫い目のすき間が正面' },
  { name: '1-Seam Gyro Sinker (1シーム)', seamType: '1-seam', rpm: 2100, tiltClock: '2:30', tiltDegrees: 75, gyroDegrees: 35, desc: '頂点がポール寄りに斜め' },
  { name: 'Sweeper (スイーパー)', seamType: '2-seam', rpm: 2600, tiltClock: '9:00', tiltDegrees: 270, gyroDegrees: 30, desc: '横滑りスイーパー' },
  { name: 'Gyro Slider (縦スラ/ジャイロ)', seamType: '4-seam', rpm: 2400, tiltClock: '10:30', tiltDegrees: 315, gyroDegrees: 65, desc: 'ライフル回転' },
  { name: '12-6 Curveball (ドロップカーブ)', seamType: '4-seam', rpm: 2700, tiltClock: '6:00', tiltDegrees: 180, gyroDegrees: 8, desc: 'トップスピン' },
  { name: 'Circle Changeup (チェンジアップ)', seamType: '2-seam', rpm: 1750, tiltClock: '2:45', tiltDegrees: 82.5, gyroDegrees: 28, desc: 'ブレーキ回転' },
];

export default SingleBallCanvas;

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Rapsodo Pitching 準拠の 3D Baseball Seam & Spin Visualizer Component
 *
 * ラプソード公式のスピン軸＆ジャイロ定義（符号統一版・投手左右の選択は不要）:
 * - チルト (Tilt / 時計の針): 12:00 (0°) を基準（バックスピン）とし、時計回りが正の角度。
 *   1:15〜1:30 (右投直球相当): バックスピン＋シュート方向。
 * - ジャイロ角度 (Gyro Degree, 符号付き -90°〜+90°):
 *   0° = ジャイロ成分なし（純粋な縦回転）
 *   + (プラス) = 左方向へ曲がる回転（右投手の基本的なスライダー/カット系の入り方）
 *   - (マイナス) = 右方向へ曲がる回転（逆ジャイロ / スクリューボール的な入り方）
 *   |90°| で完全なライフルスピン（弾丸渦巻き回転、スピン効率0%）。
 *   投手の利き腕を選択する必要はなく、符号だけで左右どちらの曲がりも表現できる。
 */

// ユーザー指定の数式に従ってシームジオメトリを生成 (太さ 0.058 に強調・断面16分割で滑らかに)
function createParametricSeamGeometry(seamType = '4-seam', radius = 1.0) {
  const points = [];
  const segments = 360;
  const a = seamType === '1-seam' ? 0.40 : 0.35;
  const r = radius * 1.004;

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    // 球面パラメータ方程式: 赤道(θ=0)から上下に a ラジアン波打つ
    const theta = a * Math.sin(2 * t);
    const phi = t;

    const x = r * Math.cos(theta) * Math.cos(phi);
    const y = r * Math.cos(theta) * Math.sin(phi);
    const z = r * Math.sin(theta);

    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  // 半径 0.058、断面分割 16 で立体感を強調
  const tubeGeo = new THREE.TubeGeometry(curve, 240, 0.058, 16, true);

  return tubeGeo;
}

// 4シーム / 2シーム / 1シームの初期回転行列 (InitRotation_Matrix)
export function getInitRotationMatrix(seamType = '4-seam') {
  const m = new THREE.Matrix4();
  if (seamType === '2-seam') {
    // 2-Seam: Z軸 135度回転（実物写真・図解通りのツーシーム姿勢）
    m.makeRotationZ((3 * Math.PI) / 4);
  } else if (seamType === '1-seam') {
    // 1-Seam: Y軸 90度回転（中央に1本のシームラインが縦に通るワンシーム姿勢）
    m.makeRotationY(Math.PI / 2);
  } else {
    // 4-Seam: 実物写真（FRONT / L-SIDE）と100%完全一致するフォーシーム初期姿勢
    // 正面(FRONT)で指先(上)・下部に横縫い目＆右に縦弧、左側面(L-SIDE)で綺麗な馬蹄形(U字)が位置する
    const mZ = new THREE.Matrix4().makeRotationZ((135 * Math.PI) / 180);
    const mY = new THREE.Matrix4().makeRotationY((45 * Math.PI) / 180);
    const mX = new THREE.Matrix4().makeRotationX((135 * Math.PI) / 180);
    m.multiply(mZ).multiply(mY).multiply(mX);
  }
  return m;
}

export const SingleBallCanvas = ({
  seamType = '4-seam',
  rpm = 2200,
  tiltClock = '1:30',
  tiltDegrees = 45,
  gyroDegrees = 15, // 符号付き: + = 左方向へ曲がる（基本）, - = 右方向へ曲がる（逆ジャイロ）
  isPlaying = true,
  playbackSpeed = 0.03, // 超低速・じっくり観察用の速度
  viewAngle = 'pitcher',
  title = 'Ball',
  accentColor = '#3b82f6',
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const ballGroupRef = useRef(null);
  const spinAxisGroupRef = useRef(null);
  const animFrameRef = useRef(null);
  const spinAngleRef = useRef(0);

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

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    if (viewAngle === 'catcher') {
      camera.position.set(0, 0, 5.0);
    } else if (viewAngle === 'pitcher') {
      camera.position.set(0, 0, -5.0);
    } else if (viewAngle === 'side') {
      camera.position.set(5.0, 0, 0);
    } else if (viewAngle === 'top') {
      camera.position.set(0, 5.0, 0.001);
    } else {
      camera.position.set(0, 0, -5.0);
    }
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x90b0ff, 1.0);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 背景の同心円グリッド（ラプソード風レーダーサークル）
    const gridGroup = new THREE.Group();
    [1.3, 1.7, 2.1].forEach(r => {
      const ringGeo = new THREE.RingGeometry(r, r + 0.015, 64);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide, transparent: true, opacity: 0.25 }));
      gridGroup.add(ring);
    });
    // 十字線
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

    // 白球本体
    const sphereGeo = new THREE.SphereGeometry(0.99, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.05,
    });
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    ballGroup.add(sphereMesh);

    // 太めの赤い立体チューブ縫い目
    const tubeGeo = createParametricSeamGeometry(seamType, 1.0);
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.55,
      metalness: 0,
    });
    const seamMesh = new THREE.Mesh(tubeGeo, seamMat);
    seamMesh.name = 'seamMesh';
    ballGroup.add(seamMesh);

    scene.add(ballGroup);

    // スピン軸ライン（矢印＋軸棒）
    const spinAxisGroup = new THREE.Group();
    spinAxisGroupRef.current = spinAxisGroup;

    // 軸棒
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 3.2, 16);
    poleGeo.rotateZ(Math.PI / 2);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    spinAxisGroup.add(new THREE.Mesh(poleGeo, poleMat));

    // 基準姿勢は常に 9:00 (-X方向) の矢印に固定。左右の曲がりはジャイロ角の符号で表現する
    const arrowGeo = new THREE.ConeGeometry(0.06, 0.18, 12);
    arrowGeo.rotateZ(-Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.x = -1.4;
    spinAxisGroup.add(arrowMesh);

    // 回転方向を示すスピンリング
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

    // マウスドラッグ
    const applyPresetCamera = (angle) => {
      if (angle === 'catcher') {
        camera.position.set(0, 0, 5.0);
      } else if (angle === 'pitcher') {
        camera.position.set(0, 0, -5.0);
      } else if (angle === 'side') {
        camera.position.set(5.0, 0, 0);
      } else if (angle === 'top') {
        camera.position.set(0, 5.0, 0.001);
      }
      camera.lookAt(0, 0, 0);
    };

    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      orbitAnglesRef.current.theta += deltaX * 0.01;
      orbitAnglesRef.current.phi = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, orbitAnglesRef.current.phi + deltaY * 0.01));

      const r = 5.0;
      const t = orbitAnglesRef.current.theta;
      const p = orbitAnglesRef.current.phi;

      camera.position.x = r * Math.sin(t) * Math.cos(p);
      camera.position.y = r * Math.sin(p);
      camera.position.z = r * Math.cos(t) * Math.cos(p);
      camera.lookAt(0, 0, 0);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    // ダブルクリックで、ドラッグ回転を選択中のプリセット視点へ戻す
    // （ドラッグ後は視点セレクタの表示と実際のカメラ位置がズレたままになるため）
    const onDoubleClick = () => {
      orbitAnglesRef.current = { theta: 0, phi: 0 };
      applyPresetCamera(viewAngleRef.current);
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

    const oldSeam = ballGroup.getObjectByName('seamMesh');
    if (oldSeam) {
      ballGroup.remove(oldSeam);
      oldSeam.geometry.dispose();
    }

    const newTubeGeo = createParametricSeamGeometry(seamType, 1.0);
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.55,
      metalness: 0,
    });
    const newSeamMesh = new THREE.Mesh(newTubeGeo, seamMat);
    newSeamMesh.name = 'seamMesh';
    ballGroup.add(newSeamMesh);
  }, [seamType]);

  // 視点切り替え
  useEffect(() => {
    viewAngleRef.current = viewAngle;
    const camera = cameraRef.current;
    if (!camera) return;

    // ドラッグで自由回転させた後にプリセット視点へ戻すため、軌道角度もリセットする
    orbitAnglesRef.current = { theta: 0, phi: 0 };

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
        //    バックスピンの回転方向自体は投手の左右で変わらないため固定
        const matSpin = new THREE.Matrix4().makeRotationX(-spinAngleRef.current);

        // 3. GyroAngle_Matrix: Rapsodo準拠ジャイロ傾斜角（符号付き）
        const gyroRad = (gyroDegrees * Math.PI) / 180;
        const matGyro = new THREE.Matrix4().makeRotationY(gyroRad);

        // 4. AxisTilt_Matrix: 投手視点で 12:00=上, 3:00=右, 6:00=下, 9:00=左 となる時計回り回転
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
  }, [seamType, rpm, calculatedTiltDeg, gyroDegrees, isPlaying, playbackSpeed]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl sm:shadow-2xl">
      {/* HUD Info Badges */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex items-center gap-1 sm:gap-2 pointer-events-none">
        <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black text-white shadow-md border border-white/20" style={{ backgroundColor: accentColor }}>
          {title}
        </span>
        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-750 text-[9px] sm:text-[10px] font-mono font-bold text-zinc-300 backdrop-blur">
          {seamType.toUpperCase()}
        </span>
        <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-750 text-[9px] sm:text-[10px] font-bold text-amber-300 backdrop-blur hidden xs:inline-block">
          {gyroDegrees > 0 ? '右方向ジャイロ ▶' : gyroDegrees < 0 ? '◀ 左方向ジャイロ' : 'ジャイロなし'}
        </span>
      </div>

      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex flex-col items-end gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] font-mono font-bold text-zinc-300 bg-zinc-900/85 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-zinc-800 backdrop-blur pointer-events-none">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-emerald-400">RPM:</span>
          <span>{rpm}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-sky-400">Tilt:</span>
          <span>{tiltClock} ({Math.round(calculatedTiltDeg)}°)</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <span className="text-yellow-400">Gyro:</span>
          <span>{gyroDegrees > 0 ? `+${gyroDegrees}` : gyroDegrees}° ({Math.round(Math.cos((Math.abs(gyroDegrees) * Math.PI) / 180) * 100)}%)</span>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing min-h-[240px] sm:min-h-[300px]" />

      <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] text-zinc-500 pointer-events-none bg-zinc-950/80 px-2 sm:px-3 py-0.5 rounded-full border border-zinc-800 whitespace-nowrap">
        🖱️ ドラッグで回転 ・ ダブルクリックで復帰
      </div>
    </div>
  );
};

export const PITCH_PRESETS = [
  { name: '4-Seam Fastball (4シーム)', seamType: '4-seam', rpm: 2350, tiltClock: '1:15', tiltDegrees: 37.5, gyroDegrees: 10, desc: '馬蹄形が正面' },
  { name: '2-Seam / Sinker (2シーム)', seamType: '2-seam', rpm: 2150, tiltClock: '2:15', tiltDegrees: 67.5, gyroDegrees: 18, desc: '馬蹄形に近い広めの回転' },
  { name: '1-Seam Gyro Sinker (1シーム)', seamType: '1-seam', rpm: 2100, tiltClock: '2:30', tiltDegrees: 75, gyroDegrees: 35, desc: '片側寄りで余白が広い雫型' },
  { name: 'Sweeper (スイーパー)', seamType: '2-seam', rpm: 2600, tiltClock: '9:00', tiltDegrees: -90, gyroDegrees: 30, desc: '横滑りスイーパー' },
  { name: 'Gyro Slider (縦スラ/ジャイロ)', seamType: '4-seam', rpm: 2400, tiltClock: '10:30', tiltDegrees: -45, gyroDegrees: 65, desc: 'ライフル回転' },
  { name: '12-6 Curveball (ドロップカーブ)', seamType: '4-seam', rpm: 2700, tiltClock: '6:00', tiltDegrees: 180, gyroDegrees: 8, desc: 'トップスピン' },
  { name: 'Circle Changeup (チェンジアップ)', seamType: '2-seam', rpm: 1750, tiltClock: '2:45', tiltDegrees: 82.5, gyroDegrees: 28, desc: 'ブレーキ回転' },
];

export default SingleBallCanvas;

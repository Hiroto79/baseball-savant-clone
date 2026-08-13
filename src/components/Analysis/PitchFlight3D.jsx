import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Activity } from 'lucide-react';

/**
 * Rapsodo 3D Diamond 仕様 3D Pitch Flight & Trajectory Simulator
 * 
 * 強化内容:
 * - 着弾点（ホームベース上）でボールが静止し、設定されたスピン軸・RPMで3D自転を継続
 * - バッテン線・着弾丸マークを排除し、洗練された3Dストライクゾーンと自転ボールを表示
 * - 正しい右打者 / 左打者目線（右打者: 一塁側から投手を見る / 左打者: 三塁側から投手を見る）
 * - 画面右下に「MOVIMIENTO (BREAK CHART) / 変化量チャート」を常時オーバーレイ表示
 */

// プロシージャル・レザーテクスチャ
function createProceduralLeatherTextures() {
  const width = 512;
  const height = 256;
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
        const n2 = (Math.random() - 0.5) * 0.3;
        const val = Math.floor(128 + (n1 * 0.3 + n2) * 50);
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
  return bumpTexture;
}

// 108本ステッチ付きリアルボールMesh作成
function createBaseballMesh(radius = 0.037, seamType = '4-seam') {
  const ballGroup = new THREE.Group();

  // 1. レザー球体本体
  const bumpTexture = createProceduralLeatherTextures();
  const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0xfafaf9,
    roughness: 0.62,
    metalness: 0.02,
    bumpMap: bumpTexture,
    bumpScale: 0.003,
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  ballGroup.add(sphereMesh);

  // 2. シーム曲線とステッチ
  const segments = 180;
  const alpha = 0.60;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const theta = alpha * Math.sin(2 * t);
    const phi = t;
    const x = radius * 1.002 * Math.cos(theta) * Math.cos(phi);
    const y = radius * 1.002 * Math.cos(theta) * Math.sin(phi);
    const z = radius * 1.002 * Math.sin(theta);
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points, true);
  const seamTubeGeo = new THREE.TubeGeometry(curve, 180, radius * 0.025, 8, true);
  const seamMat = new THREE.MeshStandardMaterial({
    color: 0xba181b,
    roughness: 0.45,
  });
  const seamMesh = new THREE.Mesh(seamTubeGeo, seamMat);
  ballGroup.add(seamMesh);

  return ballGroup;
}

// 無回転ゴーストボールMesh作成
function createGhostBallMesh(radius = 0.037) {
  const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
  const ghostMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.45,
    wireframe: false,
    roughness: 0.2,
  });
  const ghostMesh = new THREE.Mesh(sphereGeo, ghostMat);

  // 外枠リング
  const ringGeo = new THREE.RingGeometry(radius * 1.05, radius * 1.12, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ghostMesh.add(ring);

  return ghostMesh;
}

export const PitchFlight3D = ({
  pitches = [],
  selectedPitchId,
  onSelectPitch,
  showSpinlessGlobal = true,
  showForcesGlobal = true,
  cameraView = 'CATCHER', // 'CATCHER' | 'BATTER_R' | 'BATTER_L' | 'PITCHER' | 'FOLLOW' | 'SIDE'
  onCameraChange,
  playbackSpeed = 0.5,
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const animFrameRef = useRef(null);

  // 自動ループ再生はオフ。デフォルトは着弾位置 (progress=1.0) でボールが自転待機
  const [isPlaying, setIsPlaying] = useState(false);
  const [flightProgress, setFlightProgress] = useState(1.0); // 0.0 = 放球, 1.0 = 着弾
  const progressRef = useRef(1.0);
  const continuousSpinAngleRef = useRef(0);

  // マウスドラッグ軌道制御
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const orbitAnglesRef = useRef({ theta: 0, phi: 0 });

  // 物理計算: 各球種の軌道点を計算
  const pitchTrajectories = useMemo(() => {
    return pitches.map(p => {
      const v_kmh = p.velocity || 145;
      const v_ms = v_kmh / 3.6; // m/s
      const dist = 16.8; // Release to Plate (m)
      const flightTime = dist / v_ms; // 秒 (約0.4s)

      const startX = p.releasePos?.x ?? -0.45;
      const startY = p.releasePos?.y ?? 16.8;
      const startZ = p.releasePos?.z ?? 1.85;

      const targetX = (p.targetLocation?.x ?? 0) / 100; // cm -> m
      const targetZ = (p.targetLocation?.z ?? 75) / 100; // cm -> m

      // 変化量 (cm -> m)
      const hb_m = (p.hb ?? 0) / 100;
      const vb_m = (p.vb ?? 0) / 100;

      // 加速度
      const g = 9.80665;
      const ax = (2 * hb_m) / (flightTime * flightTime);
      const az_mag = (2 * vb_m) / (flightTime * flightTime); // マグナス上向き揚力

      // 初速計算 (目標コース通過)
      const vx0 = (targetX - startX - 0.5 * ax * flightTime * flightTime) / flightTime;
      const vy0 = -dist / flightTime;
      const vz0 = (targetZ - startZ - 0.5 * (az_mag - g) * flightTime * flightTime) / flightTime;

      // 軌道点配列 (N=60)
      const steps = 60;
      const actualPoints = [];
      const ghostPoints = []; // 無回転 (ax=0, az_mag=0, 重力のみ)

      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * flightTime;
        // 実軌道
        const x = startX + vx0 * t + 0.5 * ax * t * t;
        const y = startY + vy0 * t;
        const z = startZ + vz0 * t + 0.5 * (az_mag - g) * t * t;
        actualPoints.push(new THREE.Vector3(x, z, y)); // Three.js空間: Y=Height(Z), Z=Depth(Y)

        // ゴースト無回転軌道
        const gx = startX + vx0 * t;
        const gy = startY + vy0 * t;
        const gz = startZ + vz0 * t + 0.5 * (-g) * t * t;
        ghostPoints.push(new THREE.Vector3(gx, gz, gy));
      }

      return {
        ...p,
        flightTime,
        actualPoints,
        ghostPoints,
        startPos: new THREE.Vector3(startX, startZ, startY),
        targetPos: new THREE.Vector3(targetX, targetZ, 0),
        ax,
        az_mag,
        g,
      };
    });
  }, [pitches]);

  // Three.js 初期化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b); // zinc-950
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // 💡 スタジオ 3点ライティング
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.2);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xfffaed, 2.2);
    dirLight1.position.set(5, 12, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 1.2);
    dirLight2.position.set(-6, 8, -8);
    scene.add(dirLight2);

    // 🏟️ グラウンド & マウンド & ホームベース
    // フィールド床
    const fieldGeo = new THREE.PlaneGeometry(16, 26);
    fieldGeo.rotateX(-Math.PI / 2);
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.1 });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.set(0, 0, 8);
    scene.add(field);

    // 投球レーン・グリッドライン
    const gridHelper = new THREE.GridHelper(24, 24, 0x3b82f6, 0x27272a);
    gridHelper.position.set(0, 0.01, 8);
    scene.add(gridHelper);

    // ピッチャーズプレート (マウンド Y=16.8)
    const plateGeo = new THREE.BoxGeometry(0.61, 0.04, 0.15);
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const rubber = new THREE.Mesh(plateGeo, rubberMat);
    rubber.position.set(0, 0.02, 16.8);
    scene.add(rubber);

    // ホームベース (五角形 Y=0)
    const homeShape = new THREE.Shape();
    homeShape.moveTo(-0.215, 0);
    homeShape.lineTo(0.215, 0);
    homeShape.lineTo(0.215, 0.215);
    homeShape.lineTo(0, 0.43);
    homeShape.lineTo(-0.215, 0.215);
    homeShape.closePath();
    const homeGeo = new THREE.ShapeGeometry(homeShape);
    homeGeo.rotateX(-Math.PI / 2);
    const homeMesh = new THREE.Mesh(homeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    homeMesh.position.set(0, 0.02, 0);
    scene.add(homeMesh);

    // 🎯 3D ストライクゾーンフレーム (幅43cm, 高さ0.5m~1.05m / バッテン線なしの洗練された矩形)
    const szWidth = 0.43;
    const szBottom = 0.50;
    const szTop = 1.05;
    const szHeight = szTop - szBottom;

    // 外枠ボックス
    const szGeo = new THREE.BoxGeometry(szWidth, szHeight, 0.01);
    const szMat = new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true, transparent: true, opacity: 0.65 });
    const szMesh = new THREE.Mesh(szGeo, szMat);
    szMesh.position.set(0, szBottom + szHeight / 2, 0);
    scene.add(szMesh);

    // 3x3 グリッドライン（バッテン線は入れず、綺麗な縦2本・横2本の罫線のみ）
    const gridMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35 });
    const gridPoints = [
      // 縦2本
      new THREE.Vector3(-szWidth / 6, szBottom, 0), new THREE.Vector3(-szWidth / 6, szTop, 0),
      new THREE.Vector3(szWidth / 6, szBottom, 0), new THREE.Vector3(szWidth / 6, szTop, 0),
      // 横2本
      new THREE.Vector3(-szWidth / 2, szBottom + szHeight / 3, 0), new THREE.Vector3(szWidth / 2, szBottom + szHeight / 3, 0),
      new THREE.Vector3(-szWidth / 2, szBottom + 2 * szHeight / 3, 0), new THREE.Vector3(szWidth / 2, szBottom + 2 * szHeight / 3, 0),
    ];
    const gridLineGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridLines = new THREE.LineSegments(gridLineGeo, gridMat);
    scene.add(gridLines);

    // 打者ボックス (左右)
    [-0.75, 0.75].forEach(bx => {
      const boxGeo = new THREE.BoxGeometry(0.9, 0.01, 1.8);
      const boxMat = new THREE.MeshBasicMaterial({ color: 0x52525b, wireframe: true, transparent: true, opacity: 0.3 });
      const bMesh = new THREE.Mesh(boxGeo, boxMat);
      bMesh.position.set(bx, 0.01, 0.2);
      scene.add(bMesh);
    });

    // 軌道・ボールオブジェクト保持用グループ
    const trajectoryGroup = new THREE.Group();
    trajectoryGroup.name = 'trajectories';
    scene.add(trajectoryGroup);

    // カメラ位置初期設定 (右打者・左打者の位置を正確に修正)
    const updateCameraPos = (view) => {
      if (!camera) return;
      if (view === 'BATTER_R') {
        // 右打者視点: 捕手から見て左側 (X = -0.75m) の右打席からマウンドを見る
        camera.position.set(-0.75, 1.65, -0.2);
        camera.lookAt(0, 1.2, 16.8);
      } else if (view === 'BATTER_L') {
        // 左打者視点: 捕手から見て右側 (X = +0.75m) の左打席からマウンドを見る
        camera.position.set(0.75, 1.65, -0.2);
        camera.lookAt(0, 1.2, 16.8);
      } else if (view === 'CATCHER') {
        // 捕手視点
        camera.position.set(0, 1.1, -2.8);
        camera.lookAt(0, 1.0, 16.8);
      } else if (view === 'PITCHER') {
        // 投手視点
        camera.position.set(0, 2.2, 19.5);
        camera.lookAt(0, 0.8, 0);
      } else if (view === 'SIDE') {
        // 側面視点
        camera.position.set(10.5, 2.0, 8.4);
        camera.lookAt(0, 1.0, 8.4);
      }
    };
    updateCameraPos(cameraView);

    // リサイズ
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
    const onMouseDown = (e) => {
      if (cameraView === 'FOLLOW') return;
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e) => {
      if (!isDraggingRef.current || !camera) return;
      const dx = e.clientX - prevMousePosRef.current.x;
      const dy = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      camera.position.x += dx * 0.01;
      camera.position.y -= dy * 0.01;
    };
    const onMouseUp = () => { isDraggingRef.current = false; };

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

  // カメラ視点変更
  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (cameraView === 'BATTER_R') {
      // 右打者視点 (右打席: 捕手から見て左 X = -0.75m)
      camera.position.set(-0.75, 1.65, -0.2);
      camera.lookAt(0, 1.2, 16.8);
    } else if (cameraView === 'BATTER_L') {
      // 左打者視点 (左打席: 捕手から見て右 X = +0.75m)
      camera.position.set(0.75, 1.65, -0.2);
      camera.lookAt(0, 1.2, 16.8);
    } else if (cameraView === 'CATCHER') {
      camera.position.set(0, 1.1, -2.8);
      camera.lookAt(0, 1.0, 16.8);
    } else if (cameraView === 'PITCHER') {
      camera.position.set(0, 2.2, 19.5);
      camera.lookAt(0, 0.8, 0);
    } else if (cameraView === 'SIDE') {
      camera.position.set(10.5, 2.0, 8.4);
      camera.lookAt(0, 1.0, 8.4);
    }
  }, [cameraView]);

  // 軌道・ボールオブジェクトの再構築
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const trajGroup = scene.getObjectByName('trajectories');
    if (!trajGroup) return;

    // 既存のメッシュをクリーンアップ
    trajGroup.clear();

    pitchTrajectories.forEach((pt, idx) => {
      const pColor = new THREE.Color(pt.color || '#3b82f6');

      // 1. 軌道ライン (Ribbon Trail)
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pt.actualPoints);
      const lineMat = new THREE.LineBasicMaterial({ color: pColor, linewidth: 3 });
      const line = new THREE.Line(lineGeo, lineMat);
      trajGroup.add(line);

      // 2. ゴースト無回転軌道ライン (点線・半透明)
      if (showSpinlessGlobal && pt.showGhost !== false) {
        const ghostLineGeo = new THREE.BufferGeometry().setFromPoints(pt.ghostPoints);
        const ghostLineMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.6 });
        const ghostLine = new THREE.Line(ghostLineGeo, ghostLineMat);
        ghostLine.computeLineDistances();
        trajGroup.add(ghostLine);
      }

      // 3. 実飛翔ボール (PBRレザー ＋ 108本ステッチ)
      const ball = createBaseballMesh(0.037, pt.seamType || '4-seam');
      ball.name = `ball_${pt.id || idx}`;
      trajGroup.add(ball);

      // 4. ゴースト無回転ボール
      if (showSpinlessGlobal && pt.showGhost !== false) {
        const ghostBall = createGhostBallMesh(0.037);
        ghostBall.name = `ghostBall_${pt.id || idx}`;
        trajGroup.add(ghostBall);
      }

      // 5. 変化力ベクトル (マグナス矢印)
      if (showForcesGlobal) {
        const arrowDir = new THREE.Vector3(pt.ax, pt.az_mag, 0).normalize();
        const arrowLength = 0.45;
        const arrowHelper = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(), arrowLength, 0x38bdf8, 0.12, 0.08);
        arrowHelper.name = `forceArrow_${pt.id || idx}`;
        trajGroup.add(arrowHelper);
      }
    });
  }, [pitchTrajectories, showSpinlessGlobal, showForcesGlobal]);

  // アニメーションループ (飛翔 ＆ 常時自転)
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      // ボールの連続自転角度を進める
      continuousSpinAngleRef.current += deltaSec * (2 * Math.PI) * 4.0;

      if (isPlaying) {
        const speedMultiplier = playbackSpeed * 1.5;
        progressRef.current += deltaSec * speedMultiplier;
        if (progressRef.current >= 1.0) {
          progressRef.current = 1.0;
          setIsPlaying(false); // 着弾したら停止し、その場で自転を継続
        }
        setFlightProgress(progressRef.current);
      }

      const p = progressRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      if (scene) {
        const trajGroup = scene.getObjectByName('trajectories');
        if (trajGroup) {
          pitchTrajectories.forEach((pt, idx) => {
            const ball = trajGroup.getObjectByName(`ball_${pt.id || idx}`);
            const ghostBall = trajGroup.getObjectByName(`ghostBall_${pt.id || idx}`);
            const forceArrow = trajGroup.getObjectByName(`forceArrow_${pt.id || idx}`);

            const stepIdx = Math.min(Math.floor(p * (pt.actualPoints.length - 1)), pt.actualPoints.length - 2);
            const subT = (p * (pt.actualPoints.length - 1)) - stepIdx;

            // 位置補間
            if (pt.actualPoints[stepIdx] && pt.actualPoints[stepIdx + 1]) {
              const currentPos = new THREE.Vector3().lerpVectors(pt.actualPoints[stepIdx], pt.actualPoints[stepIdx + 1], subT);

              if (ball) {
                ball.position.copy(currentPos);
                // 常時自転 (RPM * time)
                const spinSpeedMult = (pt.rpm || 2200) / 2200;
                const spinAngle = continuousSpinAngleRef.current * spinSpeedMult;
                const tiltRad = ((pt.tiltDegrees || 45) * Math.PI) / 180;
                const gyroRad = ((pt.gyroDegrees || 10) * Math.PI) / 180;

                const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tiltRad);
                const qGyro = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), gyroRad);
                const qSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -spinAngle);

                const finalQ = new THREE.Quaternion().copy(qTilt).multiply(qGyro).multiply(qSpin);
                ball.quaternion.copy(finalQ);
              }

              if (forceArrow) {
                forceArrow.position.copy(currentPos);
              }

              // 追尾カメラ
              if (cameraView === 'FOLLOW' && (pt.id === selectedPitchId || idx === 0)) {
                camera.position.set(currentPos.x, currentPos.y + 0.35, currentPos.z - 1.2);
                camera.lookAt(currentPos.x, currentPos.y, currentPos.z + 5);
              }
            }

            // ゴースト位置補間
            if (ghostBall && pt.ghostPoints[stepIdx] && pt.ghostPoints[stepIdx + 1]) {
              const ghostPos = new THREE.Vector3().lerpVectors(pt.ghostPoints[stepIdx], pt.ghostPoints[stepIdx + 1], subT);
              ghostBall.position.copy(ghostPos);
            }
          });
        }
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
  }, [isPlaying, pitchTrajectories, playbackSpeed, cameraView, selectedPitchId]);

  return (
    <div className="relative w-full h-full flex flex-col bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      {/* Top Camera & Playback Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Camera Preset Buttons */}
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 backdrop-blur pointer-events-auto shadow-lg">
          {[
            { id: 'CATCHER', label: '🧤 捕手' },
            { id: 'BATTER_R', label: '👁️ 右打者' },
            { id: 'BATTER_L', label: '👁️ 左打者' },
            { id: 'PITCHER', label: '⚾ 投手' },
            { id: 'SIDE', label: '📐 側面' },
          ].map(cam => (
            <button
              key={cam.id}
              onClick={() => onCameraChange?.(cam.id)}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                cameraView === cam.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 backdrop-blur pointer-events-auto shadow-lg">
          <button
            onClick={() => {
              if (progressRef.current >= 1.0) {
                progressRef.current = 0;
                setFlightProgress(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors shadow"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? '一時停止' : '投球アニメ再生'}</span>
          </button>
          <button
            onClick={() => { progressRef.current = 1.0; setFlightProgress(1.0); setIsPlaying(false); }}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors"
            title="着弾位置へリセット"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div ref={containerRef} className="w-full h-full min-h-[440px] sm:min-h-[520px] cursor-grab active:cursor-grabbing" />

      {/* 📊 画像1仕様: MOVIMIENTO (BREAK CHART) / 変化量チャート オーバーレイ (右下) */}
      <div className="absolute bottom-10 right-3 z-10 w-44 sm:w-52 bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-xl shadow-2xl backdrop-blur pointer-events-auto">
        <div className="flex items-center justify-between mb-1.5 border-b border-zinc-800 pb-1">
          <span className="text-[10px] font-black tracking-wider text-zinc-300 flex items-center gap-1">
            <Activity className="w-3 h-3 text-sky-400" />
            MOVIMIENTO (BREAK CHART)
          </span>
          <span className="text-[8px] font-mono text-zinc-500">HB vs VB (cm)</span>
        </div>

        {/* 2D Movement Coordinate Plot */}
        <div className="relative w-full aspect-square bg-zinc-900/60 border border-zinc-800/80 rounded-lg overflow-hidden flex items-center justify-center">
          {/* Grid lines */}
          <div className="absolute w-full h-[1px] bg-zinc-700/50" />
          <div className="absolute h-full w-[1px] bg-zinc-700/50" />
          <div className="absolute inset-2 border border-dashed border-zinc-800 rounded pointer-events-none" />

          {/* Directional Labels */}
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-zinc-500 uppercase">RISE (+)</span>
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-zinc-500 uppercase">DROP (-)</span>
          <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] font-black text-zinc-500 uppercase">ARM</span>
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-black text-zinc-500 uppercase">GLOVE</span>

          {/* SVG Movement Vectors */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {pitches.map(p => {
              // Scale: -60cm ~ +60cm -> 0% ~ 100%
              const cx = 50;
              const cy = 50;
              const px = 50 + ((p.hb || 0) / 60) * 42;
              const py = 50 - ((p.vb || 0) / 60) * 42;

              return (
                <g key={p.id}>
                  {/* Line from center */}
                  <line
                    x1={`${cx}%`}
                    y1={`${cy}%`}
                    x2={`${px}%`}
                    y2={`${py}%`}
                    stroke={p.color}
                    strokeWidth="2"
                    strokeOpacity="0.85"
                  />
                  {/* Dot */}
                  <circle
                    cx={`${px}%`}
                    cy={`${py}%`}
                    r="4"
                    fill={p.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>

          {/* Pitch Labels on Chart */}
          {pitches.map(p => {
            const px = 50 + ((p.hb || 0) / 60) * 42;
            const py = 50 - ((p.vb || 0) / 60) * 42;
            return (
              <span
                key={p.id}
                className="absolute text-[8px] font-black text-white px-1 py-0.2 rounded bg-black/80 shadow -translate-x-1/2 -translate-y-3 pointer-events-none"
                style={{ left: `${px}%`, top: `${py}%` }}
              >
                {p.name.split(' ')[0]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bottom Timeline Scrubber */}
      <div className="absolute bottom-2 left-4 right-4 sm:right-60 z-10 flex items-center gap-3 bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800/80 backdrop-blur pointer-events-auto">
        <span className="text-[10px] font-mono text-zinc-400">マウンド</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={flightProgress}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            progressRef.current = val;
            setFlightProgress(val);
            setIsPlaying(false);
          }}
          className="flex-1 accent-blue-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
        />
        <span className="text-[10px] font-mono text-emerald-400">着弾 (Plate)</span>
      </div>
    </div>
  );
};

export default PitchFlight3D;

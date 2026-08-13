import React, { useState } from 'react';
import { Compass, Activity, Sparkles, Layers, Plus, Trash2, Ghost, Wind, Crosshair, Spline, TrendingUp, User } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import SeamSimulator from './SeamSimulator';
import PitchFlight3D from '../components/Analysis/PitchFlight3D';

// デフォルトの初期球種セット (右投手基準)
const INITIAL_PITCHES = [
  {
    id: 'pitch_1',
    name: 'Four-Seam (直球)',
    color: '#3b82f6', // 鮮やかなブルー
    seamType: '4-seam',
    velocity: 152, // km/h
    rpm: 2400,
    tiltClock: '1:15',
    tiltDegrees: 37.5,
    gyroDegrees: 8,
    hb: 22, // cm (シュート・アーム側成分)
    vb: 45, // cm (ホップ成分)
    releasePos: { x: 0.45, y: 16.8, z: 1.85 },
    targetLocation: { x: -10, z: 92 }, // インハイ (cm)
  },
  {
    id: 'pitch_2',
    name: 'Slider (スライダー)',
    color: '#ef4444', // 鮮やかなレッド
    seamType: '4-seam',
    velocity: 138, // km/h
    rpm: 2550,
    tiltClock: '10:30',
    tiltDegrees: -45,
    gyroDegrees: 48,
    hb: -32, // cm (グローブ側へ大きくスライド)
    vb: 8, // cm (鋭く落下)
    releasePos: { x: 0.45, y: 16.8, z: 1.82 },
    targetLocation: { x: 14, z: 58 }, // アウトロー (cm)
  },
];

// 球種プリセット辞書
const PITCH_TEMPLATES = [
  { name: 'Four-Seam (4シーム直球)', seamType: '4-seam', velocity: 152, rpm: 2400, tiltClock: '1:15', tiltDegrees: 37.5, gyroDegrees: 8, hb: 22, vb: 46, color: '#3b82f6' },
  { name: '2-Seam / Sinker (ツーシーム)', seamType: '2-seam', velocity: 148, rpm: 2200, tiltClock: '2:15', tiltDegrees: 67.5, gyroDegrees: 18, hb: 38, vb: 26, color: '#f59e0b' },
  { name: '1-Seam Gyro Sinker (ワンシーム)', seamType: '1-seam', velocity: 147, rpm: 2150, tiltClock: '2:30', tiltDegrees: 75, gyroDegrees: 32, hb: 35, vb: 18, color: '#ea580c' },
  { name: 'Cutter (カットボール)', seamType: '4-seam', velocity: 144, rpm: 2480, tiltClock: '11:45', tiltDegrees: -7.5, gyroDegrees: 30, hb: -12, vb: 30, color: '#ec4899' },
  { name: 'Slider (スライダー)', seamType: '4-seam', velocity: 138, rpm: 2550, tiltClock: '10:30', tiltDegrees: -45, gyroDegrees: 48, hb: -32, vb: 8, color: '#ef4444' },
  { name: 'Sweeper (スイーパー)', seamType: '2-seam', velocity: 132, rpm: 2700, tiltClock: '9:00', tiltDegrees: -90, gyroDegrees: 25, hb: -48, vb: 2, color: '#a855f7' },
  { name: 'Curveball (カーブ)', seamType: '4-seam', velocity: 124, rpm: 2750, tiltClock: '6:30', tiltDegrees: 195, gyroDegrees: 12, hb: -20, vb: -38, color: '#10b981' },
  { name: 'ChangeUp (チェンジアップ)', seamType: '2-seam', velocity: 136, rpm: 1750, tiltClock: '2:45', tiltDegrees: 82.5, gyroDegrees: 28, hb: 36, vb: 15, color: '#06b6d4' },
  { name: 'Fork / Splitter (フォーク)', seamType: '4-seam', velocity: 139, rpm: 1300, tiltClock: '1:45', tiltDegrees: 52.5, gyroDegrees: 35, hb: 14, vb: 4, color: '#64748b' },
];

const COLOR_PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#64748b'];

const PitchingSimulator = () => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState('trajectory');

  // 投手利き腕 ('R' = 右投げ, 'L' = 左投げ)
  const [pitcherHand, setPitcherHand] = useState('R');

  // 複数球種ステート
  const [pitches, setPitches] = useState(INITIAL_PITCHES);
  const [selectedPitchId, setSelectedPitchId] = useState('pitch_1');

  // グローバルトグル
  const [showSpinless, setShowSpinless] = useState(true);
  const [showForces, setShowForces] = useState(true);
  const [showTrajLines, setShowTrajLines] = useState(true);
  const [cameraView, setCameraView] = useState('CATCHER');
  const [playbackSpeed] = useState(0.5);

  // 選択中の球種オブジェクト
  const activePitch = pitches.find(p => p.id === selectedPitchId) || pitches[0];

  // 利き腕切り替えハンドラ (リリース位置・横変化量HB・スピン傾き・コース位置を左右反転同期)
  const handlePitcherHandChange = (hand) => {
    if (hand === pitcherHand) return;
    setPitcherHand(hand);
    setPitches(prev => prev.map(p => ({
      ...p,
      hb: -(p.hb || 0), // 変化量（HB）を左右反転！
      tiltDegrees: -(p.tiltDegrees || 0), // スピンの傾き角度も反転！
      releasePos: {
        ...p.releasePos,
        x: -(p.releasePos?.x ?? 0.45), // リリース横位置も左右反転！
      },
      targetLocation: {
        ...p.targetLocation,
        x: -(p.targetLocation?.x ?? 0), // ストライクゾーンの目標X位置も左右反転！
      }
    })));
  };

  // 球種の追加
  const handleAddPitch = () => {
    if (pitches.length >= 5) return;
    const nextIdx = pitches.length;
    const template = PITCH_TEMPLATES[nextIdx % PITCH_TEMPLATES.length];
    const newColor = COLOR_PALETTE[nextIdx % COLOR_PALETTE.length];
    const defaultRelX = pitcherHand === 'R' ? 0.45 : -0.45;
    const hbVal = pitcherHand === 'L' ? -template.hb : template.hb;
    const tiltDeg = pitcherHand === 'L' ? -template.tiltDegrees : template.tiltDegrees;
    const newPitch = {
      ...template,
      id: `pitch_${Date.now()}`,
      color: newColor,
      hb: hbVal,
      tiltDegrees: tiltDeg,
      releasePos: { x: defaultRelX, y: 16.8, z: 1.85 },
      targetLocation: { x: Math.round((Math.random() - 0.5) * 24), z: Math.round(65 + Math.random() * 25) },
    };
    setPitches([...pitches, newPitch]);
    setSelectedPitchId(newPitch.id);
  };

  // 球種の削除
  const handleDeletePitch = (id) => {
    if (pitches.length <= 1) return;
    const updated = pitches.filter(p => p.id !== id);
    setPitches(updated);
    if (selectedPitchId === id) {
      setSelectedPitchId(updated[0].id);
    }
  };

  // 選択球種のパラメータ更新
  const updateActivePitch = (updates) => {
    setPitches(prev => prev.map(p => (p.id === selectedPitchId ? { ...p, ...updates } : p)));
  };

  // 選択球種のリリースポジション更新
  const updateActiveReleasePos = (key, val) => {
    setPitches(prev => prev.map(p => {
      if (p.id !== selectedPitchId) return p;
      return {
        ...p,
        releasePos: {
          ...p.releasePos,
          [key]: val
        }
      };
    }));
  };

  // テンプレートから球種を適用
  const handleApplyTemplate = (templateName) => {
    const t = PITCH_TEMPLATES.find(x => x.name === templateName);
    if (!t) return;
    const hbVal = pitcherHand === 'L' ? -t.hb : t.hb;
    const tiltDeg = pitcherHand === 'L' ? -t.tiltDegrees : t.tiltDegrees;
    updateActivePitch({
      name: t.name,
      seamType: t.seamType,
      velocity: t.velocity,
      rpm: t.rpm,
      tiltClock: t.tiltClock,
      tiltDegrees: tiltDeg,
      gyroDegrees: t.gyroDegrees,
      hb: hbVal,
      vb: t.vb,
    });
  };

  // 長方形ストライクゾーンクリックでコース指定 (X: -26~26cm, Z: 45~110cm)
  const handleZoneClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(1, clickX / rect.width));
    const normY = Math.max(0, Math.min(1, clickY / rect.height));

    const targetX = Math.round((normX - 0.5) * 56);
    const targetZ = Math.round(110 - normY * 65);

    updateActivePitch({
      targetLocation: { x: targetX, z: targetZ }
    });
  };

  // クイックコースプリセット
  const applyQuickCourse = (preset) => {
    let x = 0, z = 75;
    const isRight = pitcherHand === 'R';
    if (preset === 'IN_HIGH') { x = isRight ? -12 : 12; z = 92; } // インハイ
    else if (preset === 'OUT_HIGH') { x = isRight ? 12 : -12; z = 92; } // 外高め
    else if (preset === 'CENTER') { x = 0; z = 75; } // ど真ん中
    else if (preset === 'IN_LOW') { x = isRight ? -12 : 12; z = 58; } // インロー
    else if (preset === 'OUT_LOW') { x = isRight ? 12 : -12; z = 58; } // アウトロー
    updateActivePitch({ targetLocation: { x, z } });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-1 sm:p-4 md:p-6 select-none">
      
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-5 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            ⚾ {language === 'ja' ? '投球 ＆ シームシミュレーター' : 'Pitch & Seam Simulator'}
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 leading-relaxed">
            {language === 'ja'
              ? 'Rapsodo 3D Diamond 仕様: 右投・左投連動の完全物理弾道・球速差到達遅延・無回転ゴースト比較・変化量チャート。'
              : 'Rapsodo 3D Diamond grade: Handedness-aligned ballistics, velocity arrival times, spinless ghost ball, and break chart.'}
          </p>
        </div>

        {/* Main Mode Tabs & Pitcher Hand Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pitcher Hand Toggle (3D弾道軌道タブでのみ表示) */}
          {activeTab === 'trajectory' && (
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <span className="text-[10px] font-black text-zinc-400 px-1.5 flex items-center gap-1">
                <User className="w-3 h-3 text-blue-400" /> 投手:
              </span>
              <button
                onClick={() => handlePitcherHandChange('R')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  pitcherHand === 'R'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                右投げ (RHP)
              </button>
              <button
                onClick={() => handlePitcherHandChange('L')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  pitcherHand === 'L'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                左投げ (LHP)
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-muted p-1 rounded-xl border border-border shrink-0">
            <button
              onClick={() => setActiveTab('trajectory')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${
                activeTab === 'trajectory'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>3D 弾道軌道</span>
            </button>

            <button
              onClick={() => setActiveTab('seam')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-xs transition-all cursor-pointer ${
                activeTab === 'seam'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span>3D 縫い目・回転</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Display */}
      {activeTab === 'seam' ? (
        /* 🌀 3D SEAM & SPIN SIMULATOR */
        <SeamSimulator />
      ) : (
        /* 🚀 REVOLUTIONARY 3D PITCH FLIGHT SIMULATOR */
        <div className="space-y-4">
          
          {/* Multi-Pitch Bar & Global Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 backdrop-blur shadow-md">
            
            {/* Pitch Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> 球種:
              </span>
              
              {pitches.map((p) => {
                const isSelected = p.id === selectedPitchId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPitchId(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black cursor-pointer transition-all ${
                      isSelected
                        ? 'border-white/50 text-white shadow-lg scale-[1.02]'
                        : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                    style={{ backgroundColor: isSelected ? p.color : undefined }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isSelected ? '#ffffff' : p.color }} />
                    <span>{p.name.split(' ')[0]}</span>
                    <span className="font-mono text-[10px] opacity-80">{p.velocity}k</span>
                    
                    {pitches.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePitch(p.id);
                        }}
                        className="ml-1 text-white/60 hover:text-white hover:bg-black/20 rounded p-0.5"
                        title="球種を削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {pitches.length < 5 && (
                <button
                  onClick={handleAddPitch}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-zinc-700 hover:border-blue-500 bg-zinc-950/40 text-zinc-400 hover:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>球種追加</span>
                </button>
              )}
            </div>

            {/* Global Visual Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTrajLines(!showTrajLines)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  showTrajLines
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="投球軌道ラインの表示・非表示を切り替え"
              >
                <Spline className="w-3.5 h-3.5 text-blue-400" />
                <span>軌道ライン</span>
              </button>

              <button
                onClick={() => setShowSpinless(!showSpinless)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  showSpinless
                    ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="回転なし（重力のみ）の落下軌道ゴーストボールを表示"
              >
                <Ghost className="w-3.5 h-3.5 text-sky-400" />
                <span>無回転比較</span>
              </button>

              <button
                onClick={() => setShowForces(!showForces)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  showForces
                    ? 'bg-indigo-950/80 border-indigo-500 text-indigo-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="マグナス＆シーム変化力ベクトル（3D矢印）を表示"
              >
                <Wind className="w-3.5 h-3.5 text-indigo-400" />
                <span>変化力ベクトル</span>
              </button>
            </div>
          </div>

          {/* Main 3D Canvas & Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: 3D Flight Viewport & Break Chart Below (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              {/* 3D Canvas */}
              <div className="min-h-[460px] sm:min-h-[520px]">
                <PitchFlight3D
                  pitches={pitches}
                  selectedPitchId={selectedPitchId}
                  showSpinlessGlobal={showSpinless}
                  showForcesGlobal={showForces}
                  showTrajLinesGlobal={showTrajLines}
                  cameraView={cameraView}
                  onCameraChange={setCameraView}
                  playbackSpeed={playbackSpeed}
                  pitcherHand={pitcherHand}
                />
              </div>

              {/* 📊 MOVIMIENTO (BREAK CHART) / 変化量チャート */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    <h3 className="font-black text-xs sm:text-sm text-zinc-200">
                      MOVIMIENTO (BREAK CHART) / 変化量チャート
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    捕手視点基準 (HB vs VB cm)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  
                  {/* 2D Break Scatter Plot (5 Columns) */}
                  <div className="sm:col-span-5 max-w-[220px] mx-auto w-full aspect-square bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative flex items-center justify-center shadow-inner">
                    {/* Grid axes */}
                    <div className="absolute w-full h-[1px] bg-zinc-700/60" />
                    <div className="absolute h-full w-[1px] bg-zinc-700/60" />
                    <div className="absolute inset-3 border border-dashed border-zinc-800/80 rounded pointer-events-none" />

                    {/* Labels */}
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-zinc-500">RISE (+)</span>
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-black text-zinc-500">DROP (-)</span>
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-500">- HB (左)</span>
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-zinc-500">+ HB (右)</span>

                    {/* Vector Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {pitches.map(p => {
                        const cx = 50;
                        const cy = 50;
                        const px = 50 + ((p.hb || 0) / 60) * 42;
                        const py = 50 - ((p.vb || 0) / 60) * 42;
                        return (
                          <g key={p.id}>
                            <line
                              x1={`${cx}%`}
                              y1={`${cy}%`}
                              x2={`${px}%`}
                              y2={`${py}%`}
                              stroke={p.color}
                              strokeWidth="2.5"
                              strokeOpacity="0.9"
                            />
                            <circle
                              cx={`${px}%`}
                              cy={`${py}%`}
                              r="4.5"
                              fill={p.color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Dots Labels */}
                    {pitches.map(p => {
                      const px = 50 + ((p.hb || 0) / 60) * 42;
                      const py = 50 - ((p.vb || 0) / 60) * 42;
                      return (
                        <span
                          key={p.id}
                          className="absolute text-[8px] font-black text-white px-1 py-0.2 rounded bg-black/90 shadow -translate-x-1/2 -translate-y-3.5 pointer-events-none border border-white/20"
                          style={{ left: `${px}%`, top: `${py}%` }}
                        >
                          {p.name.split(' ')[0]}
                        </span>
                      );
                    })}
                  </div>

                  {/* Summary Metric Table (7 Columns) */}
                  <div className="sm:col-span-7 space-y-1.5">
                    <div className="grid grid-cols-5 text-[10px] font-black text-zinc-400 border-b border-zinc-800 pb-1">
                      <span className="col-span-2">球種</span>
                      <span className="text-right">球速</span>
                      <span className="text-right">縦(VB)</span>
                      <span className="text-right">横(HB)</span>
                    </div>

                    {pitches.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPitchId(p.id)}
                        className={`grid grid-cols-5 text-xs font-mono font-bold p-1.5 rounded-lg cursor-pointer transition-all ${
                          p.id === selectedPitchId ? 'bg-zinc-800 text-white border border-white/20' : 'text-zinc-300 hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className="col-span-2 flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-sans font-black truncate">{p.name.split(' ')[0]}</span>
                        </span>
                        <span className="text-right text-blue-400">{p.velocity}k</span>
                        <span className="text-right text-amber-400">{p.vb > 0 ? `+${p.vb}` : p.vb}cm</span>
                        <span className="text-right text-purple-400">{p.hb > 0 ? `+${p.hb}` : p.hb}cm</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>

            {/* Right: Controls & Strike Zone Target Picker (5 Columns) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* 🎯 1. 正統派プロポーション・ストライクゾーン（狙い撃ち・コース指定） */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs sm:text-sm text-zinc-200 flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-red-500" />
                    <span>コース指定 (Strike Zone)</span>
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
                    X: {activePitch.targetLocation?.x}cm / Z: {activePitch.targetLocation?.z}cm
                  </span>
                </div>

                {/* 2D Clean Rectangular Strike Zone Map (適切な縦横比率 4:5) */}
                <div
                  onClick={handleZoneClick}
                  className="relative w-full max-w-[240px] mx-auto aspect-[4/5] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden cursor-crosshair flex items-center justify-center shadow-inner hover:border-zinc-700 transition-all p-3"
                >
                  <div className="absolute inset-2 border border-dashed border-zinc-800/80 rounded pointer-events-none" />

                  <div className="relative w-4/5 h-4/5 border-2 border-red-500/80 bg-red-500/5 grid grid-cols-3 grid-rows-3 rounded pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-red-500/25 flex items-center justify-center text-[9px] text-red-500/20 font-mono font-bold">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  <div className="absolute bottom-1 w-10 h-2 bg-zinc-700/60 clip-home-plate pointer-events-none" />

                  {/* All Pitch Target Pins */}
                  {pitches.map(p => {
                    const isCur = p.id === selectedPitchId;
                    const leftPct = ((p.targetLocation?.x || 0) + 28) / 56 * 100;
                    const topPct = (110 - (p.targetLocation?.z || 75)) / 65 * 100;

                    return (
                      <div
                        key={p.id}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transition-transform ${
                          isCur ? 'scale-125 z-20 animate-pulse' : 'scale-100 z-10 opacity-75'
                        }`}
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[8px] font-black text-white"
                          style={{ backgroundColor: p.color }}
                        >
                          ●
                        </div>
                        <span className="text-[8px] font-mono font-bold text-white px-1 rounded bg-black/80 mt-0.5 whitespace-nowrap">
                          {p.name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Target Buttons */}
                <div className="grid grid-cols-5 gap-1 text-[10px] font-bold">
                  {[
                    { id: 'IN_HIGH', label: 'インハイ' },
                    { id: 'OUT_HIGH', label: '外高め' },
                    { id: 'CENTER', label: '真ん中' },
                    { id: 'IN_LOW', label: 'インロー' },
                    { id: 'OUT_LOW', label: 'アウトロー' },
                  ].map(q => (
                    <button
                      key={q.id}
                      onClick={() => applyQuickCourse(q.id)}
                      className="py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer text-center"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ⚙️ 2. 選択球種のパラメータ設定 */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl shadow-lg space-y-3.5">
                
                {/* Header & Template Selector */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activePitch.color }} />
                    <span className="font-black text-xs text-zinc-200">{activePitch.name}</span>
                  </div>

                  <select
                    value=""
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-bold rounded-lg px-2 py-1 cursor-pointer"
                  >
                    <option value="">-- 球種プリセット --</option>
                    {PITCH_TEMPLATES.map(t => (
                      <option key={t.name} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sliders */}
                <div className="space-y-2.5 text-xs">
                  
                  {/* 球速 & 回転数 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span>球速</span>
                        <span className="font-mono font-bold text-blue-400">{activePitch.velocity} km/h</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="165"
                        value={activePitch.velocity}
                        onChange={(e) => updateActivePitch({ velocity: parseFloat(e.target.value) })}
                        className="w-full accent-blue-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span>回転数 (RPM)</span>
                        <span className="font-mono font-bold text-emerald-400">{activePitch.rpm}</span>
                      </div>
                      <input
                        type="range"
                        min="800"
                        max="3200"
                        step="50"
                        value={activePitch.rpm}
                        onChange={(e) => updateActivePitch({ rpm: parseInt(e.target.value) })}
                        className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 変化量 (VB & HB) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span>縦変化 (VB)</span>
                        <span className="font-mono font-bold text-amber-400">{activePitch.vb > 0 ? `+${activePitch.vb}` : activePitch.vb} cm</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="65"
                        value={activePitch.vb}
                        onChange={(e) => updateActivePitch({ vb: parseFloat(e.target.value) })}
                        className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span>横変化 (HB)</span>
                        <span className="font-mono font-bold text-purple-400">{activePitch.hb > 0 ? `+${activePitch.hb}` : activePitch.hb} cm</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={activePitch.hb}
                        onChange={(e) => updateActivePitch({ hb: parseFloat(e.target.value) })}
                        className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* リリース位置情報 (高さ & 横位置) */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800/80">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span>リリース高さ</span>
                        <span className="font-mono font-bold text-sky-400">{(activePitch.releasePos?.z ?? 1.85).toFixed(2)} m</span>
                      </div>
                      <input
                        type="range"
                        min="1.40"
                        max="2.20"
                        step="0.02"
                        value={activePitch.releasePos?.z ?? 1.85}
                        onChange={(e) => updateActiveReleasePos('z', parseFloat(e.target.value))}
                        className="w-full accent-sky-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-0.5">
                        <span>リリース横位置</span>
                        <span className="font-mono font-bold text-cyan-400">
                          {(activePitch.releasePos?.x ?? (pitcherHand === 'R' ? 0.45 : -0.45)) > 0
                            ? `右腕一塁側 +${(Math.abs(activePitch.releasePos?.x ?? 0.45)).toFixed(2)}m`
                            : `左腕三塁側 -${(Math.abs(activePitch.releasePos?.x ?? -0.45)).toFixed(2)}m`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-0.90"
                        max="0.90"
                        step="0.02"
                        value={activePitch.releasePos?.x ?? (pitcherHand === 'R' ? 0.45 : -0.45)}
                        onChange={(e) => updateActiveReleasePos('x', parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* シームタイプ */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-400">シーム姿勢:</span>
                    <div className="flex gap-1">
                      {['4-seam', '2-seam', '1-seam'].map(st => (
                        <button
                          key={st}
                          onClick={() => updateActivePitch({ seamType: st })}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                            activePitch.seamType === st
                              ? 'bg-blue-600 border-blue-500 text-white shadow'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {st.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitchingSimulator;

import React, { useState } from 'react';
import { Compass, Activity, Sparkles, Layers, Plus, Trash2, Ghost, Wind, Crosshair } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import SeamSimulator from './SeamSimulator';
import PitchFlight3D from '../components/Analysis/PitchFlight3D';

// デフォルトの初期球種セット
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
    hb: 22, // cm (シュート成分)
    vb: 45, // cm (ホップ成分)
    releasePos: { x: -0.45, y: 16.8, z: 1.85 },
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
    hb: -32, // cm (グローブ側へスライド)
    vb: 8, // cm (重力で大きく落下)
    releasePos: { x: -0.45, y: 16.8, z: 1.82 },
    targetLocation: { x: 16, z: 58 }, // アウトロー (cm)
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
  // 'seam' (3D 縫い目・回転) または 'trajectory' (3D 弾道軌道)
  const [activeTab, setActiveTab] = useState('trajectory');

  // 複数球種ステート
  const [pitches, setPitches] = useState(INITIAL_PITCHES);
  const [selectedPitchId, setSelectedPitchId] = useState('pitch_1');

  // グローバルトグル
  const [showSpinless, setShowSpinless] = useState(true);
  const [showForces, setShowForces] = useState(true);
  const [cameraView, setCameraView] = useState('CATCHER');
  const [playbackSpeed, setPlaybackSpeed] = useState(0.4);

  // 選択中の球種オブジェクト
  const activePitch = pitches.find(p => p.id === selectedPitchId) || pitches[0];

  // 球種の追加
  const handleAddPitch = () => {
    if (pitches.length >= 5) return;
    const nextIdx = pitches.length;
    const template = PITCH_TEMPLATES[nextIdx % PITCH_TEMPLATES.length];
    const newColor = COLOR_PALETTE[nextIdx % COLOR_PALETTE.length];
    const newPitch = {
      ...template,
      id: `pitch_${Date.now()}`,
      color: newColor,
      releasePos: { x: -0.45, y: 16.8, z: 1.85 },
      targetLocation: { x: Math.round((Math.random() - 0.5) * 30), z: Math.round(60 + Math.random() * 30) },
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

  // テンプレートから球種を適用
  const handleApplyTemplate = (templateName) => {
    const t = PITCH_TEMPLATES.find(x => x.name === templateName);
    if (!t) return;
    updateActivePitch({
      name: t.name,
      seamType: t.seamType,
      velocity: t.velocity,
      rpm: t.rpm,
      tiltClock: t.tiltClock,
      tiltDegrees: t.tiltDegrees,
      gyroDegrees: t.gyroDegrees,
      hb: t.hb,
      vb: t.vb,
    });
  };

  // 長方形ストライクゾーンクリックでコース指定 (X: -30~30cm, Z: 40~110cm)
  const handleZoneClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 正規化 (0 ~ 1)
    const normX = Math.max(0, Math.min(1, clickX / rect.width));
    const normY = Math.max(0, Math.min(1, clickY / rect.height));

    // cm変換 (ゾーン表示枠: -30cm ~ +30cm, ゾーン高: 40cm ~ 115cm)
    const targetX = Math.round((normX - 0.5) * 60);
    const targetZ = Math.round(115 - normY * 75);

    updateActivePitch({
      targetLocation: { x: targetX, z: targetZ }
    });
  };

  // クイックコースプリセット
  const applyQuickCourse = (preset) => {
    let x = 0, z = 75;
    if (preset === 'IN_HIGH') { x = -14; z = 95; }
    else if (preset === 'OUT_HIGH') { x = 14; z = 95; }
    else if (preset === 'IN_LOW') { x = -14; z = 55; }
    else if (preset === 'OUT_LOW') { x = 14; z = 55; }
    else if (preset === 'CENTER') { x = 0; z = 75; }
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
              ? 'Rapsodo 3D Diamond 仕様: リアル自転飛翔・無回転ゴースト比較・変化量チャート・直感長方形ゾーンコース指定。'
              : 'Rapsodo 3D Diamond grade: Real spinning flight, spinless ghost ball, break chart, and rectangular strike zone target picker.'}
          </p>
        </div>

        {/* Main Mode Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 bg-muted p-1 sm:p-1.5 rounded-xl border border-border shrink-0">
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
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
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
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

      {/* Content Display */}
      {activeTab === 'seam' ? (
        /* 🌀 3D SEAM & SPIN SIMULATOR */
        <SeamSimulator />
      ) : (
        /* 🚀 REVOLUTIONARY 3D PITCH FLIGHT SIMULATOR */
        <div className="space-y-4">
          
          {/* Multi-Pitch Bar & Global Toggles (スッキリした球種タブ) */}
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
            
            {/* 3D Flight Viewport (8 Columns) */}
            <div className="lg:col-span-8 min-h-[460px] sm:min-h-[540px]">
              <PitchFlight3D
                pitches={pitches}
                selectedPitchId={selectedPitchId}
                onSelectPitch={setSelectedPitchId}
                showSpinlessGlobal={showSpinless}
                showForcesGlobal={showForces}
                cameraView={cameraView}
                onCameraChange={setCameraView}
                playbackSpeed={playbackSpeed}
              />
            </div>

            {/* Controls & Strike Zone Target Picker (4 Columns) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* 🎯 1. 正統派長方形ストライクゾーン（狙い撃ち・コース指定） */}
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

                {/* 2D Clean Rectangular Strike Zone Map */}
                <div
                  onClick={handleZoneClick}
                  className="relative w-full max-w-[260px] mx-auto aspect-[3/4] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden cursor-crosshair flex items-center justify-center shadow-inner hover:border-zinc-700 transition-all p-3"
                >
                  {/* Outer Ball Zone Margin */}
                  <div className="absolute inset-2 border border-dashed border-zinc-800/80 rounded pointer-events-none" />

                  {/* 3x3 Official Vertical Strike Zone (長方形 43cm x 60cm 比率) */}
                  <div className="relative w-4/5 h-4/5 border-2 border-red-500/80 bg-red-500/5 grid grid-cols-3 grid-rows-3 rounded pointer-events-none shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="border border-red-500/25 flex items-center justify-center text-[9px] text-red-500/20 font-mono font-bold">
                        {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* Home Plate Icon at Bottom */}
                  <div className="absolute bottom-1 w-10 h-2 bg-zinc-700/60 clip-home-plate pointer-events-none" />

                  {/* All Pitch Target Pins */}
                  {pitches.map(p => {
                    const isCur = p.id === selectedPitchId;
                    // X: -30 ~ +30 -> 0% ~ 100%
                    const leftPct = ((p.targetLocation?.x || 0) + 30) / 60 * 100;
                    // Z: 40 ~ 115 -> 100% ~ 0%
                    const topPct = (115 - (p.targetLocation?.z || 75)) / 75 * 100;

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

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  Layers, 
  Sliders, 
  Sparkles, 
  ArrowRightLeft, 
  Info,
  Clock,
  Compass,
  Gauge,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { SingleBallCanvas, PITCH_PRESETS } from '../components/RapsodoSeamViewer';

export const SeamSimulator = ({ showHeader = false }) => {
  // Global View & Playback Controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.04);
  const [viewAngle, setViewAngle] = useState('pitcher'); // 'catcher', 'pitcher', 'side', 'top'
  const [resetKey, setResetKey] = useState(0);

  // Ball A Settings (Left) - 初期位置基準
  const [ballA, setBallA] = useState({
    name: '4-Seam Fastball',
    seamType: '4-seam',
    rpm: 2200,
    tiltClock: '12:00',
    tiltDegrees: 0,
    gyroDegrees: 0,
  });

  // Ball B Settings (Right) - 初期位置基準
  const [ballB, setBallB] = useState({
    name: '1-Seam Sinker',
    seamType: '1-seam',
    rpm: 2200,
    tiltClock: '12:00',
    tiltDegrees: 0,
    gyroDegrees: 0,
  });

  // Apply Preset to Ball
  const applyPreset = (target, preset) => {
    const updated = {
      name: preset.name,
      seamType: preset.seamType,
      rpm: preset.rpm,
      tiltClock: preset.tiltClock,
      tiltDegrees: preset.tiltDegrees,
      gyroDegrees: preset.gyroDegrees,
    };
    if (target === 'A') setBallA(prev => ({ ...prev, ...updated }));
    else setBallB(prev => ({ ...prev, ...updated }));
  };

  // Convert degrees (-180〜180) to clock string
  const degToClock = (deg) => {
    const normalized = ((deg % 360) + 360) % 360;
    const totalMin = (normalized / 30) * 60;
    const h = Math.floor(totalMin / 60) || 12;
    const m = Math.round((totalMin % 60) / 15) * 15;
    return `${h === 0 ? 12 : h}:${m === 0 ? '00' : m}`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-foreground">
      
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Rapsodo 3D Model
          </span>
          <span className="text-xs sm:text-sm font-bold text-foreground">
            4シーム・2シーム・1シーム リアルタイム2球比較
          </span>
        </div>

        {/* Global Playback Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? '一時停止' : '回転再生'}</span>
          </button>

          {/* Reset button (初期位置・角度0°・自転角0に完全リセット) */}
          <button
            onClick={() => {
              setBallA(prev => ({
                ...prev,
                name: prev.seamType === '1-seam' ? '1-Seam Sinker' : (prev.seamType === '2-seam' ? '2-Seam / Sinker' : '4-Seam Fastball'),
                rpm: 2200,
                tiltClock: '12:00',
                tiltDegrees: 0,
                gyroDegrees: 0,
              }));
              setBallB(prev => ({
                ...prev,
                name: prev.seamType === '1-seam' ? '1-Seam Sinker' : (prev.seamType === '4-seam' ? '4-Seam Fastball' : '2-Seam / Sinker'),
                rpm: 2200,
                tiltClock: '12:00',
                tiltDegrees: 0,
                gyroDegrees: 0,
              }));
              setViewAngle('pitcher');
              setResetKey(prev => prev + 1);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all cursor-pointer shadow-sm"
            title="すべての設定を基準初期位置（2200 RPM, 12:00, 0°）にリセット"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>初期位置に戻す</span>
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-[11px]">
            <span className="text-zinc-500 font-bold">回転速度:</span>
            {[
              { val: 0.04, label: '標準' },
              { val: 0.015, label: 'スロー' },
              { val: 0.005, label: 'コマ送り' }
            ].map(s => (
              <button
                key={s.val}
                onClick={() => setPlaybackSpeed(s.val)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                  playbackSpeed === s.val
                    ? 'bg-blue-600 text-white font-extrabold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* View angle selector */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-[11px]">
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={viewAngle}
              onChange={(e) => setViewAngle(e.target.value)}
              className="bg-transparent text-zinc-200 text-[11px] font-bold outline-none cursor-pointer"
            >
              <option value="pitcher">投手視点 (ラプソード基準)</option>
              <option value="catcher">捕手視点 (背面から見た鏡像)</option>
              <option value="side">側面視点 (三塁側)</option>
              <option value="top">真上視点 (天頂)</option>
            </select>
          </div>
        </div>

        {viewAngle === 'catcher' && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 mt-1 sm:mt-0">
            <Info className="w-3 h-3 shrink-0" />
            <span>捕手視点は投手視点の反対側から見た鏡像のため、回転方向が逆に見えます（仕様通りです）</span>
          </div>
        )}
      </div>

      {/* Main 2-Ball 3D Comparison Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ========================================================
            BALL A (LEFT)
           ======================================================== */}
        <div className="flex flex-col gap-4 bg-card/80 p-4 sm:p-5 rounded-2xl border border-border shadow-lg">
          {/* 3D Canvas A */}
          <div className="w-full h-[380px] sm:h-[420px]">
            <SingleBallCanvas
              seamType={ballA.seamType}
              rpm={ballA.rpm}
              tiltClock={ballA.tiltClock}
              tiltDegrees={ballA.tiltDegrees}
              gyroDegrees={ballA.gyroDegrees}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              viewAngle={viewAngle}
              title="Ball A"
              accentColor="#3b82f6"
              resetKey={resetKey}
            />
          </div>

          {/* Controller Panel A */}
          <div className="space-y-4 bg-muted/40 p-4 rounded-xl border border-border/80">
            {/* Preset Selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 球種プリセット (Ball A)
              </span>
              <select
                value=""
                onChange={(e) => {
                  const p = PITCH_PRESETS.find(x => x.name === e.target.value);
                  if (p) applyPreset('A', p);
                }}
                className="bg-zinc-900 border border-border text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-bold cursor-pointer"
              >
                <option value="">-- プリセットを選択 --</option>
                {PITCH_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Seam Type Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> シームタイプ:
              </span>
              <div className="flex items-center gap-1">
                {['4-seam', '2-seam', '1-seam'].map(st => (
                  <button
                    key={st}
                    onClick={() => setBallA(prev => ({ ...prev, seamType: st }))}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      ballA.seamType === st
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {st.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders for Ball A */}
            <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
              {/* RPM */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-emerald-400" /> 回転数 (RPM)
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{ballA.rpm} RPM</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="3200"
                  step="50"
                  value={ballA.rpm}
                  onChange={(e) => setBallA(prev => ({ ...prev, rpm: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Tilt */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> チルト (スピン軸傾斜)
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {ballA.tiltClock} ({ballA.tiltDegrees}°)
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="7.5"
                  value={ballA.tiltDegrees}
                  onChange={(e) => {
                    const deg = parseFloat(e.target.value);
                    setBallA(prev => ({
                      ...prev,
                      tiltDegrees: deg,
                      tiltClock: degToClock(deg),
                    }));
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Gyro Degree */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Compass className="w-3 h-3 text-purple-400" /> ジャイロ角 (曲がり方向)
                  </span>
                  <span className="font-mono font-bold text-purple-400">
                    {ballA.gyroDegrees > 0 ? `+${ballA.gyroDegrees}° (左曲がり)` : ballA.gyroDegrees < 0 ? `${ballA.gyroDegrees}° (右曲がり)` : '0° (純縦回転)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="1"
                  value={ballA.gyroDegrees}
                  onChange={(e) => setBallA(prev => ({ ...prev, gyroDegrees: parseInt(e.target.value) }))}
                  className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            BALL B (RIGHT)
           ======================================================== */}
        <div className="flex flex-col gap-4 bg-card/80 p-4 sm:p-5 rounded-2xl border border-border shadow-lg">
          {/* 3D Canvas B */}
          <div className="w-full h-[380px] sm:h-[420px]">
            <SingleBallCanvas
              seamType={ballB.seamType}
              rpm={ballB.rpm}
              tiltClock={ballB.tiltClock}
              tiltDegrees={ballB.tiltDegrees}
              gyroDegrees={ballB.gyroDegrees}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              viewAngle={viewAngle}
              title="Ball B"
              accentColor="#ea580c"
              resetKey={resetKey}
            />
          </div>

          {/* Controller Panel B */}
          <div className="space-y-4 bg-muted/40 p-4 rounded-xl border border-border/80">
            {/* Preset Selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-orange-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> 球種プリセット (Ball B)
              </span>
              <select
                value=""
                onChange={(e) => {
                  const p = PITCH_PRESETS.find(x => x.name === e.target.value);
                  if (p) applyPreset('B', p);
                }}
                className="bg-zinc-900 border border-border text-zinc-200 text-xs rounded-lg px-2.5 py-1 font-bold cursor-pointer"
              >
                <option value="">-- プリセットを選択 --</option>
                {PITCH_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Seam Type Switcher */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-orange-400" /> シームタイプ:
              </span>
              <div className="flex items-center gap-1">
                {['4-seam', '2-seam', '1-seam'].map(st => (
                  <button
                    key={st}
                    onClick={() => setBallB(prev => ({ ...prev, seamType: st }))}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      ballB.seamType === st
                        ? 'bg-orange-600 text-white shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {st.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders for Ball B */}
            <div className="space-y-3 pt-2 border-t border-border/60 text-xs">
              {/* RPM */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-emerald-400" /> 回転数 (RPM)
                  </span>
                  <span className="font-mono font-bold text-emerald-400">{ballB.rpm} RPM</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="3200"
                  step="50"
                  value={ballB.rpm}
                  onChange={(e) => setBallB(prev => ({ ...prev, rpm: parseInt(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Tilt */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> チルト (スピン軸傾斜)
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    {ballB.tiltClock} ({ballB.tiltDegrees}°)
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="7.5"
                  value={ballB.tiltDegrees}
                  onChange={(e) => {
                    const deg = parseFloat(e.target.value);
                    setBallB(prev => ({
                      ...prev,
                      tiltDegrees: deg,
                      tiltClock: degToClock(deg),
                    }));
                  }}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Gyro Degree */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Compass className="w-3 h-3 text-purple-400" /> ジャイロ角 (曲がり方向)
                  </span>
                  <span className="font-mono font-bold text-purple-400">
                    {ballB.gyroDegrees > 0 ? `+${ballB.gyroDegrees}° (左曲がり)` : ballB.gyroDegrees < 0 ? `${ballB.gyroDegrees}° (右曲がり)` : '0° (純縦回転)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="1"
                  value={ballB.gyroDegrees}
                  onChange={(e) => setBallB(prev => ({ ...prev, gyroDegrees: parseInt(e.target.value) }))}
                  className="w-full accent-purple-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SeamSimulator;

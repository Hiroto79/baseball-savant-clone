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
  const [playbackSpeed, setPlaybackSpeed] = useState(0.25);
  const [viewAngle, setViewAngle] = useState('catcher'); // 'catcher', 'pitcher', 'side', 'top'

  // Ball A Settings (Left)
  const [ballA, setBallA] = useState({
    name: '4-Seam Fastball',
    seamType: '4-seam',
    rpm: 2400,
    tiltClock: '1:15',
    tiltDegrees: 37.5,
    gyroDegrees: 10,
    arm: 'R'
  });

  // Ball B Settings (Right)
  const [ballB, setBallB] = useState({
    name: '2-Seam / Sinker',
    seamType: '2-seam',
    rpm: 2250,
    tiltClock: '2:15',
    tiltDegrees: 67.5,
    gyroDegrees: 25,
    arm: 'R'
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

  // Convert degrees to clock string (e.g. 45 -> 1:30)
  const degToClock = (deg) => {
    const totalMin = (deg / 30) * 60;
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

          {/* Speed selector */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-[11px] font-mono">
            <span className="text-zinc-500 font-bold">速度:</span>
            {[
              { val: 1.0, label: '1.0x (等速)' },
              { val: 0.5, label: '0.5x' },
              { val: 0.25, label: '0.25x' },
              { val: 0.1, label: '0.1x (スロー)' }
            ].map(s => (
              <button
                key={s.val}
                onClick={() => setPlaybackSpeed(s.val)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
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
              <option value="catcher">捕手視点 (正面)</option>
              <option value="pitcher">投手視点 (背面)</option>
              <option value="side">側面視点 (三塁側)</option>
              <option value="top">真上視点 (天頂)</option>
            </select>
          </div>
        </div>
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
              arm={ballA.arm}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              viewAngle={viewAngle}
              title="Ball A"
              accentColor="#3b82f6"
            />
          </div>

          {/* Controller Panel A */}
          <div className="space-y-4 bg-muted/40 p-4 rounded-xl border border-border/80">
            {/* Preset Selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-blue-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                球種プリセット
              </span>
              <select
                onChange={(e) => {
                  const p = PITCH_PRESETS.find(x => x.name === e.target.value);
                  if (p) applyPreset('A', p);
                }}
                className="bg-card border border-border text-foreground text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="">-- プリセットから選ぶ --</option>
                {PITCH_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 1. Seam Type Preset (4 / 2 / 1 Seam) */}
            <div>
              <label className="text-xs font-bold text-muted-foreground flex items-center justify-between mb-1.5">
                <span>① シームの初期姿勢 (InitRotation)</span>
                <span className="text-blue-400 font-mono">{ballA.seamType.toUpperCase()}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '4-seam', label: '4シーム (4-Seam)', desc: '馬蹄形正面' },
                  { id: '2-seam', label: '2シーム (2-Seam)', desc: '平らな面正面' },
                  { id: '1-seam', label: '1シーム (1-Seam)', desc: '極近く斜め' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setBallA(prev => ({ ...prev, seamType: s.id }))}
                    className={`py-2 px-2 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                      ballA.seamType === s.id
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.02]'
                        : 'bg-card text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    <div>{s.label}</div>
                    <div className="text-[9px] opacity-75 font-normal">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. RPM Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  回転数 (RPM)
                </span>
                <span className="font-mono text-emerald-400">{ballA.rpm} RPM</span>
              </div>
              <input
                type="range"
                min="800"
                max="3200"
                step="50"
                value={ballA.rpm}
                onChange={(e) => setBallA(prev => ({ ...prev, rpm: parseInt(e.target.value, 10) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            {/* 3. Spin Axis (Tilt) */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  回転軸の向き (Tilt / 時計の針)
                </span>
                <span className="font-mono text-sky-400">{ballA.tiltClock} ({Math.round(ballA.tiltDegrees)}°)</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="7.5"
                value={ballA.tiltDegrees}
                onChange={(e) => {
                  const deg = parseFloat(e.target.value);
                  setBallA(prev => ({
                    ...prev,
                    tiltDegrees: deg,
                    tiltClock: degToClock(deg)
                  }));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                <span>12:00 (0°)</span>
                <span>3:00 (90°)</span>
                <span>6:00 (180°)</span>
                <span>9:00 (270°)</span>
                <span>12:00 (360°)</span>
              </div>
            </div>

            {/* 4. Gyro Angle (0° ~ 90°) */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-yellow-400" />
                  ジャイロ角 (Gyro Angle / 効率)
                </span>
                <span className="font-mono text-yellow-400">
                  {ballA.gyroDegrees}° (スピン効率: {Math.round(Math.cos((ballA.gyroDegrees * Math.PI) / 180) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={ballA.gyroDegrees}
                onChange={(e) => setBallA(prev => ({ ...prev, gyroDegrees: parseInt(e.target.value, 10) }))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                <span>0° (100% 垂直)</span>
                <span>45° (71% 斜め)</span>
                <span>90° (0% ライフル)</span>
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
              arm={ballB.arm}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              viewAngle={viewAngle}
              title="Ball B"
              accentColor="#f59e0b"
            />
          </div>

          {/* Controller Panel B */}
          <div className="space-y-4 bg-muted/40 p-4 rounded-xl border border-border/80">
            {/* Preset Selector */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                球種プリセット
              </span>
              <select
                onChange={(e) => {
                  const p = PITCH_PRESETS.find(x => x.name === e.target.value);
                  if (p) applyPreset('B', p);
                }}
                className="bg-card border border-border text-foreground text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="">-- プリセットから選ぶ --</option>
                {PITCH_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 1. Seam Type Preset (4 / 2 / 1 Seam) */}
            <div>
              <label className="text-xs font-bold text-muted-foreground flex items-center justify-between mb-1.5">
                <span>① シームの初期姿勢 (InitRotation)</span>
                <span className="text-amber-400 font-mono">{ballB.seamType.toUpperCase()}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '4-seam', label: '4シーム (4-Seam)', desc: '馬蹄形正面' },
                  { id: '2-seam', label: '2シーム (2-Seam)', desc: '平らな面正面' },
                  { id: '1-seam', label: '1シーム (1-Seam)', desc: '極近く斜め' },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setBallB(prev => ({ ...prev, seamType: s.id }))}
                    className={`py-2 px-2 rounded-lg text-xs font-bold text-center border transition-all cursor-pointer ${
                      ballB.seamType === s.id
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md scale-[1.02]'
                        : 'bg-card text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    <div>{s.label}</div>
                    <div className="text-[9px] opacity-75 font-normal">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. RPM Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  回転数 (RPM)
                </span>
                <span className="font-mono text-emerald-400">{ballB.rpm} RPM</span>
              </div>
              <input
                type="range"
                min="800"
                max="3200"
                step="50"
                value={ballB.rpm}
                onChange={(e) => setBallB(prev => ({ ...prev, rpm: parseInt(e.target.value, 10) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* 3. Spin Axis (Tilt) */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  回転軸の向き (Tilt / 時計の針)
                </span>
                <span className="font-mono text-sky-400">{ballB.tiltClock} ({Math.round(ballB.tiltDegrees)}°)</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="7.5"
                value={ballB.tiltDegrees}
                onChange={(e) => {
                  const deg = parseFloat(e.target.value);
                  setBallB(prev => ({
                    ...prev,
                    tiltDegrees: deg,
                    tiltClock: degToClock(deg)
                  }));
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                <span>12:00 (0°)</span>
                <span>3:00 (90°)</span>
                <span>6:00 (180°)</span>
                <span>9:00 (270°)</span>
                <span>12:00 (360°)</span>
              </div>
            </div>

            {/* 4. Gyro Angle (0° ~ 90°) */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-yellow-400" />
                  ジャイロ角 (Gyro Angle / 効率)
                </span>
                <span className="font-mono text-yellow-400">
                  {ballB.gyroDegrees}° (スピン効率: {Math.round(Math.cos((ballB.gyroDegrees * Math.PI) / 180) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={ballB.gyroDegrees}
                onChange={(e) => setBallB(prev => ({ ...prev, gyroDegrees: parseInt(e.target.value, 10) }))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground font-mono mt-0.5">
                <span>0° (100% 垂直)</span>
                <span>45° (71% 斜め)</span>
                <span>90° (0% ライフル)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Scientific Insights & Seam Shifted Wake (SSW) Knowledge Card */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-3">
        <h3 className="text-sm font-black flex items-center gap-2 text-primary">
          <Info className="w-4 h-4" />
          ラプソード解析における「シームと回転軸の行列力学」解説
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground leading-relaxed">
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <h4 className="font-bold text-foreground">1. シームの初期姿勢 (InitRotation)</h4>
            <p>
              4シームは1回転あたり4回縫い目が空気を切り裂き、安定したマグナス揚力を発生させます。2シームや1シームは回転軸に対して縫い目が非対称になり、片側の境界層剥離を早めて空気抵抗の偏り（SSW）を生み出します。
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <h4 className="font-bold text-foreground">2. ジャイロ回転 (Gyro Angle)</h4>
            <p>
              回転軸が進行方向に向く（ジャイロ角90°）と、マグナス力による変化量はゼロになりますが、弾道の急激な沈み（ジャイロカッター/縦スラ）や鋭い落ちを演出します。スピン効率 = cos(ジャイロ角)。
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
            <h4 className="font-bold text-foreground">3. 行列合成 (FinalTransform)</h4>
            <p>
              毎フレームのボール姿勢は <code>AxisTilt * GyroAngle * SpinAnimation * InitRotation</code> の積によってリアルタイム計算され、RapsodoやTrackMan実機と全く同じ3D運動学を再現しています。
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SeamSimulator;

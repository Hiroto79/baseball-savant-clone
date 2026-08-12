import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Crosshair, 
  Target, 
  Video, 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  HelpCircle, 
  Upload, 
  Sparkles,
  ChevronRight,
  Eye,
  Sliders,
  Maximize2
} from 'lucide-react';

// サンプル投球データ
const INITIAL_PITCH_DATA = [
  { id: '1', pitchNo: 1, time: '0:03.2', pitcher: 'Tyler Rogers', pitchType: 'Sinker', count: '0-0', target: 'Out-Low', actual: 'Out-Low', targetX: 62, targetY: 78, actualX: 65, actualY: 75, missInches: 1.8, missCm: 4.6, isOpposite: false, grade: 'Excellent' },
  { id: '2', pitchNo: 2, time: '0:18.5', pitcher: 'Tyler Rogers', pitchType: '4-Seam', count: '0-1', target: 'In-High', actual: 'In-Mid', targetX: 35, targetY: 30, actualX: 38, actualY: 48, missInches: 4.2, missCm: 10.7, isOpposite: false, grade: 'Good' },
  { id: '3', pitchNo: 3, time: '0:34.1', pitcher: 'Tyler Rogers', pitchType: 'Slider', count: '0-2', target: 'Out-Low', actual: 'In-Low', targetX: 68, targetY: 82, actualX: 32, actualY: 79, missInches: 11.5, missCm: 29.2, isOpposite: true, grade: 'Opposite' },
  { id: '4', pitchNo: 4, time: '0:49.8', pitcher: 'Tyler Rogers', pitchType: 'Sinker', count: '1-2', target: 'Out-Low', actual: 'Out-Low', targetX: 64, targetY: 80, actualX: 63, actualY: 81, missInches: 0.8, missCm: 2.0, isOpposite: false, grade: 'Dot' },
];

export const CommandTracker = () => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  
  // 測定モード: 'target' (ミット構え) -> 'actual' (ボール着弾) -> 'done'
  const [inputStep, setInputStep] = useState('target'); 
  const [tempTarget, setTempTarget] = useState(null);
  const [tempActual, setTempActual] = useState(null);
  
  // 入力中のメタデータ
  const [pitcherName, setPitcherName] = useState('投手A');
  const [selectedPitchType, setSelectedPitchType] = useState('4-Seam');
  const [countBall, setCountBall] = useState(0);
  const [countStrike, setCountStrike] = useState(0);

  // 蓄積データリスト
  const [pitches, setPitches] = useState(INITIAL_PITCH_DATA);
  const [selectedPitchId, setSelectedPitchId] = useState(null);

  // ストライクゾーンキャリブレーション (画面内%座標: x, y, w, h)
  const [zoneBox, setZoneBox] = useState({ x: 38, y: 32, w: 24, h: 36 });
  const [isCalibratingZone, setIsCalibratingZone] = useState(false);

  const videoRef = useRef(null);
  const canvasOverlayRef = useRef(null);

  // 動画アップロードハンドラ
  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setPitches([]);
    }
  };

  // 動画再生・一時停止
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // フレーム微調整 (+/- 0.05秒)
  const stepFrame = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 60, videoRef.current.currentTime + seconds));
  };

  // クリックで Target / Actual 座標を記録
  const handleCanvasClick = (e) => {
    if (!canvasOverlayRef.current) return;
    const rect = canvasOverlayRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    if (inputStep === 'target') {
      setTempTarget({ x: clickX, y: clickY });
      setInputStep('actual');
    } else if (inputStep === 'actual') {
      setTempActual({ x: clickX, y: clickY });
      
      // ズレ計算 (ストライクゾーン幅 17インチ ≈ zoneBox.w % として換算)
      const dxPercent = clickX - (tempTarget?.x || clickX);
      const dyPercent = clickY - (tempTarget?.y || clickY);
      const distPercent = Math.sqrt(dxPercent * dxPercent + dyPercent * dyPercent);
      
      // 17インチ / zoneBox.w%
      const inchesPerPercent = 17.0 / (zoneBox.w || 24);
      const missInches = parseFloat((distPercent * inchesPerPercent).toFixed(1));
      const missCm = parseFloat((missInches * 2.54).toFixed(1));

      // 逆球判定（ゾーン中心より左/右の反転）
      const zoneCenterX = zoneBox.x + zoneBox.w / 2;
      const targetSide = (tempTarget?.x || 50) < zoneCenterX ? 'L' : 'R';
      const actualSide = clickX < zoneCenterX ? 'L' : 'R';
      const isOpposite = targetSide !== actualSide && Math.abs(dxPercent) > 6;

      let grade = 'Good';
      if (missInches <= 2.5) grade = 'Dot (完璧)';
      else if (missInches <= 6.0) grade = 'Good (許容内)';
      else if (isOpposite) grade = 'Opposite (逆球)';
      else grade = 'Miss (失投)';

      const newPitch = {
        id: String(Date.now()),
        pitchNo: pitches.length + 1,
        time: formatTime(videoRef.current?.currentTime || currentTime),
        pitcher: pitcherName,
        pitchType: selectedPitchType,
        count: `${countBall}-${countStrike}`,
        target: getZoneLocationName(tempTarget?.x || 50, tempTarget?.y || 50, zoneBox),
        actual: getZoneLocationName(clickX, clickY, zoneBox),
        targetX: tempTarget?.x || 50,
        targetY: tempTarget?.y || 50,
        actualX: clickX,
        actualY: clickY,
        missInches,
        missCm,
        isOpposite,
        grade
      };

      setPitches(prev => [...prev, newPitch]);
      setSelectedPitchId(newPitch.id);
      setInputStep('target');
      setTempTarget(null);
      setTempActual(null);
    }
  };

  // コース名の推定
  const getZoneLocationName = (x, y, zb) => {
    const isLeft = x < zb.x + zb.w * 0.35;
    const isRight = x > zb.x + zb.w * 0.65;
    const isHigh = y < zb.y + zb.h * 0.35;
    const isLow = y > zb.y + zb.h * 0.65;

    const horiz = isLeft ? 'In' : isRight ? 'Out' : 'Mid';
    const vert = isHigh ? 'High' : isLow ? 'Low' : 'Mid';
    return `${horiz}-${vert}`;
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // コマンド統計計算
  const stats = useMemo(() => {
    if (pitches.length === 0) return { avgMissInches: 0, avgMissCm: 0, dotRate: 0, oppRate: 0, total: 0 };
    const totalMiss = pitches.reduce((sum, p) => sum + p.missInches, 0);
    const dots = pitches.filter(p => p.missInches <= 3.5).length;
    const opps = pitches.filter(p => p.isOpposite).length;
    return {
      total: pitches.length,
      avgMissInches: (totalMiss / pitches.length).toFixed(1),
      avgMissCm: ((totalMiss / pitches.length) * 2.54).toFixed(1),
      dotRate: Math.round((dots / pitches.length) * 100),
      oppRate: Math.round((opps / pitches.length) * 100)
    };
  }, [pitches]);

  // CSVエクスポート
  const exportCsv = () => {
    const headers = ['No', 'Time', 'Pitcher', 'PitchType', 'Count', 'Target', 'Actual', 'Miss(inch)', 'Miss(cm)', 'Opposite', 'Grade'];
    const rows = pitches.map(p => [
      p.pitchNo, p.time, p.pitcher, p.pitchType, p.count, p.target, p.actual, p.missInches, p.missCm, p.isOpposite ? 'YES' : 'NO', p.grade
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OpenCommand_${pitcherName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-foreground p-2 sm:p-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              OpenCommand Engine (CC BY-NC-SA 4.0)
            </span>
            <span className="text-xs text-muted-foreground font-mono">Center Camera Vision Tracker</span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-foreground mt-1">
            🎯 センターカメラ投球コマンド・制球力自動スコアリング
          </h1>
          <p className="text-xs text-muted-foreground">
            捕手の構えたミット位置（Target）と実際の通過位置（Actual）から、投手の真の制球力（ズレ距離・逆球・コマンド率）を測定・蓄積します。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>試合映像を読み込む</span>
            <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
          </label>
          <button
            onClick={exportCsv}
            disabled={pitches.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>CSV出力</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-muted-foreground">総測定投球数</span>
          <div className="text-2xl font-black text-foreground mt-1">{stats.total} <span className="text-xs font-normal text-muted-foreground">球</span></div>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-muted-foreground">平均ズレ距離 (Miss Distance)</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.avgMissInches} <span className="text-xs font-normal text-muted-foreground">in ({stats.avgMissCm} cm)</span></div>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-muted-foreground">コマンド率 (Dot / 許容内)</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.dotRate} <span className="text-xs font-normal text-muted-foreground">%</span></div>
        </div>
        <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-muted-foreground">逆球・失投率 (Opposite Miss)</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{stats.oppRate} <span className="text-xs font-normal text-muted-foreground">%</span></div>
        </div>
      </div>

      {/* Main Studio Arena: Video Overlay + Tagging Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Video Player & Computer Vision Overlay (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-border shadow-xl select-none group">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setDuration(videoRef.current?.duration || 60)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
                <Video className="w-12 h-12 text-zinc-700 mb-2" />
                <p className="text-sm font-bold text-zinc-300">センターカメラ映像（中継・試合ビデオ）をアップロード</p>
                <p className="text-xs text-zinc-500 mt-1">動画上で「①ミット位置」→「②投球通過位置」をクリックするだけで制球力を自動測定します</p>
              </div>
            )}

            {/* Interactive Drawing Canvas Overlay */}
            <div 
              ref={canvasOverlayRef}
              onClick={handleCanvasClick}
              className="absolute inset-0 cursor-crosshair z-20 pointer-events-auto"
            >
              {/* Yellow Strike Zone Box */}
              <div 
                className="absolute border-2 border-yellow-400/90 bg-yellow-400/10 transition-all pointer-events-none"
                style={{
                  left: `${zoneBox.x}%`,
                  top: `${zoneBox.y}%`,
                  width: `${zoneBox.w}%`,
                  height: `${zoneBox.h}%`
                }}
              >
                <div className="absolute -top-4 left-0 text-[9px] font-mono font-bold text-yellow-400 bg-black/75 px-1 rounded">
                  STRIKE ZONE (17.0 in)
                </div>
                {/* 9分割グリッド */}
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 border border-yellow-400/30">
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                  <div className="border border-yellow-400/20" />
                </div>
              </div>

              {/* Temporary Target Point (White Ring) */}
              {tempTarget && (
                <div 
                  className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white bg-white/20 animate-pulse flex items-center justify-center pointer-events-none shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                  style={{ left: `${tempTarget.x}%`, top: `${tempTarget.y}%` }}
                >
                  <span className="text-[8px] font-black text-white bg-black/80 px-1 rounded -top-4 absolute whitespace-nowrap">
                    1. 構え (Target)
                  </span>
                </div>
              )}

              {/* Display Current or Selected Pitch Markers */}
              {pitches.map(p => {
                const isSelected = p.id === selectedPitchId;
                return (
                  <React.Fragment key={p.id}>
                    {/* Target Glove (White Circle) */}
                    <div
                      className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white/80 bg-white/10 flex items-center justify-center pointer-events-none transition-all ${
                        isSelected ? 'ring-2 ring-blue-400 scale-125 z-30' : 'opacity-60'
                      }`}
                      style={{ left: `${p.targetX}%`, top: `${p.targetY}%` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    {/* Actual Pitch Ball (Red Circle) */}
                    <div
                      className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-rose-500 bg-rose-500/40 flex items-center justify-center pointer-events-none transition-all ${
                        isSelected ? 'ring-2 ring-rose-400 scale-125 z-30' : 'opacity-80'
                      }`}
                      style={{ left: `${p.actualX}%`, top: `${p.actualY}%` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    {/* Miss Line Vector */}
                    {isSelected && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                        <line
                          x1={`${p.targetX}%`}
                          y1={`${p.targetY}%`}
                          x2={`${p.actualX}%`}
                          y2={`${p.actualY}%`}
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                      </svg>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Mode Guidance Badge */}
              <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
                <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-zinc-700 text-xs font-bold text-zinc-200 backdrop-blur shadow-lg flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-ping bg-rose-500" />
                  {inputStep === 'target' ? (
                    <span>① 画面上の **キャッチャーミット（構え位置）** をクリック</span>
                  ) : (
                    <span className="text-yellow-300">② ボールが通過した **着弾位置** をクリック</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Video Playback & Frame Stepper Controller */}
          <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={togglePlay}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '一時停止' : '再生'}</span>
              </button>
              <button
                onClick={() => stepFrame(-0.1)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                title="0.1秒戻る"
              >
                -0.1s
              </button>
              <button
                onClick={() => stepFrame(0.1)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                title="0.1秒進む"
              >
                +0.1s
              </button>
              <span className="font-mono text-xs text-muted-foreground ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setInputStep('target');
                  setTempTarget(null);
                  setTempActual(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 cursor-pointer"
              >
                測定キャンセル
              </button>
            </div>
          </div>
        </div>

        {/* Right: Tagging Input & Pitch Metadata (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" />
              投球メタデータ入力
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground">投手名</label>
                <input
                  type="text"
                  value={pitcherName}
                  onChange={(e) => setPitcherName(e.target.value)}
                  className="w-full bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground">球種</label>
                <select
                  value={selectedPitchType}
                  onChange={(e) => setSelectedPitchType(e.target.value)}
                  className="w-full bg-muted/60 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground outline-none mt-1 cursor-pointer"
                >
                  <option value="4-Seam">4-Seam (直球)</option>
                  <option value="2-Seam">2-Seam / Sinker</option>
                  <option value="Cutter">Cutter (カット)</option>
                  <option value="Slider">Slider (スライダー)</option>
                  <option value="Sweeper">Sweeper</option>
                  <option value="Curve">Curve (カーブ)</option>
                  <option value="Fork/Split">Fork / Split</option>
                  <option value="Changeup">Changeup</option>
                </select>
              </div>
            </div>

            {/* Count buttons */}
            <div>
              <label className="text-[10px] font-bold text-muted-foreground">カウント (B - S)</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-lg border border-border text-xs font-bold">
                  <span className="text-emerald-400">B:</span>
                  {[0, 1, 2, 3].map(b => (
                    <button
                      key={b}
                      onClick={() => setCountBall(b)}
                      className={`w-5 h-5 rounded text-[10px] font-bold cursor-pointer ${
                        countBall === b ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-muted/60 px-2 py-1 rounded-lg border border-border text-xs font-bold">
                  <span className="text-yellow-400">S:</span>
                  {[0, 1, 2].map(s => (
                    <button
                      key={s}
                      onClick={() => setCountStrike(s)}
                      className={`w-5 h-5 rounded text-[10px] font-bold cursor-pointer ${
                        countStrike === s ? 'bg-yellow-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone Calibration Expander */}
            <div className="pt-2 border-t border-border/60">
              <button
                onClick={() => setIsCalibratingZone(prev => !prev)}
                className="text-[11px] font-bold text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <span>⚙️ ストライクゾーン枠のキャリブレーション調整</span>
                <ChevronRight className={`w-3 h-3 transition-transform ${isCalibratingZone ? 'rotate-90' : ''}`} />
              </button>

              {isCalibratingZone && (
                <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px]">
                  <div>
                    <label className="text-zinc-400">横位置 (X%): {zoneBox.x}</label>
                    <input
                      type="range" min="10" max="70" value={zoneBox.x}
                      onChange={(e) => setZoneBox(prev => ({ ...prev, x: parseInt(e.target.value, 10) }))}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400">縦位置 (Y%): {zoneBox.y}</label>
                    <input
                      type="range" min="10" max="70" value={zoneBox.y}
                      onChange={(e) => setZoneBox(prev => ({ ...prev, y: parseInt(e.target.value, 10) }))}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400">幅 (Width%): {zoneBox.w}</label>
                    <input
                      type="range" min="10" max="50" value={zoneBox.w}
                      onChange={(e) => setZoneBox(prev => ({ ...prev, w: parseInt(e.target.value, 10) }))}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400">高さ (Height%): {zoneBox.h}</label>
                    <input
                      type="range" min="15" max="60" value={zoneBox.h}
                      onChange={(e) => setZoneBox(prev => ({ ...prev, h: parseInt(e.target.value, 10) }))}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Pitch Inspector */}
          {selectedPitchId && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-400">
                  選択中の投球詳細 (No.{pitches.find(p => p.id === selectedPitchId)?.pitchNo})
                </span>
                <button
                  onClick={() => {
                    setPitches(prev => prev.filter(p => p.id !== selectedPitchId));
                    setSelectedPitchId(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>削除</span>
                </button>
              </div>

              {(() => {
                const p = pitches.find(x => x.id === selectedPitchId);
                if (!p) return null;
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">構え (Target)</span>
                      <span className="font-bold text-white">{p.target}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">着弾 (Actual)</span>
                      <span className="font-bold text-white">{p.actual}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">ズレ誤差 (Miss Distance)</span>
                      <span className="font-bold text-amber-400">{p.missInches} in ({p.missCm} cm)</span>
                    </div>
                    <div className="p-2 rounded bg-muted/40 border border-border/50">
                      <span className="text-[10px] text-muted-foreground block">判定 (Grade)</span>
                      <span className={`font-bold ${p.isOpposite ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {p.grade}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

      </div>

      {/* Bottom: Sportscode Data Grid (Spreadsheet) */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground">
              📊 投球コマンド記録スプレッドシート (Sportscode Grid)
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {pitches.length} 件記録済み
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border max-h-[300px]">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead className="bg-muted/80 text-muted-foreground sticky top-0 border-b border-border z-10">
              <tr>
                <th className="p-2 text-center">No</th>
                <th className="p-2">Time</th>
                <th className="p-2">投手名</th>
                <th className="p-2">球種</th>
                <th className="p-2 text-center">Count</th>
                <th className="p-2 text-center">構え (Target)</th>
                <th className="p-2 text-center">着弾 (Actual)</th>
                <th className="p-2 text-right">ズレ (inch)</th>
                <th className="p-2 text-right">ズレ (cm)</th>
                <th className="p-2 text-center">判定</th>
                <th className="p-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pitches.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPitchId(p.id)}
                  className={`hover:bg-accent/50 cursor-pointer transition-colors ${
                    selectedPitchId === p.id ? 'bg-blue-500/15 font-bold' : ''
                  }`}
                >
                  <td className="p-2 text-center font-bold text-foreground">{p.pitchNo}</td>
                  <td className="p-2 text-muted-foreground">{p.time}</td>
                  <td className="p-2 font-bold text-foreground">{p.pitcher}</td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                      {p.pitchType}
                    </span>
                  </td>
                  <td className="p-2 text-center">{p.count}</td>
                  <td className="p-2 text-center text-zinc-300">{p.target}</td>
                  <td className="p-2 text-center text-zinc-300">{p.actual}</td>
                  <td className="p-2 text-right font-bold text-amber-400">{p.missInches}</td>
                  <td className="p-2 text-right font-bold text-amber-400">{p.missCm}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.isOpposite 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                        : p.missInches <= 2.5 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {p.grade}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPitches(prev => prev.filter(x => x.id !== p.id));
                        if (selectedPitchId === p.id) setSelectedPitchId(null);
                      }}
                      className="p-1 hover:bg-rose-500/20 rounded text-rose-400 transition-colors cursor-pointer"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommandTracker;

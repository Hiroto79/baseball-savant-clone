import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { PITCH_COLORS } from '../../utils/pitchColors';
import { Play, Pause, RotateCcw, Camera } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const Trajectory3D = ({ data, language = 'ja' }) => {
    const { units } = useSettings();
    const [selectedType, setSelectedType] = useState('All');
    const [selectedIndex, setSelectedIndex] = useState('all');
    const [isPlaying, setIsPlaying] = useState(false);
    const [frame, setFrame] = useState(0);
    const [cameraAngle, setCameraAngle] = useState('catcher');
    const STEPS = 40;

    const MPH_TO_KMH = 1.60934;

    const calculateTrajectory = (pitch) => {
        try {
            const startY = 54.5;
            const STEPS_COUNT = STEPS;

            if (pitch.vx0 && pitch.vy0 && pitch.vz0 && pitch.ax && pitch.ay && pitch.az) {
                const vx0 = parseFloat(pitch.vx0), vy0 = parseFloat(pitch.vy0), vz0 = parseFloat(pitch.vz0);
                const ax = parseFloat(pitch.ax), ay = parseFloat(pitch.ay), az = parseFloat(pitch.az);
                const startX = parseFloat(pitch.release_pos_x) || -1.5;
                const startZ = parseFloat(pitch.release_pos_z) || 5.8;

                const a = 0.5 * ay, b = vy0, c = startY - 1.417;
                let tf = (-b - Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
                if (isNaN(tf) || tf <= 0) tf = 0.42;

                const t = Array.from({ length: STEPS_COUNT }, (_, i) => (i / (STEPS_COUNT - 1)) * tf);
                const x = t.map(ti => startX + vx0 * ti + 0.5 * ax * ti ** 2);
                const y = t.map(ti => startY + vy0 * ti + 0.5 * ay * ti ** 2);
                const z = t.map(ti => startZ + vz0 * ti + 0.5 * az * ti ** 2);
                return { x, y, z };
            }

            // Fallback estimation
            const vel = parseFloat(pitch.release_speed || 90);
            const v_fps = vel * 1.467;
            const tf = (startY - 1.417) / (v_fps * 0.95);
            const startX = parseFloat(pitch.release_pos_x || -1.5);
            const startZ = parseFloat(pitch.release_pos_z || 5.8);
            const targetX = parseFloat(pitch.plate_x || 0);
            const targetZ = parseFloat(pitch.plate_z || 2.5);

            const t = Array.from({ length: STEPS_COUNT }, (_, i) => (i / (STEPS_COUNT - 1)) * tf);
            const x = t.map(ti => startX + (targetX - startX) * (ti / tf));
            const y = t.map(ti => startY - (startY - 1.417) * (ti / tf));
            const z = t.map(ti => startZ + (targetZ - startZ) * (ti / tf));
            return { x, y, z };
        } catch {
            return null;
        }
    };

    const getPitchLabel = (p) => p.pitch_name || p.pitch_type || 'Pitch';

    const availableTypes = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) return ['All'];
        const types = new Set();
        data.forEach(p => {
            if (!p) return;
            const label = getPitchLabel(p);
            if (label) types.add(label);
        });
        return ['All', ...Array.from(types).sort()];
    }, [data]);

    const filteredData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        if (selectedType === 'All') return data;
        return data.filter(p => p && getPitchLabel(p) === selectedType);
    }, [data, selectedType]);

    const displayData = useMemo(() => {
        if (selectedIndex === 'all') return filteredData.slice(0, 35);
        return filteredData[selectedIndex] ? [filteredData[selectedIndex]] : [];
    }, [filteredData, selectedIndex]);

    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setFrame(prev => {
                    if (prev >= STEPS - 1) {
                        setIsPlaying(false);
                        return STEPS - 1;
                    }
                    return prev + 1;
                });
            }, 30);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    // ==========================================
    // STADIUM FIELD 3D TRACES (True Proportions)
    // ==========================================
    const sceneTraces = useMemo(() => {
        const traces = [];

        // 1. Home Plate (White Pentagon: tip at y=0, front edge at y=1.417, width=1.417ft)
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [0, -0.708, -0.708, 0.708, 0.708, 0],
            y: [0, 0.708, 1.417, 1.417, 0.708, 0],
            z: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
            line: { color: '#ffffff', width: 6 },
            showlegend: false, hoverinfo: 'none'
        });

        // 2. Strike Zone Frame on Home Plate Front Edge (y = 1.417)
        // Correct Aspect Ratio (17 in wide, 24 in high: 1.5ft to 3.5ft)
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [-0.708, 0.708, 0.708, -0.708, -0.708],
            y: [1.417, 1.417, 1.417, 1.417, 1.417],
            z: [1.5, 1.5, 3.5, 3.5, 1.5],
            line: { color: '#38bdf8', width: 5 },
            showlegend: false, hoverinfo: 'none'
        });

        // Strike Zone 9-Grid Inner Dividers
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [-0.236, -0.236, null, 0.236, 0.236],
            y: [1.417, 1.417, null, 1.417, 1.417],
            z: [1.5, 3.5, null, 1.5, 3.5],
            line: { color: 'rgba(56, 189, 248, 0.4)', width: 2, dash: 'dot' },
            showlegend: false, hoverinfo: 'none'
        });
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [-0.708, 0.708, null, -0.708, 0.708],
            y: [1.417, 1.417, null, 1.417, 1.417],
            z: [2.167, 2.167, null, 2.833, 2.833],
            line: { color: 'rgba(56, 189, 248, 0.4)', width: 2, dash: 'dot' },
            showlegend: false, hoverinfo: 'none'
        });

        // 3. Right Batter's Box (Catcher view left: x < 0)
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [-1.1, -4.1, -4.1, -1.1, -1.1],
            y: [-1.0, -1.0, 4.0, 4.0, -1.0],
            z: [0.02, 0.02, 0.02, 0.02, 0.02],
            line: { color: 'rgba(255, 255, 255, 0.45)', width: 3 },
            showlegend: false, hoverinfo: 'none'
        });

        // 4. Left Batter's Box (Catcher view right: x > 0)
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [1.1, 4.1, 4.1, 1.1, 1.1],
            y: [-1.0, -1.0, 4.0, 4.0, -1.0],
            z: [0.02, 0.02, 0.02, 0.02, 0.02],
            line: { color: 'rgba(255, 255, 255, 0.45)', width: 3 },
            showlegend: false, hoverinfo: 'none'
        });

        // 5. Pitcher's Mound (Circle at y = 60.5ft, radius = 9.0ft)
        const moundRadius = 9.0;
        const moundCenterY = 60.5;
        const moundPoints = 32;
        const moundX = [];
        const moundY = [];
        const moundZ = [];

        for (let i = 0; i <= moundPoints; i++) {
            const angle = (i / moundPoints) * 2 * Math.PI;
            moundX.push(moundRadius * Math.cos(angle));
            moundY.push(moundCenterY + moundRadius * Math.sin(angle));
            moundZ.push(0.02);
        }

        // Mound Circle (Clay tone)
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: moundX, y: moundY, z: moundZ,
            line: { color: '#c2410c', width: 4 },
            showlegend: false, hoverinfo: 'none'
        });

        // Mound Elevation Slopes
        for (let a = 0; a < 6; a++) {
            const rad = (a / 6) * 2 * Math.PI;
            traces.push({
                type: 'scatter3d', mode: 'lines',
                x: [0, moundRadius * Math.cos(rad)],
                y: [moundCenterY, moundCenterY + moundRadius * Math.sin(rad)],
                z: [0.83, 0.02],
                line: { color: 'rgba(194, 65, 12, 0.3)', width: 2 },
                showlegend: false, hoverinfo: 'none'
            });
        }

        // 6. Pitcher's Plate (Rubber: 24in x 6in at z=0.83ft)
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [-1.0, 1.0, 1.0, -1.0, -1.0],
            y: [60.5, 60.5, 60.0, 60.0, 60.5],
            z: [0.83, 0.83, 0.83, 0.83, 0.83],
            line: { color: '#ffffff', width: 6 },
            showlegend: false, hoverinfo: 'none'
        });

        // 7. Ground Pitching Turf Guide Lines
        traces.push({
            type: 'scatter3d', mode: 'lines',
            x: [-2.5, -2.5, 2.5, 2.5],
            y: [4.0, 51.5, 51.5, 4.0],
            z: [0.01, 0.01, 0.01, 0.01],
            line: { color: 'rgba(71, 85, 105, 0.35)', width: 1.5, dash: 'dash' },
            showlegend: false, hoverinfo: 'none'
        });

        return traces;
    }, []);

    // Camera Presets (Optimized Eye distance for realistic proportions)
    const cameraSettings = useMemo(() => {
        switch (cameraAngle) {
            case 'pitcher': // Behind Pitcher looking at Catcher
                return {
                    eye: { x: 0, y: 1.5, z: 0.5 },
                    center: { x: 0, y: -0.1, z: -0.05 }
                };
            case 'side': // 1st base dugout side view
                return {
                    eye: { x: -1.6, y: 0.2, z: 0.35 },
                    center: { x: 0, y: 0.5, z: 0 }
                };
            case 'top': // Overhead top down view
                return {
                    eye: { x: 0, y: 0.0, z: 2.1 },
                    center: { x: 0, y: 0.5, z: 0 }
                };
            case 'catcher': // Realistic Catcher View (Zone in natural proportions)
            default:
                return {
                    eye: { x: 0, y: -0.85, z: 0.28 },
                    center: { x: 0, y: 0.5, z: -0.05 }
                };
        }
    }, [cameraAngle]);

    // Layout configuration with balanced aspectratio
    const layout = useMemo(() => ({
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#060a17',
        showlegend: false,
        hoverlabel: {
            bgcolor: '#0f172a',
            bordercolor: '#38bdf8',
            font: { color: '#ffffff', size: 12, family: 'Inter, sans-serif' }
        },
        scene: {
            xaxis: { visible: false, showgrid: false, showline: false, showticklabels: false, zeroline: false, range: [-6, 6] },
            yaxis: { visible: false, showgrid: false, showline: false, showticklabels: false, zeroline: false, range: [-3, 65] },
            zaxis: { visible: false, showgrid: false, showline: false, showticklabels: false, zeroline: false, range: [0, 8] },
            camera: cameraSettings,
            aspectratio: { x: 1.6, y: 3.0, z: 1.0 }
        }
    }), [cameraSettings]);

    const plotData = useMemo(() => {
        const activeTrajs = displayData.map(p => {
            const traj = calculateTrajectory(p);
            if (!traj) return null;
            return { traj, p };
        }).filter(Boolean);

        const len = frame + 1;

        const lineTraces = activeTrajs.map(({ traj, p }) => {
            const pitchType = getPitchLabel(p);
            
            const rawVel = p.release_speed || p.Velocity || p.velocity;
            const velText = rawVel 
                ? (units === 'metric' ? `${(Number(rawVel) * MPH_TO_KMH).toFixed(1)} km/h` : `${Number(rawVel).toFixed(1)} mph`)
                : '';

            let hbText = '';
            let ivbText = '';
            if (p.pfx_x != null && p.pfx_z != null) {
                let hb = -Number(p.pfx_x) * 12;
                let ivb = Number(p.pfx_z) * 12;
                if (units === 'metric') {
                    hb *= 2.54;
                    ivb *= 2.54;
                    hbText = `HB: ${hb > 0 ? `+${hb.toFixed(1)}` : hb.toFixed(1)} cm`;
                    ivbText = `iVB: ${ivb > 0 ? `+${ivb.toFixed(1)}` : ivb.toFixed(1)} cm`;
                } else {
                    hbText = `HB: ${hb > 0 ? `+${hb.toFixed(1)}` : hb.toFixed(1)} in`;
                    ivbText = `iVB: ${ivb > 0 ? `+${ivb.toFixed(1)}` : ivb.toFixed(1)} in`;
                }
            }

            const hoverInfo = `<b>${pitchType}</b><br>球速: ${velText}${hbText ? `<br>${hbText}<br>${ivbText}` : ''}`;

            return {
                type: 'scatter3d', mode: 'lines',
                x: traj.x.slice(0, len),
                y: traj.y.slice(0, len),
                z: traj.z.slice(0, len),
                line: { width: 5.5, color: PITCH_COLORS[pitchType] || '#3b82f6' },
                showlegend: false,
                hoverinfo: 'text',
                text: hoverInfo
            };
        });

        const ballTraces = activeTrajs.map(({ traj, p }) => {
            const pitchType = getPitchLabel(p);
            const k = Math.min(frame, traj.x.length - 1);
            return {
                type: 'scatter3d', mode: 'markers',
                x: [traj.x[k]], y: [traj.y[k]], z: [traj.z[k]],
                marker: { size: 6.5, color: '#ffffff', line: { color: '#38bdf8', width: 2 } },
                showlegend: false,
                hoverinfo: 'none'
            };
        });

        return [...sceneTraces, ...lineTraces, ...ballTraces];
    }, [displayData, frame, sceneTraces, units]);

    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                {language === 'ja' ? '軌道データがありません' : 'No trajectory data'}
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[460px] relative overflow-hidden rounded-2xl bg-[#060a17] border border-slate-800/80 flex flex-col shadow-inner">
            {/* Top Toolbar */}
            <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
                {/* Left: Camera Angle Selectors */}
                <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 pointer-events-auto shadow-md">
                    <span className="text-[11px] text-slate-400 font-semibold px-2 flex items-center gap-1">
                        <Camera size={12} className="text-blue-400" />
                        {language === 'ja' ? '視点' : 'View'}:
                    </span>
                    {[
                        { id: 'catcher', label: language === 'ja' ? '捕手視点' : 'Catcher' },
                        { id: 'pitcher', label: language === 'ja' ? '投手視点' : 'Pitcher' },
                        { id: 'side', label: language === 'ja' ? '横視点' : 'Side' },
                        { id: 'top', label: language === 'ja' ? '上空' : 'Top' }
                    ].map(cam => (
                        <button
                            key={cam.id}
                            onClick={() => setCameraAngle(cam.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                cameraAngle === cam.id
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                        >
                            {cam.label}
                        </button>
                    ))}
                </div>

                {/* Right: Pitch Filter & Animation Controls */}
                <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 pointer-events-auto shadow-md">
                    <select
                        value={selectedType}
                        onChange={(e) => { setSelectedType(e.target.value); setSelectedIndex('all'); setFrame(0); }}
                        className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-600 font-medium focus:outline-none cursor-pointer"
                    >
                        {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    <button
                        onClick={() => {
                            if (isPlaying) {
                                setIsPlaying(false);
                            } else {
                                if (frame >= STEPS - 1) setFrame(0);
                                setIsPlaying(true);
                            }
                        }}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        {isPlaying ? (language === 'ja' ? '停止' : 'Pause') : (language === 'ja' ? '再生' : 'Play')}
                    </button>

                    <button
                        onClick={() => { setIsPlaying(false); setFrame(0); }}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="リセット"
                    >
                        <RotateCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Bottom Status Help */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-700/40 text-[11px] text-slate-400">
                    マウンド（60.5ft）〜 ホーム（0ft）| ドラッグで3D回転・スクロールでズーム
                </div>
            </div>

            {/* 3D Canvas */}
            <div className="flex-1 w-full min-h-0">
                <Plot
                    data={plotData}
                    layout={layout}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false, responsive: true }}
                />
            </div>
        </div>
    );
};

export default Trajectory3D;

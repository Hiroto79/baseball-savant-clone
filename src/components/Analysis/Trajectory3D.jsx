import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { PITCH_COLORS } from '../../utils/pitchColors';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const Trajectory3D = ({ data, language = 'ja' }) => {
    const { units } = useSettings();
    const [selectedType, setSelectedType] = useState('All');
    const [selectedIndex, setSelectedIndex] = useState('all');
    const [isPlaying, setIsPlaying] = useState(false);
    const [frame, setFrame] = useState(0);
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
        if (selectedIndex === 'all') return filteredData.slice(0, 30);
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

    // Scene (Home plate & Strike zone 3D)
    const sceneTraces = useMemo(() => [
        // Home Plate
        {
            type: 'scatter3d', mode: 'lines',
            x: [-0.71, 0, 0.71, 0.71, -0.71, -0.71],
            y: [1.417, 0.5, 1.417, 1.417 + 0.71, 1.417 + 0.71, 1.417],
            z: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
            line: { color: '#ffffff', width: 4 },
            showlegend: false, hoverinfo: 'none'
        },
        // Strike Zone 3D
        {
            type: 'scatter3d', mode: 'lines',
            x: [-0.71, 0.71, 0.71, -0.71, -0.71],
            y: [1.417, 1.417, 1.417, 1.417, 1.417],
            z: [1.5, 1.5, 3.5, 3.5, 1.5],
            line: { color: '#38bdf8', width: 3, dash: 'solid' },
            showlegend: false, hoverinfo: 'none'
        }
    ], []);

    // Layout with Clean Background (No ugly axis lines or numbers)
    const layout = useMemo(() => ({
        autosize: true,
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: '#080d1e',
        showlegend: false,
        hoverlabel: {
            bgcolor: '#0f172a',
            bordercolor: '#38bdf8',
            font: { color: '#ffffff', size: 12 }
        },
        scene: {
            xaxis: { visible: false, showgrid: false, showline: false, showticklabels: false, zeroline: false, range: [-3.5, 3.5] },
            yaxis: { visible: false, showgrid: false, showline: false, showticklabels: false, zeroline: false, range: [0, 60] },
            zaxis: { visible: false, showgrid: false, showline: false, showticklabels: false, zeroline: false, range: [0, 7.5] },
            camera: {
                eye: { x: -0.35, y: -2.1, z: 0.8 },
                center: { x: 0, y: 0.35, z: -0.2 }
            },
            aspectratio: { x: 0.9, y: 2.3, z: 1.0 }
        }
    }), []);

    const plotData = useMemo(() => {
        const activeTrajs = displayData.map(p => {
            const traj = calculateTrajectory(p);
            if (!traj) return null;
            return { traj, p };
        }).filter(Boolean);

        const len = frame + 1;

        const lineTraces = activeTrajs.map(({ traj, p }) => {
            const pitchType = getPitchLabel(p);
            
            // Format velocity & movement for hover tooltip
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
                line: { width: 4.5, color: PITCH_COLORS[pitchType] || '#3b82f6' },
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
                marker: { size: 5.5, color: '#ffffff', line: { color: '#38bdf8', width: 2 } },
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
        <div className="w-full h-full min-h-[360px] relative overflow-hidden rounded-xl bg-[#080d1e] flex flex-col">
            {/* Top Toolbar */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 text-[11px] text-slate-300 pointer-events-auto">
                    ドラッグ: 3D回転 | ホバー: 球速・変化量表示
                </div>

                <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 pointer-events-auto">
                    <select
                        value={selectedType}
                        onChange={(e) => { setSelectedType(e.target.value); setSelectedIndex('all'); setFrame(0); }}
                        className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-600 font-medium focus:outline-none"
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
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md"
                    >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        {isPlaying ? '停止' : '再生'}
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

import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { PITCH_COLORS } from '../../utils/pitchColors';
import { Play, Pause } from 'lucide-react';

const Trajectory3D = ({ data, language = 'en' }) => {
    // --- State ---
    const [selectedType, setSelectedType] = useState('All');
    const [selectedIndex, setSelectedIndex] = useState('all');
    const [isPlaying, setIsPlaying] = useState(false);
    const [frame, setFrame] = useState(0); // 0 to STEPS-1
    const STEPS = 50;

    // --- Physics ---
    const calculateTrajectory = (pitch) => {
        try {
            const source = pitch.source || 'savant';
            const isMetric = source === 'rapsodo' || source === 'simulator';

            // Constants (FEET)
            const G = 32.174;

            // Helpers
            const toSpaceFt = (val) => {
                if (!isMetric) return val;
                if (val === null || val === undefined || isNaN(val)) return 0;
                return Math.abs(val) > 4 ? val * 0.0328084 : val * 3.28084;
            };
            const cmToFt = (val) => isMetric ? val * 0.0328084 : val / 12;
            const toFpsFromVel = (val) => {
                const mph = isMetric ? val * 0.621371 : val;
                return mph * 1.467;
            };

            // 1. Full Acceleration (Statcast)
            if (pitch.vx0 && pitch.vy0 && pitch.vz0 && pitch.ax && pitch.ay && pitch.az) {
                const vx0 = parseFloat(pitch.vx0), vy0 = parseFloat(pitch.vy0), vz0 = parseFloat(pitch.vz0);
                const ax = parseFloat(pitch.ax), ay = parseFloat(pitch.ay), az = parseFloat(pitch.az);
                const startX = parseFloat(pitch.release_pos_x), startY = parseFloat(pitch.release_pos_y) || 54.5, startZ = parseFloat(pitch.release_pos_z);

                const a = 0.5 * ay, b = vy0, c = startY - 1.417;
                let tf = (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a);
                if (isNaN(tf) || tf < 0) tf = 0.45;

                const t = Array.from({ length: STEPS }, (_, i) => (i / (STEPS - 1)) * tf);
                const x = t.map(ti => startX + vx0 * ti + 0.5 * ax * ti ** 2);
                const y = t.map(ti => startY + vy0 * ti + 0.5 * ay * ti ** 2);
                const z = t.map(ti => startZ + vz0 * ti + 0.5 * az * ti ** 2);
                return { x, y, z };
            }

            // 2. Fallback / Reconstruction
            const p = pitch;
            const valVel = parseFloat(p.release_speed || p.Velocity || p.velocity);

            if (!isNaN(valVel)) {
                const startY = 54.5;
                const v_fps = toFpsFromVel(valVel);

                const valHB = parseFloat(p.hb_trajectory || p['Horizontal Break'] || p.HB || 0);
                const valVB = parseFloat(p.vb_trajectory || p['Vertical Break'] || p.VB || 0);
                const hb_ft = cmToFt(valHB);
                const vb_ft = cmToFt(valVB);

                const valRelX = parseFloat(p.release_pos_x || p['Release Side'] || p.releaseSide || -1.5);
                const valRelZ = parseFloat(p.release_pos_z || p['Release Height'] || p.releaseHeight || 5.5);
                const startX = toSpaceFt(valRelX);
                const startZ = toSpaceFt(valRelZ);

                const valPlateX = parseFloat(p.plate_x || p['Plate Loc Side'] || p['Location Horizontal']);
                const valPlateZ = parseFloat(p.plate_z || p['Plate Loc Height'] || p['Location Height']);

                let vx0, vy0, vz0, ax, az;
                const dist = startY - 1.417;
                const t_final = dist / (v_fps * 0.95);

                ax = (2 * hb_ft) / (t_final ** 2);
                az = (2 * vb_ft) / (t_final ** 2) - G;

                if (!isNaN(valPlateX) && !isNaN(valPlateZ)) {
                    // Target Based
                    const targetX = toSpaceFt(valPlateX);
                    const targetZ = toSpaceFt(valPlateZ);
                    vx0 = (targetX - startX - 0.5 * ax * t_final ** 2) / t_final;
                    vy0 = -dist / t_final;
                    vz0 = (targetZ - startZ - 0.5 * az * t_final ** 2) / t_final;
                } else {
                    // Angle Based
                    const valRA = parseFloat(p.release_angle || p['Release Angle'] || p.ReleaseAngle || 0);
                    const valHA = parseFloat(p.horizontal_angle || p['Horizontal Angle'] || p.HorizontalAngle || 0);
                    const rad_v = (valRA * Math.PI) / 180;
                    const rad_h = (valHA * Math.PI) / 180;
                    vy0 = -v_fps * Math.cos(rad_v) * Math.cos(rad_h);
                    vx0 = v_fps * Math.cos(rad_v) * Math.sin(rad_h);
                    vz0 = v_fps * Math.sin(rad_v);
                }

                const t = Array.from({ length: STEPS }, (_, i) => (i / (STEPS - 1)) * t_final);
                const x = t.map(ti => startX + vx0 * ti + 0.5 * ax * ti ** 2);
                const y = t.map(ti => startY + vy0 * ti);
                const z = t.map(ti => startZ + vz0 * ti + 0.5 * az * ti ** 2);
                return { x, y, z };
            }
            return null;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    // --- Scene Helper ---
    const sceneTraces = useMemo(() => {
        const traces = [];
        // [Reusable Scene Logic]
        // Grass
        traces.push({ type: 'mesh3d', x: [-20, 20, 20, -20], y: [20, 20, 100, 100], z: [0, 0, 0, 0], color: '#2E8B57', opacity: 0.3, hoverinfo: 'skip' });
        // Mound
        const theta = Array.from({ length: 30 }, (_, i) => (i / 29) * 2 * Math.PI);
        traces.push({ type: 'scatter3d', mode: 'lines', x: theta.map(t => 9 * Math.cos(t)), y: theta.map(t => 60.5 + 9 * Math.sin(t)), z: Array(30).fill(0.1), line: { width: 0, color: 'saddlebrown' }, surfaceaxis: 2, surfacecolor: 'saddlebrown', opacity: 1, hoverinfo: 'skip' });
        // Dirt
        traces.push({ type: 'scatter3d', mode: 'lines', x: theta.map(t => 13 * Math.cos(t)), y: theta.map(t => 13 * Math.sin(t)), z: Array(30).fill(0.05), line: { width: 0 }, surfaceaxis: 2, surfacecolor: 'sienna', hoverinfo: 'skip' });
        // Plate
        traces.push({ type: 'mesh3d', x: [0, 0.71, 0.71, -0.71, -0.71], y: [0, 0.71, 1.42, 1.42, 0.71], z: [0.08, 0.08, 0.08, 0.08, 0.08], color: 'white', hoverinfo: 'skip' });
        // Zone
        const szTop = 3.5, szBot = 1.5, w = 0.71;
        traces.push({ type: 'scatter3d', mode: 'lines', x: [-w, w, w, -w, -w], y: [0, 0, 0, 0, 0], z: [szBot, szBot, szTop, szTop, szBot], line: { color: 'white', width: 4, dash: 'dot' }, hoverinfo: 'skip' });
        // Boxes
        traces.push({ type: 'scatter3d', mode: 'lines', x: [3, 3, 7, 7, 3], y: [0, 6, 6, 0, 0], z: Array(5).fill(0.06), line: { color: 'white', width: 2 }, hoverinfo: 'skip' });
        traces.push({ type: 'scatter3d', mode: 'lines', x: [-3, -3, -7, -7, -3], y: [0, 6, 6, 0, 0], z: Array(5).fill(0.06), line: { color: 'white', width: 2 }, hoverinfo: 'skip' });
        return traces;
    }, []);


    // --- Filtering Logic ---
    const getPitchLabel = (p) => p.pitch_type || p.pitch_name || 'Unknown';

    const availableTypes = useMemo(() => {
        if (!data) return [];
        const types = new Set(data.map(getPitchLabel));
        return ['All', ...Array.from(types)];
    }, [data]);

    const filteredData = useMemo(() => {
        if (!data) return [];
        let d = data;
        if (selectedType !== 'All') {
            d = d.filter(p => getPitchLabel(p) === selectedType);
        }
        return d;
    }, [data, selectedType]);

    const displayData = useMemo(() => {
        if (selectedIndex === 'all') return filteredData.slice(0, 50);
        return filteredData[selectedIndex] ? [filteredData[selectedIndex]] : [];
    }, [filteredData, selectedIndex]);

    // --- Animation Loop ---
    useEffect(() => {
        let animId;
        if (isPlaying) {
            const loop = () => {
                setFrame(f => {
                    if (f >= STEPS - 1) {
                        setIsPlaying(false); // Stop at end
                        return STEPS - 1;
                    }
                    return f + 1;
                });
                animId = requestAnimationFrame(loop);
            };
            animId = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(animId);
    }, [isPlaying]);

    // --- Layout Memoization ---
    const layout = useMemo(() => ({
        title: language === 'ja' ? '3D 軌道ビュー' : '3D Pitch Trajectory',
        autosize: true,
        uirevision: 'true',
        showlegend: true,
        legend: { font: { color: 'white' }, x: 0, y: 1 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#fff' },
        margin: { l: 0, r: 0, b: 0, t: 30 },
        scene: {
            camera: {
                eye: { x: 0, y: -2.3, z: 0.8 },
                center: { x: 0, y: 10, z: 0 },
                up: { x: 0, y: 0, z: 1 }
            },
            xaxis: { title: '', range: [-10, 10], showgrid: false, zeroline: false, visible: false },
            yaxis: { title: '', range: [-5, 70], showgrid: false, zeroline: false, visible: false },
            zaxis: { title: '', range: [0, 15], showgrid: false, zeroline: false, visible: false },
            aspectmode: 'manual',
            aspectratio: { x: 1, y: 3.5, z: 0.8 },
            bgcolor: '#101010'
        }
    }), [language]);

    // --- Build Plot Data ---
    const plotData = useMemo(() => {
        const activeTrajs = displayData.map(p => {
            const traj = calculateTrajectory(p);
            if (!traj) return null;
            return { traj, p };
        }).filter(Boolean);

        const validTrajs = activeTrajs;

        const lineTraces = validTrajs.map(({ traj, p }) => {
            const pitchType = getPitchLabel(p);
            // Progressive trail: Slice arrays based on current frame
            const len = frame + 1;
            return {
                type: 'scatter3d', mode: 'lines',
                x: traj.x.slice(0, len),
                y: traj.y.slice(0, len),
                z: traj.z.slice(0, len),
                line: { width: 5, color: PITCH_COLORS[pitchType] || PITCH_COLORS[p.pitch_type] || '#888' },
                name: `${pitchType}`, hoverinfo: 'name'
            };
        });

        const ballTraces = validTrajs.map(({ traj, p }) => {
            const pitchType = getPitchLabel(p);
            const k = Math.min(frame, traj.x.length - 1);
            return {
                type: 'scatter3d', mode: 'markers',
                x: [traj.x[k]], y: [traj.y[k]], z: [traj.z[k]],
                marker: { size: 6, color: 'white', line: { color: PITCH_COLORS[pitchType] || PITCH_COLORS[p.pitch_type] || '#888', width: 2 } },
                showlegend: false, hoverinfo: 'none'
            };
        });

        return [...sceneTraces, ...lineTraces, ...ballTraces];
    }, [displayData, frame, sceneTraces]);


    return (
        <div className="rounded-xl overflow-hidden border border-border shadow-sm bg-card h-[600px] relative flex flex-col">
            {/* Header / Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/60 p-2 rounded text-white text-xs pointer-events-auto">
                    {language === 'ja' ? 'スクロール: ズーム | ドラッグ: 回転' : 'Scroll: Zoom | Drag: Rotate'}
                </div>

                {/* Selection Panel */}
                <div className="bg-black/80 p-3 rounded-lg border border-white/20 pointer-events-auto flex flex-col gap-2 min-w-[200px]">


                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">{language === 'ja' ? '球種フィルタ' : 'Pitch Type'}</label>
                        <select
                            value={selectedType}
                            onChange={(e) => { setSelectedType(e.target.value); setSelectedIndex('all'); setFrame(0); }}
                            className="bg-gray-800 text-white text-xs p-1 rounded border border-gray-600"
                        >
                            {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">{language === 'ja' ? '投球選択' : 'Select Pitch'}</label>
                        <select
                            value={selectedIndex}
                            onChange={(e) => { setSelectedIndex(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setFrame(0); }}
                            className="bg-gray-800 text-white text-xs p-1 rounded border border-gray-600"
                        >
                            <option value="all">{language === 'ja' ? `全表示 (${filteredData.length})` : `Show All (${filteredData.length})`}</option>
                            {filteredData.slice(0, 50).map((p, idx) => (
                                <option key={idx} value={idx}>
                                    {`#${idx + 1} ${getPitchLabel(p)} ${p.release_speed || p.Velocity ? Math.round(p.release_speed || p.Velocity) : ''}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Plot */}
            <div className="flex-1 min-h-0 relative">
                <Plot
                    data={plotData}
                    layout={layout}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                />
            </div>

            {/* Play Button Overlay */}
            <div className="absolute bottom-4 left-4 z-10">
                <button
                    onClick={() => {
                        if (isPlaying) {
                            setIsPlaying(false);
                        } else {
                            if (frame >= STEPS - 1) setFrame(0);
                            setIsPlaying(true);
                        }
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full font-bold shadow-lg transition-all"
                >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {language === 'ja' ? '再生' : 'Play'}
                </button>
            </div>
        </div>
    );
};

export default Trajectory3D;

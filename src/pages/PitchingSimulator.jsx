import React, { useState } from 'react';
import { Compass, Activity, Sparkles, Layers, Info } from 'lucide-react';
import Trajectory3D from '../components/Analysis/Trajectory3D';
import { useSettings } from '../context/SettingsContext';
import SeamSimulator from './SeamSimulator';

const PitchingSimulator = () => {
    const { language, units } = useSettings();
    // 'seam' (3D 縫い目・回転) または 'trajectory' (弾道軌道)
    const [activeTab, setActiveTab] = useState('seam');

    // Trajectory Simulator Params
    const [params, setParams] = useState({
        pitchType: 'Four-Seam',
        velocity: 150, // km/h
        releaseAngle: 2.0, // deg
        horizontalAngle: -1.0, // deg
        hb: 30, // cm
        vb: 40, // cm
        releaseHeight: 1.8, // m
        releaseSide: -0.5 // m
    });

    const [simulatedPitch, setSimulatedPitch] = useState([{
        pitch_type: 'Four-Seam',
        velocity: 150,
        release_angle: 2.0,
        horizontal_angle: -1.0,
        HB: 30,
        VB: 40,
        release_pos_z: 1.8,
        release_pos_x: -0.5,
        source: 'simulator'
    }]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setParams(prev => ({
            ...prev,
            [name]: name === 'pitchType' ? value : parseFloat(value)
        }));
    };

    const handleSimulate = () => {
        setSimulatedPitch([{
            pitch_type: params.pitchType,
            velocity: params.velocity,
            release_angle: params.releaseAngle,
            horizontal_angle: params.horizontalAngle,
            HB: params.hb,
            VB: params.vb,
            release_pos_z: params.releaseHeight,
            release_pos_x: params.releaseSide,
            source: 'simulator'
        }]);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
            
            {/* Top Header & Tab Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
                        ⚾ {language === 'ja' ? '投球 ＆ シームシミュレーター' : 'Pitch & Seam Simulator'}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {language === 'ja'
                            ? 'ラプソード風の3Dボール縫い目・回転シミュレーションおよび3D弾道軌道を可視化・分析します。'
                            : 'Simulate Rapsodo-style 3D ball seam & spin kinematics and pitch trajectory.'}
                    </p>
                </div>

                {/* Main Mode Tabs */}
                <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border shrink-0">
                    <button
                        onClick={() => setActiveTab('seam')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                            activeTab === 'seam'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                        }`}
                    >
                        <Compass className="w-4 h-4 text-amber-400" />
                        <span>3D 縫い目・回転 (Seam & Spin)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('trajectory')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-black text-xs transition-all cursor-pointer ${
                            activeTab === 'trajectory'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                        }`}
                    >
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span>3D 弾道軌道 (Trajectory)</span>
                    </button>
                </div>
            </div>

            {/* Content Display based on Active Tab */}
            {activeTab === 'seam' ? (
                /* 🌀 RAPSODO 3D SEAM & SPIN SIMULATOR */
                <SeamSimulator />
            ) : (
                /* 🚀 TRAJECTORY 3D SIMULATOR */
                <div className="grid md:grid-cols-3 gap-6">
                    {/* Input Panel */}
                    <div className="md:col-span-1 space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
                        <h3 className="font-bold text-lg mb-4">{language === 'ja' ? 'パラメータ設定' : 'Parameters'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">Pitch Type</label>
                                <select name="pitchType" value={params.pitchType} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm">
                                    <option value="Four-Seam">Four-Seam</option>
                                    <option value="Slider">Slider</option>
                                    <option value="Curveball">Curveball</option>
                                    <option value="ChangeUp">ChangeUp</option>
                                    <option value="Sinker">Sinker</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? '球速 (km/h)' : 'Velocity (km/h)'}</label>
                                    <input type="number" name="velocity" value={params.velocity} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.1" />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? 'リリース高さ (m)' : 'Release Height (m)'}</label>
                                    <input type="number" name="releaseHeight" value={params.releaseHeight} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.01" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? '縦角度 (deg)' : 'Release Angle (deg)'}</label>
                                    <input type="number" name="releaseAngle" value={params.releaseAngle} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.1" />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? '横角度 (deg)' : 'Horiz Angle (deg)'}</label>
                                    <input type="number" name="horizontalAngle" value={params.horizontalAngle} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.1" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? '縦変化量 (cm)' : 'Vertical Break (cm)'}</label>
                                    <input type="number" name="vb" value={params.vb} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.1" />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? '横変化量 (cm)' : 'Horiz Break (cm)'}</label>
                                    <input type="number" name="hb" value={params.hb} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.1" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-muted-foreground block mb-1">{language === 'ja' ? 'リリース位置横 (m)' : 'Release Side (m)'}</label>
                                <input type="number" name="releaseSide" value={params.releaseSide} onChange={handleChange} className="w-full bg-muted/50 border border-border rounded p-2 text-sm" step="0.01" />
                            </div>

                            <button onClick={handleSimulate} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-bold hover:opacity-90 transition-opacity mt-4 cursor-pointer">
                                {language === 'ja' ? 'シミュレーション実行' : 'Simulate'}
                            </button>
                        </div>
                    </div>

                    {/* Visualizer */}
                    <div className="md:col-span-2">
                        <Trajectory3D data={simulatedPitch} language={language} units={units} />
                        <div className="mt-4 p-4 bg-muted/30 rounded text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(simulatedPitch[0], null, 2)}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default PitchingSimulator;

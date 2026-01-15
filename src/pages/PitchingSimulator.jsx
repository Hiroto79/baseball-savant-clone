import React, { useState } from 'react';
import Trajectory3D from '../components/Analysis/Trajectory3D';
import { useSettings } from '../context/SettingsContext';

const PitchingSimulator = () => {
    const { language, units } = useSettings();

    // Default Manual Pitch
    // Matching User's Python "manual_pitches" example roughly
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
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <h1 className="text-3xl font-bold">{language === 'ja' ? '投球シミュレーター' : 'Pitching Simulator'}</h1>
            <p className="text-muted-foreground">
                {language === 'ja'
                    ? '数値を入力して3D軌道をシミュレーションします。'
                    : 'Input parameters to simulate 3D pitch trajectory.'}
            </p>

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

                        <button onClick={handleSimulate} className="w-full bg-primary text-primary-foreground py-2 rounded-md font-bold hover:opacity-90 transition-opacity mt-4">
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
        </div>
    );
};

export default PitchingSimulator;

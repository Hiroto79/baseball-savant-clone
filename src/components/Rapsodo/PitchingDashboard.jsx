import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend, ReferenceDot } from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import { convertVelocity, convertDistance } from '../../utils/units';

const COLORS = {
    'Fastball': '#ef4444',
    'Curveball': '#3b82f6',
    'Slider': '#eab308',
    'ChangeUp': '#22c55e',
    'Cutter': '#b91c1c',
    'Sinker': '#f97316',
    'Splitter': '#15803d',
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-sm z-50">
                <p className="font-bold text-popover-foreground">{data.type}</p>
                <p className="text-muted-foreground">Vel: {data.velocity} {data.velocityUnit}</p>
                <p className="text-muted-foreground">Spin: {data.spin} rpm</p>
                <p className="text-muted-foreground">Break: {data.hBreak}H / {data.vBreak}V</p>
            </div>
        );
    }
    return null;
};

const PitchingDashboard = ({ data = [] }) => {
    const { units, language } = useSettings();
    const stats = useMemo(() => {
        if (!data.length) return { avgVel: 0, maxSpin: 0, avgEff: 0, total: 0 };

        const vels = data.map(d => d.Velocity).filter(v => v);
        const spins = data.map(d => d['Total Spin']).filter(s => s);
        const effs = data.map(d => d['Spin Efficiency (release)']).filter(e => e);

        // Convert velocities to user's preferred units
        const convertedVels = vels.map(v => convertVelocity(v, 'kmh', units));

        return {
            total: data.length,
            avgVel: (convertedVels.reduce((a, b) => a + b, 0) / (convertedVels.length || 1)).toFixed(1),
            maxSpin: Math.max(...spins, 0),
            avgEff: (effs.reduce((a, b) => a + b, 0) / (effs.length || 1)).toFixed(1)
        };
    }, [data, units]);

    const pitchTypeStats = useMemo(() => {
        const stats = {};
        data.forEach(d => {
            const type = d['Pitch Type'] || 'Unknown';
            if (!stats[type]) {
                stats[type] = { count: 0, vel: 0, spin: 0, hBreak: 0, vBreak: 0, eff: 0 };
            }
            stats[type].count++;
            stats[type].vel += d.Velocity || 0;
            stats[type].spin += d['Total Spin'] || 0;
            stats[type].hBreak += d['Horizontal Break'] || 0;
            stats[type].vBreak += d['Vertical Break'] || 0;
            stats[type].eff += d['Spin Efficiency'] || 0;
        });

        return Object.entries(stats).map(([type, s]) => ({
            type,
            count: s.count,
            avgVel: convertVelocity(s.vel / s.count, 'kmh', units).toFixed(1),
            avgSpin: (s.spin / s.count).toFixed(0),
            avgHBreak: (s.hBreak / s.count).toFixed(1),
            avgVBreak: (s.vBreak / s.count).toFixed(1),
            avgEff: (s.eff / s.count).toFixed(1)
        })).sort((a, b) => b.count - a.count);
    }, [data, units]);

    const chartData = data.map(d => ({
        velocity: convertVelocity(d.Velocity, 'kmh', units),
        velocityUnit: units === 'imperial' ? 'mph' : 'km/h',
        spin: d['Total Spin'],
        hBreak: d['Horizontal Break'], // Fixed key
        vBreak: d['Vertical Break'],   // Fixed key
        releaseX: d['Release Side'],
        releaseZ: d['Release Height'],
        type: d['Pitch Type'] || 'Unknown'
    })).filter(d => d.velocity && d.spin);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '総投球数' : 'Total Pitches'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.total}</div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '平均球速' : 'Avg Velocity'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.avgVel} <span className="text-lg font-normal text-muted-foreground">{units === 'imperial' ? 'mph' : 'km/h'}</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '最大回転数' : 'Max Spin'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.maxSpin} <span className="text-lg font-normal text-muted-foreground">rpm</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '平均回転効率' : 'Avg Spin Efficiency'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.avgEff}%</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Velocity vs Spin */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? '球速 vs 回転数' : 'Velocity vs Spin Rate'}</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis type="number" dataKey="velocity" name={language === 'ja' ? '球速' : 'Velocity'} unit={units === 'imperial' ? ' mph' : ' km/h'} domain={['auto', 'auto']} stroke="#888" />
                                <YAxis type="number" dataKey="spin" name={language === 'ja' ? '回転数' : 'Spin Rate'} unit=" rpm" domain={['auto', 'auto']} stroke="#888" />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <Legend />
                                <Scatter name="Pitches" data={chartData}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.type] || '#94a3b8'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Movement Plot (Break) */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? '球の変化' : 'Pitch Movement'}</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis type="number" dataKey="hBreak" name={language === 'ja' ? '横変化' : 'Horizontal Break'} unit=" cm" domain={[-60, 60]} stroke="#888" />
                                <YAxis type="number" dataKey="vBreak" name={language === 'ja' ? '縦変化' : 'Vertical Break'} unit=" cm" domain={[-60, 60]} stroke="#888" />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <ReferenceDot x={0} y={0} r={5} fill="white" stroke="none" />
                                <Scatter name="Movement" data={chartData}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.type] || '#94a3b8'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Summary Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-semibold">{language === 'ja' ? '球種別サマリー' : 'Pitch Type Summary'}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="px-6 py-3">{language === 'ja' ? '球種' : 'Pitch Type'}</th>
                                <th className="px-6 py-3">{language === 'ja' ? '投球数' : 'Count'}</th>
                                <th className="px-6 py-3">{language === 'ja' ? '平均球速' : 'Avg Velocity'} ({units === 'imperial' ? 'mph' : 'km/h'})</th>
                                <th className="px-6 py-3">{language === 'ja' ? '平均回転数' : 'Avg Spin'} (rpm)</th>
                                <th className="px-6 py-3">{language === 'ja' ? '横変化' : 'Horizontal Break'} (cm)</th>
                                <th className="px-6 py-3">{language === 'ja' ? '縦変化' : 'Vertical Break'} (cm)</th>
                                <th className="px-6 py-3">{language === 'ja' ? '平均回転効率' : 'Avg Spin Efficiency'} (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pitchTypeStats.map((stat) => (
                                <tr key={stat.type} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 font-medium flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[stat.type] || '#94a3b8' }}></div>
                                        {stat.type}
                                    </td>
                                    <td className="px-6 py-4">{stat.count}</td>
                                    <td className="px-6 py-4">{stat.avgVel}</td>
                                    <td className="px-6 py-4">{stat.avgSpin}</td>
                                    <td className="px-6 py-4">{stat.avgHBreak}</td>
                                    <td className="px-6 py-4">{stat.avgVBreak}</td>
                                    <td className="px-6 py-4">{stat.avgEff}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PitchingDashboard;

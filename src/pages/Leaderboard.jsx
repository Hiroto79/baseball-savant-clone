import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useRapsodo } from '../context/RapsodoContext';
import { useBlast } from '../context/BlastContext';
import { useSettings } from '../context/SettingsContext';
import { Trophy, Medal, Activity, Zap, Target, Wind } from 'lucide-react';

const Leaderboard = () => {
    const { data: savantData, loading: savantLoading } = useData();
    const { pitchingData: rapsodoPitching, battingData: rapsodoBatting, loading: rapsodoLoading } = useRapsodo();
    const { blastData, loading: blastLoading } = useBlast();
    const { language, units } = useSettings();

    const [activeTab, setActiveTab] = useState('savant'); // 'savant' | 'rapsodo' | 'blast'
    const [metric, setMetric] = useState('exit_velocity'); // Default metric

    // Conversion constants
    const MPH_TO_KMH = 1.60934;
    const FT_TO_M = 0.3048;

    // Helper to convert velocity
    const convertVel = (val) => {
        if (val === null || val === undefined) return null;
        return units === 'metric' ? val * MPH_TO_KMH : val;
    };

    // Helper to convert distance
    const convertDist = (val) => {
        if (val === null || val === undefined) return null;
        return units === 'metric' ? val * FT_TO_M : val;
    };

    // Available metrics per tab
    const metrics = {
        savant: [
            { id: 'exit_velocity', label: language === 'ja' ? '最高打球速度' : 'Max Exit Velocity', icon: Zap, unit: units === 'metric' ? 'km/h' : 'mph' },
            { id: 'distance', label: language === 'ja' ? '最長飛距離' : 'Max Distance', icon: Target, unit: units === 'metric' ? 'm' : 'ft' },
            { id: 'pitch_velocity', label: language === 'ja' ? '最高球速' : 'Max Pitch Velocity', icon: Wind, unit: units === 'metric' ? 'km/h' : 'mph' },
            { id: 'spin_rate', label: language === 'ja' ? '最高回転数' : 'Max Spin Rate', icon: Activity, unit: 'rpm' },
        ],
        rapsodo: [
            { id: 'exit_velocity', label: language === 'ja' ? '最高打球速度' : 'Max Exit Velocity', icon: Zap, unit: units === 'metric' ? 'km/h' : 'mph' },
            { id: 'distance', label: language === 'ja' ? '最長飛距離' : 'Max Distance', icon: Target, unit: units === 'metric' ? 'm' : 'ft' },
            { id: 'pitch_velocity', label: language === 'ja' ? '最高球速' : 'Max Pitch Velocity', icon: Wind, unit: units === 'metric' ? 'km/h' : 'mph' },
            { id: 'spin_rate', label: language === 'ja' ? '最高回転数' : 'Max Spin Rate', icon: Activity, unit: 'rpm' },
        ],
        blast: [
            { id: 'bat_speed', label: language === 'ja' ? 'バットスピード' : 'Bat Speed', icon: Wind, unit: 'mph' }, // Blast is usually mph
            { id: 'peak_hand_speed', label: language === 'ja' ? 'ハンドスピード' : 'Peak Hand Speed', icon: Zap, unit: 'mph' },
            { id: 'power', label: language === 'ja' ? 'パワー' : 'Power', icon: Activity, unit: 'kW' },
            { id: 'rotation_score', label: language === 'ja' ? '回転スコア' : 'Rotation Score', icon: Target, unit: '' },
        ]
    };

    // Reset metric when tab changes
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setMetric(metrics[tab][0].id);
    };

    // Process Data for Leaderboard
    const leaderboardData = useMemo(() => {
        const rankings = [];
        const playerMap = {}; // To store max value per player

        if (activeTab === 'savant') {
            savantData.forEach(d => {
                // Batting Metrics
                if (metric === 'exit_velocity' || metric === 'distance') {
                    const p = d.batter_name;
                    if (!p) return;

                    let val = 0;
                    if (metric === 'exit_velocity') val = d.launch_speed;
                    if (metric === 'distance') val = d.hit_distance_sc;

                    if (val && !isNaN(val)) {
                        val = Number(val);
                        if (!playerMap[p] || val > playerMap[p].value) {
                            playerMap[p] = { name: p, value: val, team: d.home_team === p ? d.away_team : d.home_team }; // Team logic is fuzzy in Savant CSV
                        }
                    }
                }
                // Pitching Metrics
                else {
                    const p = d.player_name; // Pitcher
                    if (!p) return;

                    let val = 0;
                    if (metric === 'pitch_velocity') val = d.release_speed;
                    if (metric === 'spin_rate') val = d.release_spin_rate;

                    if (val && !isNaN(val)) {
                        val = Number(val);
                        if (!playerMap[p] || val > playerMap[p].value) {
                            playerMap[p] = { name: p, value: val };
                        }
                    }
                }
            });
        } else if (activeTab === 'rapsodo') {
            // Batting
            if (metric === 'exit_velocity' || metric === 'distance') {
                rapsodoBatting.forEach(d => {
                    const p = d['Player Name'];
                    if (!p) return;

                    let val = 0;
                    if (metric === 'exit_velocity') val = d.ExitVelocity;
                    if (metric === 'distance') val = d.Distance;

                    if (val && !isNaN(val)) {
                        val = Number(val);
                        if (!playerMap[p] || val > playerMap[p].value) {
                            playerMap[p] = { name: p, value: val };
                        }
                    }
                });
            }
            // Pitching
            else {
                rapsodoPitching.forEach(d => {
                    const p = d['Player Name'];
                    if (!p) return;

                    let val = 0;
                    if (metric === 'pitch_velocity') val = d.Velocity;
                    if (metric === 'spin_rate') val = d['Total Spin'];

                    if (val && !isNaN(val)) {
                        val = Number(val);
                        if (!playerMap[p] || val > playerMap[p].value) {
                            playerMap[p] = { name: p, value: val };
                        }
                    }
                });
            }
        } else if (activeTab === 'blast') {
            blastData.forEach(d => {
                const p = d.PlayerName;
                if (!p) return;

                let val = 0;
                if (metric === 'bat_speed') val = d.BatSpeed;
                if (metric === 'peak_hand_speed') val = d.PeakHandSpeed;
                if (metric === 'power') val = d.Power;
                if (metric === 'rotation_score') val = d.RotationScore;

                if (val && !isNaN(val)) {
                    val = Number(val);
                    if (!playerMap[p] || val > playerMap[p].value) {
                        playerMap[p] = { name: p, value: val };
                    }
                }
            });
        }

        // Convert map to array and sort
        return Object.values(playerMap)
            .sort((a, b) => b.value - a.value)
            .slice(0, 50) // Top 50
            .map((item, index) => ({
                rank: index + 1,
                ...item,
                displayValue: formatValue(item.value, metric, activeTab)
            }));

    }, [activeTab, metric, savantData, rapsodoPitching, rapsodoBatting, blastData, units]);

    // Helper to format value for display
    function formatValue(val, metricId, source) {
        if (metricId === 'exit_velocity' || metricId === 'pitch_velocity') {
            // Savant is mph, Rapsodo is km/h (usually, but context handles it? No, context stores raw)
            // Actually Rapsodo context stores raw, but we need to know what raw is.
            // Assuming Savant = mph, Rapsodo = km/h (based on previous files), Blast = mph

            let finalVal = val;
            if (source === 'savant') {
                finalVal = convertVel(val); // mph -> user unit
            } else if (source === 'rapsodo') {
                // Rapsodo raw is usually km/h. If user wants mph, convert back.
                // If user wants metric (km/h), keep it.
                if (units === 'imperial') finalVal = val * 0.621371; // km/h -> mph
                else finalVal = val; // km/h -> km/h
            } else if (source === 'blast') {
                // Blast is mph.
                finalVal = convertVel(val);
            }
            return finalVal.toFixed(1);
        }

        if (metricId === 'distance') {
            // Savant = ft, Rapsodo = m
            let finalVal = val;
            if (source === 'savant') {
                finalVal = convertDist(val); // ft -> user unit
            } else if (source === 'rapsodo') {
                // Rapsodo raw is m.
                if (units === 'imperial') finalVal = val * 3.28084; // m -> ft
                else finalVal = val; // m -> m
            }
            return finalVal.toFixed(1);
        }

        if (metricId === 'spin_rate') return Math.round(val).toLocaleString();

        return val.toFixed(1);
    }

    const isLoading = savantLoading || rapsodoLoading || blastLoading;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Trophy className="h-8 w-8 text-amber-500" />
                        {language === 'ja' ? 'リーダーボード' : 'Leaderboard'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {language === 'ja' ? '各指標のトップパフォーマー' : 'Top performers across key metrics'}
                    </p>
                </div>

                {/* Tab Selector */}
                <div className="flex bg-muted p-1 rounded-lg">
                    {['savant', 'rapsodo', 'blast'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metric Selector */}
            <div className="flex flex-wrap gap-2">
                {metrics[activeTab].map((m) => {
                    const Icon = m.icon;
                    return (
                        <button
                            key={m.id}
                            onClick={() => setMetric(m.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${metric === m.id
                                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                                    : 'border-border bg-card hover:border-primary/50 hover:bg-accent'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${metric === m.id ? 'bg-primary/10' : 'bg-muted'}`}>
                                <Icon size={18} />
                            </div>
                            <div className="text-left">
                                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    {activeTab}
                                </div>
                                <div className="font-semibold">
                                    {m.label}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Ranking Table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left font-medium text-muted-foreground w-20">Rank</th>
                                <th className="px-6 py-4 text-left font-medium text-muted-foreground">Player</th>
                                <th className="px-6 py-4 text-right font-medium text-muted-foreground">
                                    {metrics[activeTab].find(m => m.id === metric)?.label}
                                    <span className="ml-1 text-xs opacity-70">
                                        ({metrics[activeTab].find(m => m.id === metric)?.unit})
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-muted-foreground">
                                        Loading data...
                                    </td>
                                </tr>
                            ) : leaderboardData.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-12 text-center text-muted-foreground">
                                        No data available for this metric.
                                    </td>
                                </tr>
                            ) : (
                                leaderboardData.map((row) => (
                                    <tr key={row.rank} className="group hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-medium">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${row.rank === 1 ? 'bg-yellow-500/10 text-yellow-600' :
                                                    row.rank === 2 ? 'bg-slate-400/10 text-slate-500' :
                                                        row.rank === 3 ? 'bg-amber-700/10 text-amber-700' :
                                                            'text-muted-foreground'
                                                }`}>
                                                {row.rank <= 3 ? <Medal size={16} /> : row.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-base">{row.name}</div>
                                            {row.team && <div className="text-xs text-muted-foreground">{row.team}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-lg font-semibold text-primary">
                                            {row.displayValue}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

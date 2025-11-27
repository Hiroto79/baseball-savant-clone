import React, { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import ComparisonChart from './ComparisonChart';
import ComparisonTable from './ComparisonTable';
import PlayerSearch from './PlayerSearch';
import PitchTypeSelector from './PitchTypeSelector';
import { ChevronsUpDown } from 'lucide-react';

const RapsodoAnalysis = ({ pitchingData, battingData }) => {
    const { language, units } = useSettings();
    const [mode, setMode] = useState('pitching'); // 'pitching' or 'batting'
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [selectedPitchTypes, setSelectedPitchTypes] = useState([]);

    // Conversion constants
    // Rapsodo data is assumed to be in Metric (km/h, m, cm) based on user input
    const KMH_TO_MPH = 0.621371;
    const M_TO_FT = 3.28084;
    const CM_TO_IN = 0.393701;

    // Helper to convert velocity (km/h -> target)
    const convertVel = (val) => {
        if (val === null || val === undefined) return null;
        return units === 'imperial' ? val * KMH_TO_MPH : val;
    };

    // Helper to convert distance (m -> target)
    const convertDist = (val) => {
        if (val === null || val === undefined) return null;
        return units === 'imperial' ? val * M_TO_FT : val;
    };

    // Helper to convert break (cm -> target)
    // Rapsodo break is usually cm or inches. 
    // If we assume Rapsodo is fully Metric, break is cm.
    const convertBreak = (val) => {
        if (val === null || val === undefined) return null;
        return units === 'imperial' ? val * CM_TO_IN : val;
    };

    // Extract unique players
    const players = useMemo(() => {
        const data = mode === 'pitching' ? pitchingData : battingData;
        const names = new Set(data.map(d => d['Player Name']).filter(Boolean));
        return Array.from(names).sort();
    }, [pitchingData, battingData, mode]);

    // Extract available pitch types
    const availablePitchTypes = useMemo(() => {
        if (mode !== 'pitching' || selectedPlayers.length === 0) return [];
        const types = new Set();
        pitchingData.forEach(d => {
            if (selectedPlayers.includes(d['Player Name']) && d['Pitch Type']) {
                types.add(d['Pitch Type']);
            }
        });
        return Array.from(types).sort();
    }, [pitchingData, mode, selectedPlayers]);

    // Toggle player selection
    const togglePlayer = (player) => {
        setSelectedPlayers(prev =>
            prev.includes(player)
                ? prev.filter(p => p !== player)
                : [...prev, player]
        );
    };

    // Toggle pitch type selection
    const togglePitchType = (type) => {
        setSelectedPitchTypes(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    // Prepare Chart Data and Summary Data
    const { chartData, summaryData } = useMemo(() => {
        if (selectedPlayers.length === 0) return { chartData: [], summaryData: {} };

        const sourceData = mode === 'pitching' ? pitchingData : battingData;
        const dateMap = {};
        const playerTotals = {};

        selectedPlayers.forEach(p => {
            // Initializing totals is tricky with dynamic keys, so we'll do it on demand or just use a map
        });

        sourceData.forEach(d => {
            if (!selectedPlayers.includes(d['Player Name']) || !d.Date) return;

            const p = d['Player Name'];
            const date = d.Date;

            if (!dateMap[date]) dateMap[date] = { date: date };

            if (mode === 'pitching') {
                const pType = d['Pitch Type'] || 'Unknown';
                if (selectedPitchTypes.length > 0 && !selectedPitchTypes.includes(pType)) return;

                const keyBase = selectedPitchTypes.length > 0 ? `${p} [${pType}]` : p;

                if (!dateMap[date][`${keyBase}_count`]) {
                    dateMap[date][`${keyBase}_count`] = 0;
                    dateMap[date][`${keyBase}_vel`] = 0;
                    dateMap[date][`${keyBase}_spin`] = 0;
                    dateMap[date][`${keyBase}_eff`] = 0;
                    dateMap[date][`${keyBase}_hbreak`] = 0;
                    dateMap[date][`${keyBase}_vbreak`] = 0;
                }

                const vel = convertVel(d.Velocity);
                const spin = d['Total Spin'] || 0;
                const eff = d['Spin Efficiency'] || 0;
                const hbreak = convertBreak(d['Horizontal Break']);
                const vbreak = convertBreak(d['Vertical Break']);

                if (vel) {
                    dateMap[date][`${keyBase}_vel`] += vel;
                    dateMap[date][`${keyBase}_spin`] += spin;
                    dateMap[date][`${keyBase}_eff`] += eff;
                    dateMap[date][`${keyBase}_hbreak`] += hbreak;
                    dateMap[date][`${keyBase}_vbreak`] += vbreak;
                    dateMap[date][`${keyBase}_count`]++;
                }

                // Summary Totals
                if (!playerTotals[keyBase]) {
                    playerTotals[keyBase] = { count: 0, vel: 0, spin: 0, eff: 0, hbreak: 0, vbreak: 0 };
                }
                if (vel) {
                    playerTotals[keyBase].vel += vel;
                    playerTotals[keyBase].spin += spin;
                    playerTotals[keyBase].eff += eff;
                    playerTotals[keyBase].hbreak += hbreak;
                    playerTotals[keyBase].vbreak += vbreak;
                    playerTotals[keyBase].count++;
                }

            } else {
                // Batting - use direct calculation like BattingDashboard
                const p = d['Player Name'];
                if (!selectedPlayers.includes(p)) return;

                if (!dateMap[date][`${p}_count`]) {
                    dateMap[date][`${p}_count`] = 0;
                    dateMap[date][`${p}_exit`] = 0;
                    dateMap[date][`${p}_dist`] = 0;
                }

                // Get raw values - prioritize ExitVelocity (no space)
                const exitVel = d.ExitVelocity || d['Exit Velocity'] || d['Exit Speed'];
                const dist = d.Distance || d['Distance'] || d['Total Distance'];

                if (exitVel != null && !isNaN(exitVel) && exitVel > 0) {
                    const convertedExit = convertVel(Number(exitVel));
                    dateMap[date][`${p}_exit`] += convertedExit;
                    dateMap[date][`${p}_count`]++;
                }

                if (dist != null && !isNaN(dist) && dist > 0) {
                    const convertedDist = convertDist(Number(dist));
                    dateMap[date][`${p}_dist`] += convertedDist;
                }

                if (!playerTotals[p]) {
                    playerTotals[p] = { count: 0, exit: 0, dist: 0, exitCount: 0, distCount: 0 };
                }

                if (exitVel != null && !isNaN(exitVel) && exitVel > 0) {
                    const convertedExit = convertVel(Number(exitVel));
                    playerTotals[p].exit += convertedExit;
                    playerTotals[p].exitCount++;
                }

                if (dist != null && !isNaN(dist) && dist > 0) {
                    const convertedDist = convertDist(Number(dist));
                    playerTotals[p].dist += convertedDist;
                    playerTotals[p].distCount++;
                }

                playerTotals[p].count = Math.max(playerTotals[p].exitCount, playerTotals[p].distCount);
            }
        });

        // Finalize Chart Data
        const finalChartData = Object.values(dateMap).map(day => {
            const entry = { date: day.date };
            Object.keys(day).forEach(key => {
                if (key === 'date') return;
                if (key.endsWith('_count')) {
                    const baseKey = key.replace('_count', '');
                    const count = day[key];
                    if (count > 0) {
                        if (mode === 'pitching') {
                            entry[`${baseKey}_vel`] = day[`${baseKey}_vel`] / count;
                            entry[`${baseKey}_spin`] = day[`${baseKey}_spin`] / count;
                            entry[`${baseKey}_eff`] = day[`${baseKey}_eff`] / count;
                            entry[`${baseKey}_hbreak`] = day[`${baseKey}_hbreak`] / count;
                            entry[`${baseKey}_vbreak`] = day[`${baseKey}_vbreak`] / count;
                        } else {
                            entry[`${baseKey}_exit`] = day[`${baseKey}_exit`] / count;
                            entry[`${baseKey}_dist`] = day[`${baseKey}_dist`] / count;
                        }
                    }
                }
            });
            return entry;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Build summary data
        const finalSummaryData = {};
        Object.keys(playerTotals).forEach(key => {
            const totals = playerTotals[key];
            if (mode === 'pitching') {
                finalSummaryData[key] = {
                    vel: totals.count > 0 ? totals.vel / totals.count : 0,
                    spin: totals.count > 0 ? totals.spin / totals.count : 0,
                    eff: totals.count > 0 ? totals.eff / totals.count : 0,
                    hbreak: totals.count > 0 ? totals.hbreak / totals.count : 0,
                    vbreak: totals.count > 0 ? totals.vbreak / totals.count : 0,
                    count: totals.count
                };
            } else {
                finalSummaryData[key] = {
                    exit: totals.exitCount > 0 ? totals.exit / totals.exitCount : 0,
                    dist: totals.distCount > 0 ? totals.dist / totals.distCount : 0,
                    count: totals.count
                };
            }
        });

        console.log('Rapsodo Analysis Summary Data:', finalSummaryData);
        console.log('Rapsodo Analysis Player Totals:', playerTotals);

        return { chartData: finalChartData, summaryData: finalSummaryData };

    }, [pitchingData, battingData, mode, selectedPlayers, selectedPitchTypes, units]);

    // Define metrics
    const metrics = mode === 'pitching'
        ? [
            { key: 'vel', label: language === 'ja' ? '平均球速' : 'Avg Velocity', unit: units === 'metric' ? 'km/h' : 'mph' },
            { key: 'spin', label: language === 'ja' ? '平均回転数' : 'Avg Spin', unit: 'rpm' },
            { key: 'eff', label: language === 'ja' ? '回転効率' : 'Spin Eff', unit: '%' },
            { key: 'hbreak', label: language === 'ja' ? '横の変化量' : 'H-Break', unit: units === 'metric' ? 'cm' : 'in' },
            { key: 'vbreak', label: language === 'ja' ? '縦の変化量' : 'V-Break', unit: units === 'metric' ? 'cm' : 'in' },
            { key: 'count', label: language === 'ja' ? '投球数' : 'Pitch Count', unit: '' }
        ]
        : [
            { key: 'exit', label: language === 'ja' ? '平均打球速度' : 'Avg Exit Vel', unit: units === 'metric' ? 'km/h' : 'mph' },
            { key: 'dist', label: language === 'ja' ? '平均飛距離' : 'Avg Distance', unit: units === 'metric' ? 'm' : 'ft' },
            { key: 'count', label: language === 'ja' ? '打球数' : 'Hit Count', unit: '' }
        ];

    const chartLines = useMemo(() => {
        return Object.keys(summaryData).map(key => ({
            name: key,
            id: key
        }));
    }, [summaryData]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="flex flex-col gap-4 bg-card p-4 rounded-xl border border-border">
                {/* Mode Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => { setMode('pitching'); setSelectedPlayers([]); setSelectedPitchTypes([]); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'pitching' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {language === 'ja' ? 'ピッチング' : 'Pitching'}
                    </button>
                    <button
                        onClick={() => { setMode('batting'); setSelectedPlayers([]); setSelectedPitchTypes([]); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'batting' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {language === 'ja' ? 'バッティング' : 'Batting'}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                    {/* Player Search */}
                    <div className="w-full md:w-[400px]">
                        <PlayerSearch
                            players={players}
                            selectedPlayers={selectedPlayers}
                            onTogglePlayer={togglePlayer}
                        />
                    </div>

                    {/* Pitch Type Selector (Pitching Mode Only) */}
                    {mode === 'pitching' && selectedPlayers.length > 0 && (
                        <div className="w-full md:w-auto">
                            <PitchTypeSelector
                                pitchTypes={availablePitchTypes}
                                selectedPitchTypes={selectedPitchTypes}
                                onToggle={togglePitchType}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            {selectedPlayers.length > 0 ? (
                <div className="space-y-6">
                    {/* Comparison Table */}
                    <ComparisonTable data={summaryData} metrics={metrics} />

                    {/* Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {mode === 'pitching' ? (
                            <>
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_vel`, name: l.name }))}
                                    yLabel={language === 'ja' ? `平均球速 (${units === 'metric' ? 'km/h' : 'mph'})` : `Avg Velocity (${units === 'metric' ? 'km/h' : 'mph'})`}
                                />
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_spin`, name: l.name }))}
                                    yLabel={language === 'ja' ? '平均回転数 (rpm)' : 'Avg Spin Rate (rpm)'}
                                />
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_eff`, name: l.name }))}
                                    yLabel={language === 'ja' ? '回転効率 (%)' : 'Spin Efficiency (%)'}
                                />
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_hbreak`, name: l.name }))}
                                    yLabel={language === 'ja' ? `横の変化量 (${units === 'metric' ? 'cm' : 'in'})` : `Horizontal Break (${units === 'metric' ? 'cm' : 'in'})`}
                                />
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_vbreak`, name: l.name }))}
                                    yLabel={language === 'ja' ? `縦の変化量 (${units === 'metric' ? 'cm' : 'in'})` : `Vertical Break (${units === 'metric' ? 'cm' : 'in'})`}
                                />
                            </>
                        ) : (
                            <>
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_exit`, name: l.name }))}
                                    yLabel={language === 'ja' ? `平均打球速度 (${units === 'metric' ? 'km/h' : 'mph'})` : `Avg Exit Velocity (${units === 'metric' ? 'km/h' : 'mph'})`}
                                />
                                <ComparisonChart
                                    data={chartData}
                                    lines={chartLines.map(l => ({ dataKey: `${l.id}_dist`, name: l.name }))}
                                    yLabel={language === 'ja' ? `平均飛距離 (${units === 'metric' ? 'm' : 'ft'})` : `Avg Distance (${units === 'metric' ? 'm' : 'ft'})`}
                                />
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                    <ChevronsUpDown className="h-12 w-12 mb-4 opacity-20" />
                    <p>{language === 'ja' ? '選手を選択して比較を開始してください' : 'Select players to start comparison'}</p>
                </div>
            )}
        </div>
    );
};

export default RapsodoAnalysis;

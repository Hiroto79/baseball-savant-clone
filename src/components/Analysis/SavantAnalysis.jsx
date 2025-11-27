import React, { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import ComparisonChart from './ComparisonChart';
import ComparisonTable from './ComparisonTable';
import ScatterPlot from './ScatterPlot';
import PlayerSearch from './PlayerSearch';
import PitchTypeSelector from './PitchTypeSelector';
import { ChevronsUpDown } from 'lucide-react';

const SavantAnalysis = ({ data }) => {
    const { language, units } = useSettings();
    const [mode, setMode] = useState('pitching'); // 'pitching' | 'batting'
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [selectedPitchTypes, setSelectedPitchTypes] = useState([]);
    const [dateRange, setDateRange] = useState('all'); // 'all' | 'custom'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    // Filter data by date range (for batting mode) - MUST be before players
    const filteredData = useMemo(() => {
        if (mode !== 'batting' || dateRange === 'all') return data;
        if (!startDate && !endDate) return data;

        return data.filter(d => {
            const gameDate = d.game_date;
            if (!gameDate) return false;

            if (startDate && gameDate < startDate) return false;
            if (endDate && gameDate > endDate) return false;
            return true;
        });
    }, [data, mode, dateRange, startDate, endDate]);

    // Extract unique players based on mode
    const players = useMemo(() => {
        const names = new Set();
        filteredData.forEach(d => {
            if (mode === 'pitching' && d.player_name) names.add(String(d.player_name));
            if (mode === 'batting' && d.batter_name) names.add(String(d.batter_name));
        });
        const playerList = Array.from(names).sort();
        console.log(`Savant ${mode} players:`, playerList.slice(0, 5));
        return playerList;
    }, [filteredData, mode]);

    // Extract available pitch types for selected pitchers
    const availablePitchTypes = useMemo(() => {
        if (mode !== 'pitching' || selectedPlayers.length === 0) return [];
        const types = new Set();
        filteredData.forEach(d => {
            if (selectedPlayers.includes(d.player_name) && d.pitch_name) {
                types.add(d.pitch_name);
            }
        });
        return Array.from(types).sort();
    }, [filteredData, mode, selectedPlayers]);

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

        const dateMap = {};
        const playerTotals = {};

        // Helper to check if a pitch is a swing
        const isSwing = (desc) => ['swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'missed_bunt', 'foul_bunt'].includes(desc);
        // Helper to check if a pitch is a whiff (swing and miss)
        const isWhiff = (desc) => ['swinging_strike', 'swinging_strike_blocked'].includes(desc);
        // Helper to check if a pitch is a strike (including fouls and balls in play)
        const isStrike = (desc, zone) => ['called_strike', 'swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'foul_bunt', 'missed_bunt'].includes(desc);

        filteredData.forEach(d => {
            const date = d.game_date;
            if (!date) return;

            if (!dateMap[date]) dateMap[date] = { date: date };

            if (mode === 'pitching') {
                const p = d.player_name;
                if (!selectedPlayers.includes(p)) return;

                const pType = d.pitch_name || 'Unknown';
                // Filter by pitch type if any are selected
                if (selectedPitchTypes.length > 0 && !selectedPitchTypes.includes(pType)) return;

                // We will aggregate by (Player + Pitch Type)
                // Key format: `${p} [${pType}]`
                const keyBase = selectedPitchTypes.length > 0 ? `${p} [${pType}]` : p;

                if (!dateMap[date][`${keyBase}_count`]) {
                    dateMap[date][`${keyBase}_count`] = 0;
                    dateMap[date][`${keyBase}_vel`] = 0;
                    dateMap[date][`${keyBase}_spin`] = 0;
                    dateMap[date][`${keyBase}_whiffs`] = 0;
                    dateMap[date][`${keyBase}_swings`] = 0;
                    dateMap[date][`${keyBase}_strikes`] = 0;
                }

                if (d.release_speed) {
                    // Savant is always Imperial (mph)
                    const vel = convertVel(d.release_speed);

                    dateMap[date][`${keyBase}_vel`] += vel;
                    dateMap[date][`${keyBase}_spin`] += (d.release_spin_rate || 0);
                    dateMap[date][`${keyBase}_count`]++;

                    if (isSwing(d.description)) {
                        dateMap[date][`${keyBase}_swings`]++;
                        if (isWhiff(d.description)) {
                            dateMap[date][`${keyBase}_whiffs`]++;
                        }
                    }
                    if (isStrike(d.description, d.zone)) {
                        dateMap[date][`${keyBase}_strikes`]++;
                    }
                }

                // Summary Totals
                if (!playerTotals[keyBase]) {
                    playerTotals[keyBase] = { count: 0, vel: 0, spin: 0, whiffs: 0, swings: 0, strikes: 0 };
                }
                if (d.release_speed) {
                    const vel = convertVel(d.release_speed);
                    playerTotals[keyBase].vel += vel;
                    playerTotals[keyBase].spin += (d.release_spin_rate || 0);
                    playerTotals[keyBase].count++;

                    if (isSwing(d.description)) {
                        playerTotals[keyBase].swings++;
                        if (isWhiff(d.description)) {
                            playerTotals[keyBase].whiffs++;
                        }
                    }
                    if (isStrike(d.description, d.zone)) {
                        playerTotals[keyBase].strikes++;
                    }
                }
            } else {
                // Batting Mode - use direct calculation
                const p = String(d.batter_name); // Convert to string for comparison

                if (!selectedPlayers.includes(p)) return;

                if (!dateMap[date][`${p}_exit_sum`]) {
                    dateMap[date][`${p}_exit_sum`] = 0;
                    dateMap[date][`${p}_dist_sum`] = 0;
                    dateMap[date][`${p}_angle_sum`] = 0;
                    dateMap[date][`${p}_exit_count`] = 0;
                    dateMap[date][`${p}_dist_count`] = 0;
                    dateMap[date][`${p}_angle_count`] = 0;
                }

                const launchSpeed = d.launch_speed;
                const hitDist = d.hit_distance_sc;
                const launchAngle = d.launch_angle;

                if (launchSpeed != null && !isNaN(launchSpeed) && Number(launchSpeed) > 0) {
                    const convertedExit = convertVel(Number(launchSpeed));
                    dateMap[date][`${p}_exit_sum`] += convertedExit;
                    dateMap[date][`${p}_exit_count`]++;
                }

                if (hitDist != null && !isNaN(hitDist) && Number(hitDist) > 0) {
                    const convertedDist = convertDist(Number(hitDist));
                    dateMap[date][`${p}_dist_sum`] += convertedDist;
                    dateMap[date][`${p}_dist_count`]++;
                }

                if (launchAngle != null && !isNaN(launchAngle)) {
                    dateMap[date][`${p}_angle_sum`] += Number(launchAngle);
                    dateMap[date][`${p}_angle_count`]++;
                }

                if (!playerTotals[p]) {
                    playerTotals[p] = { exit: 0, dist: 0, angle: 0, exitCount: 0, distCount: 0, angleCount: 0 };
                }

                if (launchSpeed != null && !isNaN(launchSpeed) && Number(launchSpeed) > 0) {
                    const convertedExit = convertVel(Number(launchSpeed));
                    playerTotals[p].exit += convertedExit;
                    playerTotals[p].exitCount++;
                }

                if (hitDist != null && !isNaN(hitDist) && Number(hitDist) > 0) {
                    const convertedDist = convertDist(Number(hitDist));
                    playerTotals[p].dist += convertedDist;
                    playerTotals[p].distCount++;
                }

                if (launchAngle != null && !isNaN(launchAngle)) {
                    playerTotals[p].angle += Number(launchAngle);
                    playerTotals[p].angleCount++;
                }
            }
        });

        // Build chart data
        const dates = Object.keys(dateMap).sort();
        const finalChartData = dates.map(date => {
            const entry = { date };
            Object.keys(playerTotals).forEach(key => {
                if (mode === 'pitching') {
                    const count = dateMap[date][`${key}_count`] || 0;
                    entry[`${key}_vel`] = count > 0 ? dateMap[date][`${key}_vel`] / count : null;
                    entry[`${key}_spin`] = count > 0 ? dateMap[date][`${key}_spin`] / count : null;
                } else {
                    // Batting - use separate counts for exit, dist, and angle
                    const exitCount = dateMap[date][`${key}_exit_count`] || 0;
                    const distCount = dateMap[date][`${key}_dist_count`] || 0;
                    const angleCount = dateMap[date][`${key}_angle_count`] || 0;
                    entry[`${key}_exit`] = exitCount > 0 ? dateMap[date][`${key}_exit_sum`] / exitCount : null;
                    entry[`${key}_dist`] = distCount > 0 ? dateMap[date][`${key}_dist_sum`] / distCount : null;
                    entry[`${key}_angle`] = angleCount > 0 ? dateMap[date][`${key}_angle_sum`] / angleCount : null;
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
                    whiff: totals.swings > 0 ? (totals.whiffs / totals.swings) * 100 : 0,
                    strike: totals.count > 0 ? (totals.strikes / totals.count) * 100 : 0,
                    count: totals.count
                };
            } else {
                finalSummaryData[key] = {
                    exit: totals.exitCount > 0 ? totals.exit / totals.exitCount : 0,
                    dist: totals.distCount > 0 ? totals.dist / totals.distCount : 0,
                    angle: totals.angleCount > 0 ? totals.angle / totals.angleCount : 0,
                    count: totals.exitCount + totals.distCount
                };
            }
        });

        console.log('Savant Analysis Summary Data:', finalSummaryData);
        console.log('Savant Analysis Chart Data sample:', finalChartData.slice(0, 3));

        return { chartData: finalChartData, summaryData: finalSummaryData };

    }, [filteredData, mode, selectedPlayers, selectedPitchTypes, units]);

    // Prepare scatter plot data for batting mode
    const scatterData = useMemo(() => {
        if (mode !== 'batting' || selectedPlayers.length === 0) return [];

        const data = [];
        filteredData.forEach(d => {
            const p = String(d.batter_name);
            if (!selectedPlayers.includes(p)) return;

            const launchSpeed = d.launch_speed;
            const launchAngle = d.launch_angle;

            if (launchSpeed != null && !isNaN(launchSpeed) && Number(launchSpeed) > 0 &&
                launchAngle != null && !isNaN(launchAngle)) {
                data.push({
                    player: p,
                    exitVelocity: convertVel(Number(launchSpeed)),
                    launchAngle: Number(launchAngle)
                });
            }
        });

        return data;
    }, [filteredData, mode, selectedPlayers, units]);

    // Prepare bat speed scatter plot data for batting mode
    const batSpeedScatterData = useMemo(() => {
        if (mode !== 'batting' || selectedPlayers.length === 0) return [];

        const data = [];
        filteredData.forEach(d => {
            const p = String(d.batter_name);
            if (!selectedPlayers.includes(p)) return;

            const launchSpeed = d.launch_speed;
            const batSpeed = d.bat_speed;

            if (launchSpeed != null && !isNaN(launchSpeed) && Number(launchSpeed) > 0 &&
                batSpeed != null && !isNaN(batSpeed) && Number(batSpeed) > 0) {
                data.push({
                    player: p,
                    exitVelocity: convertVel(Number(launchSpeed)),
                    batSpeed: convertVel(Number(batSpeed))
                });
            }
        });

        return data;
    }, [filteredData, mode, selectedPlayers, units]);

    // Define metrics
    const metrics = mode === 'pitching'
        ? [
            { key: 'vel', label: language === 'ja' ? '平均球速' : 'Avg Velocity', unit: units === 'metric' ? 'km/h' : 'mph' },
            { key: 'spin', label: language === 'ja' ? '平均回転数' : 'Avg Spin', unit: 'rpm' },
            { key: 'whiff', label: language === 'ja' ? '空振り率' : 'Whiff Rate', unit: '%' },
            { key: 'strike', label: language === 'ja' ? 'ストライク率' : 'Strike Rate', unit: '%' },
            { key: 'count', label: language === 'ja' ? '投球数' : 'Pitch Count', unit: '' }
        ]
        : [
            { key: 'exit', label: language === 'ja' ? '平均打球速度' : 'Avg Exit Vel', unit: units === 'metric' ? 'km/h' : 'mph' },
            { key: 'dist', label: language === 'ja' ? '平均飛距離' : 'Avg Distance', unit: units === 'metric' ? 'm' : 'ft' },
            { key: 'angle', label: language === 'ja' ? '平均打球角度' : 'Avg Launch Angle', unit: '°' },
            { key: 'count', label: language === 'ja' ? '打球数' : 'Hit Count', unit: '' }
        ];

    // Generate lines for charts
    // We need to know all the keys generated (Player + Pitch Type combinations)
    const chartLines = useMemo(() => {
        return Object.keys(summaryData).map(key => ({
            name: key,
            id: key // Use key as ID for mapping
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

                    {/* Date Range Filter (Batting Mode Only) */}
                    {mode === 'batting' && (
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <label className="text-sm font-medium text-muted-foreground">
                                {language === 'ja' ? '期間' : 'Date Range'}
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDateRange('all')}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {language === 'ja' ? 'すべて' : 'ALL'}
                                </button>
                                <button
                                    onClick={() => setDateRange('custom')}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${dateRange === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {language === 'ja' ? 'カスタム' : 'Custom'}
                                </button>
                            </div>
                            {dateRange === 'custom' && (
                                <div className="flex gap-2 mt-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">
                                            {language === 'ja' ? '開始日' : 'Start'}
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs text-muted-foreground">
                                            {language === 'ja' ? '終了日' : 'End'}
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="px-2 py-1 rounded-md border border-border bg-background text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                            </>
                        ) : (
                            <>
                                <ScatterPlot
                                    data={scatterData}
                                    xKey="launchAngle"
                                    yKey="exitVelocity"
                                    xLabel={language === 'ja' ? '打球角度 (°)' : 'Launch Angle (°)'}
                                    yLabel={language === 'ja' ? `打球速度 (${units === 'metric' ? 'km/h' : 'mph'})` : `Exit Velocity (${units === 'metric' ? 'km/h' : 'mph'})`}
                                />
                                <ScatterPlot
                                    data={batSpeedScatterData}
                                    xKey="batSpeed"
                                    yKey="exitVelocity"
                                    xLabel={language === 'ja' ? `バットスピード (${units === 'metric' ? 'km/h' : 'mph'})` : `Bat Speed (${units === 'metric' ? 'km/h' : 'mph'})`}
                                    yLabel={language === 'ja' ? `打球速度 (${units === 'metric' ? 'km/h' : 'mph'})` : `Exit Velocity (${units === 'metric' ? 'km/h' : 'mph'})`}
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

export default SavantAnalysis;

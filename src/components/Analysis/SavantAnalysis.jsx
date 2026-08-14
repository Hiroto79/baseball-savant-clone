import React, { useState, useMemo } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import ComparisonChart from './ComparisonChart';
import ComparisonTable from './ComparisonTable';
import ScatterPlot from './ScatterPlot';
import BattedBallProfile from './BattedBallProfile';
import KPICards from './KPICards';
import Trajectory3D from './Trajectory3D';
import StrikeZoneHeatmap from './StrikeZoneHeatmap';
import ContactAnalysis3D from './ContactAnalysis3D';
import PitchMetricsSummary from './PitchMetricsSummary';
import PolarSprayChart from './PolarSprayChart';
import BatterMetricsTable from './BatterMetricsTable';
import PlayerSearch from './PlayerSearch';
import PitchMovementChart from './PitchMovementChart';
import PitchTypeSelector from './PitchTypeSelector';
import BattingStatsByCountTable from './BattingStatsByCountTable';
import PitchArsenalTable from './PitchArsenalTable';

const SavantAnalysis = ({ data }) => {
    const { language, units } = useSettings();
    const [mode, setMode] = useState('pitching'); // 'pitching' | 'batting'
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [selectedPitchTypes, setSelectedPitchTypes] = useState([]);
    const [standFilter, setStandFilter] = useState('all'); // 'all' | 'R' | 'L'
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

    // Helper to convert distance (m/ft)
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
        const isStrike = (desc) => ['called_strike', 'swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'foul_bunt', 'missed_bunt'].includes(desc);

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
                    if (isStrike(d.description)) {
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
                    if (isStrike(d.description)) {
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
                    playerTotals[p] = { exit: 0, dist: 0, angle: 0, batSpeed: 0, exitCount: 0, distCount: 0, angleCount: 0, batSpeedCount: 0 };
                }

                if (launchSpeed != null && !isNaN(launchSpeed) && Number(launchSpeed) > 0) {
                    const convertedExit = convertVel(Number(launchSpeed));
                    playerTotals[p].exit += convertedExit;
                    playerTotals[p].exitCount++;
                }

                if (d.bat_speed != null && (typeof d.bat_speed === 'number' || typeof d.bat_speed === 'string')) {
                    const val = typeof d.bat_speed === 'string' ? parseFloat(d.bat_speed) : d.bat_speed;
                    if (!isNaN(val) && val > 0) {
                        const convertedBat = convertVel(val);
                        playerTotals[p].batSpeed += convertedBat;
                        playerTotals[p].batSpeedCount++;
                    }
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
                    batSpeed: totals.batSpeedCount > 0 ? totals.batSpeed / totals.batSpeedCount : 0,
                    count: totals.exitCount // Use exit count as proxy for Batted Balls
                };
            }
        });

        console.log('Savant Analysis Summary Data:', finalSummaryData);
        console.log('Savant Analysis Chart Data sample:', finalChartData.slice(0, 3));

        return { chartData: finalChartData, summaryData: finalSummaryData };

    }, [filteredData, mode, selectedPlayers, selectedPitchTypes, units]);

    const trajectoryData = useMemo(() => {
        if (selectedPlayers.length === 0) return [];
        return data.filter(p => selectedPlayers.includes(p.player_name) && (selectedPitchTypes.length === 0 || selectedPitchTypes.includes(p.pitch_type || p.pitch_name)));
    }, [data, selectedPlayers, selectedPitchTypes]);

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




    // Prepare Batted Ball Profile
    const battedBallProfile = useMemo(() => {
        if (selectedPlayers.length === 0) return {};

        const counts = { fly_ball: 0, ground_ball: 0, line_drive: 0, popup: 0, total: 0 };

        filteredData.forEach(d => {
            // For pitching, check pitcher_name; for batting, check batter_name
            if (mode === 'pitching') {
                if (!selectedPlayers.includes(d.player_name)) return;
            } else {
                if (!selectedPlayers.includes(String(d.batter_name))) return; // batter_name is string already
            }

            if (d.bb_type && counts[d.bb_type] !== undefined) {
                counts[d.bb_type]++;
                counts.total++;
            }
        });

        return counts;
    }, [filteredData, mode, selectedPlayers]);

    // Prepare bat speed scatter plot data for batting mode
    const batSpeedScatterData = useMemo(() => {
        if (mode !== 'batting' || selectedPlayers.length === 0) return [];

        const data = [];
        filteredData.forEach(d => {
            const p = String(d.batter_name);
            if (!selectedPlayers.includes(p)) return;

            const launchSpeed = d.launch_speed;
            const batSpeed = d.bat_speed;

            const launchVal = typeof launchSpeed === 'string' ? parseFloat(launchSpeed) : Number(launchSpeed);
            const batVal = typeof batSpeed === 'string' ? parseFloat(batSpeed) : Number(batSpeed);

            if (launchSpeed != null && !isNaN(launchVal) && launchVal > 0 &&
                batSpeed != null && !isNaN(batVal) && batVal > 0) {
                data.push({
                    player: p,
                    exitVelocity: convertVel(launchVal),
                    batSpeed: convertVel(batVal)
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
            { key: 'batSpeed', label: language === 'ja' ? '平均バット速度' : 'Avg Bat Speed', unit: units === 'metric' ? 'km/h' : 'mph' },
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
            {/* Page Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{language === 'ja' ? '分析ダッシュボード' : 'Analysis Dashboard'}</h2>
                <p className="text-muted-foreground mt-1">
                    {language === 'ja'
                        ? '選手を選択して詳細データ（バットスピード、球種別成績など）を分析します。'
                        : 'Select players to analyze detailed metrics including Bat Speed and Pitch Stats.'}
                </p>
            </div>

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

            {/* Content Dashboard */}
            {selectedPlayers.length > 0 ? (
                <div className="space-y-8">
                    {/* KPI Cards */}
                    <KPICards data={summaryData} mode={mode} />

                    {/* Main Analysis Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Comparison Table - Inspector Removed Verified */}
                        <div className="md:col-span-2">
                            <ComparisonTable data={summaryData} metrics={metrics} />
                        </div>

                        {mode === 'pitching' ? (
                            <>
                                {/* 1. Pitch Arsenal Table (Full-width Matrix) */}
                                <div className="md:col-span-2">
                                    <PitchArsenalTable 
                                        data={filteredData} 
                                        selectedPlayers={selectedPlayers} 
                                        standFilter={standFilter} 
                                    />
                                </div>

                                {/* 2. Batter Handedness Split Filter */}
                                <div className="md:col-span-2 flex items-center justify-between bg-card p-3 rounded-xl border border-border">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {language === 'ja' ? '打者左右フィルター (vs RHH / vs LHH)' : 'Batter Handedness Filter'}
                                    </span>
                                    <div className="flex gap-1.5">
                                        {[
                                            { id: 'all', label: language === 'ja' ? '全打者' : 'All Batters' },
                                            { id: 'R', label: language === 'ja' ? '対 右打者' : 'vs Right' },
                                            { id: 'L', label: language === 'ja' ? '対 左打者' : 'vs Left' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setStandFilter(tab.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    standFilter === tab.id
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Two-Column Visual Split (Movement & Strike Zone) */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                    {/* Left: Pitch Movement */}
                                    <div className="w-full">
                                        <PitchMovementChart 
                                            data={filteredData} 
                                            selectedPlayers={selectedPlayers} 
                                            standFilter={standFilter} 
                                        />
                                    </div>

                                    {/* Right: Strike Zone Heatmap */}
                                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm h-[420px] flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground mb-0.5">
                                                {language === 'ja' ? 'コース別配球 (Strike Zone Location)' : 'Pitch Location (Catcher View)'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {language === 'ja' ? '捕手視点でのコース分布・ヒートマップ' : 'Catcher view strike zone frequency'}
                                            </p>
                                        </div>
                                        <div className="flex-1 w-full min-h-0 pt-2 flex items-center justify-center">
                                            <StrikeZoneHeatmap
                                                data={trajectoryData.filter(d => standFilter === 'all' || !d.stand || d.stand === standFilter)}
                                                language={language}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 4. 3D Trajectory Viewer (Full Width Dedicated Card) */}
                                <div className="md:col-span-2 bg-card rounded-xl border border-border p-4 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground">
                                                {language === 'ja' ? '3D 投球軌道シミュレータ (Trajectory 3D)' : '3D Pitch Trajectory Simulation'}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {language === 'ja' ? 'マウンドからホームベースまでの立体軌道と球種別の変化の可視化' : 'Interactive 3D ball flight path from mound to home plate'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-[480px] w-full">
                                        <Trajectory3D
                                            key="traj-3d-view"
                                            data={trajectoryData.filter(d => standFilter === 'all' || !d.stand || d.stand === standFilter)}
                                            language={language}
                                            units={units}
                                        />
                                    </div>
                                </div>

                                {/* 4. Count Breakdown & Batted Ball Profile */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
                                        <h3 className="text-sm font-bold text-foreground mb-3">
                                            {language === 'ja' ? 'カウント別 投球成績' : 'Stats by Count'}
                                        </h3>
                                        <BattingStatsByCountTable data={filteredData} selectedPlayers={selectedPlayers} mode={mode} />
                                    </div>
                                    <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-foreground mb-3">
                                                {language === 'ja' ? '被打球プロファイル (Batted Balls)' : 'Batted Ball Profile'}
                                            </h3>
                                            <BattedBallProfile data={battedBallProfile} />
                                        </div>
                                    </div>
                                </div>

                                {/* 5. Velocity Trend Chart */}
                                <div className="md:col-span-2">
                                    <ComparisonChart
                                        data={chartData}
                                        lines={chartLines.map(l => ({ dataKey: `${l.id}_vel`, name: l.name }))}
                                        yLabel={language === 'ja' ? `平均球速 (${units === 'metric' ? 'km/h' : 'mph'})` : `Avg Velocity (${units === 'metric' ? 'km/h' : 'mph'})`}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="md:col-span-2">
                                    <BatterMetricsTable data={filteredData} selectedPlayers={selectedPlayers} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <BattingStatsByCountTable data={filteredData} selectedPlayers={selectedPlayers} mode={mode} />
                                    </div>
                                </div>

                                <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                                    <div className="md:col-span-1">
                                        <PolarSprayChart data={filteredData} selectedPlayers={selectedPlayers} />
                                    </div>
                                    <div className="md:col-span-1">
                                        <BattedBallProfile data={battedBallProfile} />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <ContactAnalysis3D data={filteredData} selectedPlayers={selectedPlayers} />
                                </div>

                                <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
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
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                    <ChevronsUpDown className="h-12 w-12 mb-4 opacity-20" />
                    <p>{language === 'ja' ? '選手を選択して比較を開始してください' : 'Select players to start comparison'}</p>
                </div>
            )
            }
        </div >
    );
};

export default SavantAnalysis;

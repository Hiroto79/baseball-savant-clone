import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
    Activity, 
    BarChart3, 
    Compass, 
    UploadCloud, 
    Database, 
    Zap, 
    Target, 
    Wind, 
    TrendingUp,
    ArrowRight,
    Users,
    Layers,
    Filter
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useData } from '../context/DataContext';
import { useRapsodo } from '../context/RapsodoContext';
import { useBlast } from '../context/BlastContext';
import { useSettings } from '../context/SettingsContext';

const PITCH_COLORS = {
    'ストレート': '#ef4444',
    'スライダー': '#eab308',
    'チェンジアップ': '#22c55e',
    'カッター': '#a855f7',
    'シンカー': '#f97316',
    'カーブ': '#06b6d4',
    'スプリット': '#3b82f6',
    'スイーパー': '#d97706',
    'その他': '#94a3b8'
};

const PITCH_MAP = {
    'FF': 'ストレート', '4-Seam Fastball': 'ストレート',
    'FC': 'カッター', 'Cutter': 'カッター',
    'CH': 'チェンジアップ', 'Changeup': 'チェンジアップ',
    'CU': 'カーブ', 'Curveball': 'カーブ',
    'SL': 'スライダー', 'Slider': 'スライダー',
    'SI': 'シンカー', 'Sinker': 'シンカー',
    'FS': 'スプリット', 'Split-Finger': 'スプリット',
    'EP': 'その他', 'ST': 'スイーパー', 'Sweeper': 'スイーパー',
    'SV': 'スライダー', 'KC': 'カーブ', 'KN': 'その他', 'FO': 'スプリット'
};

const Dashboard = () => {
    const { data: savantData } = useData();
    const { pitchingData: rapPitching, battingData: rapBatting } = useRapsodo();
    const { blastData } = useBlast();
    const { language, units } = useSettings();

    // Active DataSource Tab: 'savant' | 'rapsodo' | 'blast'
    const [sourceTab, setSourceTab] = useState('savant');
    
    // Savant Team Filter: 'ALL' or team code (e.g. 'LAD', 'NYY')
    const [selectedTeam, setSelectedTeam] = useState('ALL');

    // Rapsodo Type Filter: 'pitching' | 'batting'
    const [rapsodoType, setRapsodoType] = useState('pitching');

    const MPH_TO_KMH = 1.60934;
    const FT_TO_M = 0.3048;

    const convertVel = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 0;
        return units === 'metric' ? Number(val) * MPH_TO_KMH : Number(val);
    };

    const convertDist = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 0;
        return units === 'metric' ? Number(val) * FT_TO_M : Number(val);
    };

    const velUnit = units === 'metric' ? 'km/h' : 'mph';
    const distUnit = units === 'metric' ? 'm' : 'ft';

    // 1. Extract Available Teams in Savant Data
    const availableTeams = useMemo(() => {
        const teams = new Set();
        savantData.forEach(d => {
            if (d.home_team) teams.add(String(d.home_team));
            if (d.away_team) teams.add(String(d.away_team));
        });
        return ['ALL', ...Array.from(teams).sort()];
    }, [savantData]);

    // 2. Filter Savant Data by Team
    const filteredSavantData = useMemo(() => {
        if (selectedTeam === 'ALL') return savantData;
        return savantData.filter(d => d.home_team === selectedTeam || d.away_team === selectedTeam);
    }, [savantData, selectedTeam]);

    // 3. Aggregate Savant Metrics
    const savantOverview = useMemo(() => {
        const totalPitches = filteredSavantData.length;
        const pitchers = new Set();
        const batters = new Set();

        let veloSum = 0;
        let veloCount = 0;
        let maxVelo = 0;
        let strikes = 0;
        let whiffs = 0;
        let swings = 0;
        let inZone = 0;

        const pitchCounts = {};
        const bbCounts = { ground_ball: 0, line_drive: 0, fly_ball: 0, popup: 0, total: 0 };
        const pitcherMap = {};

        const isSwing = (desc) => ['swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'missed_bunt', 'foul_bunt'].includes(desc);
        const isWhiff = (desc) => ['swinging_strike', 'swinging_strike_blocked'].includes(desc);
        const isStrike = (desc) => ['called_strike', 'swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play'].includes(desc);

        filteredSavantData.forEach(d => {
            if (d.player_name) {
                pitchers.add(d.player_name);
                if (!pitcherMap[d.player_name]) {
                    pitcherMap[d.player_name] = { count: 0, veloSum: 0, veloCount: 0, maxVelo: 0 };
                }
                const p = pitcherMap[d.player_name];
                p.count++;
                if (d.release_speed != null && !isNaN(d.release_speed)) {
                    const v = Number(d.release_speed);
                    p.veloSum += v;
                    p.veloCount++;
                    if (v > p.maxVelo) p.maxVelo = v;
                }
            }
            if (d.batter_name) batters.add(d.batter_name);

            // Velo
            if (d.release_speed != null && !isNaN(d.release_speed)) {
                const v = Number(d.release_speed);
                veloSum += v;
                veloCount++;
                if (v > maxVelo) maxVelo = v;
            }

            // Description
            const desc = d.description || '';
            if (isSwing(desc)) swings++;
            if (isWhiff(desc)) whiffs++;
            if (isStrike(desc)) strikes++;

            // Zone
            if (d.zone && Number(d.zone) >= 1 && Number(d.zone) <= 9) inZone++;

            // Pitch Type
            const rawType = d.pitch_type || d.pitch_name || d.type || 'その他';
            const pName = PITCH_MAP[rawType] || rawType;
            pitchCounts[pName] = (pitchCounts[pName] || 0) + 1;

            // Batted balls
            if (d.bb_type && bbCounts[d.bb_type] !== undefined) {
                bbCounts[d.bb_type]++;
                bbCounts.total++;
            }
        });

        // Pitch usage pie data
        const pitchUsageData = Object.entries(pitchCounts)
            .map(([name, count]) => ({
                name,
                value: count,
                color: PITCH_COLORS[name] || '#94a3b8'
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7);

        // Batted ball distribution bar data
        const bbData = [
            { name: language === 'ja' ? 'ゴロ (GB)' : 'Ground', value: bbCounts.total > 0 ? Math.round((bbCounts.ground_ball / bbCounts.total) * 100) : 0, color: '#3b82f6' },
            { name: language === 'ja' ? 'ライナー (LD)' : 'Line Drive', value: bbCounts.total > 0 ? Math.round((bbCounts.line_drive / bbCounts.total) * 100) : 0, color: '#10b981' },
            { name: language === 'ja' ? 'フライ (FB)' : 'Fly Ball', value: bbCounts.total > 0 ? Math.round((bbCounts.fly_ball / bbCounts.total) * 100) : 0, color: '#f59e0b' },
            { name: language === 'ja' ? 'ポップ (PU)' : 'Popup', value: bbCounts.total > 0 ? Math.round((bbCounts.popup / bbCounts.total) * 100) : 0, color: '#8b5cf6' }
        ];

        // Top Pitchers list
        const topPitchers = Object.entries(pitcherMap)
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                avgVelo: stats.veloCount > 0 ? convertVel(stats.veloSum / stats.veloCount).toFixed(1) : '-',
                maxVelo: stats.maxVelo > 0 ? convertVel(stats.maxVelo).toFixed(1) : '-'
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);

        return {
            totalPitches,
            pitcherCount: pitchers.size,
            batterCount: batters.size,
            avgVelo: veloCount > 0 ? convertVel(veloSum / veloCount).toFixed(1) : '-',
            maxVelo: maxVelo > 0 ? convertVel(maxVelo).toFixed(1) : '-',
            strikeRate: totalPitches > 0 ? ((strikes / totalPitches) * 100).toFixed(1) : '-',
            whiffRate: swings > 0 ? ((whiffs / swings) * 100).toFixed(1) : '-',
            zoneRate: totalPitches > 0 ? ((inZone / totalPitches) * 100).toFixed(1) : '-',
            pitchUsageData,
            bbData,
            topPitchers
        };
    }, [filteredSavantData, language, units]);

    // 4. Aggregate Rapsodo Metrics
    const rapsodoOverview = useMemo(() => {
        if (rapsodoType === 'pitching') {
            const count = rapPitching.length;
            const players = new Set();
            let velSum = 0, velCount = 0, maxVel = 0, spinSum = 0, spinCount = 0, effSum = 0, effCount = 0;

            rapPitching.forEach(d => {
                if (d.player_name) players.add(d.player_name);
                const v = Number(d.velocity);
                if (!isNaN(v) && v > 0) {
                    velSum += v;
                    velCount++;
                    if (v > maxVel) maxVel = v;
                }
                const s = Number(d.total_spin);
                if (!isNaN(s) && s > 0) { spinSum += s; spinCount++; }
                const e = Number(d.spin_efficiency);
                if (!isNaN(e) && e > 0) { effSum += e; effCount++; }
            });

            return {
                totalCount: count,
                playerCount: players.size,
                avgVel: velCount > 0 ? convertVel(velSum / velCount).toFixed(1) : '-',
                maxVel: maxVel > 0 ? convertVel(maxVel).toFixed(1) : '-',
                avgSpin: spinCount > 0 ? Math.round(spinSum / spinCount) : '-',
                avgEff: effCount > 0 ? (effSum / effCount).toFixed(1) : '-'
            };
        } else {
            const count = rapBatting.length;
            const players = new Set();
            let evSum = 0, evCount = 0, maxEv = 0, distSum = 0, distCount = 0, maxDist = 0;

            rapBatting.forEach(d => {
                if (d.player_name) players.add(d.player_name);
                const ev = Number(d.exit_velocity);
                if (!isNaN(ev) && ev > 0) {
                    evSum += ev;
                    evCount++;
                    if (ev > maxEv) maxEv = ev;
                }
                const dist = Number(d.distance);
                if (!isNaN(dist) && dist > 0) {
                    distSum += dist;
                    distCount++;
                    if (dist > maxDist) maxDist = dist;
                }
            });

            return {
                totalCount: count,
                playerCount: players.size,
                avgEv: evCount > 0 ? convertVel(evSum / evCount).toFixed(1) : '-',
                maxEv: maxEv > 0 ? convertVel(maxEv).toFixed(1) : '-',
                avgDist: distCount > 0 ? convertDist(distSum / distCount).toFixed(1) : '-',
                maxDist: maxDist > 0 ? convertDist(maxDist).toFixed(1) : '-'
            };
        }
    }, [rapPitching, rapBatting, rapsodoType, units]);

    // 5. Aggregate Blast Metrics
    const blastOverview = useMemo(() => {
        const count = blastData.length;
        const players = new Set();
        let bsSum = 0, bsCount = 0, maxBs = 0;
        let phsSum = 0, phsCount = 0;
        let pwrSum = 0, pwrCount = 0;
        let opeSum = 0, opeCount = 0;

        blastData.forEach(d => {
            if (d.player_name) players.add(d.player_name);
            const bs = Number(d.bat_speed);
            if (!isNaN(bs) && bs > 0) {
                bsSum += bs;
                bsCount++;
                if (bs > maxBs) maxBs = bs;
            }
            const phs = Number(d.peak_hand_speed);
            if (!isNaN(phs) && phs > 0) { phsSum += phs; phsCount++; }
            const pwr = Number(d.power);
            if (!isNaN(pwr) && pwr > 0) { pwrSum += pwr; pwrCount++; }
            const ope = Number(d.on_plane_efficiency);
            if (!isNaN(ope) && ope > 0) { opeSum += ope; opeCount++; }
        });

        return {
            totalSwings: count,
            playerCount: players.size,
            avgBatSpeed: bsCount > 0 ? convertVel(bsSum / bsCount).toFixed(1) : '-',
            maxBatSpeed: maxBs > 0 ? convertVel(maxBs).toFixed(1) : '-',
            avgHandSpeed: phsCount > 0 ? convertVel(phsSum / phsCount).toFixed(1) : '-',
            avgPower: pwrCount > 0 ? (pwrSum / pwrCount).toFixed(2) : '-',
            avgOpe: opeCount > 0 ? (opeSum / opeCount).toFixed(1) : '-'
        };
    }, [blastData, units]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            {/* Top Hero Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-card to-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        {language === 'ja' ? 'アナリティクス ダッシュボード' : 'Analytics Dashboard'}
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {language === 'ja'
                            ? 'Savant (MLB) / Rapsodo / Blast Motion の全データ統計とチーム別分析'
                            : 'Integrated overview for Baseball Savant, Rapsodo, and Blast Motion data.'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/analysis"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs md:text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
                    >
                        <Activity size={16} />
                        <span>{language === 'ja' ? '選手別 詳細分析へ' : 'Player Analysis'}</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* DataSource Tabs (Savant / Rapsodo / Blast) */}
            <div className="flex items-center justify-between bg-card p-2 rounded-2xl border border-border">
                <div className="flex gap-2">
                    <button
                        onClick={() => setSourceTab('savant')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                            sourceTab === 'savant'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                        <Database size={16} />
                        <span>Savant ({savantData.length.toLocaleString()}件)</span>
                    </button>

                    <button
                        onClick={() => setSourceTab('rapsodo')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                            sourceTab === 'rapsodo'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                        <Activity size={16} />
                        <span>Rapsodo ({(rapPitching.length + rapBatting.length).toLocaleString()}件)</span>
                    </button>

                    <button
                        onClick={() => setSourceTab('blast')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                            sourceTab === 'blast'
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                        <BarChart3 size={16} />
                        <span>Blast ({blastData.length.toLocaleString()}件)</span>
                    </button>
                </div>
            </div>

            {/* ========================================================= */}
            {/* TAB 1: SAVANT (MLB) VIEW                                  */}
            {/* ========================================================= */}
            {sourceTab === 'savant' && (
                <div className="space-y-6">
                    {/* Team Filter Bar */}
                    <div className="bg-card p-4 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-blue-400" />
                            <span className="text-xs font-bold text-foreground">
                                {language === 'ja' ? 'チーム絞り込み' : 'Filter by Team'}:
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {selectedTeam === 'ALL' ? (language === 'ja' ? '全チーム一括表示' : 'All Teams') : selectedTeam}
                            </span>
                        </div>

                        {/* Team Buttons (Horizontal scroll) */}
                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                            {availableTeams.map(team => (
                                <button
                                    key={team}
                                    onClick={() => setSelectedTeam(team)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                                        selectedTeam === team
                                            ? 'bg-blue-600 text-white shadow-sm scale-105'
                                            : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }`}
                                >
                                    {team === 'ALL' ? (language === 'ja' ? '全チーム (ALL)' : 'ALL') : team}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Savant KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                                <span>{language === 'ja' ? '投球データ数' : 'Pitches'}</span>
                                <Database size={15} className="text-blue-400" />
                            </div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                                {savantOverview.totalPitches.toLocaleString()}
                                <span className="text-xs font-normal text-muted-foreground ml-1">球</span>
                            </div>
                        </div>

                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                                <span>{language === 'ja' ? '投手 / 打者数' : 'Pitchers / Batters'}</span>
                                <Users size={15} className="text-cyan-400" />
                            </div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                                {savantOverview.pitcherCount} <span className="text-xs font-normal text-muted-foreground">/ {savantOverview.batterCount}名</span>
                            </div>
                        </div>

                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                                <span>{language === 'ja' ? `平均球速 (${velUnit})` : `Avg Velo`}</span>
                                <Wind size={15} className="text-amber-400" />
                            </div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                                {savantOverview.avgVelo}
                            </div>
                        </div>

                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                                <span>{language === 'ja' ? `最高球速 (${velUnit})` : `Max Velo`}</span>
                                <Zap size={15} className="text-red-400" />
                            </div>
                            <div className="mt-2 text-2xl font-bold text-red-400 font-mono">
                                {savantOverview.maxVelo}
                            </div>
                        </div>

                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                                <span>{language === 'ja' ? '空振り率 (Whiff%)' : 'Whiff Rate'}</span>
                                <TrendingUp size={15} className="text-emerald-400" />
                            </div>
                            <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
                                {savantOverview.whiffRate}%
                            </div>
                        </div>

                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                                <span>{language === 'ja' ? 'ゾーン内投球率' : 'Zone %'}</span>
                                <Target size={15} className="text-purple-400" />
                            </div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                                {savantOverview.zoneRate}%
                            </div>
                        </div>
                    </div>

                    {/* Visual Analytics Sections (Pitch Usage & Batted Ball Outcomes) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 1. Pitch Arsenal Usage Donut */}
                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between min-h-[360px]">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-bold text-base text-foreground">
                                        {selectedTeam === 'ALL' ? (language === 'ja' ? '全体 球種割合' : 'Arsenal Breakdown') : `${selectedTeam} 球種割合`}
                                    </h3>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {selectedTeam === 'ALL' ? '全チーム' : `${selectedTeam}のみ`}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {language === 'ja' ? '投球データにおける球種の構成比率' : 'Pitch usage distribution'}
                                </p>
                            </div>

                            {savantOverview.pitchUsageData.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 my-auto">
                                    <div className="h-[210px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={savantOverview.pitchUsageData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={80}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {savantOverview.pitchUsageData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const d = payload[0];
                                                            const percent = ((d.value / savantOverview.totalPitches) * 100).toFixed(1);
                                                            return (
                                                                <div className="bg-popover border border-border px-3 py-1.5 rounded-lg shadow-lg text-xs">
                                                                    <span className="font-bold" style={{ color: d.payload.color }}>{d.name}</span>: {d.value.toLocaleString()}球 ({percent}%)
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        {savantOverview.pitchUsageData.map((item) => {
                                            const percent = ((item.value / savantOverview.totalPitches) * 100).toFixed(1);
                                            return (
                                                <div key={item.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                                        <span className="font-medium text-foreground">{item.name}</span>
                                                    </div>
                                                    <div className="font-mono text-muted-foreground text-[11px]">
                                                        <span className="font-semibold text-foreground mr-1">{percent}%</span>
                                                        ({item.value.toLocaleString()})
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[210px] text-muted-foreground text-sm">
                                    {language === 'ja' ? 'データがありません' : 'No Data'}
                                </div>
                            )}
                        </div>

                        {/* 2. Batted Ball Profile */}
                        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between min-h-[360px]">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-bold text-base text-foreground">
                                        {selectedTeam === 'ALL' ? (language === 'ja' ? '全体 打球性質比率' : 'Batted Ball Types') : `${selectedTeam} 打球性質比率`}
                                    </h3>
                                    <span className="text-xs text-muted-foreground font-mono">MLB Benchmark</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {language === 'ja' ? 'ゴロ・ライナー・フライ・ポップフライの比率' : 'Ground balls, line drives, fly balls, and popups'}
                                </p>
                            </div>

                            {savantOverview.bbData.some(d => d.value > 0) ? (
                                <div className="h-[210px] w-full my-auto">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={savantOverview.bbData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" unit="%" domain={[0, 60]} />
                                            <Tooltip
                                                formatter={(val) => [`${val}%`, '割合']}
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                            />
                                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                {savantOverview.bbData.map((entry, index) => (
                                                    <Cell key={`cell-bb-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[210px] text-muted-foreground text-sm">
                                    {language === 'ja' ? '打球データがありません' : 'No Batted Ball Data'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Top Pitchers Quick Table in Team */}
                    {savantOverview.topPitchers.length > 0 && (
                        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                                <h3 className="font-bold text-sm text-foreground">
                                    {selectedTeam === 'ALL' ? (language === 'ja' ? '主要投手一覧' : 'Key Pitchers') : `${selectedTeam} 所属投手`}
                                </h3>
                                <Link to="/analysis" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                                    <span>詳細分析へ</span>
                                    <ArrowRight size={12} />
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/50 text-muted-foreground border-b border-border text-[11px] uppercase font-semibold">
                                        <tr>
                                            <th className="px-4 py-2.5">{language === 'ja' ? '投手名' : 'Pitcher'}</th>
                                            <th className="px-4 py-2.5 text-right">{language === 'ja' ? '投球数' : 'Pitches'}</th>
                                            <th className="px-4 py-2.5 text-right">{language === 'ja' ? `平均球速 (${velUnit})` : 'Avg Velo'}</th>
                                            <th className="px-4 py-2.5 text-right">{language === 'ja' ? `最高球速 (${velUnit})` : 'Max Velo'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border font-mono">
                                        {savantOverview.topPitchers.map(p => (
                                            <tr key={p.name} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-2.5 font-sans font-semibold text-foreground">{p.name}</td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{p.count}</td>
                                                <td className="px-4 py-2.5 text-right text-foreground font-medium">{p.avgVelo}</td>
                                                <td className="px-4 py-2.5 text-right text-red-400 font-bold">{p.maxVelo}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: RAPSODO VIEW                                       */}
            {/* ========================================================= */}
            {sourceTab === 'rapsodo' && (
                <div className="space-y-6">
                    {/* Pitching / Batting Toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setRapsodoType('pitching')}
                            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                                rapsodoType === 'pitching'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                            }`}
                        >
                            {language === 'ja' ? 'ピッチング (投球)' : 'Pitching'} ({rapPitching.length.toLocaleString()}件)
                        </button>
                        <button
                            onClick={() => setRapsodoType('batting')}
                            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                                rapsodoType === 'batting'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                            }`}
                        >
                            {language === 'ja' ? 'バッティング (打撃)' : 'Batting'} ({rapBatting.length.toLocaleString()}件)
                        </button>
                    </div>

                    {rapsodoType === 'pitching' ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">投球データ数</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.totalCount.toLocaleString()}球</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">登録投手</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.playerCount}名</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">平均球速 ({velUnit})</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.avgVel}</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">平均回転数 (rpm)</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.avgSpin}</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">平均スピン効率 (%)</div>
                                <div className="mt-2 text-2xl font-bold text-cyan-400 font-mono">{rapsodoOverview.avgEff}%</div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">打球データ数</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.totalCount.toLocaleString()}打球</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">登録打者</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.playerCount}名</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">平均打球速度 ({velUnit})</div>
                                <div className="mt-2 text-2xl font-bold text-foreground font-mono">{rapsodoOverview.avgEv}</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">最高打球速度 ({velUnit})</div>
                                <div className="mt-2 text-2xl font-bold text-red-400 font-mono">{rapsodoOverview.maxEv}</div>
                            </div>
                            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                                <div className="text-muted-foreground text-xs font-semibold">平均飛距離 ({distUnit})</div>
                                <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">{rapsodoOverview.avgDist}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: BLAST VIEW                                         */}
            {/* ========================================================= */}
            {sourceTab === 'blast' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="text-muted-foreground text-xs font-semibold">スイング総数</div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">{blastOverview.totalSwings.toLocaleString()}回</div>
                        </div>
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="text-muted-foreground text-xs font-semibold">登録選手</div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">{blastOverview.playerCount}名</div>
                        </div>
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="text-muted-foreground text-xs font-semibold">平均バット速度 ({velUnit})</div>
                            <div className="mt-2 text-2xl font-bold text-foreground font-mono">{blastOverview.avgBatSpeed}</div>
                        </div>
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="text-muted-foreground text-xs font-semibold">最高バット速度 ({velUnit})</div>
                            <div className="mt-2 text-2xl font-bold text-red-400 font-mono">{blastOverview.maxBatSpeed}</div>
                        </div>
                        <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                            <div className="text-muted-foreground text-xs font-semibold">オンプレーン効率 (%)</div>
                            <div className="mt-2 text-2xl font-bold text-cyan-400 font-mono">{blastOverview.avgOpe}%</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Modules */}
            <div>
                <h3 className="text-sm font-bold text-foreground mb-3">
                    {language === 'ja' ? 'クイックアクセス' : 'Quick Access'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to="/analysis"
                        className="group bg-card hover:bg-muted/40 p-4 rounded-2xl border border-border shadow-sm hover:border-blue-500/50 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                <BarChart3 size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-foreground">詳細分析 (Analysis)</h4>
                                <p className="text-[11px] text-muted-foreground">球種別マトリクス・変化量</p>
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        to="/simulator"
                        className="group bg-card hover:bg-muted/40 p-4 rounded-2xl border border-border shadow-sm hover:border-cyan-500/50 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                                <Compass size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-foreground">3Dシミュレータ</h4>
                                <p className="text-[11px] text-muted-foreground">縫い目回転と立体軌道</p>
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        to="/leaderboard"
                        className="group bg-card hover:bg-muted/40 p-4 rounded-2xl border border-border shadow-sm hover:border-amber-500/50 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                                <Zap size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-foreground">リーダーボード</h4>
                                <p className="text-[11px] text-muted-foreground">球速・打球速度ランキング</p>
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        to="/upload"
                        className="group bg-card hover:bg-muted/40 p-4 rounded-2xl border border-border shadow-sm hover:border-emerald-500/50 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <UploadCloud size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-xs text-foreground">データアップロード</h4>
                                <p className="text-[11px] text-muted-foreground">CSVファイルの追加</p>
                            </div>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

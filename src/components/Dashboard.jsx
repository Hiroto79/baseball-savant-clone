import React, { useMemo } from 'react';
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
    Users
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

    const MPH_TO_KMH = 1.60934;
    const convertVel = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 0;
        return units === 'metric' ? Number(val) * MPH_TO_KMH : Number(val);
    };

    // Aggregate overall metrics from actual data
    const overview = useMemo(() => {
        const totalSavantPitches = savantData.length;
        const totalRapsodo = rapPitching.length + rapBatting.length;
        const totalBlast = blastData.length;

        // Unique pitchers and batters
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

        const isSwing = (desc) => ['swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'missed_bunt', 'foul_bunt'].includes(desc);
        const isWhiff = (desc) => ['swinging_strike', 'swinging_strike_blocked'].includes(desc);
        const isStrike = (desc) => ['called_strike', 'swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play'].includes(desc);

        savantData.forEach(d => {
            if (d.player_name) pitchers.add(d.player_name);
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

        return {
            totalPitches: totalSavantPitches,
            totalRapsodo,
            totalBlast,
            pitcherCount: pitchers.size,
            batterCount: batters.size,
            avgVelo: veloCount > 0 ? convertVel(veloSum / veloCount).toFixed(1) : '-',
            maxVelo: maxVelo > 0 ? convertVel(maxVelo).toFixed(1) : '-',
            strikeRate: totalSavantPitches > 0 ? ((strikes / totalSavantPitches) * 100).toFixed(1) : '-',
            whiffRate: swings > 0 ? ((whiffs / swings) * 100).toFixed(1) : '-',
            zoneRate: totalSavantPitches > 0 ? ((inZone / totalSavantPitches) * 100).toFixed(1) : '-',
            pitchUsageData,
            bbData
        };
    }, [savantData, rapPitching, rapBatting, blastData, language, units]);

    const velUnit = units === 'metric' ? 'km/h' : 'mph';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
            {/* Header / Hero */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/40 via-card to-card p-6 rounded-2xl border border-border shadow-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                        {language === 'ja' ? 'アナリティクス ダッシュボード' : 'Analytics Overview'}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {language === 'ja'
                            ? `インポート済みデータ全体の投球傾向、球種分布、制圧力の全体概況`
                            : 'Overall pitching trends, arsenal breakdown, and league benchmark summary.'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/analysis"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-all shadow-md"
                    >
                        <Activity size={16} />
                        <span>{language === 'ja' ? '選手別 詳細分析へ' : 'Player Analysis'}</span>
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {/* Overall KPI Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{language === 'ja' ? '総投球データ' : 'Total Pitches'}</span>
                        <Database size={15} className="text-blue-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                        {overview.totalPitches.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground ml-1">球</span>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{language === 'ja' ? '登録投手 / 打者' : 'Pitchers / Batters'}</span>
                        <Users size={15} className="text-cyan-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                        {overview.pitcherCount} <span className="text-xs font-normal text-muted-foreground">/ {overview.batterCount}名</span>
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{language === 'ja' ? `平均球速 (${velUnit})` : `Avg Velo (${velUnit})`}</span>
                        <Wind size={15} className="text-amber-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                        {overview.avgVelo}
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{language === 'ja' ? `最高球速 (${velUnit})` : `Max Velo (${velUnit})`}</span>
                        <Zap size={15} className="text-red-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-red-400 font-mono">
                        {overview.maxVelo}
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{language === 'ja' ? '空振り率 (Whiff%)' : 'Whiff Rate'}</span>
                        <TrendingUp size={15} className="text-emerald-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-emerald-400 font-mono">
                        {overview.whiffRate}%
                    </div>
                </div>

                <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                        <span>{language === 'ja' ? 'ゾーン内投球率' : 'Zone %'}</span>
                        <Target size={15} className="text-purple-400" />
                    </div>
                    <div className="mt-2 text-2xl font-bold text-foreground font-mono">
                        {overview.zoneRate}%
                    </div>
                </div>
            </div>

            {/* Visual Analytics Sections (Pitch Usage & Batted Ball Outcomes) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Pitch Arsenal Usage Donut */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between min-h-[380px]">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-base text-foreground">
                                {language === 'ja' ? '全体 球種割合 (Arsenal Breakdown)' : 'Overall Pitch Arsenal Distribution'}
                            </h3>
                            <span className="text-xs text-muted-foreground font-mono">Savant Dataset</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {language === 'ja' ? '全投球データにおける球種の構成比率' : 'Distribution of pitch types across all recorded pitches'}
                        </p>
                    </div>

                    {overview.pitchUsageData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 my-auto">
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={overview.pitchUsageData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {overview.pitchUsageData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0];
                                                    const percent = ((d.value / overview.totalPitches) * 100).toFixed(1);
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
                            <div className="space-y-2 text-xs">
                                {overview.pitchUsageData.map((item) => {
                                    const percent = ((item.value / overview.totalPitches) * 100).toFixed(1);
                                    return (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                                <span className="font-medium text-foreground">{item.name}</span>
                                            </div>
                                            <div className="font-mono text-muted-foreground">
                                                <span className="font-semibold text-foreground mr-1">{percent}%</span>
                                                ({item.value.toLocaleString()})
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                            {language === 'ja' ? 'データがありません' : 'No Data Available'}
                        </div>
                    )}
                </div>

                {/* 2. Batted Ball Profile */}
                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between min-h-[380px]">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-base text-foreground">
                                {language === 'ja' ? '全体 打球性質比率 (Batted Ball Types)' : 'Batted Ball Distribution'}
                            </h3>
                            <span className="text-xs text-muted-foreground font-mono">MLB Standard</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {language === 'ja' ? 'ゴロ・ライナー・フライ・ポップフライの比率' : 'Ground balls, line drives, fly balls, and popups breakdown'}
                        </p>
                    </div>

                    {overview.bbData.some(d => d.value > 0) ? (
                        <div className="h-[220px] w-full my-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={overview.bbData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" unit="%" domain={[0, 60]} />
                                    <Tooltip
                                        formatter={(val) => [`${val}%`, '割合']}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {overview.bbData.map((entry, index) => (
                                            <Cell key={`cell-bb-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                            {language === 'ja' ? '打球データがありません' : 'No Batted Ball Data'}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Navigation Cards to Features */}
            <div>
                <h3 className="text-base font-bold text-foreground mb-3">
                    {language === 'ja' ? 'アナリティクス モジュール' : 'Analytics Modules'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Link
                        to="/analysis"
                        className="group bg-card hover:bg-muted/40 p-5 rounded-2xl border border-border shadow-sm hover:border-blue-500/50 transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <BarChart3 size={20} />
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-foreground group-hover:text-blue-400 transition-colors">
                                {language === 'ja' ? '投手・打者 詳細分析' : 'Player Analysis'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                {language === 'ja' ? '球種マトリクス、変化量プロット、コース配分' : 'Pitch Arsenal, Movement plot, and heatmaps'}
                            </p>
                        </div>
                    </Link>

                    <Link
                        to="/simulator"
                        className="group bg-card hover:bg-muted/40 p-5 rounded-2xl border border-border shadow-sm hover:border-cyan-500/50 transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                                <Compass size={20} />
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-foreground group-hover:text-cyan-400 transition-colors">
                                {language === 'ja' ? '3D 軌道・シームシミュレータ' : '3D Simulator'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                {language === 'ja' ? '縫い目回転と球速・リリース変化の3D再現' : '3D Seam rotation and release trajectory'}
                            </p>
                        </div>
                    </Link>

                    <Link
                        to="/leaderboard"
                        className="group bg-card hover:bg-muted/40 p-5 rounded-2xl border border-border shadow-sm hover:border-amber-500/50 transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <Zap size={20} />
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-foreground group-hover:text-amber-400 transition-colors">
                                {language === 'ja' ? 'リーダーボード (ランキング)' : 'Leaderboard'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                {language === 'ja' ? '球速・回転数・打球速度の全選手ランキング' : 'Rankings of velocity, spin, and exit velo'}
                            </p>
                        </div>
                    </Link>

                    <Link
                        to="/upload"
                        className="group bg-card hover:bg-muted/40 p-5 rounded-2xl border border-border shadow-sm hover:border-emerald-500/50 transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <UploadCloud size={20} />
                            </div>
                            <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-400 transition-colors">
                                {language === 'ja' ? 'データアップロード' : 'Upload Data'}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                {language === 'ja' ? 'Savant / Rapsodo / Blast の新規CSV連携' : 'Import new Savant, Rapsodo, Blast CSVs'}
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

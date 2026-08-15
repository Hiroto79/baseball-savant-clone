import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import { Zap, Target, Gauge, Activity } from 'lucide-react';

const HITTING_COLORS = {
    'Single': '#3b82f6',
    'Double': '#10b981',
    'Triple': '#f59e0b',
    'Home Run': '#ef4444',
    'Field Out': '#64748b',
    'Strikeout': '#475569',
    'Other': '#94a3b8'
};

const HittingPowerMatrix = ({ data, selectedPlayers }) => {
    const { language, units } = useSettings();
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

    const { chartData, metrics } = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0 || !selectedPlayers || selectedPlayers.length === 0) {
            return { chartData: [], metrics: null };
        }

        const filtered = data.filter(d => d && d.batter_name && selectedPlayers.includes(d.batter_name));
        const pts = [];

        let bsSum = 0, bsCount = 0, maxBs = 0;
        let evSum = 0, evCount = 0, maxEv = 0;
        let sweetCount = 0, hardHitCount = 0, totalBatted = 0;

        filtered.forEach(d => {
            const bs = d.bat_speed != null ? Number(d.bat_speed) : null;
            const ev = d.launch_speed != null ? Number(d.launch_speed) : null;
            const la = d.launch_angle != null ? Number(d.launch_angle) : null;
            const event = d.events || 'In Play';

            if (bs && !isNaN(bs) && bs > 0) {
                bsSum += bs;
                bsCount++;
                if (bs > maxBs) maxBs = bs;
            }

            if (ev && !isNaN(ev) && ev > 0) {
                evSum += ev;
                evCount++;
                if (ev > maxEv) maxEv = ev;
                totalBatted++;

                if (ev >= 95) hardHitCount++;
                if (la != null && la >= 8 && la <= 32) sweetCount++;

                // If we have both Bat Speed and Exit Velo, or fallback to approximate bat speed
                const xVal = bs ? convertVel(bs) : (convertVel(ev * 0.72));
                const yVal = convertVel(ev);

                // Determine outcome category color
                let color = HITTING_COLORS['Field Out'];
                if (event.includes('single')) color = HITTING_COLORS['Single'];
                else if (event.includes('double')) color = HITTING_COLORS['Double'];
                else if (event.includes('triple')) color = HITTING_COLORS['Triple'];
                else if (event.includes('home_run')) color = HITTING_COLORS['Home Run'];

                const distVal = d.hit_distance_sc ? `${convertDist(d.hit_distance_sc).toFixed(0)} ${distUnit}` : '-';

                pts.push({
                    x: Number(xVal.toFixed(1)),
                    y: Number(yVal.toFixed(1)),
                    la: la != null ? `${Number(la).toFixed(0)}°` : '-',
                    dist: distVal,
                    event: d.events || 'In Play',
                    color,
                    isRealBs: !!bs
                });
            }
        });

        const avgBatSpeed = bsCount > 0 ? convertVel(bsSum / bsCount).toFixed(1) : '-';
        const maxBatSpeed = maxBs > 0 ? convertVel(maxBs).toFixed(1) : '-';
        const avgExitVelo = evCount > 0 ? convertVel(evSum / evCount).toFixed(1) : '-';
        const maxExitVelo = maxEv > 0 ? convertVel(maxEv).toFixed(1) : '-';
        const sweetSpotRate = totalBatted > 0 ? ((sweetCount / totalBatted) * 100).toFixed(1) : '-';
        const hardHitRate = totalBatted > 0 ? ((hardHitCount / totalBatted) * 100).toFixed(1) : '-';

        return {
            chartData: pts,
            metrics: {
                avgBatSpeed, maxBatSpeed,
                avgExitVelo, maxExitVelo,
                sweetSpotRate, hardHitRate,
                totalBatted, hasBatSpeed: bsCount > 0
            }
        };
    }, [data, selectedPlayers, units]);

    if (!metrics || metrics.totalBatted === 0) return null;

    const xDomain = units === 'metric' ? [80, 150] : [50, 95];
    const yDomain = units === 'metric' ? [90, 190] : [60, 120];

    return (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                    <h3 className="font-extrabold text-sm md:text-base text-foreground tracking-tight flex items-center gap-2">
                        <span>{language === 'ja' ? 'バットスピード × 打球初速マトリクス' : 'Bat Speed vs Exit Velocity Matrix'}</span>
                        <span className="text-[10px] bg-red-500/15 text-red-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Power & Impact
                        </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {language === 'ja'
                            ? 'スイング速度（Bat Speed）と打球へのエネルギー伝達効率（Exit Velo）の相関分析'
                            : 'Correlation between swing speed and exit velocity energy transfer'}
                    </p>
                </div>
            </div>

            {/* Hitting Quality KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-muted/40 p-3 rounded-xl border border-border flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Gauge size={13} className="text-amber-400" />
                        平均バット速度
                    </span>
                    <div className="text-lg font-bold font-mono text-foreground mt-1">
                        {metrics.avgBatSpeed} <span className="text-[10px] text-muted-foreground font-normal">{velUnit}</span>
                    </div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl border border-border flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Zap size={13} className="text-red-400" />
                        最高バット速度
                    </span>
                    <div className="text-lg font-bold font-mono text-red-400 mt-1">
                        {metrics.maxBatSpeed} <span className="text-[10px] text-muted-foreground font-normal">{velUnit}</span>
                    </div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl border border-border flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Activity size={13} className="text-blue-400" />
                        平均打球初速
                    </span>
                    <div className="text-lg font-bold font-mono text-foreground mt-1">
                        {metrics.avgExitVelo} <span className="text-[10px] text-muted-foreground font-normal">{velUnit}</span>
                    </div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl border border-border flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Zap size={13} className="text-cyan-400" />
                        最高打球初速
                    </span>
                    <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                        {metrics.maxExitVelo} <span className="text-[10px] text-muted-foreground font-normal">{velUnit}</span>
                    </div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl border border-border flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Target size={13} className="text-emerald-400" />
                        Hard-Hit% (95mph+)
                    </span>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                        {metrics.hardHitRate}%
                    </div>
                </div>

                <div className="bg-muted/40 p-3 rounded-xl border border-border flex flex-col justify-between">
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Target size={13} className="text-purple-400" />
                        Sweet-Spot% (8°-32°)
                    </span>
                    <div className="text-lg font-bold font-mono text-purple-400 mt-1">
                        {metrics.sweetSpotRate}%
                    </div>
                </div>
            </div>

            {/* Scatter Plot */}
            <div className="w-full h-[320px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: -5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#64748b" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Bat Speed"
                            domain={xDomain}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            stroke="#475569"
                            unit={` ${velUnit}`}
                            label={{ value: `スイング速度 (${velUnit})`, position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Exit Velocity"
                            domain={yDomain}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            stroke="#475569"
                            unit={` ${velUnit}`}
                            label={{ value: `打球初速 (${velUnit})`, angle: -90, position: 'insideLeft', offset: 15, fill: '#94a3b8', fontSize: 11 }}
                        />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-xl text-xs z-50">
                                            <div className="font-bold mb-1" style={{ color: d.color }}>
                                                {d.event}
                                            </div>
                                            <div className="text-muted-foreground space-y-0.5 text-[11px]">
                                                <div>スイング速度: <span className="font-semibold text-foreground">{d.x} {velUnit}</span></div>
                                                <div>打球初速: <span className="font-semibold text-foreground">{d.y} {velUnit}</span></div>
                                                <div>打球角度: <span className="font-semibold text-cyan-400">{d.la}</span></div>
                                                <div>推定飛距離: <span className="font-semibold text-emerald-400">{d.dist}</span></div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Impacts" data={chartData} isAnimationActive={false}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-hit-${index}`} fill={entry.color} fillOpacity={0.8} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default HittingPowerMatrix;

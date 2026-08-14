import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from 'recharts';
import { useSettings } from '../../context/SettingsContext';
import { PITCH_COLORS } from '../../utils/pitchColors';

const ReleasePointChart = ({ data, selectedPlayers }) => {
    const { language, units } = useSettings();

    const FT_TO_M = 0.3048;

    const { chartData, metrics, legendData } = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0 || !selectedPlayers || selectedPlayers.length === 0) {
            return { chartData: [], metrics: null, legendData: [] };
        }

        const filtered = data.filter(d => d && d.player_name && selectedPlayers.includes(d.player_name));
        const pts = [];

        let sumHeight = 0, sumSide = 0, sumExt = 0, validCount = 0;
        const types = {};

        filtered.forEach(d => {
            if (d.release_pos_x != null && d.release_pos_z != null) {
                const rx = Number(d.release_pos_x);
                const rz = Number(d.release_pos_z);
                const ext = d.release_extension != null ? Number(d.release_extension) : null;

                if (!isNaN(rx) && !isNaN(rz)) {
                    const pitchType = d.pitch_name || d.pitch_type || 'Other';
                    const color = PITCH_COLORS[pitchType] || '#3b82f6';

                    // Convert to units
                    const xVal = units === 'metric' ? Number((rx * FT_TO_M).toFixed(2)) : Number(rx.toFixed(2));
                    const zVal = units === 'metric' ? Number((rz * FT_TO_M).toFixed(2)) : Number(rz.toFixed(2));

                    pts.push({
                        x: xVal,
                        y: zVal,
                        ext: ext ? (units === 'metric' ? (ext * FT_TO_M).toFixed(2) : ext.toFixed(2)) : '-',
                        pitchType,
                        color
                    });

                    sumHeight += rz;
                    sumSide += rx;
                    if (ext) sumExt += ext;
                    validCount++;

                    types[pitchType] = color;
                }
            }
        });

        const avgHeight = validCount > 0 ? (units === 'metric' ? (sumHeight / validCount) * FT_TO_M : sumHeight / validCount).toFixed(2) : '-';
        const avgSide = validCount > 0 ? (units === 'metric' ? (sumSide / validCount) * FT_TO_M : sumSide / validCount).toFixed(2) : '-';
        const avgExt = validCount > 0 && sumExt > 0 ? (units === 'metric' ? (sumExt / validCount) * FT_TO_M : sumExt / validCount).toFixed(2) : '-';

        const legends = Object.entries(types).map(([name, color]) => ({ name, color }));

        return {
            chartData: pts,
            metrics: { avgHeight, avgSide, avgExt, total: validCount },
            legendData: legends
        };
    }, [data, selectedPlayers, units]);

    const distUnit = units === 'metric' ? 'm' : 'ft';
    const xDomain = units === 'metric' ? [-1.5, 1.5] : [-4, 4];
    const yDomain = units === 'metric' ? [1.2, 2.3] : [4.0, 7.5];

    if (chartData.length === 0) return null;

    return (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                    <h3 className="font-extrabold text-sm md:text-base text-foreground tracking-tight flex items-center gap-2">
                        <span>{language === 'ja' ? 'リリースポイント・トンネル分析' : 'Release Point & Tunneling'}</span>
                        <span className="text-[10px] bg-cyan-500/15 text-cyan-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Form Consistency
                        </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {language === 'ja'
                            ? '捕手視点でのボール放出位置（Release X / Release Z）と球種による腕の振りの一致度'
                            : 'Catcher view release arm slot consistency across all pitch types'}
                    </p>
                </div>

                {/* KPI Summary badges */}
                {metrics && (
                    <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="bg-muted/70 px-2.5 py-1 rounded-lg border border-border">
                            <span className="text-muted-foreground mr-1.5">{language === 'ja' ? '平均高さ' : 'Avg Height'}:</span>
                            <span className="font-bold text-foreground">{metrics.avgHeight} {distUnit}</span>
                        </div>
                        <div className="bg-muted/70 px-2.5 py-1 rounded-lg border border-border">
                            <span className="text-muted-foreground mr-1.5">{language === 'ja' ? '踏み込み (Ext)' : 'Extension'}:</span>
                            <span className="font-bold text-cyan-400">{metrics.avgExt} {distUnit}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Compact Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {legendData.map(s => (
                    <div key={s.name} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></span>
                        <span className="text-foreground text-[11px] font-medium">{s.name}</span>
                    </div>
                ))}
            </div>

            {/* Release Point Scatter Plot */}
            <div className="w-full h-[320px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: -5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#64748b" />
                        <XAxis
                            type="number"
                            dataKey="x"
                            name="Release X"
                            domain={xDomain}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            stroke="#475569"
                            unit={` ${distUnit}`}
                        />
                        <YAxis
                            type="number"
                            dataKey="y"
                            name="Release Z"
                            domain={yDomain}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            stroke="#475569"
                            unit={` ${distUnit}`}
                        />
                        <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="2 2" strokeOpacity={0.6} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-xl text-xs z-50">
                                            <div className="flex items-center gap-1.5 mb-1 font-bold" style={{ color: d.color }}>
                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                                                {d.pitchType}
                                            </div>
                                            <div className="text-muted-foreground space-y-0.5 text-[11px]">
                                                <div>Release X: <span className="font-semibold text-foreground">{d.x} {distUnit}</span></div>
                                                <div>Release Height: <span className="font-semibold text-foreground">{d.y} {distUnit}</span></div>
                                                <div>Extension: <span className="font-semibold text-cyan-400">{d.ext} {distUnit}</span></div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Scatter name="Releases" data={chartData} isAnimationActive={false}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-rel-${index}`} fill={entry.color} fillOpacity={0.7} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ReleasePointChart;

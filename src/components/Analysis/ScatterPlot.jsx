import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const ScatterPlot = ({ data, xKey, yKey, xLabel, yLabel, domainX, domainY, aspect }) => {
    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center border border-dashed border-border rounded-xl bg-card/50 ${aspect ? 'aspect-square' : 'h-[500px]'}`}>
                <p className="text-muted-foreground">データがありません</p>
            </div>
        );
    }

    // Group data by player aka Pitch Type
    const playerData = {};
    data.forEach(d => {
        const key = d.player || 'Unknown';
        if (!playerData[key]) {
            playerData[key] = [];
        }
        playerData[key].push(d);
    });

    return (
        <div className={`border border-border rounded-xl bg-card p-4 shadow-sm ${aspect ? 'aspect-square' : ''}`}>
            <h3 className="text-sm font-medium text-foreground mb-4">{yLabel} vs {xLabel}</h3>
            <ResponsiveContainer width="100%" height={aspect ? "100%" : 500}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        type="number"
                        dataKey={xKey}
                        name={xLabel}
                        stroke="#888888"
                        domain={domainX || ['auto', 'auto']}
                        tick={{ fill: '#888888' }}
                        label={{ value: xLabel, position: 'insideBottom', offset: -20, fill: '#888888' }}
                    />
                    <YAxis
                        type="number"
                        dataKey={yKey}
                        name={yLabel}
                        stroke="#888888"
                        domain={domainY || ['auto', 'auto']}
                        tick={{ fill: '#888888' }}
                        label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#888888' }}
                    />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                // Filter duplications (if any) or just show top 5
                                const uniquePoints = payload.slice(0, 5);
                                return (
                                    <div className="bg-card border border-border p-3 rounded-lg shadow-lg text-sm">
                                        <p className="font-bold mb-1 text-foreground">{label}</p>
                                        <div className="space-y-1">
                                            {uniquePoints.map((p, i) => {
                                                const pt = p.payload;
                                                return (
                                                    <div key={i} className="flex flex-col gap-0.5 border-b border-border/50 pb-1 last:border-0 last:pb-0">
                                                        <span className="font-semibold" style={{ color: p.color }}>{p.name}</span>
                                                        <div className="text-muted-foreground text-xs flex gap-2">
                                                            <span>{xLabel}: {pt[xKey]}</span>
                                                            <span>{yLabel}: {pt[yKey]}</span>
                                                        </div>
                                                        {pt.fullPlayerName && (
                                                            <span className="text-xs text-muted-foreground italic">{pt.fullPlayerName}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {payload.length > 5 && <span className="text-xs text-muted-foreground ml-1">...and {payload.length - 5} more</span>}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    {Object.entries(playerData).map(([player, points], idx) => (
                        <Scatter
                            key={player}
                            name={player}
                            data={points}
                            fill={COLORS[idx % COLORS.length]}
                        />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ScatterPlot;

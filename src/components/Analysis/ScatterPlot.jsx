import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const ScatterPlot = ({ data, xKey, yKey, xLabel, yLabel }) => {
    if (!data || data.length === 0) {
        return (
            <div className="h-[400px] flex items-center justify-center border border-dashed border-border rounded-xl bg-card/50">
                <p className="text-muted-foreground">データがありません</p>
            </div>
        );
    }

    // Group data by player
    const playerData = {};
    data.forEach(d => {
        if (!playerData[d.player]) {
            playerData[d.player] = [];
        }
        playerData[d.player].push(d);
    });

    return (
        <div className="border border-border rounded-xl bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-4">{yLabel} vs {xLabel}</h3>
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        type="number"
                        dataKey={xKey}
                        name={xLabel}
                        stroke="#888888"
                        domain={['auto', 'auto']}
                        tick={{ fill: '#888888' }}
                        label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#888888' }}
                    />
                    <YAxis
                        type="number"
                        dataKey={yKey}
                        name={yLabel}
                        stroke="#888888"
                        domain={['auto', 'auto']}
                        tick={{ fill: '#888888' }}
                        label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#888888' }}
                    />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: '#ffffff'
                        }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: '#ffffff' }}
                    />
                    <Legend />
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

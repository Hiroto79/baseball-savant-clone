import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSettings } from '../../context/SettingsContext';

const COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                <p className="font-medium mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="font-medium font-mono">
                            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const ComparisonChart = ({ data, lines, yLabel }) => {
    const { language } = useSettings();

    // Don't render if no data or no valid data points
    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                <p className="text-sm">{language === 'ja' ? 'データがありません' : 'No data available'}</p>
            </div>
        );
    }

    // Check if any line has actual data
    const hasData = lines.some(line =>
        data.some(d => d[line.dataKey] !== undefined && d[line.dataKey] !== null)
    );

    if (!hasData) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                <p className="text-sm">{language === 'ja' ? 'データがありません' : 'No data available'}</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground">{yLabel}</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {lines.map((line, idx) => (
                        <Line
                            key={line.dataKey}
                            type="monotone"
                            dataKey={line.dataKey}
                            stroke={COLORS[idx % COLORS.length]}
                            name={line.name}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ComparisonChart;

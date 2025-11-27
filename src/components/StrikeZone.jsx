import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, ReferenceArea, Cell } from 'recharts';

const COLORS = {
    '4-Seam Fastball': '#ef4444', // red-500
    'Sinker': '#f97316', // orange-500
    'Cutter': '#b91c1c', // red-700
    'Slider': '#eab308',   // yellow-500
    'Sweeper': '#facc15', // yellow-400
    'Curveball': '#3b82f6', // blue-500
    'Knuckle Curve': '#1d4ed8', // blue-700
    'Changeup': '#22c55e',  // green-500
    'Splitter': '#15803d', // green-700
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-sm z-50">
                <p className="font-bold text-popover-foreground">{data.type}</p>
                <p className="text-muted-foreground">Speed: {data.speed} mph</p>
                <p className="text-muted-foreground">Result: {data.result}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.desc}</p>
            </div>
        );
    }
    return null;
};

const StrikeZone = ({ pitches = [] }) => {
    // Transform data for chart
    const chartData = pitches.map(p => ({
        x: p.plate_x,
        y: p.plate_z,
        type: p.pitch_name || 'Unknown',
        speed: p.release_speed,
        result: p.type, // S=Strike, B=Ball, X=InPlay
        desc: p.description
    })).filter(p => p.x != null && p.y != null);

    return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center relative bg-card/50 rounded-lg p-4">
            <h4 className="absolute top-2 left-4 text-sm font-medium text-muted-foreground">Catcher's View</h4>
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    {/* Domain: -2.5ft to 2.5ft (width), 0ft to 5ft (height) */}
                    <XAxis type="number" dataKey="x" domain={[-2.5, 2.5]} hide />
                    <YAxis type="number" dataKey="y" domain={[0, 5]} hide />
                    <ZAxis type="number" range={[60, 60]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                    {/* Home Plate (approximate visual) */}
                    <ReferenceArea x1={-0.71} x2={0.71} y1={0} y2={0.2} fill="#cbd5e1" />

                    {/* Strike Zone Box */}
                    <ReferenceArea
                        x1={-0.71}
                        x2={0.71}
                        y1={1.5}
                        y2={3.5}
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="rgba(255,255,255,0.05)"
                    />

                    <Scatter name="Pitches" data={chartData}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.type] || '#94a3b8'} stroke="white" strokeWidth={1} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap justify-center gap-2 mt-4 text-xs text-muted-foreground max-w-full overflow-hidden">
                {Object.entries(COLORS).filter(([type]) => chartData.some(d => d.type === type)).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }}></div>
                        <span className="font-medium whitespace-nowrap">{type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StrikeZone;

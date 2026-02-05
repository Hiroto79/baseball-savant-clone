import React, { useMemo } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import { useSettings } from '../../context/SettingsContext';

const COLOR_MAP = {
    'FF': '#FF0000', '4-Seam Fastball': '#FF0000',
    'FT': '#FF4500', '2-Seam Fastball': '#FF4500',
    'FC': '#933f2c', 'Cutter': '#933f2c',
    'SI': '#FF8C00', 'Sinker': '#FF8C00',
    'CH': '#1DB100', 'Changeup': '#1DB100',
    'CU': '#00BFFF', 'Curveball': '#00BFFF',
    'SL': '#EEE600', 'Slider': '#EEE600',
    'ST': '#D2691E', 'Sweeper': '#D2691E',
    'SV': '#800080', 'Slurve': '#800080',
    'KC': '#483D8B', 'Knuckle Curve': '#483D8B',
    'FS': '#0000FF', 'Split-Finger': '#0000FF',
    'FO': '#0055FF', 'Forkball': '#0055FF',
    'EP': '#444444', 'Eephus': '#444444',
    'KN': '#999999', 'Knuckleball': '#999999',
    'SC': '#FFA07A', 'Screwball': '#FFA07A',
    'Other': '#808080'
};

const ReleaseAngleChart = ({ pitches }) => {
    const { language } = useSettings();

    const data = useMemo(() => {
        if (!pitches || pitches.length === 0) return [];

        // Group by pitch type
        const grouped = {};
        let total = 0;

        pitches.forEach(p => {
            const rawType = p.pitch_type || p.pitch_name || 'Unknown';
            if (!grouped[rawType]) {
                grouped[rawType] = {
                    type: rawType,
                    count: 0,
                    vx0Sum: 0, vy0Sum: 0, vz0Sum: 0,
                    axSum: 0, aySum: 0, azSum: 0
                };
            }
            const g = grouped[rawType];

            // Need numeric vectors
            const vx0 = Number(p.vx0);
            const vy0 = Number(p.vy0);
            const vz0 = Number(p.vz0);
            const ax = Number(p.ax);
            const ay = Number(p.ay);
            const az = Number(p.az);

            if (!isNaN(vx0) && !isNaN(vy0) && !isNaN(vz0)) {
                g.vx0Sum += vx0;
                g.vy0Sum += vy0;
                g.vz0Sum += vz0;
                g.count++;
                total++;
            }
            // ax, ay, az for arm angle if needed (user code used ax/ax? No, user used vx0/vy0 for arm angle too?)
            // User code:
            // horiz_angle = degrees(arctan2(vx0, vy0))
            // vert_angle = degrees(arctan2(vz0, sqrt(vx0^2 + vy0^2)))
        });

        // Calculate means and angles
        const result = Object.values(grouped).map(g => {
            if (g.count === 0) return null;
            const vx0 = g.vx0Sum / g.count;
            const vy0 = g.vy0Sum / g.count;
            const vz0 = g.vz0Sum / g.count;

            const toDeg = 180 / Math.PI;

            // Vertical Release Angle (Elevation)
            const vertAngle = Math.atan2(vz0, Math.sqrt(vx0 * vx0 + vy0 * vy0)) * toDeg;

            // Arm Angle (Horizontal) - User Logic
            // horiz_angle = (degrees(atan2(vx0, vy0)) - 180) % 360 ...
            // Let's implement user's exact logic for consistency
            let rawHoriz = Math.atan2(vx0, vy0) * toDeg;
            // The user script does: (horiz - 180) % 360 ... then (+180)%360 - 180.
            // This essentially normalizes it to [-180, 180] centered correctly for baseball perspective?
            // Actually atan2(vx0, vy0) is angle from +Y (towards catcher). 
            // -X (Left), +X (Right).
            // This is roughly the horizontal angle.
            // Let's just store the direct value for display first.
            const armAngle = rawHoriz;

            return {
                type: g.type,
                vertAngle: Number(vertAngle.toFixed(1)),
                armAngle: Number(armAngle.toFixed(1)),
                count: g.count,
                ratio: g.count / total,
                color: COLOR_MAP[g.type] || '#808080'
            };
        }).filter(Boolean).sort((a, b) => b.count - a.count);

        return result;
    }, [pitches]);

    if (data.length === 0) return null;

    // Visualization
    // User used a 2D plot with arrows.
    // X = 0, Y = 0 (Release Point)
    // End = (cos(angle), sin(angle)) * length
    // Pitcher side view usually looks at Z (Height) vs Y (Distance).
    // Or X (Horizontal) vs Z (Height).
    // User chart: `angle = np.deg2rad(row["mean_vert"] * scale)`
    // This implies it's magnifying the vertical angle to make it visible.
    // And plotting it as lines radiating from a point.
    // Let's replicate this using SVG.

    const SCALE = 8; // Magnification factor from user script
    const RADIUS = 150; // Pixel length of line
    const CENTER_X = 200;
    const CENTER_Y = 200; // Left side of SVG for the "ball"

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full h-full flex flex-col">
            <h3 className="text-lg font-bold mb-4">Vertical Release Angle</h3>
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8">

                {/* Chart Area */}
                <div className="relative w-[300px] h-[300px] border border-border/50 rounded-lg bg-black/20">
                    <svg width="100%" height="100%" viewBox="0 0 400 400" className="overflow-visible">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7"
                                refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
                            </marker>
                        </defs>

                        {/* Origin Line (Horizon) */}
                        <line x1={0} y1={CENTER_Y} x2={400} y2={CENTER_Y} stroke="#444" strokeDasharray="4 4" />

                        {/* Ball at Origin */}
                        <circle cx={50} cy={CENTER_Y} r={10} fill="white" stroke="black" strokeWidth={2} />

                        {/* Vectors */}
                        {data.map((d, i) => {
                            // Angle in degrees. Positive is UP.
                            // In SVG y is down. So subtract angle.
                            // User multiplied by SCALE (8).
                            const angleRad = (d.vertAngle * SCALE) * (Math.PI / 180);

                            // Start at ball
                            const sx = 50;
                            const sy = CENTER_Y;

                            // End point
                            const len = 250;
                            const ex = sx + len * Math.cos(angleRad);
                            const ey = sy - len * Math.sin(angleRad); // Minus because Y is down

                            return (
                                <g key={i}>
                                    <line
                                        x1={sx} y1={sy}
                                        x2={ex} y2={ey}
                                        stroke={d.color}
                                        strokeWidth={3}
                                        className="opacity-80 hover:opacity-100 transition-opacity"
                                    />
                                    {/* Label at end */}
                                    <text x={ex + 5} y={ey} fill={d.color} fontSize="12" alignmentBaseline="middle">
                                        {d.type} ({d.vertAngle}°)
                                    </text>
                                </g>
                            );
                        })}

                        {/* Plus/Minus Legends */}
                        <text x={20} y={100} fill="red" fontSize="20" fontWeight="bold">+</text>
                        <text x={20} y={300} fill="red" fontSize="20" fontWeight="bold">-</text>

                    </svg>
                </div>

                {/* Legend / Table Area */}
                <div className="flex-1 overflow-auto max-h-[300px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-2 py-1">Type</th>
                                <th className="px-2 py-1">Rel Ang</th>
                                <th className="px-2 py-1">Arm Ang</th>
                                <th className="px-2 py-1 text-right">Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.map(row => (
                                <tr key={row.type}>
                                    <td className="px-2 py-1 font-medium flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></span>
                                        {row.type}
                                    </td>
                                    <td className="px-2 py-1">{row.vertAngle}°</td>
                                    <td className="px-2 py-1">{row.armAngle}°</td>
                                    <td className="px-2 py-1 text-right">{row.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
                * Angle magnified {SCALE}x for visibility. Origin is Release Point (Side View).
            </p>
        </div>
    );
};

export default ReleaseAngleChart;

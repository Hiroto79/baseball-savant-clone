import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceDot } from 'recharts';
import { useSettings } from '../context/SettingsContext';
import { getVelocityUnit, getDistanceUnit, convertVelocity, convertDistance } from '../utils/units';

const COLORS = {
    'single': '#3b82f6',
    'double': '#eab308',
    'triple': '#f97316',
    'home_run': '#ef4444',
    'field_out': '#64748b',
    'force_out': '#64748b',
    'grounded_into_double_play': '#64748b',
    'sac_fly': '#64748b',
};

const CustomTooltip = ({ active, payload }) => {
    const { units } = useSettings();
    if (active && payload && payload.length) {
        const data = payload[0].payload;

        // Determine source data units based on mode
        // Rapsodo: km/h and meters
        // Savant: mph and feet
        const isRapsodo = data.sourceMode === 'rapsodo';

        let displayVel, displayDist;

        if (isRapsodo) {
            // Rapsodo data is in km/h and meters
            // Convert based on user's unit preference
            displayVel = data.exitVel ? (units === 'imperial' ? convertVelocity(data.exitVel, 'kmh', units) : data.exitVel) : null;
            displayDist = data.distance ? (units === 'imperial' ? convertDistance(data.distance, 'm', units) : data.distance) : null;
        } else {
            // Savant data is already in mph and feet
            // Convert to metric if needed
            displayVel = data.exitVel ? (units === 'metric' ? convertVelocity(data.exitVel, 'mph', units) : data.exitVel) : null;
            displayDist = data.distance ? (units === 'metric' ? convertDistance(data.distance, 'ft', units) : data.distance) : null;
        }

        return (
            <div className="bg-popover border border-border p-3 rounded-lg shadow-lg text-sm z-50">
                <p className="font-bold text-popover-foreground capitalize">{data.type.replace(/_/g, ' ')}</p>
                {displayVel !== null && displayVel !== undefined && !isNaN(displayVel) && (
                    <p className="text-muted-foreground">
                        Exit Vel: {displayVel.toFixed(1)} {getVelocityUnit(units)}
                    </p>
                )}
                {displayDist !== null && displayDist !== undefined && !isNaN(displayDist) && (
                    <p className="text-muted-foreground">
                        Distance: {displayDist.toFixed(1)} {getDistanceUnit(units)}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const SprayChart = ({ hits = [], mode = 'statcast' }) => {
    // User-provided constants and transformation logic
    const HOME_PLATE_X = 125.42;
    const HOME_PLATE_Y = 199.88;
    const SCALE = 2.85; // Increased scale to match visual distance with new field dimensions

    const chartData = hits.map(h => {
        let x, y;

        if (mode === 'rapsodo') {
            // Rapsodo data uses hc_x/hc_y (calculated from direction/distance in feet)
            if (h.hc_x == null || h.hc_y == null) return null;

            // Rapsodo coordinates are already in feet, centered at home plate
            // Just need to scale them to match the chart dimensions
            const RAPSODO_SCALE = 1; // Coordinates are in feet, matches chart scale
            x = h.hc_x * RAPSODO_SCALE;
            y = h.hc_y * RAPSODO_SCALE;
        } else {
            // Statcast Mode
            if (h.hc_x == null || h.hc_y == null) return null;

            // Calculate angle from hc_x/hc_y
            const relativeX = (h.hc_x - HOME_PLATE_X);
            const relativeY = (HOME_PLATE_Y - h.hc_y); // Invert Y so positive is outfield
            const angle = Math.atan2(relativeY, relativeX);

            // Use explicit distance if available for best accuracy
            // This resolves discrepancies where hc_x/y scaling doesn't match hit_distance_sc
            const dist = h.distance || h.hit_distance_sc;

            if (dist) {
                // Polar to Cartesian: x = r * cos(theta), y = r * sin(theta)
                x = dist * Math.cos(angle);
                y = dist * Math.sin(angle);
            } else {
                // Fallback to scaling if distance is missing
                // SCALE = 2.5 is standard approximation
                x = relativeX * SCALE;
                y = relativeY * SCALE;
            }
        }

        // Determine hit type/color
        let type = 'field_out';
        if (h.events) {
            const event = h.events.toLowerCase();
            if (event.includes('single')) type = 'single';
            else if (event.includes('double')) type = 'double';
            else if (event.includes('triple')) type = 'triple';
            else if (event.includes('home_run')) type = 'home_run';
        }

        // Convert for display based on user settings will be handled in tooltip
        return {
            x,
            y,
            type: type,
            exitVel: h.launch_speed || h.exitVel,
            distance: h.distance || h.hit_distance_sc, // Use distance if available, otherwise hit_distance_sc
            sourceMode: mode, // Track data source for tooltip conversion
        };
    })
        .filter(Boolean)
        .filter(h => h.y >= 0 && (h.distance == null || h.distance > 10)); // Filter out points behind home or very short distances

    // Legend Data
    const legendItems = [
        { label: 'Single', color: COLORS.single },
        { label: 'Double', color: COLORS.double },
        { label: 'Triple', color: COLORS.triple },
        { label: 'Home Run', color: COLORS.home_run },
        { label: 'Out', color: COLORS.field_out },
    ];

    return (
        <div className="w-full h-full min-h-[400px] relative flex flex-col items-center justify-center bg-card/50 rounded-lg p-4">
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                {/* 
                  Unified SVG Coordinate System:
                  Field Dimensions (User Specified):
                  - Center: 120m = 393.7 ft
                  - Sides (Foul Poles): 98m = 321.5 ft
                  
                  Coordinates:
                  - Center Fence: (0, -393.7)
                  - Left Pole: (-227.3, -227.3)  [321.5 * cos(45), 321.5 * sin(45)]
                  - Right Pole: (227.3, -227.3)
                  
                  ViewBox adjusted to fit new dimensions
                */}
                <svg viewBox="-300 -450 600 500" className="w-full h-full max-w-[500px] max-h-[400px] overflow-visible">
                    {/* Foul Lines */}
                    <line x1="0" y1="0" x2="-227.3" y2="-227.3" stroke="white" strokeWidth="2" />
                    <line x1="0" y1="0" x2="227.3" y2="-227.3" stroke="white" strokeWidth="2" />

                    {/* Outfield Fence 
                        Path from Left Pole to Right Pole passing through Center
                        M -227.3 -227.3 
                        A 238.5 238.5 0 0 1 227.3 -227.3
                    */}
                    <path d="M -227.3 -227.3 A 238.5 238.5 0 0 1 227.3 -227.3" stroke="white" strokeWidth="3" fill="none" />

                    {/* Infield Diamond (90ft bases) */}
                    <path d="M 0 0 L 63.6 -63.6 L 0 -127.3 L -63.6 -63.6 Z" stroke="#a16207" strokeWidth="2" fill="none" />

                    {/* Bases */}
                    <rect x="-3" y="-3" width="6" height="6" fill="white" transform="rotate(45 0 0)" />
                    <rect x="60.6" y="-66.6" width="6" height="6" fill="white" transform="rotate(45 63.6 -63.6)" />
                    <rect x="-3" y="-130.3" width="6" height="6" fill="white" transform="rotate(45 0 -127.3)" />
                    <rect x="-66.6" y="-66.6" width="6" height="6" fill="white" transform="rotate(45 -63.6 -63.6)" />
                </svg>
            </div>

            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <XAxis type="number" dataKey="x" domain={[-300, 300]} hide />
                    <YAxis type="number" dataKey="y" domain={[-50, 450]} hide />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Scatter name="Hits" data={chartData}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.type] || '#94a3b8'} stroke="white" strokeWidth={1} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-muted-foreground">
                {legendItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SprayChart;

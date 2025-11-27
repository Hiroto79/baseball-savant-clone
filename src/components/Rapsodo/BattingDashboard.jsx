import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import SprayChart from '../SprayChart';
import { useSettings } from '../../context/SettingsContext';
import { KMH_TO_MPH, M_TO_FT, FT_TO_M, MPH_TO_KMH } from '../../utils/units';

const BattingDashboard = ({ data = [] }) => {
    const { units, language } = useSettings();

    const stats = useMemo(() => {
        if (!data.length) return { avgExitVel: 0, maxExitVel: 0, avgDist: 0, maxAngle: 0, total: 0 };

        const vels = data.map(d => d.ExitVelocity).filter(v => v != null && !isNaN(v) && v > 0);
        const dists = data.map(d => d.Distance).filter(d => d != null && !isNaN(d) && d > 0);
        const angles = data.map(d => d.LaunchAngle).filter(a => a != null && !isNaN(a));

        // Rapsodo input data is in km/h and meters
        // Convert to user's preferred units using the utility functions
        const convertedVels = vels.map(v => units === 'imperial' ? v * KMH_TO_MPH : v);
        const convertedDists = dists.map(d => units === 'imperial' ? d * M_TO_FT : d);

        return {
            total: data.length,
            avgExitVel: convertedVels.length ? (convertedVels.reduce((a, b) => a + b, 0) / convertedVels.length).toFixed(1) : 0,
            maxExitVel: convertedVels.length ? Math.max(...convertedVels).toFixed(1) : 0,
            avgDist: convertedDists.length ? (convertedDists.reduce((a, b) => a + b, 0) / convertedDists.length).toFixed(1) : 0,
            maxAngle: angles.length ? Math.max(...angles).toFixed(1) : 0
        };
    }, [data, units]);

    const chartData = data.map(d => ({
        // Rapsodo input is in km/h and meters
        exitVel: units === 'imperial' ? d.ExitVelocity * KMH_TO_MPH : d.ExitVelocity,
        launchAngle: d.LaunchAngle,
        distance: units === 'imperial' ? d.Distance * M_TO_FT : d.Distance,
        direction: d.ExitDirection,
        // Keep original values for spray chart calculation
        originalDistance: d.Distance, // meters
        originalExitVel: d.ExitVelocity // km/h
    })).filter(d => d.exitVel && d.launchAngle);

    // For Spray Chart - always use feet for coordinates
    const sprayData = data.map(d => {
        if (d.ExitDirection == null || d.Distance == null || d.Distance <= 0) {
            console.log('Filtered out spray data:', { ExitDirection: d.ExitDirection, Distance: d.Distance });
            return null;
        }

        // Rapsodo input is in meters and km/h
        const distanceMeters = d.Distance;
        const distanceFeet = d.Distance * M_TO_FT; // Convert to feet for chart coordinates
        const exitVelKmh = d.ExitVelocity;
        const direction = d.ExitDirection;

        // Chart coordinates (SprayChart expects feet)
        // Convert angle to radians
        const angleRad = (direction * Math.PI) / 180;

        // Calculate x, y coordinates in feet
        const x = distanceFeet * Math.sin(angleRad);
        const y = Math.abs(distanceFeet * Math.cos(angleRad));

        // Keep raw values for tooltip conversion (units handled in tooltip)
        const rawDistance = distanceMeters; // meters
        const rawExitVel = exitVelKmh; // km/h
        return {
            hc_x: x,
            hc_y: y,
            hit_distance_sc: distanceFeet,
            distance: rawDistance, // meters, will be converted in tooltip
            exitVel: rawExitVel, // km/h, will be converted in tooltip
            events: 'hit',
            sourceMode: 'rapsodo' // Flag for tooltip to know data is in km/h and meters
        };
    }).filter(Boolean);

    console.log('Spray data count:', sprayData.length, 'Total data:', data.length);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '平均打球速度' : 'Avg Exit Velocity'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.avgExitVel} <span className="text-lg font-normal text-muted-foreground">{units === 'imperial' ? 'mph' : 'km/h'}</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '最大打球速度' : 'Max Exit Velocity'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.maxExitVel} <span className="text-lg font-normal text-muted-foreground">{units === 'imperial' ? 'mph' : 'km/h'}</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '平均飛距離' : 'Avg Distance'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.avgDist} <span className="text-lg font-normal text-muted-foreground">{units === 'imperial' ? 'ft' : 'm'}</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '最大打球角度' : 'Max Launch Angle'}</h3>
                    <div className="mt-2 text-3xl font-bold">{stats.maxAngle}°</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Exit Vel vs Launch Angle */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? '打球速度 vs 打球角度' : 'Exit Velocity vs Launch Angle'}</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis type="number" dataKey="exitVel" name={language === 'ja' ? '打球速度' : 'Exit Velocity'} unit={units === 'imperial' ? ' mph' : ' km/h'} domain={['auto', 'auto']} stroke="#888" />
                                <YAxis type="number" dataKey="launchAngle" name={language === 'ja' ? '打球角度' : 'Launch Angle'} unit=" deg" domain={['auto', 'auto']} stroke="#888" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Hits" data={chartData} fill="#3b82f6" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Spray Chart (Calculated) */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? '打球分布' : 'Hit Distribution'}</h3>
                    <div className="flex-1 relative">
                        <SprayChart hits={sprayData} mode="rapsodo" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BattingDashboard;

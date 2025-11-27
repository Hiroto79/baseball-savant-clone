import React, { useState, useMemo } from 'react';
import { useBlast } from '../context/BlastContext';
import { useSettings } from '../context/SettingsContext';
import PlayerSearch from '../components/Analysis/PlayerSearch';
import { Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend } from 'recharts';

const Blast = () => {
    const { blastData, loading } = useBlast();
    const { language } = useSettings();
    const [selectedPlayers, setSelectedPlayers] = useState([]);

    // Custom tooltip with white text
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', padding: '10px', color: '#fff' }}>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: '#fff', margin: '2px 0' }}>
                            {`${entry.name}: ${entry.value}${entry.unit || ''}`}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    // Extract unique players
    const players = useMemo(() => {
        const names = new Set(blastData.map(d => d.PlayerName).filter(Boolean));
        return Array.from(names).sort();
    }, [blastData]);

    // Filter data by selected players
    const filteredData = useMemo(() => {
        if (selectedPlayers.length === 0) return blastData;
        return blastData.filter(d => selectedPlayers.includes(d.PlayerName));
    }, [blastData, selectedPlayers]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (filteredData.length === 0) return { avgBatSpeed: 0, maxPower: 0, avgEfficiency: 0, totalSwings: 0 };

        const validBatSpeed = filteredData.filter(d => d.BatSpeed).map(d => d.BatSpeed);
        const validPower = filteredData.filter(d => d.Power).map(d => d.Power);
        const validEfficiency = filteredData.filter(d => d.OnPlaneEfficiency).map(d => d.OnPlaneEfficiency);

        return {
            avgBatSpeed: validBatSpeed.length > 0 ? (validBatSpeed.reduce((a, b) => a + b, 0) / validBatSpeed.length).toFixed(1) : 0,
            maxPower: validPower.length > 0 ? Math.max(...validPower).toFixed(2) : 0,
            avgEfficiency: validEfficiency.length > 0 ? (validEfficiency.reduce((a, b) => a + b, 0) / validEfficiency.length).toFixed(1) : 0,
            totalSwings: filteredData.length
        };
    }, [filteredData]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg font-medium">Loading Blast Data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">
                    {language === 'ja' ? 'Blast分析' : 'Blast Analysis'}
                </h2>

                <div className="flex items-center gap-4">
                    {/* Player Search */}
                    <div className="w-full md:w-[400px]">
                        <PlayerSearch
                            players={players}
                            selectedPlayers={selectedPlayers}
                            onTogglePlayer={(player) => {
                                setSelectedPlayers(prev =>
                                    prev.includes(player)
                                        ? prev.filter(p => p !== player)
                                        : [...prev, player]
                                );
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {language === 'ja' ? '総スイング数' : 'Total Swings'}
                    </h3>
                    <div className="mt-2 text-3xl font-bold">{stats.totalSwings}</div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {language === 'ja' ? '平均バットスピード' : 'Avg Bat Speed'}
                    </h3>
                    <div className="mt-2 text-3xl font-bold">{stats.avgBatSpeed} <span className="text-lg font-normal text-muted-foreground">mph</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {language === 'ja' ? '最大パワー' : 'Max Power'}
                    </h3>
                    <div className="mt-2 text-3xl font-bold">{stats.maxPower} <span className="text-lg font-normal text-muted-foreground">kW</span></div>
                </div>
                <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {language === 'ja' ? '平均オンプレーン効率' : 'Avg On-Plane Efficiency'}
                    </h3>
                    <div className="mt-2 text-3xl font-bold">{stats.avgEfficiency} <span className="text-lg font-normal text-muted-foreground">%</span></div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Bat Speed vs Hand Speed */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                        {language === 'ja' ? 'バットスピード vs 手の最大速度' : 'Bat Speed vs Hand Speed'}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                type="number"
                                dataKey="BatSpeed"
                                name={language === 'ja' ? 'バットスピード' : 'Bat Speed'}
                                unit=" mph"
                                stroke="#888"
                                tick={{ fill: '#888' }}
                            />
                            <YAxis
                                type="number"
                                dataKey="PeakHandSpeed"
                                name={language === 'ja' ? '手の最大速度' : 'Hand Speed'}
                                unit=" mph"
                                stroke="#888"
                                tick={{ fill: '#888' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Scatter
                                data={filteredData.filter(d => d.BatSpeed && d.PeakHandSpeed)}
                                fill="#3b82f6"
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>

                {/* Bat Speed Distribution */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                        {language === 'ja' ? 'バットスピードの推移' : 'Bat Speed Trend'}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData.filter(d => d.BatSpeed).map((d, i) => ({ ...d, index: i + 1 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="index"
                                stroke="#888"
                                tick={{ fill: '#888' }}
                                label={{ value: language === 'ja' ? 'スイング' : 'Swing', position: 'insideBottomRight', offset: -5, fill: '#888' }}
                            />
                            <YAxis stroke="#888" tick={{ fill: '#888' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="BatSpeed"
                                stroke="#10b981"
                                name={language === 'ja' ? 'バットスピード (mph)' : 'Bat Speed (mph)'}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* On-Plane Efficiency Over Time */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                        {language === 'ja' ? 'オンプレーン効率の推移' : 'On-Plane Efficiency Trend'}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredData.filter(d => d.OnPlaneEfficiency).map((d, i) => ({ ...d, index: i + 1 }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                dataKey="index"
                                stroke="#888"
                                tick={{ fill: '#888' }}
                                label={{ value: language === 'ja' ? 'スイング' : 'Swing', position: 'insideBottomRight', offset: -5, fill: '#888' }}
                            />
                            <YAxis stroke="#888" tick={{ fill: '#888' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="OnPlaneEfficiency"
                                stroke="#f59e0b"
                                name={language === 'ja' ? 'オンプレーン効率 (%)' : 'On-Plane Efficiency (%)'}
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Power vs Hand Speed */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">
                        {language === 'ja' ? 'パワー vs 手の最大速度' : 'Power vs Hand Speed'}
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis
                                type="number"
                                dataKey="PeakHandSpeed"
                                name={language === 'ja' ? '手の最大速度' : 'Hand Speed'}
                                unit=" mph"
                                stroke="#888"
                                tick={{ fill: '#888' }}
                            />
                            <YAxis
                                type="number"
                                dataKey="Power"
                                name={language === 'ja' ? 'パワー' : 'Power'}
                                unit=" kW"
                                stroke="#888"
                                tick={{ fill: '#888' }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Scatter
                                data={filteredData.filter(d => d.PeakHandSpeed && d.Power)}
                                fill="#8b5cf6"
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Blast;

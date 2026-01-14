import React, { useState, useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import ComparisonChart from './ComparisonChart';
import ComparisonTable from './ComparisonTable';
import PlayerSearch from './PlayerSearch';
import { ChevronsUpDown } from 'lucide-react';

const BlastAnalysis = ({ data }) => {
    const { language, units } = useSettings();
    const [selectedPlayers, setSelectedPlayers] = useState([]);

    // Conversion constants
    const MPH_TO_KMH = 1.60934;

    // Helper to convert velocity
    const convertVel = (val) => {
        if (val === null || val === undefined) return null;
        return units === 'metric' ? val * MPH_TO_KMH : val;
    };

    // Extract unique players and map swings for efficient access
    const { players, playerSwings } = useMemo(() => {
        const names = new Set();
        const swingsMap = {};

        // Iterate through Teams
        Object.values(data).forEach(teamPlayers => {
            // Iterate through Players in each Team
            Object.entries(teamPlayers).forEach(([player, swings]) => {
                names.add(player);

                // Consolidate swings (in case player exists in multiple teams/groups)
                if (swingsMap[player]) {
                    swingsMap[player] = [...swingsMap[player], ...swings];
                } else {
                    swingsMap[player] = swings;
                }
            });
        });

        return {
            players: Array.from(names).sort(),
            playerSwings: swingsMap
        };
    }, [data]);

    // Toggle player selection
    const togglePlayer = (player) => {
        setSelectedPlayers(prev =>
            prev.includes(player)
                ? prev.filter(p => p !== player)
                : [...prev, player]
        );
    };

    // Prepare Chart Data and Summary Data
    const { chartData, summaryData } = useMemo(() => {
        if (selectedPlayers.length === 0) return { chartData: [], summaryData: {} };

        // Group by Date for Chart
        const dateMap = {};
        // Accumulate totals for Summary
        const playerTotals = {};

        selectedPlayers.forEach(p => {
            playerTotals[p] = { count: 0, bat_speed: 0, power: 0, efficiency: 0 };

            const swings = playerSwings[p] || [];

            swings.forEach(d => {
                // Use Date if available, otherwise fallback to file name or "Unknown"
                const dateKey = d.Date || d.file_name || 'Unknown Date';

                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { date: dateKey };
                }

                if (!dateMap[dateKey][`${p}_count`]) {
                    dateMap[dateKey][`${p}_count`] = 0;
                    dateMap[dateKey][`${p}_bat_speed`] = 0;
                    dateMap[dateKey][`${p}_power`] = 0;
                    dateMap[dateKey][`${p}_efficiency`] = 0;
                }

                const batSpeed = convertVel(d.BatSpeed);

                dateMap[dateKey][`${p}_count`]++;
                dateMap[dateKey][`${p}_bat_speed`] += (batSpeed || 0);
                dateMap[dateKey][`${p}_power`] += (d.Power || 0);
                dateMap[dateKey][`${p}_efficiency`] += (d.OnPlaneEfficiency || 0);

                playerTotals[p].count++;
                playerTotals[p].bat_speed += (batSpeed || 0);
                playerTotals[p].power += (d.Power || 0);
                playerTotals[p].efficiency += (d.OnPlaneEfficiency || 0);
            });
        });

        // Calculate averages for Chart
        const finalChartData = Object.values(dateMap).map(day => {
            const entry = { date: day.date };
            selectedPlayers.forEach(p => {
                const count = day[`${p}_count`];
                if (count > 0) {
                    entry[`${p}_bat_speed`] = day[`${p}_bat_speed`] / count;
                    entry[`${p}_power`] = day[`${p}_power`] / count;
                    entry[`${p}_efficiency`] = day[`${p}_efficiency`] / count;
                }
            });
            return entry;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return a.date.localeCompare(b.date);
            if (isNaN(dateA.getTime())) return 1; // Put non-dates at the end
            if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
        });

        // Calculate averages for Summary
        const finalSummaryData = {};
        selectedPlayers.forEach(p => {
            const t = playerTotals[p];
            if (t.count > 0) {
                finalSummaryData[p] = {
                    bat_speed: t.bat_speed / t.count,
                    power: t.power / t.count,
                    efficiency: t.efficiency / t.count,
                    count: t.count
                };
            }
        });

        return { chartData: finalChartData, summaryData: finalSummaryData };

    }, [playerSwings, selectedPlayers, units]);

    const metrics = [
        { key: 'bat_speed', label: language === 'ja' ? '平均バットスピード' : 'Avg Bat Speed', unit: units === 'metric' ? 'km/h' : 'mph' },
        { key: 'power', label: language === 'ja' ? '平均パワー' : 'Avg Power', unit: 'kW' },
        { key: 'efficiency', label: language === 'ja' ? '平均オンプレーン効率' : 'Avg Efficiency', unit: '%' },
        { key: 'count', label: language === 'ja' ? 'スイング数' : 'Swing Count', unit: '' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="bg-card p-4 rounded-xl border border-border">
                <div className="w-full md:w-[400px]">
                    <PlayerSearch
                        players={players}
                        selectedPlayers={selectedPlayers}
                        onTogglePlayer={togglePlayer}
                    />
                </div>
            </div>

            {/* Content */}
            {selectedPlayers.length > 0 ? (
                <div className="space-y-6">
                    {/* Comparison Table */}
                    <ComparisonTable data={summaryData} metrics={metrics} />

                    {/* Charts */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <ComparisonChart
                            data={chartData}
                            lines={selectedPlayers.map(p => ({ dataKey: `${p}_bat_speed`, name: p }))}
                            yLabel={language === 'ja' ? `バットスピード (${units === 'metric' ? 'km/h' : 'mph'})` : `Bat Speed (${units === 'metric' ? 'km/h' : 'mph'})`}
                        />
                        <ComparisonChart
                            data={chartData}
                            lines={selectedPlayers.map(p => ({ dataKey: `${p}_power`, name: p }))}
                            yLabel={language === 'ja' ? 'パワー (kW)' : 'Power (kW)'}
                        />
                        <ComparisonChart
                            data={chartData}
                            lines={selectedPlayers.map(p => ({ dataKey: `${p}_efficiency`, name: p }))}
                            yLabel={language === 'ja' ? 'オンプレーン効率 (%)' : 'On Plane Efficiency (%)'}
                        />
                    </div>
                </div>
            ) : (
                <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                    <ChevronsUpDown className="h-12 w-12 mb-4 opacity-20" />
                    <p>{language === 'ja' ? '選手を選択して比較を開始してください' : 'Select players to start comparison'}</p>
                </div>
            )}
        </div>
    );
};

export default BlastAnalysis;

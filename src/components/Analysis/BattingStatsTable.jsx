import React from 'react';
import { useSettings } from '../../context/SettingsContext';

import { getPitchTypeColor } from '../../utils/pitchColors';

const BattingStatsTable = ({ data, units }) => {
    const { language } = useSettings();

    if (!data || data.length === 0) return null;

    // translations
    const headers = {
        // ... truncated ...
        whiffRate: language === 'ja' ? '空振り率' : 'Whiff %',
    };

    // Helper for Data Bar width
    const getMax = (key) => Math.max(...data.map(d => parseFloat(d[key]) || 0), 1);
    const maxExit = getMax('exit');
    const maxBat = getMax('batSpeed');

    return (
        <div className="overflow-hidden border border-border rounded-xl bg-card shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-sm font-bold text-white bg-gray-800 border-b border-gray-700">
                        <tr>
                            <th className="px-4 py-4">{headers.pitchType}</th>
                            <th className="px-3 py-4 text-right">{headers.count}</th>
                            <th className="px-4 py-4 w-1/5">{headers.avgExit}</th>
                            <th className="px-4 py-4 w-1/5">{headers.avgBatSpeed}</th>
                            <th className="px-3 py-4 text-right">{headers.avgDist}</th>
                            <th className="px-3 py-4 text-right">{headers.avgAngle}</th>
                            <th className="px-3 py-4 text-right">{headers.whiffRate}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.map((row) => (
                            <tr key={row.pitchType} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3 font-medium">
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: getPitchTypeColor(row.pitchType) }}
                                    >
                                        {row.pitchType}
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right text-muted-foreground font-mono">{row.count}</td>

                                {/* Exit Velo with Bar */}
                                <td className="px-4 py-2">
                                    <div className="flex flex-col justify-center h-full">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="font-bold font-mono text-base">{row.exit}</span>
                                        </div>
                                        <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-red-500 h-full rounded-full"
                                                style={{ width: `${Math.min((parseFloat(row.exit) / maxExit) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>

                                {/* Bat Speed with Bar */}
                                <td className="px-4 py-2">
                                    <div className="flex flex-col justify-center h-full">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="font-bold font-mono text-base">{row.batSpeed}</span>
                                        </div>
                                        <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-yellow-500 h-full rounded-full"
                                                style={{ width: `${Math.min((parseFloat(row.batSpeed) / maxBat) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>

                                <td className="px-3 py-3 text-right font-mono">{row.dist}</td>
                                <td className="px-3 py-3 text-right font-mono">{row.angle}°</td>
                                <td className="px-3 py-3 text-right font-mono text-muted-foreground">{row.whiff}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BattingStatsTable;

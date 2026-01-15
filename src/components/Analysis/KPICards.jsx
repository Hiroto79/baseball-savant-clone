import React from 'react';
import { Activity, Wind, Target, TrendingUp, Zap, RotateCw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const KPICards = ({ data, mode }) => {
    const { language, units } = useSettings();

    // Icons map
    const icons = {
        vel: Zap,
        spin: RotateCw,
        whiff: Wind,
        strike: Target,
        exit: TrendingUp,
        batSpeed: Activity
    };

    if (!data || Object.keys(data).length === 0) return null;

    // Helper to calculate aggregate stats from the summaryData object
    // summaryData struct: { 'Player [Filter]': { vel, spin, count... } }
    // We want weighted average across all selected data for the "Overall" snapshot
    let totalCount = 0;
    let weightedVel = 0;
    let weightedSpin = 0;
    let weightedWhiff = 0;
    let weightedStrike = 0;

    let weightedExitVel = 0;
    let weightedExitCount = 0;
    let weightedBatSpeed = 0;
    let batSpeedCount = 0;

    Object.values(data).forEach(d => {
        if (mode === 'pitching') {
            totalCount += d.count;
            weightedVel += d.vel * d.count;
            weightedSpin += d.spin * d.count;
            // approximate whiff/strike counts from rates
            // d.whiff is %, d.strike is %
            // need raw counts... actually SavantAnalysis passes averages. 
            // Ideally we need totals. 
            // For now, let's just average the rates weighted by count (approximation)
            weightedWhiff += d.whiff * d.count;
            weightedStrike += d.strike * d.count;
        } else {
            // Batting
            // d struct: { exit, dist, angle, count }
            // Missing batSpeed in summaryData? Need to check SavantAnalysis update.
            // Assuming we will add batSpeed to summaryData.

            // For now, use what we have
            totalCount += d.count;
            if (d.exit > 0) {
                weightedExitVel += d.exit * d.count;
                weightedExitCount += d.count;
            }
            if (d.batSpeed > 0) {
                weightedBatSpeed += d.batSpeed * d.count;
                batSpeedCount += d.count;
            }
        }
    });

    const avgVel = totalCount > 0 ? weightedVel / totalCount : 0;
    const avgSpin = totalCount > 0 ? weightedSpin / totalCount : 0;
    const avgWhiff = totalCount > 0 ? weightedWhiff / totalCount : 0;
    const avgStrike = totalCount > 0 ? weightedStrike / totalCount : 0;

    const avgExit = weightedExitCount > 0 ? weightedExitVel / weightedExitCount : 0;
    const avgBatSpeed = batSpeedCount > 0 ? weightedBatSpeed / batSpeedCount : 0;

    // We need to pass these configured cards
    const cards = mode === 'pitching' ? [
        { label: language === 'ja' ? '平均球速' : 'Avg Velocity', value: avgVel.toFixed(1), unit: units === 'metric' ? 'km/h' : 'mph', icon: icons.vel, color: 'text-blue-500' },
        { label: language === 'ja' ? '平均回転数' : 'Avg Spin', value: Math.round(avgSpin), unit: 'rpm', icon: icons.spin, color: 'text-purple-500' },
        { label: language === 'ja' ? '空振り率' : 'Whiff %', value: avgWhiff.toFixed(1), unit: '%', icon: icons.whiff, color: 'text-green-500' },
        { label: language === 'ja' ? 'ストライク率' : 'Strike %', value: avgStrike.toFixed(1), unit: '%', icon: icons.strike, color: 'text-orange-500' },
    ] : [
        { label: language === 'ja' ? '平均打球速度' : 'Avg Exit Vel', value: avgExit.toFixed(1), unit: units === 'metric' ? 'km/h' : 'mph', icon: icons.exit, color: 'text-red-500' },
        { label: language === 'ja' ? '平均バット速度' : 'Avg Bat Speed', value: avgBatSpeed > 0 ? avgBatSpeed.toFixed(1) : '-', unit: units === 'metric' ? 'km/h' : 'mph', icon: icons.batSpeed, color: 'text-yellow-500' },
        // Placeholder for Hard Hit or similar if we had it
        { label: language === 'ja' ? '打球数' : 'Batted Balls', value: totalCount, unit: '', icon: Target, color: 'text-gray-500' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <div key={idx} className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center space-x-4">
                        <div className={`p-3 rounded-full bg-muted/50 ${card.color}`}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase">{card.label}</p>
                            <div className="flex items-baseline space-x-1">
                                <span className="text-2xl font-bold">{card.value}</span>
                                <span className="text-xs text-muted-foreground">{card.unit}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default KPICards;

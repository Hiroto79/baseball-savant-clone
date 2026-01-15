import React from 'react';
import { useSettings } from '../../context/SettingsContext';

const BattedBallProfile = ({ data }) => {
    const { language } = useSettings();

    if (!data || Object.keys(data).length === 0) return null;

    // data is expected in format: { fly_ball: 20, ground_ball: 40, line_drive: 30, popup: 10, total: 100 }

    const getLabel = (key) => {
        const labels = {
            fly_ball: language === 'ja' ? 'フライ' : 'Fly Ball',
            ground_ball: language === 'ja' ? 'ゴロ' : 'Ground Ball',
            line_drive: language === 'ja' ? 'ライナー' : 'Line Drive',
            popup: language === 'ja' ? 'ポップフライ' : 'Pop Up'
        };
        return labels[key] || key;
    };

    const keys = ['fly_ball', 'line_drive', 'ground_ball', 'popup'];
    const colors = {
        fly_ball: '#3b82f6',     // Blue
        line_drive: '#ef4444',   // Red
        ground_ball: '#10b981',  // Green
        popup: '#f59e0b'         // Orange
    };

    return (
        <div className="border border-border rounded-xl bg-card p-4 shadow-sm h-full">
            <h3 className="text-lg font-bold mb-4">{language === 'ja' ? '打球タイプ傾向' : 'Batted Ball Profile'}</h3>

            <div className="space-y-4">
                {/* Visual Bar */}
                <div className="flex h-4 w-full rounded-full overflow-hidden bg-muted">
                    {keys.map(key => {
                        const count = data[key] || 0;
                        const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                            <div
                                key={key}
                                style={{ width: `${pct}%`, backgroundColor: colors[key] }}
                                title={`${getLabel(key)}: ${pct.toFixed(1)}%`}
                            />
                        );
                    })}
                </div>

                {/* Legend / Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {keys.map(key => {
                        const count = data[key] || 0;
                        const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                        return (
                            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 transition-colors hover:bg-muted/70">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: colors[key] }} />
                                    <span className="text-sm font-medium">{getLabel(key)}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold font-mono">{pct.toFixed(1)}%</div>
                                    <div className="text-xs text-muted-foreground">{count}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BattedBallProfile;

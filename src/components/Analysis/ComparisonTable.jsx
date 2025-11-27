import React from 'react';

const ComparisonTable = ({ data, metrics }) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
        <div className="space-y-6">
            {/* Card-style comparison */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(data).map(([player, stats]) => (
                    <div key={player} className="bg-card border border-border rounded-xl p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">{player}</h3>
                        <div className="space-y-3">
                            {metrics.filter(m => m.key !== 'count').map(metric => (
                                <div key={metric.key} className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                                    <span className="text-base font-medium text-foreground">
                                        {stats[metric.key] !== undefined && stats[metric.key] !== null
                                            ? `${stats[metric.key].toFixed(1)} ${metric.unit}`
                                            : '–'}
                                    </span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 border-t border-border">
                                <span className="text-sm text-muted-foreground">
                                    {metrics.find(m => m.key === 'count')?.label}
                                </span>
                                <span className="text-base font-medium text-foreground">
                                    {stats.count?.toFixed(1) || '0'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ComparisonTable;

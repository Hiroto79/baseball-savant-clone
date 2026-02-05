import React, { useMemo } from 'react';

const BattingStatsByCountTable = ({ data, selectedPlayers, mode }) => {
    const stats = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Filter data based on selected players and mode
        const filtered = data.filter(d => {
            if (mode === 'pitching') {
                return selectedPlayers.length === 0 || selectedPlayers.includes(d.player_name);
            } else {
                return selectedPlayers.length === 0 || selectedPlayers.includes(d.batter_name);
            }
        });

        if (filtered.length === 0) return [];

        // Define Counts
        const counts = [
            '0-0', '0-1', '0-2',
            '1-0', '1-1', '1-2',
            '2-0', '2-1', '2-2',
            '3-0', '3-1', '3-2'
        ];

        // Define Events
        const hitEvents = ['single', 'double', 'triple', 'home_run'];
        const atBatEvents = [
            "single", "double", "triple", "home_run",
            "field_out", "fly_out", "fly_out_double_play",
            "grounded_into_double_play", "double_play", "triple_play",
            "force_out", "strikeout", "strikeout_double_play",
            "fielders_choice", "fielders_choice_out", "field_error"
        ];

        // Aggregate
        const grouped = {};
        counts.forEach(c => {
            grouped[c] = { countStr: c, hits: 0, atBats: 0 };
        });

        filtered.forEach(d => {
            // Check valid count data
            if (d.balls === undefined || d.strikes === undefined || d.balls === null || d.strikes === null) return;

            const countStr = `${d.balls}-${d.strikes}`;

            // Only care about standard counts (ignore 4 balls or 3 strikes if they appear oddly in count state, usually count is state BEFORE pitch)
            // Actually Savant 'balls'/'strikes' columns are pre-pitch count.
            if (!grouped[countStr]) return;

            const evt = d.events;
            if (atBatEvents.includes(evt)) {
                grouped[countStr].atBats++;
                if (hitEvents.includes(evt)) {
                    grouped[countStr].hits++;
                }
            }
        });

        // Calculate AVG
        return counts.map(c => {
            const g = grouped[c];
            const avg = g.atBats > 0 ? (g.hits / g.atBats) : 0;
            // Format: .3f, remove leading zero
            let avgStr = avg.toFixed(3);
            if (avgStr.startsWith('0')) avgStr = avgStr.substring(1); // "0.300" -> ".300"

            return {
                count: c,
                hits: g.hits,
                atBats: g.atBats,
                avg: g.atBats > 0 ? avgStr : ''
            };
        });

    }, [data, selectedPlayers, mode]);

    if (!stats.length) return null;

    // Split into 4 rows of 3 cols organization? 
    // User showed a single table (likely 2 cols: Count | Avg). 
    // But 12 rows is long. Maybe grid?
    // User request: "display(被打率_count.style.hide(axis="index"))" -> shows a simple list.
    // Let's standard vertical table for now.

    const countsGrid = [
        ['0-0', '1-0', '2-0', '3-0'],
        ['0-1', '1-1', '2-1', '3-1'],
        ['0-2', '1-2', '2-2', '3-2']
    ];
    // Actually user image or standard baseball stats usually group by balls or strikes.
    // 0-0, 0-1, 0-2
    // 1-0, 1-1, 1-2
    // 2-0, 2-1, 2-2
    // 3-0, 3-1, 3-2
    // Let's just list them in order.

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full overflow-hidden">
            <h3 className="text-lg font-bold mb-4">Batting Average by Count</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-3 py-2">Count</th>
                            <th className="px-3 py-2">AVG</th>
                            <th className="px-3 py-2 text-xs opacity-50">AB</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.map((row) => (
                            <tr key={row.count} className="hover:bg-accent/50">
                                <td className="px-3 py-2 font-medium">{row.count}</td>
                                <td className="px-3 py-2 font-bold">{row.avg || '-'}</td>
                                <td className="px-3 py-2 text-xs opacity-50">{row.atBats}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BattingStatsByCountTable;

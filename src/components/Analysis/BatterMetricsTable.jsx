import React, { useMemo } from 'react';

const BatterMetricsTable = ({ data, selectedPlayers }) => {
    const tableData = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        const filtered = data.filter(d =>
            d.batter_name && selectedPlayers.includes(d.batter_name)
        );

        if (filtered.length === 0) return [];

        // Helper
        const getVal = v => {
            if (v === '' || v === null || v === undefined) return null;
            const n = Number(v);
            return isNaN(n) ? null : n;
        };

        // Constants for bases
        const bases = { single: 1, double: 2, triple: 3, home_run: 4 };
        const hits = ['single', 'double', 'triple', 'home_run'];
        const walks = ['walk', 'intent_walk'];
        const hbp = ['hit_by_pitch'];
        const sac = ['sac_fly'];
        const atBats = ['single', 'double', 'triple', 'home_run',
            'field_out', 'fly_out', 'grounded_into_double_play',
            'double_play', 'force_out', 'strikeout',
            'strikeout_double_play', 'fielders_choice'];

        const swingEvents = ["swinging_strike", "swinging_strike_blocked", "foul", "foul_tip", "hit_into_play", "hit_into_play_no_out", "hit_into_play_score"];
        const whiffEvents = ["swinging_strike", "swinging_strike_blocked"];

        // Aggregation per Pitch Type
        const grouped = {};

        filtered.forEach(d => {
            const type = d.pitch_name || d.pitch_type || 'Unknown';
            if (!grouped[type]) {
                grouped[type] = {
                    type,
                    count: 0,
                    batSpeedSum: 0, batSpeedCount: 0,
                    launchSpeedSum: 0, launchSpeedCount: 0,
                    launchAngleSum: 0, launchAngleCount: 0,
                    attackAngleSum: 0, attackAngleCount: 0, // Python key: attack_angle. Savant CSV: swing_angle? or attack_angle? User script says `attack_angle` but `bat_speed` cols.
                    // Need to check CSV columns available. 'bat_speed', 'swing_length' exists. 'attack_angle'?
                    // Assuming columns exist if user script uses them. If not, will be 0.
                    spraySum: 0, sprayCount: 0, // attack_direction?

                    xwobaSum: 0, xwobaCount: 0,

                    AB: 0, H: 0, TB: 0, BB: 0, HBP: 0, SF: 0,

                    swings: 0, whiffs: 0
                };
            }

            const g = grouped[type];
            g.count++;

            // Metrics
            const batSpeed = getVal(d.bat_speed);
            if (batSpeed !== null) { g.batSpeedSum += batSpeed; g.batSpeedCount++; }

            const ls = getVal(d.launch_speed);
            if (ls !== null) { g.launchSpeedSum += ls; g.launchSpeedCount++; }

            const la = getVal(d.launch_angle);
            if (la !== null) { g.launchAngleSum += la; g.launchAngleCount++; }

            // Attack Angle: 'attack_angle' or 'swing_angle'? User script: `attack_angle`.
            // Check DataContext.jsx: we don't map `attack_angle` explicitly but `...row` copies everything.
            // Attack Angle (Check normalized and known raw keys)
            const aaVal = d.attack_angle !== undefined ? d.attack_angle : (d['Attack Angle (deg)'] || d['Attack Angle'] || d['swing_vertical_angle']);

            if (aaVal !== null && aaVal !== undefined) {
                const aa = getVal(aaVal);
                if (aa !== null) { g.attackAngleSum += aa; g.attackAngleCount++; }
            }

            if (d.attack_direction) { // User script: `attack_direction`
                const ad = getVal(d.attack_direction);
                if (ad !== null) { g.spraySum += ad; g.sprayCount++; }
            }

            // xwOBA: `estimated_woba_using_speedangle`
            const xwoba = getVal(d.estimated_woba_using_speedangle);
            if (xwoba !== null) { g.xwobaSum += xwoba; g.xwobaCount++; }

            // Events
            const evt = d.events;
            if (hits.includes(evt)) { g.H++; g.TB += bases[evt]; }
            if (walks.includes(evt)) g.BB++;
            if (hbp.includes(evt)) g.HBP++;
            if (sac.includes(evt)) g.SF++;
            if (atBats.includes(evt)) g.AB++;

            // Swing/Whiff
            const desc = d.description;
            if (swingEvents.includes(desc)) g.swings++;
            if (whiffEvents.includes(desc)) g.whiffs++;
        });

        // Calculate Row Stats
        const calcMulti = (g) => {
            const avg = g.AB > 0 ? g.H / g.AB : 0;
            const obp = (g.AB + g.BB + g.HBP + g.SF) > 0 ? (g.H + g.BB + g.HBP) / (g.AB + g.BB + g.HBP + g.SF) : 0;
            const slg = g.AB > 0 ? g.TB / g.AB : 0;
            const ops = obp + slg;
            const iso = slg - avg;
            const xwoba = g.xwobaCount > 0 ? g.xwobaSum / g.xwobaCount : 0;

            return {
                ...g,
                avg: avg.toFixed(3).replace(/^0+/, ''),
                obp: obp.toFixed(3).replace(/^0+/, ''),
                slg: slg.toFixed(3), // User script keeps 0? `f"{x:.3f}".lstrip("0")` for all.
                ops: ops.toFixed(3),
                iso: iso.toFixed(3),
                xwoba: xwoba.toFixed(3).replace(/^0+/, ''),

                avgBatSpeed: g.batSpeedCount ? (g.batSpeedSum / g.batSpeedCount).toFixed(1) : '-',
                avgExitVel: g.launchSpeedCount ? (g.launchSpeedSum / g.launchSpeedCount).toFixed(1) : '-',
                avgLaunchAngle: g.launchAngleCount ? (g.launchAngleSum / g.launchAngleCount).toFixed(1) : '-',
                avgAttackAngle: g.attackAngleCount ? (g.attackAngleSum / g.attackAngleCount).toFixed(2) : '-',
                avgSpray: g.sprayCount ? (g.spraySum / g.sprayCount).toFixed(1) : '-',

                swingPct: g.count > 0 ? ((g.swings / g.count) * 100).toFixed(1) : '-',
                whiffPct: g.swings > 0 ? ((g.whiffs / g.swings) * 100).toFixed(1) : '-'
            };
        };

        const rows = Object.values(grouped).map(calcMulti);

        // Total Row
        const total = {
            type: 'Total',
            count: 0,
            batSpeedSum: 0, batSpeedCount: 0,
            launchSpeedSum: 0, launchSpeedCount: 0,
            launchAngleSum: 0, launchAngleCount: 0,
            attackAngleSum: 0, attackAngleCount: 0,
            spraySum: 0, sprayCount: 0,
            xwobaSum: 0, xwobaCount: 0,
            AB: 0, H: 0, TB: 0, BB: 0, HBP: 0, SF: 0,
            swings: 0, whiffs: 0
        };

        Object.values(grouped).forEach(g => {
            total.count += g.count;
            total.batSpeedSum += g.batSpeedSum; total.batSpeedCount += g.batSpeedCount;
            total.launchSpeedSum += g.launchSpeedSum; total.launchSpeedCount += g.launchSpeedCount;
            total.launchAngleSum += g.launchAngleSum; total.launchAngleCount += g.launchAngleCount;
            total.attackAngleSum += g.attackAngleSum; total.attackAngleCount += g.attackAngleCount;
            total.spraySum += g.spraySum; total.sprayCount += g.sprayCount;
            total.xwobaSum += g.xwobaSum; total.xwobaCount += g.xwobaCount;
            total.AB += g.AB; total.H += g.H; total.TB += g.TB;
            total.BB += g.BB; total.HBP += g.HBP; total.SF += g.SF;
            total.swings += g.swings; total.whiffs += g.whiffs;
        });

        const totalRow = calcMulti(total);
        totalRow.type = '全体'; // Japanese "Total"

        // Sort rows by pitch count
        rows.sort((a, b) => b.count - a.count);

        return [...rows, totalRow];

    }, [data, selectedPlayers]);

    if (!tableData.length) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full overflow-hidden">
            <h3 className="text-lg font-bold mb-4">Batting Metrics by Pitch Type</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-muted text-muted-foreground uppercase">
                        <tr>
                            <th className="px-2 py-2">Pitch</th>
                            <th className="px-2 py-2">AVG</th>
                            <th className="px-2 py-2">OBP</th>
                            <th className="px-2 py-2">SLG</th>
                            <th className="px-2 py-2">OPS</th>
                            <th className="px-2 py-2">ISO</th>
                            <th className="px-2 py-2">xwOBA</th>
                            <th className="px-2 py-2 border-l border-border">Bat Speed</th>
                            <th className="px-2 py-2">Exit Vel</th>
                            <th className="px-2 py-2">Launch Ang</th>
                            <th className="px-2 py-2">Attack Ang</th>
                            <th className="px-2 py-2 border-l border-border">Swing%</th>
                            <th className="px-2 py-2">Whiff%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {tableData.map((row, i) => (
                            <tr key={i} className={`hover:bg-accent/50 ${row.type === '全体' ? 'font-bold bg-muted/20' : ''}`}>
                                <td className="px-2 py-2">{row.type}</td>
                                <td className="px-2 py-2">{row.avg}</td>
                                <td className="px-2 py-2">{row.obp}</td>
                                <td className="px-2 py-2">{row.slg}</td>
                                <td className="px-2 py-2">{row.ops}</td>
                                <td className="px-2 py-2">{row.iso}</td>
                                <td className="px-2 py-2">{row.xwoba}</td>
                                <td className="px-2 py-2 border-l border-border">{row.avgBatSpeed}</td>
                                <td className="px-2 py-2">{row.avgExitVel}</td>
                                <td className="px-2 py-2">{row.avgLaunchAngle}</td>
                                <td className="px-2 py-2">{row.avgAttackAngle}</td>
                                <td className="px-2 py-2 border-l border-border">{row.swingPct}%</td>
                                <td className="px-2 py-2">{row.whiffPct}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatterMetricsTable;

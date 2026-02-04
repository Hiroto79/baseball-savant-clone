import React, { useMemo } from 'react';

const PitchMetricsSummary = ({ data, selectedPlayers }) => {
    const stats = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        const filtered = data.filter(d =>
            d.player_name && selectedPlayers.includes(d.player_name) && (d.pitch_type || d.pitch_name)
        );

        if (filtered.length === 0) return [];

        // Helper for calc
        const getVal = (v) => {
            if (v === null || v === undefined || v === '') return null;
            const num = Number(v);
            return isNaN(num) ? null : num;
        };

        const grouped = {};
        let totalPitches = 0;

        filtered.forEach(d => {
            const type = d.pitch_name || d.pitch_type; // Use pitch_name if available for better display
            if (!grouped[type]) {
                grouped[type] = {
                    type,
                    count: 0,
                    veloSum: 0, veloCount: 0,
                    spinSum: 0, spinCount: 0,
                    hbSum: 0, hbCount: 0,
                    ivbSum: 0, ivbCount: 0,
                    vaaSum: 0, vaaCount: 0,
                    haaSum: 0, haaCount: 0,
                    swings: 0,
                    whiffs: 0,
                    zoneP: 0,
                    oZoneP: 0,
                    chase: 0
                };
            }

            const g = grouped[type];
            g.count++;
            totalPitches++;

            // Velo
            const velo = getVal(d.release_speed);
            if (velo !== null) { g.veloSum += velo; g.veloCount++; }

            // Spin
            const spin = getVal(d.release_spin_rate);
            if (spin !== null) { g.spinSum += spin; g.spinCount++; }

            // Movement (pfx_x, pfx_z are in ft in CSV usually, but user code does *12)
            // Let's assume input is in feet (Savant default).
            // HB = -pfx_x * 12
            // iVB = pfx_z * 12
            const pfx_x = getVal(d.pfx_x);
            const pfx_z = getVal(d.pfx_z);

            if (pfx_x !== null) { g.hbSum += (-pfx_x * 12); g.hbCount++; }
            if (pfx_z !== null) { g.ivbSum += (pfx_z * 12); g.ivbCount++; }

            // VAA / HAA Calculation
            // vy0, vz0, vx0, ay, az, ax, release_pos_y
            // plate_y = 1.417
            // t_plate = (-vy0 - sqrt(vy0^2 - 2*ay*(release_pos_y - plate_y))) / ay
            const vy0 = getVal(d.vy0);
            const vz0 = getVal(d.vz0);
            const vx0 = getVal(d.vx0);
            const ay = getVal(d.ay);
            const az = getVal(d.az);
            const ax = getVal(d.ax);
            const ry = getVal(d.release_pos_y);

            if (vy0 !== null && vz0 !== null && vx0 !== null && ay !== null && az !== null && ax !== null && ry !== null) {
                const plate_y = 1.417; // ft
                // Avoid division by zero if ay is 0 (unlikely for pitch)
                if (ay !== 0) {
                    const term = vy0 * vy0 - 2 * ay * (ry - plate_y);
                    if (term >= 0) {
                        const t_plate = (-vy0 - Math.sqrt(term)) / ay;

                        const vx_p = vx0 + ax * t_plate;
                        const vy_p = vy0 + ay * t_plate;
                        const vz_p = vz0 + az * t_plate;

                        // VAA = degrees(arctan(vz_p / -vy_p))
                        // HAA = degrees(arctan(vx_p / -vy_p))
                        // Note: JS math usually radians
                        if (vy_p !== 0) {
                            const vaa = Math.atan(vz_p / -vy_p) * (180 / Math.PI);
                            const haa = Math.atan(vx_p / -vy_p) * (180 / Math.PI);

                            g.vaaSum += vaa; g.vaaCount++;
                            g.haaSum += haa; g.haaCount++;
                        }
                    }
                }
            }

            // Swing / Whiff / Zone / Chase
            const desc = d.description;
            const zone = getVal(d.zone);

            const swingDesc = [
                "swinging_strike", "swinging_strike_blocked", "foul", "foul_tip",
                "hit_into_play", "hit_into_play_no_out", "hit_into_play_score"
            ];
            const whiffDesc = ["swinging_strike", "swinging_strike_blocked"];

            const isSwing = swingDesc.includes(desc);
            const isWhiff = whiffDesc.includes(desc);

            // Zone 1-9
            const isZone = zone >= 1 && zone <= 9;
            // O-Zone 11-14
            const isOZone = zone >= 11 && zone <= 14;

            if (isSwing) g.swings++;
            if (isWhiff) g.whiffs++;
            if (isZone) g.zoneP++;
            if (isOZone) {
                g.oZoneP++;
                if (isSwing) g.chase++;
            }
        });

        // Final Aggregate
        return Object.values(grouped).map(g => {
            const usage = (g.count / totalPitches) * 100;
            const whiffPct = g.swings > 0 ? (g.whiffs / g.swings) * 100 : 0;
            const zonePct = g.count > 0 ? (g.zoneP / g.count) * 100 : 0;
            const chasePct = g.oZoneP > 0 ? (g.chase / g.oZoneP) * 100 : 0;

            return {
                type: g.type,
                pitches: g.count,
                usage: usage.toFixed(1),
                velo: g.veloCount ? (g.veloSum / g.veloCount).toFixed(1) : '-',
                spin: g.spinCount ? (g.spinSum / g.spinCount).toFixed(0) : '-',
                hb: g.hbCount ? (g.hbSum / g.hbCount).toFixed(2) : '-',
                ivb: g.ivbCount ? (g.ivbSum / g.ivbCount).toFixed(2) : '-',
                vaa: g.vaaCount ? (g.vaaSum / g.vaaCount).toFixed(2) : '-',
                haa: g.haaCount ? (g.haaSum / g.haaCount).toFixed(2) : '-',
                whiffPct: whiffPct.toFixed(1),
                zonePct: zonePct.toFixed(1),
                chasePct: chasePct.toFixed(1)
            };
        }).sort((a, b) => b.usage - a.usage);

    }, [data, selectedPlayers]);

    if (!stats.length) return null;

    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm w-full overflow-hidden">
            <h3 className="text-lg font-bold mb-4">Pitch Metrics Summary</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground uppercase text-xs">
                        <tr>
                            <th className="px-3 py-2">Pitch Type</th>
                            <th className="px-3 py-2">Count</th>
                            <th className="px-3 py-2">Usage%</th>
                            <th className="px-3 py-2">Velo</th>
                            <th className="px-3 py-2">Spin</th>
                            <th className="px-3 py-2">HB</th>
                            <th className="px-3 py-2">iVB</th>
                            <th className="px-3 py-2">VAA</th>
                            <th className="px-3 py-2">HAA</th>
                            <th className="px-3 py-2">Whiff%</th>
                            <th className="px-3 py-2">Zone%</th>
                            <th className="px-3 py-2">Chase%</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.map((row, i) => (
                            <tr key={i} className="hover:bg-accent/50">
                                <td className="px-3 py-2 font-medium">{row.type}</td>
                                <td className="px-3 py-2">{row.pitches}</td>
                                <td className="px-3 py-2">{row.usage}%</td>
                                <td className="px-3 py-2">{row.velo}</td>
                                <td className="px-3 py-2">{row.spin}</td>
                                <td className="px-3 py-2">{row.hb}</td>
                                <td className="px-3 py-2">{row.ivb}</td>
                                <td className="px-3 py-2 text-blue-400">{row.vaa}</td>
                                <td className="px-3 py-2 text-green-400">{row.haa}</td>
                                <td className="px-3 py-2">{row.whiffPct}%</td>
                                <td className="px-3 py-2">{row.zonePct}%</td>
                                <td className="px-3 py-2">{row.chasePct}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PitchMetricsSummary;

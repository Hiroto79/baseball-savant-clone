import React, { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';

const MigrateData = () => {
    const [status, setStatus] = useState({});
    const [loading, setLoading] = useState(false);

    const log = (key, message) => {
        setStatus(prev => ({ ...prev, [key]: message }));
    };

    const migrateSavant = async () => {
        setLoading(true);
        log('savant', 'Fetching Savant CSV...');
        try {
            const response = await fetch('/data/data.csv');
            const text = await response.text();

            log('savant', 'Parsing CSV...');
            const parsed = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });

            const rows = parsed.data;
            log('savant', `Found ${rows.length} rows. Preparing to insert...`);

            // Map CSV columns to Database columns
            const dbRows = rows.map(row => ({
                game_date: row.game_date,
                pitcher_name: row.player_name, // In Savant CSV, player_name is pitcher
                batter_name: row.batter_name || String(row.batter), // Handle missing batter name
                pitch_name: row.pitch_name,
                release_speed: row.release_speed,
                release_spin_rate: row.release_spin_rate,
                launch_speed: row.launch_speed,
                launch_angle: row.launch_angle,
                hit_distance_sc: row.hit_distance_sc,
                events: row.events,
                description: row.description,
                zone: row.zone,
                stand: row.stand,
                p_throws: row.p_throws,
                home_team: row.home_team,
                away_team: row.away_team,
                type: row.type,
                hit_location: row.hit_location,
                bb_type: row.bb_type,
                balls: row.balls,
                strikes: row.strikes,
                game_year: row.game_year,
                pfx_x: row.pfx_x,
                pfx_z: row.pfx_z,
                plate_x: row.plate_x,
                plate_z: row.plate_z,
                on_3b: row.on_3b,
                on_2b: row.on_2b,
                on_1b: row.on_1b,
                outs_when_up: row.outs_when_up,
                inning: row.inning,
                inning_topbot: row.inning_topbot,
                hc_x: row.hc_x,
                hc_y: row.hc_y,
                vx0: row.vx0,
                vy0: row.vy0,
                vz0: row.vz0,
                ax: row.ax,
                ay: row.ay,
                az: row.az,
                sz_top: row.sz_top,
                sz_bot: row.sz_bot,
                effective_speed: row.effective_speed,
                release_extension: row.release_extension,
                game_pk: row.game_pk,
                spin_axis: row.spin_axis,
                delta_home_win_exp: row.delta_home_win_exp,
                delta_run_exp: row.delta_run_exp
            }));

            // Insert in batches
            const BATCH_SIZE = 1000;
            for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
                const batch = dbRows.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('savant_data').insert(batch);

                if (error) throw error;
                log('savant', `Inserted ${Math.min(i + BATCH_SIZE, dbRows.length)} / ${dbRows.length} rows...`);
            }

            log('savant', 'Savant Data Migration Complete! ✅');

        } catch (error) {
            console.error(error);
            log('savant', `Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const migrateRapsodo = async () => {
        setLoading(true);
        log('rapsodo', 'Starting Rapsodo Migration...');

        try {
            // Pitching
            log('rapsodo', 'Fetching Pitching CSV...');
            const pRes = await fetch('/data/rapsodo/pitching.csv');
            const pText = await pRes.text();
            const pParsed = Papa.parse(pText, { header: true, skipEmptyLines: true, dynamicTyping: true });

            // Helper to parse numbers safely
            const parseNum = (val) => {
                if (val === '-' || val === '' || val === null || val === undefined) return null;
                const num = Number(val);
                return isNaN(num) ? null : num;
            };

            const pRows = pParsed.data.map(d => ({
                date: d.Date,
                player_name: d['Player Name'],
                pitch_type: d['Pitch Type'],
                velocity: parseNum(d.Velocity),
                total_spin: Math.round(parseNum(d['Total Spin'] || d['Spin Rate']) || 0),
                spin_efficiency: parseNum(d['Spin Efficiency']),
                horizontal_break: parseNum(d['Horizontal Break'] || d['HB']),
                vertical_break: parseNum(d['Vertical Break'] || d['VB']),
                release_side: parseNum(d['Release Side']),
                release_height: parseNum(d['Release Height']),
                release_angle: parseNum(d['Release Angle']),
                strike_zone_side: parseNum(d['Strike Zone Side']),
                strike_zone_height: parseNum(d['Strike Zone Height'])
            })).filter(r => r.player_name); // Filter empty rows

            log('rapsodo', `Inserting ${pRows.length} pitching rows...`);
            const { error: pError } = await supabase.from('rapsodo_pitching').insert(pRows);
            if (pError) throw pError;

            // Batting
            log('rapsodo', 'Fetching Batting CSV...');
            const bRes = await fetch('/data/rapsodo/batting.csv');
            const bText = await bRes.text();
            const bParsed = Papa.parse(bText, { header: true, skipEmptyLines: true, dynamicTyping: true });

            const bRows = bParsed.data.map(d => ({
                date: d.Date,
                player_name: d['Player Name'],
                exit_velocity: parseNum(d['Exit Velocity']),
                launch_angle: parseNum(d['Launch Angle']),
                direction: parseNum(d['Direction']),
                spin_rate: Math.round(parseNum(d['Spin Rate']) || 0),
                distance: parseNum(d['Distance']),
                hang_time: parseNum(d['Hang Time']),
                strike_zone_side: parseNum(d['Strike Zone Side']),
                strike_zone_height: parseNum(d['Strike Zone Height'])
            })).filter(r => r.player_name);

            log('rapsodo', `Inserting ${bRows.length} batting rows...`);
            const { error: bError } = await supabase.from('rapsodo_batting').insert(bRows);
            if (bError) throw bError;

            log('rapsodo', 'Rapsodo Data Migration Complete! ✅');

        } catch (error) {
            console.error(error);
            log('rapsodo', `Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const migrateBlast = async () => {
        setLoading(true);
        log('blast', 'Starting Blast Migration...');

        try {
            const files = [
                'Player 2312 - 2025-11-11 - 2025-11-11 - 1764042452.csv',
                'Player 2315 - 2025-11-11 - 2025-11-11 - 1764042427.csv'
            ];

            const allRows = [];

            for (const file of files) {
                log('blast', `Fetching ${file}...`);
                const response = await fetch(`/data/blast/${file}`);
                const text = await response.text();

                // Skip metadata (first 8 lines)
                const lines = text.split('\n');
                const csvText = lines.slice(8).join('\n');

                const parsed = Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    transformHeader: (header) => {
                        const headerMap = {
                            '日付': 'Date',
                            'バット': 'Bat',
                            '利き腕': 'Hand',
                            'スイング条件': 'Condition',
                            'オンプレーンスコア': 'OnPlaneScore',
                            '体とバットの角度スコア': 'ConnectionScore',
                            '体の回転による加速スコア': 'RotationScore',
                            'バットスピード (mph)': 'BatSpeed',
                            '体の回転によるバットの加速の大きさ（初動） (g)': 'RotationAcceleration',
                            'オンプレーンの効率 (%)': 'OnPlaneEfficiency',
                            'アッパースイング度 (deg)': 'AttackAngle',
                            ' 体とバットの角度（構え） (deg)': 'ConnectionAtAddress',
                            ' 体とバットの角度（インパクト） (deg)': 'ConnectionAtImpact',
                            ' バット角度 (deg)': 'BatAngle',
                            'パワー (kW)': 'Power',
                            'スイング時間 (sec)': 'TimeToContact',
                            '手の最大スピード (mph)': 'PeakHandSpeed',
                            '打球スピード (mph)': 'ExitVelocity',
                            '打球角度 (deg)': 'LaunchAngle',
                            '推定飛距離 (feet)': 'Distance'
                        };
                        return headerMap[header] || header;
                    }
                });

                // Extract player ID from filename
                const playerMatch = file.match(/Player (\d+)/);
                const playerId = playerMatch ? `Player ${playerMatch[1]}` : 'Unknown';

                // Parse Japanese Date
                const parseDate = (dateStr) => {
                    if (!dateStr) return null;
                    try {
                        const match = dateStr.match(/(\d+)月\s+(\d+),\s+(\d+)\s+(\d+):(\d+):(\d+)\s+(午前|午後)/);
                        if (!match) return null;
                        const [, month, day, year, hour, minute, second, ampm] = match;
                        let hours = parseInt(hour);
                        if (ampm === '午後' && hours !== 12) hours += 12;
                        if (ampm === '午前' && hours === 12) hours = 0;
                        const date = new Date(year, month - 1, day, hours, minute, second);
                        return date.toISOString().split('T')[0];
                    } catch (e) { return null; }
                };

                const fileRows = parsed.data.map(d => ({
                    date: parseDate(d.Date),
                    player_name: playerId,
                    bat_speed: d.BatSpeed,
                    attack_angle: d.AttackAngle,
                    vertical_bat_angle: null, // Not in CSV?
                    power: d.Power,
                    time_to_contact: d.TimeToContact,
                    peak_hand_speed: d.PeakHandSpeed,
                    on_plane_efficiency: d.OnPlaneEfficiency,
                    rotation_score: d.RotationScore,
                    on_plane_score: d.OnPlaneScore,
                    connection_score: d.ConnectionScore,
                    rotation_acceleration: d.RotationAcceleration,
                    connection_at_impact: d.ConnectionAtImpact,
                    connection_at_address: d.ConnectionAtAddress,
                    bat_angle: d.BatAngle
                })).filter(r => r.date); // Filter invalid rows

                allRows.push(...fileRows);
            }

            log('blast', `Inserting ${allRows.length} Blast rows...`);
            const { error } = await supabase.from('blast_data').insert(allRows);
            if (error) throw error;

            log('blast', 'Blast Data Migration Complete! ✅');

        } catch (error) {
            console.error(error);
            log('blast', `Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <Database className="h-8 w-8 text-primary" />
                Database Migration
            </h1>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Savant Migration */}
                <div className="p-6 border rounded-xl bg-card">
                    <h2 className="text-xl font-bold mb-4">Savant Data</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Migrate data from /data/data.csv to 'savant_data' table.
                    </p>
                    <button
                        onClick={migrateSavant}
                        disabled={loading}
                        className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Migrate Savant Data'}
                    </button>
                    {status.savant && (
                        <div className="mt-4 p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">
                            {status.savant}
                        </div>
                    )}
                </div>

                {/* Rapsodo Migration */}
                <div className="p-6 border rounded-xl bg-card">
                    <h2 className="text-xl font-bold mb-4">Rapsodo Data</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Migrate pitching/batting CSVs to 'rapsodo_pitching' and 'rapsodo_batting'.
                    </p>
                    <button
                        onClick={migrateRapsodo}
                        disabled={loading}
                        className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Migrate Rapsodo Data'}
                    </button>
                    {status.rapsodo && (
                        <div className="mt-4 p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">
                            {status.rapsodo}
                        </div>
                    )}
                </div>

                {/* Blast Migration */}
                <div className="p-6 border rounded-xl bg-card">
                    <h2 className="text-xl font-bold mb-4">Blast Data</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Migrate Blast CSVs to 'blast_data' table.
                    </p>
                    <button
                        onClick={migrateBlast}
                        disabled={loading}
                        className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Migrate Blast Data'}
                    </button>
                    {status.blast && (
                        <div className="mt-4 p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">
                            {status.blast}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MigrateData;

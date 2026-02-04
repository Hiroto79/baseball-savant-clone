import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [data, setData] = useState([]);
    const [fileHistory, setFileHistory] = useState([]);
    const [players, setPlayers] = useState({});
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Savant Data from Supabase with pagination
                let allData = [];
                let from = 0;
                const BATCH_SIZE = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data: savantData, error } = await supabase
                        .from('savant_data')
                        .select('*')
                        .range(from, from + BATCH_SIZE - 1);

                    if (error) throw error;

                    if (savantData && savantData.length > 0) {
                        allData = [...allData, ...savantData];
                        from += BATCH_SIZE;
                        hasMore = savantData.length === BATCH_SIZE;
                    } else {
                        hasMore = false;
                    }
                }

                console.log(`Loaded ${allData.length} rows from Supabase (savant_data)`);

                // Process Data (if needed)
                // DB columns match what app expects mostly, but let's ensure compatibility
                const processedData = allData.map(row => ({
                    ...row,
                    // Ensure numeric types if needed (Supabase returns correct types usually)
                    // Map DB columns to App expected keys if they differ
                    // App expects 'player_name' to be pitcher?
                    // In DB we have 'pitcher_name' and 'batter_name'
                    // CSV had 'player_name' for pitcher.
                    player_name: row.pitcher_name,

                    // App expects 'batter' for ID? Or just batter_name?
                    // The app uses 'batter_name' for display.
                    // We stored resolved name in 'batter_name'.
                }));

                setData(processedData);

                // Extract Teams
                // Extract Teams
                const teamsData = {};

                processedData.forEach(row => {
                    if (row.home_team) {
                        if (!teamsData[row.home_team]) {
                            teamsData[row.home_team] = { id: row.home_team, name: row.home_team, league: 'MLB' };
                        }
                    }
                    if (row.away_team) {
                        if (!teamsData[row.away_team]) {
                            teamsData[row.away_team] = { id: row.away_team, name: row.away_team, league: 'MLB' };
                        }
                    }
                });
                setTeams(Object.values(teamsData));

                // Extract Players for Autocomplete/Search
                // We can build this from the data itself now
                const playerMap = {};
                processedData.forEach(row => {
                    if (row.player_name) playerMap[row.player_name] = row.player_name; // Pitchers
                    if (row.batter_name) playerMap[row.batter_name] = row.batter_name; // Batters
                });
                setPlayers(playerMap);

                // Add initial load to history (Mock for compatibility)
                // Reconstruct File History from Data
                const historyMap = new Map();

                processedData.forEach(row => {
                    const uploadId = row.upload_id || 'legacy';
                    const fileName = row.file_name || 'Legacy Data (Pre-update)';

                    if (!historyMap.has(uploadId)) {
                        historyMap.set(uploadId, {
                            id: uploadId,
                            fileName: fileName,
                            source: 'database',
                            uploadedAt: new Date().toISOString(), // We don't have upload time stored, using current for now or could add column
                            rowCount: 0,
                            dataType: 'savant'
                        });
                    }

                    const entry = historyMap.get(uploadId);
                    entry.rowCount++;

                    // Assign _fileId for local deletion to work
                    row._fileId = uploadId;
                });

                setFileHistory(Array.from(historyMap.values()));

                setLoading(false);
            } catch (error) {
                console.error("Failed to load data from Supabase:", error);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const uploadSavantData = async (rawData, fileName = 'uploaded.csv') => {
        try {
            setLoading(true);

            // Generate file ID
            const fileId = Date.now() + Math.random();

            // Helper to parse numbers safely
            // Helper to parse numbers safely (handles '90.5 mph', ' 80.2 ', full-width, etc.)
            const parseNum = (val) => {
                if (val === '-' || val === '' || val === null || val === undefined) return null;
                if (typeof val === 'number') return val;
                if (val === null || val === undefined || val === '') return null;
                // '0' is falsy but valid

                let strVal = String(val).trim();

                // Handle Full-Width Numbers (０-９．)
                strVal = strVal.replace(/[０-９．]/g, (s) => {
                    if (s === '．') return '.';
                    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
                });

                // Try standard parseFloat which handles "75.5 mph"
                const num = parseFloat(strVal);

                return isNaN(num) ? null : num;
            };

            // Create a normalized key map for the first row to handle variations
            const firstRow = rawData[0] || {};
            const keyMap = {};
            // console.log('Original CSV Headers:', Object.keys(firstRow));

            Object.keys(firstRow).forEach(key => {
                // Normalize: trim, lowercase, remove quotes, remove BOM, convert full-width to half-width, REMOVE UNDERSCORES AND SPACES
                const normalized = key.trim().toLowerCase()
                    .replace(/['"]/g, '')
                    .replace(/^\ufeff/, '')
                    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
                    .replace(/[_\s\.]/g, ''); // Remove _ and space and dot

                keyMap[normalized] = key;
                // Also store original lowercased for exact matches if needed? No, fuzzy is better.
            });

            // Helper to get value
            const getValue = (row, targets) => {
                for (const t of targets) {
                    // Normalize target same way
                    const normTarget = t.toLowerCase().replace(/[_\s\.]/g, '');
                    const k = keyMap[normTarget];
                    if (k && row[k] !== undefined) return row[k];
                }
                return undefined;
            };

            // Map CSV columns to Database columns
            const dbRows = rawData.map(row => {
                const mapped = {
                    game_date: getValue(row, ['game_date', 'game_date_null']),
                    pitcher_name: getValue(row, ['player_name', 'pitcher_name']),
                    batter_name: getValue(row, ['batter_name']) || String(row.batter),
                    pitcher: parseNum(row.pitcher),
                    batter: parseNum(row.batter),
                    pitch_name: getValue(row, ['pitch_name', 'pitch_type_name']),
                    release_speed: parseNum(getValue(row, ['release_speed', 'velocity'])),
                    release_spin_rate: parseNum(getValue(row, ['release_spin_rate', 'spin_rate'])),
                    release_pos_x: parseNum(getValue(row, ['release_pos_x'])),
                    release_pos_y: parseNum(getValue(row, ['release_pos_y'])),
                    release_pos_z: parseNum(getValue(row, ['release_pos_z'])),

                    // Robust bat_speed check (Wrapped in parseNum)
                    bat_speed: parseNum(getValue(row, ['bat_speed', 'bat speed', 'bat_speed_mph', 'bat_speed (mph)', 'bat speed (mph)', 'batspeed', 'swing_speed', 'swing speed'])),
                    swing_length: parseNum(getValue(row, ['swing_length', 'swing length'])),
                    launch_speed: parseNum(getValue(row, ['launch_speed', 'exit_velocity', 'launch_speed_mph', 'exit_speed'])),

                    launch_angle: parseNum(getValue(row, ['launch_angle'])),
                    hit_distance_sc: parseNum(getValue(row, ['hit_distance_sc', 'hit_distance'])),
                    events: getValue(row, ['events', 'event']),
                    description: getValue(row, ['description', 'des']),
                    zone: getValue(row, ['zone']),
                    stand: getValue(row, ['stand']),
                    p_throws: getValue(row, ['p_throws']),
                    home_team: getValue(row, ['home_team']),
                    away_team: getValue(row, ['away_team']),
                    pitch_type: getValue(row, ['pitch_type', 'pitch type', 'type']),
                    type: row.type, // Keep specifically for compatibility if needed, but pitch_type is preferred
                    hit_location: row.hit_location,
                    bb_type: row.bb_type,
                    balls: row.balls,
                    strikes: row.strikes,
                    game_year: row.game_year,
                    pfx_x: parseNum(getValue(row, ['pfx_x'])),
                    pfx_z: parseNum(getValue(row, ['pfx_z'])),
                    plate_x: parseNum(getValue(row, ['plate_x', 'plate_loc_side'])),
                    plate_z: parseNum(getValue(row, ['plate_z', 'plate_loc_height'])),
                    on_3b: row.on_3b, // IDs usually, keep raw or safe get?
                    on_2b: row.on_2b,
                    on_1b: row.on_1b,
                    outs_when_up: row.outs_when_up,
                    inning: row.inning,
                    inning_topbot: row.inning_topbot,
                    hc_x: parseNum(getValue(row, ['hc_x'])),
                    hc_y: parseNum(getValue(row, ['hc_y'])),
                    vx0: parseNum(getValue(row, ['vx0'])),
                    vy0: parseNum(getValue(row, ['vy0'])),
                    vz0: parseNum(getValue(row, ['vz0'])),
                    ax: parseNum(getValue(row, ['ax'])),
                    ay: parseNum(getValue(row, ['ay'])),
                    az: parseNum(getValue(row, ['az'])),
                    sz_top: parseNum(getValue(row, ['sz_top'])),
                    sz_bot: parseNum(getValue(row, ['sz_bot'])),
                    effective_speed: parseNum(getValue(row, ['effective_speed', 'effective speed'])),
                    release_extension: parseNum(getValue(row, ['release_extension', 'release extension', 'extension'])),
                    vaa: parseNum(getValue(row, ['vaa', 'vertical_approach_angle', 'plate_loc_height_visual', 'v_angle'])),
                    haa: parseNum(getValue(row, ['haa', 'horizontal_approach_angle', 'h_angle'])),
                    attack_angle: parseNum(getValue(row, ['attack_angle', 'attack angle', 'swing_angle', 'swing_vertical_angle', 'Attack Angle (deg)', 'AttackAngle', 'Attack Angle'])),
                    attack_direction: parseNum(getValue(row, ['attack_direction', 'attack direction'])),
                    estimated_woba_using_speedangle: parseNum(getValue(row, ['estimated_woba_using_speedangle', 'estimated_woba', 'woba_value', 'woba'])),
                    game_pk: row.game_pk,
                    spin_axis: parseNum(getValue(row, ['spin_axis', 'spin axis'])),
                    delta_home_win_exp: row.delta_home_win_exp,
                    delta_run_exp: row.delta_run_exp,
                    file_name: fileName,
                    upload_id: String(fileId)
                };

                // Strict validation: Skip row if critical fields are missing
                // For Savant, we need at least pitcher, batter, and some data
                const criticalFields = ['pitcher_name', 'batter_name', 'game_date'];
                const hasEmpty = criticalFields.some(field => mapped[field] === null || mapped[field] === undefined || mapped[field] === '');

                if (hasEmpty) return null;
                return mapped;
            }).filter(Boolean);

            // Insert into Supabase
            // Insert in batches of 500
            const BATCH_SIZE = 500;
            console.log("Starting upload to Supabase. Total rows:", dbRows.length);
            console.log("Sample row:", dbRows[0]);

            for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
                const batch = dbRows.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('savant_data').insert(batch).select();

                if (error) {
                    console.error("Supabase Insert Error:", error);
                    alert(`Upload failed: ${error.message}`);
                    throw error;
                }
                console.log(`Batch ${i / BATCH_SIZE + 1} uploaded successfully. Rows: ${batch.length}`);
            }

            console.log(`Uploaded ${dbRows.length} Savant data rows to Supabase`);

            // Update local state to reflect change immediately
            // We map back to App format (which expects 'player_name' as pitcher)
            const processedData = dbRows.map(row => ({
                ...row,
                player_name: row.pitcher_name,
                // Add other fields if necessary for UI
            }));

            setData(prev => [...prev, ...processedData]);

            setFileHistory(prev => [...prev, {
                id: fileId,
                fileName: fileName,
                source: 'upload',
                uploadedAt: new Date().toISOString(),
                rowCount: dbRows.length,
                dataType: 'savant'
            }]);

            // Update players/teams maps if needed (omitted for brevity, usually re-fetched or derived)
            alert("Upload successful!");

        } catch (error) {
            console.error("Failed to upload Savant data:", error);
            alert(`Upload failed: ${error.message || error}`);
            throw error; // Re-throw to let Upload component know
        } finally {
            setLoading(false);
        }
    };

    const deleteFile = async (fileId) => {
        try {
            // Delete from Supabase
            // Note: fileId is stored as string in DB column 'upload_id'
            const { error } = await supabase
                .from('savant_data')
                .delete()
                .eq('upload_id', String(fileId));

            if (error) {
                console.error("Error deleting file from Supabase:", error);
                alert(`Failed to delete file from server: ${error.message}`);
                return;
            }

            // Update local state
            setData(prev => prev.filter(row => row._fileId !== fileId));
            setFileHistory(prev => prev.filter(file => file.id !== fileId));

            console.log(`Deleted file ${fileId} from Supabase and local state`);
        } catch (err) {
            console.error("Delete operation failed:", err);
            alert("An unexpected error occurred while deleting.");
        }
    };

    return (
        <DataContext.Provider value={{ data, players, teams, loading, uploadSavantData, fileHistory, deleteFile }}>
            {children}
        </DataContext.Provider >
    );
};

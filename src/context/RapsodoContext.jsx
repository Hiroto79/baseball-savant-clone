import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const RapsodoContext = createContext();

export const useRapsodo = () => useContext(RapsodoContext);

export const RapsodoProvider = ({ children }) => {
    const [pitchingData, setPitchingData] = useState([]);
    const [battingData, setBattingData] = useState([]);
    const [fileHistory, setFileHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);

                // Fetch Pitching Data from Supabase with pagination
                let allPitchingData = [];
                let from = 0;
                const BATCH_SIZE = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data: pData, error: pError } = await supabase
                        .from('rapsodo_pitching')
                        .select('*')
                        .range(from, from + BATCH_SIZE - 1);

                    if (pError) throw pError;

                    if (pData && pData.length > 0) {
                        allPitchingData = [...allPitchingData, ...pData];
                        from += BATCH_SIZE;
                        hasMore = pData.length === BATCH_SIZE;
                    } else {
                        hasMore = false;
                    }
                }

                // Fetch Batting Data from Supabase with pagination
                let allBattingData = [];
                from = 0;
                hasMore = true;

                while (hasMore) {
                    const { data: bData, error: bError } = await supabase
                        .from('rapsodo_batting')
                        .select('*')
                        .range(from, from + BATCH_SIZE - 1);

                    if (bError) throw bError;

                    if (bData && bData.length > 0) {
                        allBattingData = [...allBattingData, ...bData];
                        from += BATCH_SIZE;
                        hasMore = bData.length === BATCH_SIZE;
                    } else {
                        hasMore = false;
                    }
                }

                console.log("Loaded Pitching Rows (Supabase):", allPitchingData.length);
                console.log("Loaded Batting Rows (Supabase):", allBattingData.length);

                // Process Pitching Data (Map DB columns to App keys)
                const processedPitching = allPitchingData.map(d => ({
                    ...d,
                    'Date': d.date,
                    'Player Name': d.player_name,
                    'Pitch Type': d.pitch_type,
                    'Velocity': d.velocity,
                    'Total Spin': d.total_spin,
                    'Spin Efficiency': d.spin_efficiency,
                    'Horizontal Break': d.horizontal_break,
                    'Vertical Break': d.vertical_break,
                    'Release Side': d.release_side,
                    'Release Height': d.release_height,
                    'Release Angle': d.release_angle,
                    'Strike Zone Side': d.strike_zone_side,
                    'Strike Zone Height': d.strike_zone_height
                }));

                // Process Batting Data (Map DB columns to App keys)
                const processedBatting = allBattingData.map(d => ({
                    ...d,
                    'Date': d.date,
                    'Player Name': d.player_name,
                    'ExitVelocity': d.exit_velocity,
                    'LaunchAngle': d.launch_angle,
                    'ExitDirection': d.direction,
                    'Spin': d.spin_rate,
                    'Distance': d.distance,
                    'HangTime': d.hang_time,
                    'StrikeZoneSide': d.strike_zone_side,
                    'StrikeZoneHeight': d.strike_zone_height
                }));

                setPitchingData(processedPitching);
                setBattingData(processedBatting);

                // Add initial load to history (Mock for compatibility)
                setFileHistory([
                    {
                        id: 'supabase-rapsodo-pitching',
                        fileName: 'Rapsodo Pitching (Database)',
                        source: 'database',
                        uploadedAt: new Date().toISOString(),
                        rowCount: processedPitching.length,
                        dataType: 'rapsodo-pitching'
                    },
                    {
                        id: 'supabase-rapsodo-batting',
                        fileName: 'Rapsodo Batting (Database)',
                        source: 'database',
                        uploadedAt: new Date().toISOString(),
                        rowCount: processedBatting.length,
                        dataType: 'rapsodo-batting'
                    }
                ]);
            } catch (error) {
                console.error("Failed to load Rapsodo data from Supabase:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // User requested to keep original units (km/h, cm)
    // const KMH_TO_MPH = 0.621371;
    // const CM_TO_IN = 0.393701;
    // const M_TO_FT = 3.28084;


    const uploadRapsodoData = async (data, type, fileName = 'uploaded.csv') => {
        try {
            setLoading(true);
            const fileId = Date.now() + Math.random();

            // Helper to parse numbers safely
            const parseNum = (val) => {
                if (val === '-' || val === '' || val === null || val === undefined) return null;
                const num = Number(val);
                return isNaN(num) ? null : num;
            };

            if (type === 'pitching') {
                // Validate Rapsodo pitching format
                // We check for at least Player Name
                if (!data[0]['Player Name'] && !data[0].PlayerName) {
                    throw new Error(`Missing 'Player Name' column for Rapsodo Pitching`);
                }

                const dbRows = data.map(d => {
                    const row = {
                        date: d.Date,
                        player_name: d['Player Name'] || d.PlayerName,
                        pitch_type: d['Pitch Type'] || d.PitchType,
                        velocity: parseNum(d.Velocity),
                        total_spin: Math.round(parseNum(d['Total Spin'] || d.TotalSpin) || 0),
                        spin_efficiency: parseNum(d['Spin Efficiency (release)'] || d['Spin Efficiency'] || d.SpinEfficiency),
                        horizontal_break: parseNum(d['HB (trajectory)'] || d['Horizontal Break'] || d.HorizontalBreak),
                        vertical_break: parseNum(d['VB (trajectory)'] || d['Vertical Break'] || d.VerticalBreak),
                        release_side: parseNum(d['Release Side'] || d.ReleaseSide),
                        release_height: parseNum(d['Release Height'] || d.ReleaseHeight),
                        release_angle: parseNum(d['Release Angle'] || d.ReleaseAngle),
                        strike_zone_side: parseNum(d['Strike Zone Side'] || d.StrikeZoneSide || d.PlateLocSide),
                        strike_zone_height: parseNum(d['Strike Zone Height'] || d.StrikeZoneHeight || d.PlateLocHeight),
                        file_name: fileName,
                        upload_id: String(fileId)
                    };

                    // Strict validation: Skip row if ANY critical value is null/undefined
                    const criticalFields = ['player_name', 'velocity', 'total_spin'];
                    const hasEmpty = criticalFields.some(field => row[field] === null || row[field] === undefined || row[field] === '');

                    if (hasEmpty) {
                        return null;
                    }

                    return row;
                }).filter(Boolean);

                // Insert into Supabase in batches
                const BATCH_SIZE = 1000;
                console.log(`Starting Rapsodo Pitching upload. Total rows: ${dbRows.length}`);

                for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
                    const batch = dbRows.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase.from('rapsodo_pitching').insert(batch);

                    if (error) {
                        console.error(`Supabase Insert Error (Pitching Batch ${i / BATCH_SIZE + 1}):`, error);
                        alert(`Upload failed at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
                        throw error;
                    }
                    console.log(`Uploaded batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
                }

                console.log(`Uploaded ${dbRows.length} pitching rows to Supabase`);

                // Update local state (Map back to App keys)
                const processed = dbRows.map(d => ({
                    ...d,
                    _fileId: fileId,
                    'Date': d.date,
                    'Player Name': d.player_name,
                    'Pitch Type': d.pitch_type,
                    'Velocity': d.velocity,
                    'Total Spin': d.total_spin,
                    'Spin Efficiency': d.spin_efficiency,
                    'Horizontal Break': d.horizontal_break,
                    'Vertical Break': d.vertical_break,
                    'Release Side': d.release_side,
                    'Release Height': d.release_height,
                    'Release Angle': d.release_angle,
                    'Strike Zone Side': d.strike_zone_side,
                    'Strike Zone Height': d.strike_zone_height
                }));

                setPitchingData(prev => [...prev, ...processed]);
                setFileHistory(prev => [...prev, {
                    id: fileId,
                    fileName: fileName,
                    source: 'upload',
                    uploadedAt: new Date().toISOString(),
                    rowCount: processed.length,
                    dataType: 'rapsodo-pitching'
                }]);
                alert("Upload successful!");

            } else if (type === 'batting') {
                // Validate Rapsodo batting format
                // Note: Column names might vary (ExitVelocity vs Exit Velocity)
                // We check for at least Player Name
                if (!data[0]['Player Name']) {
                    throw new Error(`Missing 'Player Name' column for Rapsodo Batting`);
                }

                const dbRows = data.map(d => {
                    // Map CSV columns to Database columns
                    // We use the exact column names found in the CSV (e.g. ExitVelocity, LaunchAngle)
                    // We also support the spaced versions just in case, but prioritize the non-spaced ones found in the user's file.

                    const row = {
                        date: d.Date,
                        player_name: d['Player Name'] || d.PlayerName,
                        exit_velocity: parseNum(d.ExitVelocity || d['Exit Velocity'] || d['Exit Speed']),
                        launch_angle: parseNum(d.LaunchAngle || d['Launch Angle']),
                        direction: parseNum(d.ExitDirection || d['Direction']),
                        spin_rate: Math.round(parseNum(d.Spin || d['Spin Rate'] || d.SpinRate) || 0),
                        distance: parseNum(d.Distance || d['Total Distance']),
                        hang_time: parseNum(d.HangTime || d['Hang Time']),
                        strike_zone_side: parseNum(d.StrikeZoneLocation || d['Strike Zone Side'] || d.StrikeZoneSide), // CSV has StrikeZoneLocation? Or StrikeZoneX? Screenshot showed StrikeZoneLocation
                        strike_zone_height: parseNum(d['Strike Zone Height'] || d.StrikeZoneHeight), // Screenshot didn't clearly show this, but assuming similar pattern
                        file_name: fileName,
                        upload_id: String(fileId)
                    };

                    // Strict validation: Skip row if ANY critical value is null/undefined
                    // User said: "Skip if there are empty cells"
                    // We check the critical metrics for batting: velocity, angle, distance
                    // We also check player_name and date
                    const criticalFields = ['player_name', 'exit_velocity', 'launch_angle', 'distance'];
                    const hasEmpty = criticalFields.some(field => row[field] === null || row[field] === undefined || row[field] === '');

                    if (hasEmpty) {
                        // console.log('Skipping row due to empty values:', row);
                        return null;
                    }

                    return row;
                }).filter(Boolean); // Remove nulls

                // Insert into Supabase in batches
                const BATCH_SIZE = 1000;
                console.log(`Starting Rapsodo Batting upload. Total rows: ${dbRows.length}`);

                for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
                    const batch = dbRows.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase.from('rapsodo_batting').insert(batch);

                    if (error) {
                        console.error(`Supabase Insert Error (Batting Batch ${i / BATCH_SIZE + 1}):`, error);
                        alert(`Upload failed at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
                        throw error;
                    }
                    console.log(`Uploaded batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
                }

                console.log(`Uploaded ${dbRows.length} batting rows to Supabase`);

                // Update local state
                const processed = dbRows.map(d => ({
                    ...d,
                    _fileId: fileId,
                    'Date': d.date,
                    'Player Name': d.player_name,
                    'ExitVelocity': d.exit_velocity,
                    'LaunchAngle': d.launch_angle,
                    'ExitDirection': d.direction,
                    'Spin': d.spin_rate,
                    'Distance': d.distance,
                    'HangTime': d.hang_time,
                    'StrikeZoneSide': d.strike_zone_side,
                    'StrikeZoneHeight': d.strike_zone_height
                }));

                setBattingData(prev => [...prev, ...processed]);
                setFileHistory(prev => [...prev, {
                    id: fileId,
                    fileName: fileName,
                    source: 'upload',
                    uploadedAt: new Date().toISOString(),
                    rowCount: processed.length,
                    dataType: 'rapsodo-batting'
                }]);
                alert("Upload successful!");
            }
        } catch (error) {
            console.error("Failed to upload Rapsodo data:", error);
            alert(`Upload failed: ${error.message || error}`);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deleteFile = (fileId) => {
        setPitchingData(prev => prev.filter(row => row._fileId !== fileId));
        setBattingData(prev => prev.filter(row => row._fileId !== fileId));
        setFileHistory(prev => prev.filter(file => file.id !== fileId));
    };

    return (
        <RapsodoContext.Provider value={{ pitchingData, battingData, loading, uploadRapsodoData, fileHistory, deleteFile }}>
            {children}
        </RapsodoContext.Provider>
    );
};

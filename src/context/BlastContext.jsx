import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const BlastContext = createContext();

export const useBlast = () => useContext(BlastContext);

export const BlastProvider = ({ children }) => {
    const [blastData, setBlastData] = useState([]);
    const [fileHistory, setFileHistory] = useState([]); // Track uploaded files
    const [loading, setLoading] = useState(true);

    const loadedRef = React.useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        const loadData = async () => {
            try {
                setLoading(true);

                // Fetch Blast Data from Supabase with pagination
                let allData = [];
                let from = 0;
                const BATCH_SIZE = 1000;
                let hasMore = true;

                while (hasMore) {
                    const { data: blastRows, error } = await supabase
                        .from('blast_data')
                        .select('*')
                        .range(from, from + BATCH_SIZE - 1);

                    if (error) throw error;

                    if (blastRows && blastRows.length > 0) {
                        allData = [...allData, ...blastRows];
                        from += BATCH_SIZE;
                        hasMore = blastRows.length === BATCH_SIZE;
                    } else {
                        hasMore = false;
                    }
                }

                console.log(`Loaded ${allData.length} rows from Supabase (blast_data)`);

                // Process Data (Map DB columns to App keys)
                const processedData = allData.map(d => ({
                    ...d,
                    // Map snake_case DB columns to PascalCase App keys
                    Date: d.date,
                    PlayerName: d.player_name, // App uses PlayerName
                    BatSpeed: d.bat_speed,
                    AttackAngle: d.attack_angle,
                    VerticalBatAngle: d.vertical_bat_angle,
                    Power: d.power,
                    TimeToContact: d.time_to_contact,
                    PeakHandSpeed: d.peak_hand_speed,
                    OnPlaneEfficiency: d.on_plane_efficiency,
                    RotationScore: d.rotation_score,
                    OnPlaneScore: d.on_plane_score,
                    ConnectionScore: d.connection_score,
                    RotationAcceleration: d.rotation_acceleration,
                    ConnectionAtImpact: d.connection_at_impact,
                    ConnectionAtAddress: d.connection_at_address,
                    BatAngle: d.bat_angle,

                    // Keep original snake_case too if needed, or just rely on spread
                }));

                setBlastData(processedData);

                // Add initial load to history (Mock)
                // Reconstruct File History
                const historyMap = new Map();

                processedData.forEach(row => {
                    const uploadId = row.upload_id || 'legacy';
                    const fileName = row.file_name || 'Legacy Blast Data';

                    if (!historyMap.has(uploadId)) {
                        historyMap.set(uploadId, {
                            id: uploadId,
                            fileName: fileName,
                            source: 'database',
                            uploadedAt: new Date().toISOString(),
                            rowCount: 0,
                            dataType: 'blast'
                        });
                    }

                    const entry = historyMap.get(uploadId);
                    entry.rowCount++;
                    row._fileId = uploadId;
                });

                setFileHistory(Array.from(historyMap.values()));

            } catch (error) {
                console.error("Failed to load Blast data from Supabase:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Helper function for parsing Japanese dates
    const parseJapaneseDate = (dateString) => {
        if (!dateString) return null;
        // Example: "2023年10月26日" -> "2023-10-26"
        const parts = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (parts) {
            const year = parts[1];
            const month = parts[2].padStart(2, '0');
            const day = parts[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        // Fallback for other date formats or if not Japanese
        try {
            const date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch (e) {
            console.warn("Could not parse date:", dateString, e);
        }
        return null;
    };

    const uploadBlastData = async (rawData, fileName = 'uploaded.csv') => {
        try {
            setLoading(true);
            let processedData = [];

            // Helper to parse numbers safely
            const parseNum = (val) => {
                if (val === '-' || val === '' || val === null || val === undefined) return null;
                const num = Number(val);
                return isNaN(num) ? null : num;
            };

            // Check if it's Japanese format (has specific headers)
            const firstRow = rawData[0] || {};
            console.log('First Blast row:', firstRow);
            console.log('Available Blast columns:', Object.keys(firstRow));
            const isJapanese = Object.keys(firstRow).some(key => key.includes('日付') || key.includes('スイング'));

            if (isJapanese) {
                processedData = rawData.map(row => {
                    const mapped = {};
                    // Map Japanese headers to Supabase columns
                    const headerMap = {
                        '日付': 'date',
                        'スイングスピード (mph)': 'bat_speed',
                        'バットスピード (mph)': 'bat_speed',
                        'アッパースイング度 (deg)': 'attack_angle',
                        '垂直バット角度 (deg)': 'vertical_bat_angle',
                        'パワー (kW)': 'power',
                        'スイング時間 (sec)': 'time_to_contact',
                        '手の最大スピード (mph)': 'peak_hand_speed',
                        'オンプレーンの効率 (%)': 'on_plane_efficiency',
                        '体の回転による加速スコア': 'rotation_score',
                        'オンプレーンのスコア': 'on_plane_score', // Assuming this exists or similar
                        'コネクションのスコア': 'connection_score', // Assuming this exists
                        '体の回転によるバットの加速の大きさ（初動） (g)': 'rotation_acceleration',
                        ' 体とバットの角度（インパクト） (deg)': 'connection_at_impact',
                        ' 体とバットの角度（構え） (deg)': 'connection_at_address',
                        ' バット角度 (deg)': 'bat_angle'
                    };

                    // Also map English headers if mixed or standard
                    const englishMap = {
                        'Date': 'date',
                        'Bat Speed (mph)': 'bat_speed',
                        'Attack Angle (deg)': 'attack_angle',
                        'Vertical Bat Angle (deg)': 'vertical_bat_angle',
                        'Power (kW)': 'power',
                        'Time to Contact (sec)': 'time_to_contact',
                        'Peak Hand Speed (mph)': 'peak_hand_speed',
                        'On Plane Efficiency (%)': 'on_plane_efficiency',
                        'Rotation Score': 'rotation_score',
                        'On Plane Score': 'on_plane_score',
                        'Connection Score': 'connection_score',
                        'Rotational Acceleration (g)': 'rotation_acceleration',
                        'Connection at Impact (deg)': 'connection_at_impact',
                        'Connection at Address (deg)': 'connection_at_address',
                        'Bat Angle (deg)': 'bat_angle'
                    };

                    Object.keys(row).forEach(key => {
                        const targetKey = headerMap[key] || englishMap[key];
                        if (targetKey) {
                            mapped[targetKey] = row[key];
                        }
                    });
                    return mapped;
                });
            } else {
                // Assume standard English headers but map to snake_case for Supabase
                processedData = rawData.map(row => {
                    const mapped = {
                        date: row.Date,
                        bat_speed: parseNum(row['Bat Speed (mph)'] || row.BatSpeed),
                        attack_angle: parseNum(row['Attack Angle (deg)'] || row.AttackAngle),
                        vertical_bat_angle: parseNum(row['Vertical Bat Angle (deg)'] || row.VerticalBatAngle),
                        power: parseNum(row['Power (kW)'] || row.Power),
                        time_to_contact: parseNum(row['Time to Contact (sec)'] || row.TimeToContact),
                        peak_hand_speed: parseNum(row['Peak Hand Speed (mph)'] || row.PeakHandSpeed),
                        on_plane_efficiency: parseNum(row['On Plane Efficiency (%)'] || row.OnPlaneEfficiency),
                        rotation_score: parseNum(row['Rotation Score'] || row.RotationScore),
                        on_plane_score: parseNum(row['On Plane Score'] || row.OnPlaneScore),
                        connection_score: parseNum(row['Connection Score'] || row.ConnectionScore),
                        rotation_acceleration: parseNum(row['Rotational Acceleration (g)'] || row.RotationAcceleration),
                        connection_at_impact: parseNum(row['Connection at Impact (deg)'] || row.ConnectionAtImpact),
                        connection_at_address: parseNum(row['Connection at Address (deg)'] || row.ConnectionAtAddress),
                        bat_angle: parseNum(row['Bat Angle (deg)'] || row.BatAngle)
                    };
                    return mapped;
                });
            }

            // Extract player info from filename if available
            const playerMatch = fileName.match(/Player (\d+)/);
            const playerId = playerMatch ? playerMatch[1] : 'Uploaded';

            // Generate unique file ID
            const fileId = Date.now() + Math.random();

            // Prepare for DB
            const dbRows = processedData.map(d => {
                const row = {
                    date: isJapanese ? parseJapaneseDate(d.date) : (d.date ? new Date(d.date).toISOString().split('T')[0] : null),
                    player_name: playerId, // Use extracted player ID/Name from filename
                    bat_speed: parseNum(d.bat_speed),
                    attack_angle: parseNum(d.attack_angle),
                    vertical_bat_angle: parseNum(d.vertical_bat_angle),
                    power: parseNum(d.power),
                    time_to_contact: parseNum(d.time_to_contact),
                    peak_hand_speed: parseNum(d.peak_hand_speed),
                    on_plane_efficiency: parseNum(d.on_plane_efficiency),
                    rotation_score: parseNum(d.rotation_score),
                    on_plane_score: parseNum(d.on_plane_score),
                    connection_score: parseNum(d.connection_score),
                    rotation_acceleration: parseNum(d.rotation_acceleration),
                    connection_at_impact: parseNum(d.connection_at_impact),
                    connection_at_address: parseNum(d.connection_at_address),
                    bat_angle: parseNum(d.bat_angle),
                    file_name: fileName,
                    upload_id: String(fileId)
                };

                // Validation: Skip row only if bat_speed is missing (critical for analysis)
                // Relaxed validation to avoid skipping rows with partial data
                if (row.bat_speed === null || row.bat_speed === undefined) {
                    return null;
                }
                return row;
            }).filter(Boolean);

            // Insert into Supabase in batches
            const BATCH_SIZE = 1000;
            console.log(`Starting Blast upload. Total rows: ${dbRows.length}`);

            for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
                const batch = dbRows.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('blast_data').insert(batch);

                if (error) {
                    console.error(`Supabase Insert Error (Blast Batch ${i / BATCH_SIZE + 1}):`, error);
                    alert(`Upload failed at batch ${i / BATCH_SIZE + 1}: ${error.message}`);
                    throw error;
                }
                console.log(`Uploaded batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
            }

            console.log(`Uploaded ${dbRows.length} Blast data rows to Supabase`);

            // Update local state (Map back to App keys expected by Blast dashboard)
            // The dashboard expects keys like 'BatSpeed', 'Date', 'PlayerName'
            const finalData = dbRows.map(row => ({
                ...row,
                _fileId: fileId,
                PlayerId: row.player_name,
                PlayerName: row.player_name,
                Date: row.date,
                BatSpeed: row.bat_speed,
                AttackAngle: row.attack_angle,
                VerticalBatAngle: row.vertical_bat_angle,
                Power: row.power,
                TimeToContact: row.time_to_contact,
                PeakHandSpeed: row.peak_hand_speed,
                OnPlaneEfficiency: row.on_plane_efficiency,
                RotationScore: row.rotation_score,
                OnPlaneScore: row.on_plane_score,
                ConnectionScore: row.connection_score,
                RotationAcceleration: row.rotation_acceleration,
                ConnectionAtImpact: row.connection_at_impact,
                ConnectionAtAddress: row.connection_at_address,
                BatAngle: row.bat_angle
            }));

            // Append to existing data instead of replacing
            setBlastData(prev => [...prev, ...finalData]);

            // Add to file history
            setFileHistory(prev => [...prev, {
                id: fileId,
                fileName: fileName,
                source: 'upload',
                uploadedAt: new Date().toISOString(),
                rowCount: finalData.length,
                dataType: 'blast'
            }]);
            alert("Upload successful!");
        } catch (error) {
            console.error("Failed to upload Blast data:", error);
            alert(`Upload failed: ${error.message || error}`);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Function to delete file from history
    const deleteFile = async (fileId) => {
        try {
            // Delete from Supabase
            const { error } = await supabase
                .from('blast_data')
                .delete()
                .eq('upload_id', String(fileId));

            if (error) {
                console.error("Error deleting file from Supabase:", error);
                alert(`Failed to delete file from server: ${error.message}`);
                return;
            }

            // Remove data associated with this file
            setBlastData(prev => prev.filter(row => row._fileId !== fileId));
            // Remove from history
            setFileHistory(prev => prev.filter(file => file.id !== fileId));

            console.log(`Deleted file ${fileId} from Supabase and local state`);
        } catch (err) {
            console.error("Delete operation failed:", err);
            alert("An unexpected error occurred while deleting.");
        }
    };

    return (
        <BlastContext.Provider value={{ blastData, loading, uploadBlastData, fileHistory, deleteFile }}>
            {children}
        </BlastContext.Provider>
    );
};

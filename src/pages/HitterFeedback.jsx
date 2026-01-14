import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Printer, Info } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ReferenceArea, ReferenceDot } from 'recharts';

const HitterFeedback = () => {
    const { language } = useSettings();
    const [allData, setAllData] = useState([]); // Master dataset from one file
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [reportType, setReportType] = useState('point'); // point, height, course, hand
    const [viewMode, setViewMode] = useState('individual'); // 'individual' or 'team'
    const [subViewMode, setSubViewMode] = useState('analysis'); // 'analysis' (P1) or 'detail' (P2) for individual report
    const [customPlayerName, setCustomPlayerName] = useState('');

    useEffect(() => {
        if (selectedPlayer) {
            setCustomPlayerName(selectedPlayer);
        }
    }, [selectedPlayer]);

    // Manual Benchmarks (Previous & Target only)
    const [benchmarks, setBenchmarks] = useState({
        prevSpeed: '',
        prevAngle: '',
        prevBatSpeed: '',
        prevAccel: '',
        prevPower: '',
        prevAdjust: '',
        targetSpeed: '150.0',
        targetBatSpeed: '120.0'
    });
    const [manualAdjustments, setManualAdjustments] = useState({});

    // Configuration for Categories
    const CONFIG = {
        point: [
            { id: 'point_front', label: 'ポイント前 (Front)', shortLabel: '前', tags: ['前', 'front', 'point_front'] },
            { id: 'point_mid', label: '真ん中 (Mid)', shortLabel: '中', tags: ['中', 'mid', 'point_mid', 'middle'] },
            { id: 'point_back', label: 'ポイント後 (Back)', shortLabel: '後', tags: ['後', 'back', 'point_back'] }
        ],
        height: [
            { id: 'height_high', label: '高め (High)', shortLabel: '高め', tags: ['高', 'high', 'height_high'] },
            { id: 'height_mid', label: '真ん中 (Mid)', shortLabel: '真ん中', tags: ['中', 'mid', 'height_mid', 'middle'] },
            { id: 'height_low', label: '低め (Low)', shortLabel: '低め', tags: ['低', 'low', 'height_low'] }
        ],
        course: [
            { id: 'course_in', label: 'インコース (In)', shortLabel: 'イン', tags: ['イン', 'in', 'course_in'] },
            { id: 'course_mid', label: '真ん中 (Mid)', shortLabel: '真ん中', tags: ['中', 'mid', 'course_mid', 'middle'] },
            { id: 'course_out', label: 'アウトコース (Out)', shortLabel: 'アウト', tags: ['アウト', 'out', 'course_out'] }
        ],
        // 'hand' is special: It's the "Comparison" report (Image 3)
        hand: [
            { id: 'hand_tee', label: '置きT (Tee)', shortLabel: '置きT', tags: ['置きT', 'tee', 'hand_tee'] },
            { id: 'hand_live', label: '手投げ (Hand)', shortLabel: '手投げ', tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス', 'machine', 'マシン'] }
        ]
    };

    // Derived Players List
    const players = useMemo(() => {
        const unique = new Set(allData.map(d => d['Player Name'] || d.PlayerName).filter(Boolean));
        return [...unique].sort();
    }, [allData]);

    // Added: Check if MS3 exists in data
    const hasMS3 = useMemo(() => {
        return allData.some(d => {
            const g = String(d['学年'] || d['Grade'] || d['Year'] || '');
            return g.includes('3') && (g.includes('中') || g.includes('MS'));
        });
    }, [allData]);

    // Unique Grades and Color Logic
    const getGradeInfo = (raw) => {
        const s = String(raw || '').trim();
        if (s.includes('2')) return { label: '2年生', color: 'text-red-600', order: 2, group: '2' };
        if (s.includes('3') && (s.includes('中') || s.includes('MS'))) return { label: '中学3年生', color: 'text-blue-600', order: 4, group: 'MS3' }; // MS3
        if (s.includes('3')) return { label: '3年生', color: 'text-blue-600', order: 1, group: '3' }; // HS3
        return { label: '1年生', color: 'text-black', order: 3, group: '1' }; // Default 1st
    };

    const getPlayerGradeInfo = (player) => {
        const row = allData.find(d => (d['Player Name'] || d.PlayerName) === player);
        if (!row) return { color: 'text-black' };
        return getGradeInfo(row['学年'] || row['Grade'] || row['Year'] || '');
    };

    useEffect(() => {
        if (players.length > 0 && !selectedPlayer) {
            setSelectedPlayer(players[0]);
        }
    }, [players, selectedPlayer]);

    // Handle Upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        setFileName(file.name);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                const rawData = results.data;
                if (!rawData[0]) {
                    alert('Invalid CSV. No data found.');
                    setLoading(false);
                    return;
                }

                // Helper to normalize keys
                const normalizeRow = (row) => {
                    const newRow = { ...row };

                    // Map of Variations -> Standard Key
                    const keyMap = {
                        // Bat Speed
                        'Bat Speed (mph)': 'BatSpeed',
                        'Bat Speed': 'BatSpeed',
                        'バットスピード': 'BatSpeed',
                        'バットスピード (mph)': 'BatSpeed',
                        'バット速度': 'BatSpeed',
                        'バット速度 (km/h)': 'BatSpeed',
                        'Bat Speed (km/h)': 'BatSpeed',
                        'BatSpeed': 'BatSpeed',


                        // Exit Velocity
                        'Exit Velocity': 'ExitVelocity',
                        'ExitVelocity': 'ExitVelocity',
                        '打球速度': 'ExitVelocity',
                        '打球速度 (km/h)': 'ExitVelocity',
                        'Exit Velocity (mph)': 'ExitVelocity',

                        // Launch Angle
                        'Launch Angle': 'LaunchAngle',
                        'LaunchAngle': 'LaunchAngle',
                        '打球角度': 'LaunchAngle',
                        '打球角度 (deg)': 'LaunchAngle',
                        'Launch Angle (deg)': 'LaunchAngle',

                        // Distance
                        'Distance': 'Distance',
                        'Hit Distance': 'Distance',
                        '飛距離': 'Distance',
                        '推定飛距離': 'Distance',

                        // Spin Rate
                        'Spin Rate': 'SpinRate',
                        'SpinRate': 'SpinRate',
                        '回転数': 'SpinRate',
                        'Total Spin': 'SpinRate',

                        // Player Name
                        'Player Name': 'PlayerName',
                        'PlayerName': 'PlayerName',
                        '名前': 'PlayerName',
                        '選手名': 'PlayerName',

                        // Tags
                        'Tag': 'Tag',
                        'Tags': 'Tag',
                        'Note': 'Tag',
                        'Notes': 'Tag',
                        'タグ': 'Tag',
                        'Category': 'Tag',

                        // Grade
                        '学年': 'Grade',
                        'Grade': 'Grade',
                        'Year': 'Grade',

                        // Blast Metrics
                        // Blast Metrics
                        'パワー': 'Power',
                        'パワー (kW)': 'Power',
                        'Power': 'Power',
                        'Power (kW)': 'Power',
                        '加速度': 'Acceleration',
                        '加速度 (G)': 'Acceleration',
                        '加速度(G)': 'Acceleration',
                        'ACC': 'Acceleration',
                        'Acc': 'Acceleration',
                        'Acceleration': 'Acceleration',
                        'Acceleration (G)': 'Acceleration',
                        'Acceleration(G)': 'Acceleration',
                        'Max Acceleration(G)': 'Acceleration',
                        'Maximum Acceleration': 'Acceleration',
                        'Maximum Acceleration (G)': 'Acceleration',
                        'Peak Hand Speed': 'PeakHandSpeed',
                        'Peak Hand Speed (mph)': 'PeakHandSpeed',
                        'Peak Hand Speed (km/h)': 'PeakHandSpeed',
                        'アジャスト率': 'Adjust',
                        'アジャスト率 (%)': 'Adjust',
                        'アジャスト率(%)': 'Adjust',
                        'Adjust': 'Adjust',
                        'Adjust (%)': 'Adjust',
                        'AdjustRate': 'Adjust',
                        'On Plane Efficiency': 'OnPlaneEfficiency',
                        'On Plane Efficiency (%)': 'OnPlaneEfficiency',
                        'Attack Angle': 'AttackAngle',
                        'Attack Angle (deg)': 'AttackAngle',
                        'Vertical Bat Angle': 'VerticalBatAngle',
                        'Vertical Bat Angle (deg)': 'VerticalBatAngle',
                        'Early Connection': 'EarlyConnection',
                        'Connection at Impact': 'ConnectionAtImpact',
                        'Rotation Score': 'RotationScore',
                        'スイング時間': 'Time',
                        'Time to Contact': 'Time',
                    };

                    // Expanded Acceleration Keys - with all spacing and parenthesis variations
                    const manualKeys = {
                        'Acceleration': 'Acceleration',
                        'Acceleration (g)': 'Acceleration',
                        'Acceleration(g)': 'Acceleration',
                        'Acceleration（g）': 'Acceleration',
                        'Acceleration (G)': 'Acceleration',
                        'Acceleration(G)': 'Acceleration',
                        'Acceleration（G）': 'Acceleration',
                        'Accel': 'Acceleration',
                        'Accel (g)': 'Acceleration',
                        'Accel(g)': 'Acceleration',
                        'Accel（g）': 'Acceleration',
                        'Accel (G)': 'Acceleration',
                        'Accel(G)': 'Acceleration',
                        'Accel（G）': 'Acceleration',
                        'Body Rotational Acceleration': 'Acceleration',
                        'Body Rotational Acceleration (g)': 'Acceleration',
                        'Rotational Acceleration': 'Acceleration',
                        'Rotational Accel': 'Acceleration',
                        'Bat Accel': 'Acceleration',
                        'Bat Acceleration': 'Acceleration',
                        '加速度': 'Acceleration',
                        '加速度 (G)': 'Acceleration',
                        '加速度(G)': 'Acceleration',
                        '加速度（G）': 'Acceleration',
                        '加速度 (g)': 'Acceleration',
                        '加速度(g)': 'Acceleration',
                        '加速度（g）': 'Acceleration',
                        '体の回転によるバットの加速の大きさ（初動）': 'Acceleration',
                        '体の回転によるバットの加速の大きさ（初動） (g)': 'Acceleration',
                        '体の回転によるバットの加速の大きさ（初動）(g)': 'Acceleration',
                        '体の回転によるバットの加速の大きさ（初動）（g）': 'Acceleration',
                        '体の回転によるバットの加速の大きさ(初動)': 'Acceleration',
                        '体の回転によるバットの加速の大きさ(初動) (g)': 'Acceleration',
                        '体の回転によるバットの加速の大きさ(初動)(g)': 'Acceleration',
                        '体の回転によるバットの加速の大きさ(初動)（g）': 'Acceleration',
                        'Acceleration ( g)': 'Acceleration',
                        'Acceleration( g)': 'Acceleration'
                    };
                    Object.assign(keyMap, manualKeys);

                    Object.keys(row).forEach(key => {
                        // Check exact match or partial match for mapped keys
                        // We prioritize exact match first
                        const cleanKey = key.trim();
                        const lowerKey = cleanKey.toLowerCase();

                        // Try direct lookup (exact)
                        if (keyMap[cleanKey]) {
                            newRow[keyMap[cleanKey]] = row[key];
                            return;
                        }

                        // Try case-insensitive lookup
                        const foundKey = Object.keys(keyMap).find(k => k.toLowerCase() === lowerKey);
                        if (foundKey) {
                            newRow[keyMap[foundKey]] = row[key];
                            return;
                        }

                        // Try finding a mapping that contains this key or vice versa (fuzzy)
                        for (const [mapSrc, mapDest] of Object.entries(keyMap)) {
                            if (lowerKey.includes(mapSrc.toLowerCase())) {
                                newRow[mapDest] = row[key];
                                break;
                            }
                        }
                    });

                    // Ensure numeric conversion for key metrics
                    ['BatSpeed', 'ExitVelocity', 'LaunchAngle', 'Distance', 'SpinRate', 'Acceleration', 'Power', 'Adjust'].forEach(field => {
                        if (newRow[field]) {
                            let val = parseFloat(newRow[field]);
                            if (!isNaN(val)) {
                                // Bat Speed Unit Correction
                                if (field === 'BatSpeed') {
                                    if (val < 20) {
                                        // Assume convert 11.2 -> 112.0 (x10 scaling error)
                                        val *= 10;
                                    } else if (val < 50) {
                                        // Assume m/s -> km/h (20 m/s = 72 km/h, 50 m/s = 180 km/h)
                                        val *= 3.6;
                                    }
                                }
                                newRow[field] = val;
                            }
                        }
                    });

                    return newRow;
                };

                const processedData = rawData.map(normalizeRow);

                if (!processedData[0].PlayerName) {
                    alert('Invalid CSV. Could not find "Player Name" column.');
                    setLoading(false);
                    return;
                }

                setAllData(processedData);
                setLoading(false);
            },
            error: (err) => {
                console.error(err);
                alert('Failed to parse CSV');
                setLoading(false);
            }
        });
    };

    // Helper: Filter logic
    const getFilteredRows = (tagConfig, player = null) => {
        if (!allData.length) return [];
        return allData.filter(row => {
            if (player) {
                const pName = row['Player Name'] || row.PlayerName;
                if (pName !== player) return false;
            }
            const rowTag = (row['Tag'] || row['Note'] || row['Notes'] || row['Category'] || '').toString().toLowerCase().trim();
            // Match any of the tags
            return tagConfig.tags.some(t => rowTag.includes(t.toLowerCase()));
        });
    };

    // Stats Calculator
    const getStats = (tagConfig, player) => {
        const rows = getFilteredRows(tagConfig, player);
        if (rows.length === 0) return null;

        const avg = (key) => {
            const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
            if (vals.length === 0) return '';
            return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
        };

        // For Image 3 layout, we might need Max?
        // Let's return both if useful, or stick to Avg as standard.
        // Image 3 boxes are big, imply single value.
        // Let's use AVG for consistency.

        const avgAccel = (key) => {
            const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
            if (vals.length === 0) return '';
            return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        };

        return {
            ev: avg('ExitVelocity'),
            angle: avg('LaunchAngle'),
            dist: avg('Distance'),
            spin: avg('SpinRate'),
            batSpeed: avg('BatSpeed') || '',
            accel: avgAccel('Acceleration'),
            power: avg('Power'),
            adjust: avg('Adjust')
        };
    };

    const getAverage = (tagConfig, key) => {
        const rows = getFilteredRows(tagConfig, null);
        if (rows.length === 0) return null;
        const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
        if (vals.length === 0) return null;
        return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    };

    // Optimized: Calculate average including manual adjustments (Single Pass)
    const getAdjustAverage = (categoryId, tagConfig) => {
        // 1. Get all rows for this category (One scan)
        const catRows = getFilteredRows(tagConfig, null);

        // 2. Build map of player -> average adjust
        const playerAdjustMap = {};
        catRows.forEach(r => {
            const p = r['Player Name'] || r.PlayerName;
            const val = r.Adjust; // Assuming normalized key 'Adjust' exists
            if (typeof val === 'number') {
                if (!playerAdjustMap[p]) playerAdjustMap[p] = { sum: 0, count: 0 };
                playerAdjustMap[p].sum += val;
                playerAdjustMap[p].count += 1;
            }
        });

        // 3. Iterate players
        const validValues = players.map(player => {
            // Manual adjustment priority
            const manualKey = `${player}-${categoryId}`;
            if (manualAdjustments[manualKey] !== undefined && manualAdjustments[manualKey] !== '') {
                const val = parseFloat(manualAdjustments[manualKey]);
                return isNaN(val) ? null : val;
            }
            // Data fallback
            if (playerAdjustMap[player]) {
                return playerAdjustMap[player].sum / playerAdjustMap[player].count;
            }
            return null;
        }).filter(v => v !== null);

        if (validValues.length === 0) return null;
        return (validValues.reduce((a, b) => a + b, 0) / validValues.length);
    };

    const getGradeAverage = (tagConfig, key, gradeGroup) => {
        // Filter by Grade Group logic
        const rows = getFilteredRows(tagConfig, null).filter(r => {
            const info = getGradeInfo(r['学年'] || r['Grade'] || r['Year'] || '');
            return info.group === gradeGroup;
        });

        if (rows.length === 0) return '/';

        // Special handling for Adjust (use Manual Adjustments)
        if (key === 'Adjust') {
            const gradePlayers = players.filter(p => {
                const info = getPlayerGradeInfo(p);
                return info.group === gradeGroup;
            });

            // Build map for efficient lookup (avoid N*M scan)
            const playerMap = {};
            rows.forEach(r => {
                const p = r['Player Name'] || r.PlayerName;
                const val = r.Adjust || 0;
                if (!playerMap[p]) playerMap[p] = { sum: 0, count: 0 };
                playerMap[p].sum += val;
                playerMap[p].count += 1;
            });

            const validAdjusts = gradePlayers.map(p => {
                // Check Manual First
                const manualKey = `${p}-${tagConfig.id}`;
                if (manualAdjustments[manualKey] !== undefined && manualAdjustments[manualKey] !== '') {
                    return parseFloat(manualAdjustments[manualKey]);
                }
                // Check Data from Map
                if (playerMap[p] && playerMap[p].count > 0) {
                    return playerMap[p].sum / playerMap[p].count;
                }
                return null;
            }).filter(v => v !== null && !isNaN(v));

            if (validAdjusts.length === 0) return '/';
            return (validAdjusts.reduce((a, b) => a + b, 0) / validAdjusts.length).toFixed(1);
        }

        // Special handling for Power
        if (key === 'Power') {
            const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
            if (vals.length === 0) return '/';
            return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
        }

        const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
        if (vals.length === 0) return '/';
        return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    };

    // Calculate Team Stats for Report (Point/Height/Course)
    const getTeamStats = () => {
        let allRelevantRows = [];
        CONFIG[reportType].forEach(conf => {
            const rows = getFilteredRows(conf, null);
            allRelevantRows = [...allRelevantRows, ...rows];
        });
        if (allRelevantRows.length === 0) return { ev: '', bat: '' };

        const calcAvg = (key) => {
            const vals = allRelevantRows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
            if (vals.length === 0) return '';
            return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
        };
        return { ev: calcAvg('ExitVelocity'), bat: calcAvg('BatSpeed') };
    };

    // Scatter Data
    const getScatterData = (player) => {
        const relevantTags = CONFIG[reportType].flatMap(c => c.tags);
        const rows = allData.filter(row => {
            const pName = row['Player Name'] || row.PlayerName;
            if (pName !== player) return false;
            const rowTag = (row['Tag'] || row['Note'] || row['Notes'] || row['Category'] || '').toString().toLowerCase().trim();
            return relevantTags.some(t => rowTag.includes(t.toLowerCase()));
        });
        return rows.map(r => ({
            ev: r.ExitVelocity || r['Exit Velocity'],
            ang: r.LaunchAngle || r['Launch Angle'],
            bat: r.BatSpeed || r['Bat Speed'] || 0
        })).filter(d => typeof d.ev === 'number' && typeof d.ang === 'number');
    };

    // Performance Optimization: Memoize expensive data derivations
    const scatterData = useMemo(() => getScatterData(selectedPlayer), [selectedPlayer, reportType, allData]);
    const teamStats = useMemo(() => getTeamStats(), [reportType, allData]);

    // Performance Optimization: Memoize static stats (Team/Grade Averages)
    const staticTableStats = useMemo(() => {
        if (!allData.length) return null;
        const result = { team: {}, grade2: {}, grade1: {}, ms3: {}, grade3: {} };
        const cats = CONFIG[reportType];

        cats.forEach(cat => {
            const catRows = getFilteredRows(cat, null);
            const calcAvg = (key) => {
                const vals = catRows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
                return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
            };

            // Team Avgs
            result.team[cat.id] = {
                ev: calcAvg('ExitVelocity'),
                ang: calcAvg('LaunchAngle'),
                dist: calcAvg('Distance'),
                bat: calcAvg('BatSpeed'),
                power: calcAvg('Power')
            };

            // Grade Avgs
            const calcGradeAvg = (filterFn) => {
                const gRows = catRows.filter(r => {
                    const info = getGradeInfo(r['学年'] || r['Grade'] || r['Year'] || '');
                    return filterFn(info);
                });
                const gCalc = (key) => {
                    const vals = gRows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
                    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                };
                return {
                    ev: gCalc('ExitVelocity'),
                    ang: gCalc('LaunchAngle'),
                    dist: gCalc('Distance'),
                    bat: gCalc('BatSpeed'),
                    power: gCalc('Power')
                };
            };

            result.grade2[cat.id] = calcGradeAvg(i => i.group === '2');
            result.grade1[cat.id] = calcGradeAvg(i => i.group === '1');
            result.ms3[cat.id] = calcGradeAvg(i => i.group === 'MS3');
            result.grade3[cat.id] = calcGradeAvg(i => i.group === '3');
        });
        return result;
    }, [allData, reportType]);

    const handlePrint = () => window.print();
    const getTypeColor = (ang) => {
        if (ang < 0) return '#22c55e'; // Green
        if (ang < 6) return '#eab308'; // Yellow
        if (ang < 14) return '#ef4444'; // Red
        if (ang < 24) return '#06b6d4'; // Cyan
        if (ang < 50) return '#3b82f6'; // Blue
        return 'black';
    };

    // --- RENDER ---
    return (
        <div className="p-6 max-w-[210mm] mx-auto bg-gray-50 min-h-screen text-black font-sans print:max-w-none print:w-full print:mx-0 print:p-0 print:min-h-0 print:h-auto print:overflow-visible print:absolute print:top-0 print:left-0">

            {/* Force Print Styles & Reset */}
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 0mm; }
                    html, body {
                        width: 297mm;
                        height: auto;
                        min-height: 100vh;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    /* Explicit Print Column Widths Override - Removed in favor of inline pixel widths for exact control */
                    /* .print-col-player { width: 48mm !important; } */
                    /* .print-col-data { width: 19mm !important; } */

                    /* Hide EVERYTHING by default */
                    body * { visibility: hidden; }
                    /* Only show the report container and its children */
                    #report-container, #report-container * { visibility: visible; }

                    /* Position the report at absolute top-left */
                    #report-container {
                        position: relative;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 auto !important;
                        padding-left: 5mm !important;
                        padding-right: 5mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        overflow: visible !important;
                        page-break-after: always;
                    }
                    #report-container:last-child {
                        page-break-after: auto;
                    }

                    /* Hide specific UI elements just in case */
                    nav, aside, header, .print\\:hidden { display: none !important; }
                }
            `}</style>

            {/* CONTROLS (omitted from print via body * visibility trick above, but kept here for screen) */}
            <div className="bg-white p-4 rounded shadow mb-6 print:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Hitter Feedback</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode(viewMode === 'individual' ? 'team' : 'individual')}
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                        >
                            {viewMode === 'individual' ? 'チーム一覧に切り替え' : '個人レポートに切り替え'}
                        </button>
                        <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center hover:bg-blue-700">
                            <Printer className="mr-2 h-4 w-4" /> 印刷 (Print)
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 text-sm text-blue-800">
                    <div className="font-bold flex items-center"><Info className="h-4 w-4 mr-1" /> 使い方ガイド</div>
                    <div className="mt-1">
                        1. チーム全員分の打撃データが入った **CSVファイル** をアップロードしてください。<br />
                        2. ファイル内の **"Tag"** 列で分類します。（前, 中, 後 / 高, 中, 低 / イン, アウト / 置きT, 手投げ）<br />
                        3. レポート種類を選択してください。<br />
                        (※「打球データ(打撃別)」を選ぶと、「置きT」と「手投げ」の比較レポートが表示されます)
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="border border-dashed border-gray-400 p-4 rounded text-center flex flex-col justify-center items-center bg-gray-50 h-32">
                        {allData.length > 0 ? (
                            <div className="text-green-600 font-bold mb-2 break-all">
                                読み込み完了: {fileName} <br /> ({allData.length} 行)
                            </div>
                        ) : (
                            <div className="text-gray-500 mb-2">ファイルがありません</div>
                        )}
                        <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center shadow">
                            <Upload className="mr-2 h-4 w-4" /> CSVアップロード
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                        </label>
                    </div>

                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">レポート種類</label>
                            <select className="border p-2 rounded w-full" value={reportType} onChange={e => setReportType(e.target.value)}>
                                <option value="point">打球データ (ポイント別)</option>
                                <option value="height">打球データ (高低別)</option>
                                <option value="course">打球データ (コース別)</option>
                                <option value="hand">打球データ (打撃別 - Tee/Hand)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">計測日</label>
                            <input type="date" className="border p-2 rounded w-full" value={reportDate} onChange={e => setReportDate(e.target.value)} />
                        </div>
                        {viewMode === 'individual' && allData.length > 0 && (
                            <div className="col-span-2">
                                <label className="block text-sm font-bold mb-1">選手選択</label>
                                <select className="border p-2 rounded w-full" value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)}>
                                    <option value="">選手を選択してください...</option>
                                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Benchmark Inputs - Restored */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-xs font-bold mb-2">前回データ入力 (置きT)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold mb-1">打球速度</label>
                                <input
                                    type="text"
                                    className="border p-1 rounded w-full text-sm"
                                    value={benchmarks.prevSpeed}
                                    onChange={e => setBenchmarks({ ...benchmarks, prevSpeed: e.target.value })}
                                    placeholder="km/h"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1">打球角度</label>
                                <input
                                    type="text"
                                    className="border p-1 rounded w-full text-sm"
                                    value={benchmarks.prevAngle}
                                    onChange={e => setBenchmarks({ ...benchmarks, prevAngle: e.target.value })}
                                    placeholder="deg."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1">バット速度</label>
                                <input
                                    type="text"
                                    className="border p-1 rounded w-full text-sm"
                                    value={benchmarks.prevBatSpeed}
                                    onChange={e => setBenchmarks({ ...benchmarks, prevBatSpeed: e.target.value })}
                                    placeholder="km/h"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============== INDIVIDUAL REPORT ============== */}
            {viewMode === 'individual' && selectedPlayer && (
                <div id="report-container" className="mx-auto bg-white min-h-screen text-black print:p-[4px] print:min-h-0 print:h-auto print:pb-0 print:overflow-hidden max-w-[210mm] print:max-w-[190mm] print:transform print:scale-[1.6] print:origin-top print:pt-0" style={{ width: '100%', minHeight: 'auto', padding: '10mm' }}>

                    {/* Print Spacer (Adjust this height to lower the title in PDF) */}
                    <div className="hidden print:block print:h-[0px]"></div>

                    {/* Report Type / Page Toggle for Screen */}
                    <div className="flex gap-2 mb-4 justify-end print:hidden">
                        <button
                            className={`px-4 py-2 rounded shadow font-bold ${subViewMode === 'analysis' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                            onClick={() => setSubViewMode('analysis')}
                        >
                            分析チャート (P1)
                        </button>
                        <button
                            className={`px-4 py-2 rounded shadow font-bold ${subViewMode === 'detail' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                            onClick={() => setSubViewMode('detail')}
                        >
                            詳細データ (P2)
                        </button>
                    </div>

                    {/* Header */}
                    <div className="flex justify-between items-end mb-1 print:mb-1 print:mt-2">
                        <div className="flex gap-4 items-end">
                            <h2 className="text-xl font-bold print:text-lg border-b-2 border-black pb-0 whitespace-nowrap">打球データ (ポイント詳細)</h2>
                            <div className="font-bold text-lg print:text-base border-b-2 border-black pb-0 px-4 flex items-end whitespace-nowrap">
                                <span className="mr-2">氏名:</span>
                                <input
                                    type="text"
                                    className="bg-transparent border-none outline-none font-bold text-lg print:text-base w-40 text-left"
                                    value={customPlayerName}
                                    onChange={(e) => setCustomPlayerName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="font-bold text-sm print:text-xs border-b-2 border-black pb-0 px-4 whitespace-nowrap">計測日: {reportDate}</div>
                    </div>

                    {/* Decorative pattern (Stitch Line) */}
                    <div className="w-full h-6 mb-2 flex overflow-hidden items-center justify-center">
                        <img src="/assets/baseball_stitch_line.png" alt="Stitch Line" className="w-full h-full object-cover object-left" />
                    </div>

                    {/* ==================== ANALYSIS VIEW (Chart 1 & 2) ==================== */}
                    {subViewMode === 'analysis' && (
                        <>
                            {/* Top Table */}
                            <div className="mb-0">
                                <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
                                    <thead>
                                        <tr className="bg-gray-400 h-6 text-black font-bold text-xs">
                                            <th rowSpan="2" className="border border-black p-1 w-[15%]"></th>
                                            <th className="border border-black p-0.5">打球速度</th>
                                            <th className="border border-black p-0.5">打球角度</th>
                                            <th className="border border-black p-0.5">バット速度</th>
                                            <th className="border border-black p-0.5">加速度</th>
                                            <th className="border border-black p-0.5">パワー</th>
                                            <th className="border border-black p-0.5">アジャスト率</th>
                                        </tr>
                                        <tr className="bg-gray-400 h-6 text-black font-bold text-[10px]">
                                            <th className="border border-black p-0.5">(km/h)</th>
                                            <th className="border border-black p-0.5">(deg.)</th>
                                            <th className="border border-black p-0.5">(km/h)</th>
                                            <th className="border border-black p-0.5">(G)</th>
                                            <th className="border border-black p-0.5">(kW)</th>
                                            <th className="border border-black p-0.5">(%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportType === 'hand' ? (
                                            <>
                                                {/* Tee */}
                                                <tr className="h-8">
                                                    <td className="border border-black p-1 font-bold bg-white text-center text-xs">置きT</td>
                                                    {(() => {
                                                        const s = getStats({ tags: ['置きT', 'tee', 'hand_tee'] }, selectedPlayer);
                                                        return <>
                                                            <td className="border border-black p-0">
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-full text-center bg-transparent outline-none p-1 border-none text-sm"
                                                                    value={manualAdjustments[`${selectedPlayer}-hand_tee`] !== undefined ? manualAdjustments[`${selectedPlayer}-hand_tee`] : (s ? s.adjust : '')}
                                                                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-hand_tee`]: e.target.value })}
                                                                />
                                                            </td>
                                                        </>;
                                                    })()}
                                                </tr>
                                                {/* Previous */}
                                                <tr className="h-8">
                                                    <td className="border border-black p-1 font-bold bg-white text-center text-[10px] leading-tight">前回<br /><small className="font-normal">(置きT)</small></td>
                                                    <td className="border border-black p-1 font-bold text-sm">{benchmarks.prevSpeed || ''}</td>
                                                    <td className="border border-black p-1 font-bold text-sm">{benchmarks.prevAngle || ''}</td>
                                                    <td className="border border-black p-1 font-bold text-sm">{benchmarks.prevBatSpeed || ''}</td>
                                                    <td className="border border-black p-1 font-bold text-sm">{benchmarks.prevAccel || ''}</td>
                                                    <td className="border border-black p-1 font-bold text-sm">{benchmarks.prevPower || ''}</td>
                                                    <td className="border border-black p-0">
                                                        <input
                                                            type="text"
                                                            className="w-full h-full text-center bg-transparent outline-none p-1 border-none font-bold text-sm"
                                                            value={manualAdjustments[`${selectedPlayer}-prevAdjust`] !== undefined ? manualAdjustments[`${selectedPlayer}-prevAdjust`] : (benchmarks.prevAdjust || '')}
                                                            onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-prevAdjust`]: e.target.value })}
                                                        />
                                                    </td>
                                                </tr>
                                                {/* Hand */}
                                                <tr className="h-8">
                                                    <td className="border border-black p-1 font-bold bg-white text-center text-xs">手投げ</td>
                                                    {(() => {
                                                        const s = getStats({ tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス'] }, selectedPlayer);
                                                        return <>
                                                            <td className="border border-black p-1 font-bold text-sm">{s ? s.ev : ''}</td>
                                                            <td className="border border-black p-1 font-bold text-sm">{s ? s.angle : ''}</td>
                                                            <td className="border border-black p-1 font-bold text-sm">{s ? s.batSpeed : ''}</td>
                                                            <td className="border border-black p-1 text-sm">{s ? s.accel : ''}</td>
                                                            <td className="border border-black p-1 text-sm">{s ? s.power : ''}</td>
                                                            <td className="border border-black p-0">
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-full text-center bg-transparent outline-none p-1 border-none text-sm"
                                                                    value={manualAdjustments[`${selectedPlayer}-hand_live`] !== undefined ? manualAdjustments[`${selectedPlayer}-hand_live`] : (s ? s.adjust : '')}
                                                                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-hand_live`]: e.target.value })}
                                                                />
                                                            </td>
                                                        </>;
                                                    })()}
                                                </tr>
                                            </>
                                        ) : (
                                            CONFIG[reportType].map(cat => {
                                                const stats = getStats(cat, selectedPlayer);
                                                return (
                                                    <tr key={cat.id} className="h-8">
                                                        <td className="border border-black p-1 font-bold bg-white text-center text-sm">{cat.label.split(' ')[0]}</td>
                                                        <td className="border border-black p-1 font-bold text-[10px]">{stats ? stats.ev : ''}</td>
                                                        <td className="border border-black p-1 font-bold text-[10px]">{stats ? stats.angle : ''}</td>
                                                        <td className="border border-black p-1 font-bold text-[10px]">{stats ? stats.batSpeed : ''}</td>
                                                        <td className="border border-black p-1 text-[10px]">{stats ? stats.accel : ''}</td>
                                                        <td className="border border-black p-1 text-[10px]">{stats ? stats.power : ''}</td>
                                                        <td className="border border-black p-0">
                                                            <input
                                                                type="text"
                                                                className="w-full h-full text-center bg-transparent outline-none p-1 border-none text-[10px]"
                                                                value={manualAdjustments[`${selectedPlayer}-${cat.id}`] !== undefined ? manualAdjustments[`${selectedPlayer}-${cat.id}`] : (stats ? stats.adjust : '')}
                                                                onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-${cat.id}`]: e.target.value })}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Charts Container - Fixed Min Width for Print Scaling Stability */}
                            <div className="border border-green-500 p-1 relative flex flex-col justify-start h-auto pb-4 w-[98%] mx-auto mt-8">
                                {/* TOP SECTION */}
                                <div className="grid grid-cols-[1.2fr_1fr] gap-2 h-[300px] mb-2">
                                    {/* Left: Current Data */}
                                    <div className="border border-gray-200 flex flex-col relative w-full h-full">
                                        <h3 className="font-bold text-lg px-2 pt-1 z-10 bg-white absolute top-1 left-0">打球角度と打球速度の関係（全打球）</h3>

                                        <div className="flex flex-grow pt-8 pb-2 px-1">
                                            {/* Silhouette */}
                                            <div className="w-[20%] flex flex-col justify-center items-center relative mr-1">
                                                <div className="w-full h-full relative">
                                                    <img src="/assets/hitter_silhouette_grey.png" className="absolute inset-0 w-full h-full object-contain opacity-50" alt="Hitter Silhouette" />
                                                </div>
                                            </div>

                                            {/* Chart */}
                                            <div className="w-[85%] h-full relative">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 15 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={false} />
                                                        <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e5e7eb" />
                                                        <ReferenceLine y={0} stroke="#9ca3af" />
                                                        <XAxis
                                                            type="number"
                                                            dataKey="ev"
                                                            domain={[20, 200]}
                                                            ticks={[20, 40, 60, 80, 100, 120, 140, 160, 180, 200]}
                                                            tick={{ fontSize: 9 }}
                                                            label={{ value: '打球速度', position: 'insideBottom', offset: 1, fontSize: 11, fontWeight: 'bold' }}
                                                        />
                                                        <YAxis
                                                            type="number"
                                                            dataKey="ang"
                                                            domain={[-60, 60]}
                                                            tickCount={7}
                                                            tick={{ fontSize: 9 }}
                                                            label={{ value: '打球角度', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }, offset: 10, fontSize: 11, fontWeight: 'bold' }}
                                                        />
                                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                        <Scatter name="Hits" data={scatterData}>
                                                            {scatterData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={getTypeColor(entry.ang)} />
                                                            ))}
                                                        </Scatter>
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>


                                    </div>

                                    {/* Right: Previous Data */}
                                    <div className="border-l-2 border-dashed border-[#4ade80] flex flex-col w-full h-full overflow-hidden bg-white outline-none">
                                        <div className="px-2 pt-1 font-bold text-lg">前回</div>
                                        <div className="flex-grow w-full relative pt-2 outline-none">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 0, right: 20, bottom: 0, left: -35 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis
                                                        type="number"
                                                        dataKey="ev"
                                                        domain={[20, 200]}
                                                        tickCount={6}
                                                        tick={{ fontSize: 9 }}
                                                        label={{ value: '打球速度', position: 'insideBottom', offset: 1, fontSize: 10 }}
                                                    />
                                                    <YAxis
                                                        type="number"
                                                        dataKey="ang"
                                                        domain={[-60, 60]}
                                                        tickCount={7}
                                                        tick={{ fontSize: 9 }}
                                                        label={{ value: '打球角度', angle: -90, position: 'insideLeft', offset: 20, fontSize: 10 }}
                                                    />
                                                    <Scatter
                                                        name="PrevHits"
                                                        data={benchmarks.prevSpeed && benchmarks.prevAngle ? [{ ev: parseFloat(benchmarks.prevSpeed), ang: parseFloat(benchmarks.prevAngle) }] : []}
                                                        fill="#9ca3af"
                                                        shape="circle"
                                                    />
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="text-[10px] font-bold text-right pr-1 pb-1">※ラプソードでの分類になります</div>
                                    </div>
                                </div>

                                {/* SEPARATOR */}
                                <hr className="border-t-2 border-[#4ade80] my-0.5" />

                                {/* BOTTOM SECTION */}
                                <div className="grid grid-cols-[1.5fr_1fr] gap-5 items-center mt-6">
                                    {/* Grid / Heatmap */}
                                    <div className="relative pl-0 pb-3 pt-2">
                                        <h3 className="font-bold text-lg absolute top-[-25px] left-1">打球速度とバット速度 ({reportType === 'hand' ? '置きT' : '条件別'})</h3>

                                        <div className="relative h-[220px] w-[96%] border border-black mt-1 ml-2">
                                            {/* Top Gradient - Thicker, No Cap - Aligned to corner */}
                                            <div className="absolute top-[-10px] left-[18%] right-[-10px] h-4 bg-gradient-to-r from-blue-300 via-white to-red-400 z-10"></div>

                                            {/* Right Gradient - Thicker, No Cap - Aligned to corner */}
                                            <div className="absolute top-[-10px] right-[-10px] bottom-[18%] w-4 bg-gradient-to-t from-blue-300 via-white to-red-400 z-10"></div>

                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 10, right: 10, bottom: 15, left: 15 }}>
                                                    {/* 9-Division Background Areas */}
                                                    {/* Low (Blue) */}
                                                    <ReferenceArea x1={100} x2={120} y1={70} y2={90} fill="#dbeafe" fillOpacity={1} />
                                                    <ReferenceArea x1={120} x2={140} y1={70} y2={90} fill="#eff6ff" fillOpacity={1} />
                                                    <ReferenceArea x1={100} x2={120} y1={90} y2={110} fill="#eff6ff" fillOpacity={1} />

                                                    {/* Mid (Neutral/Cream) */}
                                                    <ReferenceArea x1={120} x2={140} y1={90} y2={110} fill="#fff7ed" fillOpacity={1} />
                                                    <ReferenceArea x1={140} x2={160} y1={70} y2={90} fill="#fff" fillOpacity={1} />
                                                    <ReferenceArea x1={100} x2={120} y1={110} y2={130} fill="#fff" fillOpacity={1} />

                                                    {/* High (Red) */}
                                                    <ReferenceArea x1={140} x2={160} y1={90} y2={110} fill="#fee2e2" fillOpacity={1} />
                                                    <ReferenceArea x1={120} x2={140} y1={110} y2={130} fill="#fee2e2" fillOpacity={1} />
                                                    <ReferenceArea x1={140} x2={160} y1={110} y2={130} fill="#fecaca" fillOpacity={1} />

                                                    {/* Consolidate Scatters for Z-Index/Rendering reliability */}
                                                    <Scatter name="Conditions" data={(() => {
                                                        const points = [];

                                                        // Today (Red)
                                                        const d = getScatterData(selectedPlayer);
                                                        const bats = d.map(x => x.bat).filter(b => b > 0);
                                                        if (d.length && bats.length) {
                                                            const maxEv = Math.max(...d.map(x => x.ev));
                                                            const avgBat = bats.reduce((a, b) => a + b, 0) / bats.length;
                                                            points.push({ ev: maxEv, bat: avgBat, fill: '#dc2626' });
                                                        }

                                                        // Previous (Gray)
                                                        if (benchmarks.prevSpeed && benchmarks.prevBatSpeed) {
                                                            points.push({ ev: parseFloat(benchmarks.prevSpeed), bat: parseFloat(benchmarks.prevBatSpeed), fill: '#d1d5db' });
                                                        }

                                                        // Team Average (Yellow)
                                                        const team = getTeamStats();
                                                        if (team.ev && team.bat) {
                                                            points.push({ ev: parseFloat(team.ev), bat: parseFloat(team.bat), fill: '#eab308' });
                                                        }

                                                        // Koshien (Black)
                                                        if (benchmarks.targetSpeed && benchmarks.targetBatSpeed) {
                                                            points.push({ ev: parseFloat(benchmarks.targetSpeed), bat: parseFloat(benchmarks.targetBatSpeed), fill: '#000000' });
                                                        }

                                                        return points;
                                                    })()}>
                                                        {
                                                            // We cannot use Cell inside the data function, we must map over the data prop result?
                                                            // Actually, in Recharts, if data comes from the prop, we can map over it in children to create Cells.
                                                            // But we can't easily access the "result of the IIFE" in the render method unless we store it.
                                                            // Instead, we can rely on the `fill` property in the data object if we don't use Cell?
                                                            // No, Scatter dots don't auto-take fill from data unless we use Cell.
                                                            // Let's use a standard map inside the Scatter children.
                                                            // But we need the data to be deterministic.
                                                            // I will define the data outside or use the IIFE and map over it assuming index stability? 
                                                            // Better approach: Use Cell's `fill` based on the entry, but we need to access `entry`?
                                                            // Recharts Scatter `Cell` mapping is `data.map((entry, index) => <Cell fill={entry.fill} />)`
                                                        }
                                                        {(() => {
                                                            // Re-calculate data to map Cells (Inefficient but robust for this context)
                                                            // Or just use the same logic.
                                                            const points = [];
                                                            const d = scatterData;
                                                            const bats = d.map(x => x.bat).filter(b => b > 0);
                                                            if (d.length && bats.length) {
                                                                points.push({ fill: 'red' });
                                                            }
                                                            if (benchmarks.prevSpeed && benchmarks.prevBatSpeed) points.push({ fill: 'gray' });
                                                            const team = teamStats;
                                                            if (team.ev && team.bat) points.push({ fill: '#eab308' });
                                                            if (benchmarks.targetSpeed && benchmarks.targetBatSpeed) points.push({ fill: 'black' });

                                                            return points.map((p, i) => <Cell key={i} fill={p.fill} stroke="black" strokeWidth={1} r={12} />);
                                                        })()}
                                                    </Scatter>


                                                    {/* 9-Section Grid Lines (3x3) - Rendered after Scatter to ensure visibility */}
                                                    <ReferenceLine x={120} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine x={140} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={90} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={90} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={110} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={90} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={110} stroke="black" strokeWidth={2} />

                                                    {/* Slash Line (Bottom Right Corner) */}
                                                    <ReferenceLine segment={[{ x: 140, y: 70 }, { x: 160, y: 90 }]} stroke="black" strokeWidth={1} />

                                                    {/* Labels in diagonal cells */}
                                                    <ReferenceDot x={110} y={80} r={0} label={{ value: "低", position: 'center', fill: 'black', fontSize: 16, fontWeight: 'bold' }} />
                                                    <ReferenceDot x={130} y={100} r={0} label={{ value: "中", position: 'center', fill: 'black', fontSize: 16, fontWeight: 'bold' }} />
                                                    <ReferenceDot x={150} y={120} r={0} label={{ value: "高", position: 'center', fill: 'black', fontSize: 16, fontWeight: 'bold' }} />

                                                    <XAxis type="number" dataKey="ev" domain={[100, 160]} ticks={[100, 120, 140, 160]} tick={{ fontSize: 10, fontWeight: 'bold' }} allowDataOverflow={true} />
                                                    <YAxis type="number" dataKey="bat" domain={[70, 130]} ticks={[70, 90, 110, 130]} tick={{ fontSize: 10, fontWeight: 'bold' }} allowDataOverflow={true} />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                </ScatterChart>
                                            </ResponsiveContainer>

                                            {/* Axis Titles - positioned inside chart margins */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 font-bold text-xs -rotate-90 origin-center">バット速度</div>
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-bold text-xs">打球速度</div>
                                        </div>
                                    </div>

                                    {/* Comparisons Table */}
                                    <div className="flex flex-col justify-center items-end pr-4">
                                        <table className="w-[90%] border-collapse border border-black text-center font-bold bg-white text-sm">
                                            <thead>
                                                <tr className="bg-gray-400">
                                                    <th className="border border-black p-1 w-[30%] text-xs">条件</th>
                                                    <th className="border border-black p-1">
                                                        <span className="text-xs">打球速度</span>
                                                        <hr className="border-t border-black my-0.5" />
                                                        (km/h)
                                                    </th>
                                                    <th className="border border-black p-1">
                                                        <span className="text-xs">バット速度</span>
                                                        <hr className="border-t border-black my-0.5" />
                                                        (km/h)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="h-12"><td className="border border-black bg-red-600 text-white text-lg">今回</td><td className="border border-black text-xl">{(() => { const d = scatterData; return d.length ? Math.max(...d.map(x => x.ev)).toFixed(1) : '' })()}</td><td className="border border-black text-xl">{(() => { const d = scatterData; const bats = d.map(x => x.bat).filter(b => b > 0); return bats.length ? (bats.reduce((a, b) => a + b, 0) / bats.length).toFixed(1) : '' })()}</td></tr>
                                                <tr className="h-12"><td className="border border-black bg-gray-300 text-lg">前回</td><td className="border border-black text-xl">{benchmarks.prevSpeed}</td><td className="border border-black text-xl">{benchmarks.prevBatSpeed}</td></tr>
                                                <tr className="h-12"><td className="border border-black bg-[#eab308] text-sm whitespace-nowrap">チーム平均</td><td className="border border-black text-xl">{teamStats.ev}</td><td className="border border-black text-xl">{teamStats.bat}</td></tr>
                                                <tr className="h-12"><td className="border border-black bg-black text-white text-lg">甲子園</td><td className="border border-black text-xl">{benchmarks.targetSpeed}</td><td className="border border-black text-xl">{benchmarks.targetBatSpeed}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ==================== DETAIL VIEW (4-BLOCK GRID) ==================== */}
                    {
                        subViewMode === 'detail' && (
                            <>
                                {/* Top Table (Compact) */}
                                <div className="mb-8">
                                    <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
                                        <thead>
                                            <tr className="bg-gray-400 h-10 print:h-8">
                                                <th className="border border-black p-1 w-[20%] bg-gray-400" rowSpan="2"></th>
                                                <th className="border border-black p-1">打球速度</th>
                                                <th className="border border-black p-1">打球角度</th>
                                                <th className="border border-black p-1">バット速度</th>
                                                <th className="border border-black p-1">加速度</th>
                                                <th className="border border-black p-1">パワー</th>
                                                <th className="border border-black p-1">アジャスト率</th>
                                            </tr>
                                            <tr className="bg-gray-400 h-6">
                                                <th className="border border-black p-0 text-xs">(km/h)</th>
                                                <th className="border border-black p-0 text-xs">(deg.)</th>
                                                <th className="border border-black p-0 text-xs">(km/h)</th>
                                                <th className="border border-black p-0 text-xs">(G)</th>
                                                <th className="border border-black p-0 text-xs">(kW)</th>
                                                <th className="border border-black p-0 text-xs">(%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reportType === 'hand' ? (
                                                <>
                                                    {/* Tee */}
                                                    <tr className="h-12 font-bold">
                                                        <td className="border border-black p-1 bg-white text-center">置きT</td>
                                                        {(() => {
                                                            const s = getStats({ tags: ['置きT', 'tee', 'hand_tee'] }, selectedPlayer);
                                                            return <>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.ev : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.angle : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.batSpeed : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.accel : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.power : ''}</td>
                                                                <td className="border border-black p-0">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full h-full text-center bg-transparent outline-none p-1 border-none font-bold text-sm"
                                                                        value={manualAdjustments[`${selectedPlayer}-hand_tee`] !== undefined ? manualAdjustments[`${selectedPlayer}-hand_tee`] : (s ? s.adjust : '')}
                                                                        onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-hand_tee`]: e.target.value })}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </td>
                                                            </>;
                                                        })()}
                                                    </tr>
                                                    {/* Previous */}
                                                    <tr className="h-12 font-bold">
                                                        <td className="border border-black p-1 bg-white text-center">前回<span className="text-xs font-normal ml-1">(置きT)</span></td>
                                                        <td className="border border-black p-1 text-center text-sm">{benchmarks.prevSpeed || ''}</td>
                                                        <td className="border border-black p-1 text-center text-sm"></td>
                                                        <td className="border border-black p-1 text-center text-sm">{benchmarks.prevBatSpeed || ''}</td>
                                                        <td className="border border-black p-1 text-center text-sm"></td>
                                                        <td className="border border-black p-1 text-center text-sm"></td>
                                                        <td className="border border-black p-1 text-center text-sm"></td>
                                                    </tr>
                                                    {/* Hand */}
                                                    <tr className="h-12 font-bold">
                                                        <td className="border border-black p-1 bg-white text-center">手投げ</td>
                                                        {(() => {
                                                            const s = getStats({ tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス'] }, selectedPlayer);
                                                            return <>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.ev : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.angle : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.batSpeed : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.accel : ''}</td>
                                                                <td className="border border-black p-1 text-center text-sm">{s ? s.power : ''}</td>
                                                                <td className="border border-black p-0">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full h-full text-center bg-transparent outline-none p-1 border-none font-bold text-sm"
                                                                        value={manualAdjustments[`${selectedPlayer}-hand_live`] !== undefined ? manualAdjustments[`${selectedPlayer}-hand_live`] : (s ? s.adjust : '')}
                                                                        onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-hand_live`]: e.target.value })}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    />
                                                                </td>
                                                            </>;
                                                        })()}
                                                    </tr>
                                                </>
                                            ) : (
                                                CONFIG[reportType].map(cat => {
                                                    const s = getStats(cat, selectedPlayer);
                                                    return (
                                                        <tr key={cat.id} className="h-8 font-bold">
                                                            <td className="border border-black p-1 bg-white text-center">{cat.label.split(' ')[0]}</td>
                                                            <td className="border border-black p-1 text-center text-sm">{s ? s.ev : ''}</td>
                                                            <td className="border border-black p-1 text-center text-sm">{s ? s.angle : ''}</td>
                                                            <td className="border border-black p-1 text-center text-sm">{s ? s.batSpeed : ''}</td>
                                                            <td className="border border-black p-1 text-center text-sm">{s ? s.accel : ''}</td>
                                                            <td className="border border-black p-1 text-center text-sm font-bold">{s ? s.power : ''}</td>
                                                            <td className="border border-black p-0">
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-full text-center bg-transparent outline-none p-1 border-none font-bold text-sm"
                                                                    value={manualAdjustments[`${selectedPlayer}-${cat.id}`] !== undefined ? manualAdjustments[`${selectedPlayer}-${cat.id}`] : (s ? s.adjust : '')}
                                                                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${selectedPlayer}-${cat.id}`]: e.target.value })}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 4-Block Grid Detail Section */}
                                <div className="border border-green-600 p-2 relative h-[690px] -mt-4">
                                    <h3 className="font-bold text-4xl mb-4 mt-2 ml-4">
                                        {reportType === 'point' ? 'ポイント別打球速度データ' :
                                            reportType === 'height' ? '高低別打球速度データ' :
                                                reportType === 'course' ? 'コース別打球データ' :
                                                    '打球データ一覧'}
                                    </h3>
                                    <div className="text-center text-sm font-bold mb-4">
                                        右打ち、左打ち、共通の表記になります
                                    </div>

                                    <div className="flex">
                                        {/* Left Side: 4 Blocks Grid OR 3x3 Zone Grid (for Course) */}
                                        {reportType === 'course' ? (
                                            <div className="w-full flex gap-4">
                                                {/* 3x3 Grids x 4 */}
                                                <div className="w-[75%] grid grid-cols-2 gap-x-4 gap-y-8">
                                                    {(() => {
                                                        // Helper to get stats for combined tags
                                                        const getMultiTagStats = (tags1, tags2) => {
                                                            const rows = allData.filter(row => {
                                                                const pName = row['Player Name'] || row.PlayerName;
                                                                if (pName !== selectedPlayer) return false;
                                                                const rowTag = (row['Tag'] || row['Note'] || row['Notes'] || row['Category'] || '').toString().toLowerCase().trim();
                                                                const match1 = tags1.some(t => rowTag.includes(t.toLowerCase()));
                                                                const match2 = tags2.some(t => rowTag.includes(t.toLowerCase()));
                                                                return match1 && match2;
                                                            });
                                                            if (rows.length === 0) return null;
                                                            const avg = (key) => {
                                                                const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
                                                                if (vals.length === 0) return '';
                                                                return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
                                                            };
                                                            // Attempt to find Adjust/Efficiency
                                                            const adjustVal = rows.map(r => r['Adjust'] || r['Efficiency'] || r['AdjustRate']).filter(v => typeof v === 'number');
                                                            const adjustAvg = adjustVal.length ? (adjustVal.reduce((a, b) => a + b, 0) / adjustVal.length).toFixed(1) : '';

                                                            return {
                                                                ev: avg('ExitVelocity'),
                                                                batSpeed: avg('BatSpeed'),
                                                                angle: avg('LaunchAngle'),
                                                                adjust: adjustAvg
                                                            };
                                                        };

                                                        const courseOrder = [
                                                            CONFIG.course.find(c => c.id === 'course_out'),
                                                            CONFIG.course.find(c => c.id === 'course_mid'),
                                                            CONFIG.course.find(c => c.id === 'course_in')
                                                        ];
                                                        const heightOrder = CONFIG.height; // High, Mid, Low

                                                        const renderGrid = (title, dataKey) => (
                                                            <div className="w-full">
                                                                <h4 className="text-center font-bold text-2xl text-red-600 mb-2">{title}</h4>
                                                                <div className="grid grid-cols-3 border border-black">
                                                                    {heightOrder.map((hCat) => (
                                                                        courseOrder.map((cCat) => {
                                                                            const stats = getMultiTagStats(cCat.tags, hCat.tags);
                                                                            const val = stats ? stats[dataKey] : '';
                                                                            // Show label only for Top (High) and Bottom (Low) rows, hide for Mid row
                                                                            const showLabel = hCat.id !== 'height_mid';

                                                                            return (
                                                                                <div key={`${hCat.id}-${cCat.id}`} className="aspect-square border border-black relative flex items-center justify-center bg-white">
                                                                                    {/* Watermark Label */}
                                                                                    {showLabel && (
                                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                                            <span className="text-gray-400 font-bold text-xl">{cCat.shortLabel}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Value */}
                                                                                    {dataKey === 'adjust' ? (
                                                                                        (() => {
                                                                                            const cellKey = `${selectedPlayer}-adjust-grid-${hCat.id}-${cCat.id}`;
                                                                                            const displayVal = manualAdjustments[cellKey] !== undefined ? manualAdjustments[cellKey] : val;
                                                                                            return (
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={displayVal}
                                                                                                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [cellKey]: e.target.value })}
                                                                                                    className="w-full h-full text-center bg-transparent border-none outline-none text-2xl font-bold relative z-10 p-0"
                                                                                                />
                                                                                            );
                                                                                        })()
                                                                                    ) : (
                                                                                        <span className="text-2xl font-bold relative z-10">{val}</span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );

                                                        return (
                                                            <>
                                                                {renderGrid('打球速度(km/h)', 'ev')}
                                                                {renderGrid('バット速度(km/h)', 'batSpeed')}
                                                                {renderGrid('打球角度(deg.)', 'angle')}
                                                                {renderGrid('アジャスト率(%)', 'adjust')}
                                                            </>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Right Side: Silhouette */}
                                                <div className="w-[25%] flex items-center justify-center relative overflow-hidden">
                                                    <img src="/assets/hitter_silhouette_blue.png" alt="Silhouette" className="object-contain max-h-[600px] opacity-50 scale-[1.5] origin-center translate-y-10" />
                                                </div>
                                            </div>
                                        ) : (<>
                                            <div className="w-[63%] grid grid-cols-2 gap-x-2 gap-y-10 scale-[1.05] origin-top-left">
                                                {[
                                                    { label: '打球速度(km/h)', color: 'text-red-600', key: 'ev', target: benchmarks.prevSpeed },
                                                    { label: 'バット速度(km/h)', color: 'text-red-600', key: 'batSpeed', target: benchmarks.prevBatSpeed },
                                                    { label: '打球角度(°)', color: 'text-red-600', key: 'angle', target: null },
                                                    { label: 'アジャスト率(%)', color: 'text-red-600', key: 'adjust', target: null }
                                                ].map((block) => (
                                                    <div key={block.label} className="flex flex-col">
                                                        <h4 className={`text-center font-bold h-14 flex items-center justify-center p-1 ${block.color} ${block.longLabel ? 'text-xs leading-tight' : 'text-lg'}`}>{block.longLabel || block.label}</h4>
                                                        <table className="w-full border-collapse border border-black text-center bg-white table-fixed h-full">
                                                            <tbody>
                                                                {reportType === 'hand' ? (
                                                                    <>
                                                                        <tr className="h-14">
                                                                            <td className="border border-black bg-white font-bold text-gray-400 text-xl w-1/3 align-middle text-center">置きT</td>
                                                                            <td className="border border-black text-2xl font-bold w-1/3 align-middle">
                                                                                {(() => {
                                                                                    const s = getStats({ tags: ['置きT', 'tee', 'hand_tee'] }, selectedPlayer);
                                                                                    return s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-3xl leading-none block">&nbsp;</span>;
                                                                                })()}
                                                                            </td>
                                                                            <td className="border border-black bg-white w-1/3 text-gray-400 font-bold text-xl align-middle select-none text-center">置きT</td>
                                                                        </tr>
                                                                        <tr className="h-14">
                                                                            <td className="border border-black bg-white font-bold text-gray-400 text-xl w-1/3 align-middle text-center">前回<span className="text-xs font-normal block">(置きT)</span></td>
                                                                            <td className="border border-black text-2xl font-bold text-gray-400 w-1/3 align-middle">{block.target || <span className="text-gray-300 text-3xl leading-none block">&nbsp;</span>}</td>
                                                                            <td className="border border-black bg-white text-gray-400 font-bold text-xl w-1/3 align-middle select-none text-center">前回<span className="text-xs font-normal block">(置きT)</span></td>
                                                                        </tr>
                                                                        <tr className="h-14">
                                                                            <td className="border border-black bg-white font-bold text-gray-400 text-xl w-1/3 align-middle text-center">手投げ</td>
                                                                            <td className="border border-black text-2xl font-bold w-1/3 align-middle">
                                                                                {(() => {
                                                                                    const s = getStats({ tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス'] }, selectedPlayer);
                                                                                    return s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-3xl leading-none block">&nbsp;</span>;
                                                                                })()}
                                                                            </td>
                                                                            <td className="border border-black bg-white text-gray-400 font-bold text-xl w-1/3 align-middle select-none text-center">手投げ</td>
                                                                        </tr>
                                                                    </>
                                                                ) : (
                                                                    CONFIG[reportType].map((cat, i) => {
                                                                        const s = getStats(cat, selectedPlayer);
                                                                        return (
                                                                            <tr key={cat.id} className="h-14">
                                                                                <td className="border border-black bg-white font-bold text-gray-400 text-xl w-1/3 p-0 whitespace-nowrap align-middle text-center">
                                                                                    {cat.shortLabel}
                                                                                </td>
                                                                                <td className="border border-black text-xl font-bold w-1/3 p-1 align-middle text-center">
                                                                                    {block.key === 'adjust' ? (
                                                                                        manualAdjustments[`${selectedPlayer}-${cat.id}`] !== undefined && manualAdjustments[`${selectedPlayer}-${cat.id}`] !== ''
                                                                                            ? manualAdjustments[`${selectedPlayer}-${cat.id}`]
                                                                                            : (s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-xl leading-none block">&nbsp;</span>)
                                                                                    ) : (
                                                                                        s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-xl leading-none block">&nbsp;</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="border border-black bg-white text-gray-400 font-bold text-xl w-1/3 p-0 select-none whitespace-nowrap align-middle text-center">
                                                                                    {cat.shortLabel}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Right Side: Silhouette Scled 2x - Removed Clip Path */}
                                            <div className="w-[37%] flex items-center justify-end relative pl-4 pr-12 overflow-hidden">
                                                <div>
                                                    <img src="/assets/hitter_silhouette_blue.png" alt="Silhouette" className="object-contain max-h-[600px] opacity-50 scale-[1.6] origin-center" />
                                                </div>
                                            </div>
                                        </>)}
                                    </div>
                                </div>
                            </>
                        )
                    }

                </div >
            )
            }

            {/* ============== TEAM REPORT ============== */}
            {
                viewMode === 'team' && (() => {
                    const renderTeamReportPage = (pageCategories, pageIndex, totalPages) => {
                        const colPlayerWidth = 140;
                        const showExtraCols = true; // User requested to return to 6 columns
                        const colDataWidth = 75;
                        const renderCell = (val) => {
                            if (val === '/') {
                                return (
                                    <td className="border border-black p-0 relative overflow-hidden">
                                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                            <line x1="100%" y1="0%" x2="0%" y2="100%" stroke="black" strokeWidth="1.5" />
                                        </svg>
                                    </td>
                                );
                            }
                            return <td className="border border-black p-1 text-[1.3em]">{val}</td>;
                        };

                        const totalTableWidth = colPlayerWidth + (pageCategories.length * (showExtraCols ? 6 : 4) * colDataWidth);

                        return (
                            <div key={pageIndex} id="report-container" className={`bg-white mx-auto text-black leading-tight border border-gray-200 shadow relative p-8 print:px-[2mm] print:pt-[75px] print:pb-[20px] flex flex-col items-center ${pageIndex > 0 ? 'print:break-before-page' : ''}`} style={{ width: '297mm', minHeight: '210mm', writingMode: 'horizontal-tb', marginBottom: '20px' }}>
                                {/* Print Spacer (Adjust this height to lower the title in PDF) */}
                                <div className="mb-2 w-full text-left">
                                    <h2 className="text-3xl font-bold border-b border-black inline-block pb-1">チーム：打球データ一覧 {totalPages > 1 ? `(${pageIndex + 1}/${totalPages})` : ''}</h2>
                                </div>
                                <div className="w-full h-6 mb-2 flex overflow-hidden items-center justify-center">
                                    <img src="/assets/baseball_stitch_line.png" alt="Stitch Line" className="w-full h-full object-cover object-left" />
                                </div>
                                <div className="text-2xl font-bold mt-1 mb-16 w-full text-left">
                                    {reportDate.split('-')[0]}年{reportDate.split('-')[1].replace(/^0/, '')}月{reportDate.split('-')[2].replace(/^0/, '')}日
                                </div>

                                <div className="w-full flex justify-center p-[1px]">
                                    <table className="border-collapse border border-black text-[10px] text-center table-fixed bg-white mx-auto" style={{ width: `${totalTableWidth}px` }}> {/* Removed margin:0 auto in favor of flex parent centering */}
                                        <colgroup>
                                            <col style={{ width: `${colPlayerWidth}px` }} />
                                            {Array.from({ length: pageCategories.length * (showExtraCols ? 6 : 4) }).map((_, i) => (
                                                <col key={i} style={{ width: `${colDataWidth}px` }} />
                                            ))}
                                        </colgroup>
                                        <thead>
                                            {/* 1st Row: Category Headers */}
                                            <tr className="bg-white">
                                                <th className="border border-black p-2 align-middle text-base font-bold text-center" rowSpan="3">選手名</th>
                                                {pageCategories.map(cat => (
                                                    <th key={cat.id} className="border border-black p-1 text-sm font-bold bg-white h-8" colSpan={showExtraCols ? 6 : 4}>{cat.label.split(' ')[0]}</th>
                                                ))}
                                            </tr>
                                            {/* 2nd Row: Metric Names */}
                                            <tr className="bg-white font-bold text-white h-8">
                                                {pageCategories.map(cat => (
                                                    <React.Fragment key={cat.id}>
                                                        <th className="border border-black p-1 bg-[#ff0000] text-[10px] whitespace-nowrap">打球速度</th>
                                                        <th className="border border-black p-1 bg-[#ff0000] text-[10px] whitespace-nowrap">打球角度</th>
                                                        <th className="border border-black p-1 bg-[#ff0000] text-[10px] whitespace-nowrap">飛距離</th>
                                                        <th className="border border-black p-1 bg-[#00ccff] text-[10px] whitespace-nowrap">バット速度</th>
                                                        {showExtraCols && (
                                                            <>
                                                                <th className="border border-black p-1 bg-[#00ccff] text-[10px] whitespace-nowrap">パワー</th>
                                                                <th className="border border-black p-1 bg-[#00ccff] text-[10px] whitespace-nowrap">アジャスト率</th>
                                                            </>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                            {/* 3rd Row: Units */}
                                            <tr className="bg-white font-bold text-black h-6">
                                                {pageCategories.map(cat => (
                                                    <React.Fragment key={cat.id}>
                                                        <th className="border border-black p-0 text-[9px] whitespace-nowrap">(km/h)</th>
                                                        <th className="border border-black p-0 text-[9px] whitespace-nowrap">(deg)</th>
                                                        <th className="border border-black p-0 text-[9px] whitespace-nowrap">(m)</th>
                                                        <th className="border border-black p-0 text-[9px] whitespace-nowrap">(km/h)</th>
                                                        {showExtraCols && (
                                                            <>
                                                                <th className="border border-black p-0 text-[9px] whitespace-nowrap">(kW)</th>
                                                                <th className="border border-black p-0 text-[9px] whitespace-nowrap">(%)</th>
                                                            </>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* PLAYER ROWS */}
                                            {players.map((row) => {
                                                const pName = row; // row is the player name string in players array
                                                return (
                                                    <tr key={pName} className={`bg-white border text-xs h-6 font-bold border-b-[1.5px] border-b-black ${getPlayerGradeInfo(pName).color}`}>
                                                        <td className="border border-black p-1 font-bold bg-white align-middle text-[1.4em] overflow-hidden whitespace-nowrap text-ellipsis px-1">{pName}</td>
                                                        {pageCategories.map(cat => {
                                                            const stats = getStats(cat, pName);
                                                            return (
                                                                <React.Fragment key={cat.id}>
                                                                    <td className="border border-black p-1 text-[1.3em] text-black">{stats ? stats.ev : '-'}</td>
                                                                    <td className="border border-black p-1 text-[1.3em] text-black">{stats ? stats.angle : '-'}</td>
                                                                    <td className="border border-black p-1 text-[1.3em] text-black">{stats ? stats.dist : '-'}</td>
                                                                    <td className="border border-black p-1 text-[1.3em] text-black">{stats ? stats.batSpeed : '-'}</td>
                                                                    {showExtraCols && (
                                                                        <>
                                                                            <td className="border border-black p-1 text-[1.3em] text-black">{stats ? stats.power : '-'}</td>
                                                                            <td className="border border-black p-0 text-[1.3em] text-black">
                                                                                <input
                                                                                    type="text"
                                                                                    className="w-full h-full text-center bg-transparent outline-none p-0 appearance-none border-none"
                                                                                    value={manualAdjustments[`${pName}-${cat.id}`] !== undefined ? manualAdjustments[`${pName}-${cat.id}`] : (stats ? stats.adjust : '')}
                                                                                    onChange={(e) => setManualAdjustments({ ...manualAdjustments, [`${pName}-${cat.id}`]: e.target.value })}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                />
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}

                                            {/* SPACER ROW */}
                                            <tr className="h-4 border-none">
                                                <td colSpan={1 + (pageCategories.length * 6)} className="border-none"></td>
                                            </tr>

                                            {/* 2nd Year (Red) */}
                                            <tr className="bg-white border text-xs h-6 font-bold text-red-600">
                                                <td className="border border-black p-1 text-center font-bold bg-white align-middle text-[1.3em]">2年生平均</td>
                                                {pageCategories.map(cat => (
                                                    <React.Fragment key={cat.id}>
                                                        {renderCell(staticTableStats?.grade2[cat.id]?.ev != null ? staticTableStats.grade2[cat.id].ev.toFixed(1) : '-')}
                                                        {renderCell(staticTableStats?.grade2[cat.id]?.ang != null ? staticTableStats.grade2[cat.id].ang.toFixed(1) : '-')}
                                                        {renderCell(staticTableStats?.grade2[cat.id]?.dist != null ? staticTableStats.grade2[cat.id].dist.toFixed(1) : '-')}
                                                        {renderCell(staticTableStats?.grade2[cat.id]?.bat != null ? staticTableStats.grade2[cat.id].bat.toFixed(1) : '-')}
                                                        {showExtraCols && (
                                                            <>
                                                                {renderCell(staticTableStats?.grade2[cat.id]?.power != null ? staticTableStats.grade2[cat.id].power.toFixed(1) : '-')}
                                                                {renderCell(getGradeAverage(cat, 'Adjust', '2'))}
                                                            </>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                            {/* 1st Year (Black) */}
                                            < tr className="bg-white border text-xs h-6 font-bold text-black" >
                                                <td className="border border-black p-1 text-center font-bold bg-white align-middle text-[1.3em]">1年生平均</td>
                                                {
                                                    pageCategories.map(cat => (
                                                        <React.Fragment key={cat.id}>
                                                            {renderCell(staticTableStats?.grade1[cat.id]?.ev != null ? staticTableStats.grade1[cat.id].ev.toFixed(1) : '-')}
                                                            {renderCell(staticTableStats?.grade1[cat.id]?.ang != null ? staticTableStats.grade1[cat.id].ang.toFixed(1) : '-')}
                                                            {renderCell(staticTableStats?.grade1[cat.id]?.dist != null ? staticTableStats.grade1[cat.id].dist.toFixed(1) : '-')}
                                                            {renderCell(staticTableStats?.grade1[cat.id]?.bat != null ? staticTableStats.grade1[cat.id].bat.toFixed(1) : '-')}
                                                            {showExtraCols && (
                                                                <>
                                                                    {renderCell(staticTableStats?.grade1[cat.id]?.power != null ? staticTableStats.grade1[cat.id].power.toFixed(1) : '-')}
                                                                    {renderCell(getGradeAverage(cat, 'Adjust', '1'))}
                                                                </>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                            </tr>
                                            {/* MS3 (Blue) - Conditional Render */}
                                            {hasMS3 && (
                                                <tr className="bg-white border text-xs h-6 font-bold text-[#3b82f6]">
                                                    <td className="border border-black p-1 text-center font-bold bg-white align-middle text-[1.3em]">MS3平均</td>
                                                    {pageCategories.map(cat => (
                                                        <React.Fragment key={cat.id}>
                                                            {renderCell(staticTableStats?.ms3[cat.id]?.ev != null ? staticTableStats.ms3[cat.id].ev.toFixed(1) : '-')}
                                                            {renderCell(staticTableStats?.ms3[cat.id]?.ang != null ? staticTableStats.ms3[cat.id].ang.toFixed(1) : '-')}
                                                            {renderCell(staticTableStats?.ms3[cat.id]?.dist != null ? staticTableStats.ms3[cat.id].dist.toFixed(1) : '-')}
                                                            {renderCell(staticTableStats?.ms3[cat.id]?.bat != null ? staticTableStats.ms3[cat.id].bat.toFixed(1) : '-')}
                                                            {renderCell('-')}
                                                            {renderCell('-')}
                                                        </React.Fragment>
                                                    ))}
                                                </tr>
                                            )}
                                            {/* 3rd Year (Blue) - Always Show if exists */}
                                            {
                                                players.some(p => getPlayerGradeInfo(p).group === '3') && (
                                                    <tr className="bg-white border text-xs h-6 font-bold text-[#3b82f6]">
                                                        <td className="border border-black p-1 text-center font-bold bg-white align-middle text-[1.3em]">3年生平均</td>
                                                        {pageCategories.map(cat => (
                                                            <React.Fragment key={cat.id}>
                                                                {renderCell(staticTableStats?.grade3[cat.id]?.ev != null ? staticTableStats.grade3[cat.id].ev.toFixed(1) : '-')}
                                                                {renderCell(staticTableStats?.grade3[cat.id]?.ang != null ? staticTableStats.grade3[cat.id].ang.toFixed(1) : '-')}
                                                                {renderCell(staticTableStats?.grade3[cat.id]?.dist != null ? staticTableStats.grade3[cat.id].dist.toFixed(1) : '-')}
                                                                {renderCell(staticTableStats?.grade3[cat.id]?.bat != null ? staticTableStats.grade3[cat.id].bat.toFixed(1) : '-')}
                                                                {showExtraCols && (
                                                                    <>
                                                                        {renderCell(staticTableStats?.grade3[cat.id]?.power != null ? staticTableStats.grade3[cat.id].power.toFixed(1) : '-')}
                                                                        {renderCell(getGradeAverage(cat, 'Adjust', '3'))}
                                                                    </>
                                                                )}
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                )}
                                            {/* Team Average Row (Black) */}
                                            <tr className="bg-white border text-xs h-6 font-bold text-black">
                                                <td className="border border-black p-1 text-center font-bold bg-white align-middle text-[1.3em] whitespace-nowrap">チーム平均</td>
                                                {pageCategories.map(cat => {
                                                    const avgEV = staticTableStats?.team[cat.id]?.ev;
                                                    const avgAng = staticTableStats?.team[cat.id]?.ang;
                                                    const avgDist = staticTableStats?.team[cat.id]?.dist;
                                                    const avgBat = staticTableStats?.team[cat.id]?.bat;
                                                    const avgAdj = getAdjustAverage(cat.id, cat); // Keep dynamic
                                                    const avgPower = staticTableStats?.team[cat.id]?.power;

                                                    return (
                                                        <React.Fragment key={cat.id}>
                                                            <td className="border border-black p-1 text-[1.3em]">{avgEV != null ? avgEV.toFixed(1) : '-'}</td>
                                                            <td className="border border-black p-1 text-[1.3em]">{avgAng != null ? avgAng.toFixed(1) : '-'}</td>
                                                            <td className="border border-black p-1 text-[1.3em]">{avgDist != null ? avgDist.toFixed(1) : '-'}</td>
                                                            <td className="border border-black p-1 text-[1.3em]">{avgBat != null ? avgBat.toFixed(1) : '-'}</td>
                                                            {showExtraCols && (
                                                                <>
                                                                    <td className="border border-black p-1 text-[1.3em]">{avgPower != null ? avgPower.toFixed(1) : '-'}</td>
                                                                    <td className="border border-black p-1 text-[1.3em]">{avgAdj !== null ? avgAdj.toFixed(1) : '-'}</td>
                                                                </>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    };

                    const categories = CONFIG[reportType];
                    if (categories.length === 3) {
                        return (
                            <>
                                <style>{`
                                    @media print {
                                        @page {
                                            size: A4 landscape;
                                            margin: 0;
                                        }
                                        body {
                                            -webkit-print-color-adjust: exact;
                                            print-color-adjust: exact;
                                        }
                                    }
                                `}</style>
                                {renderTeamReportPage(categories.slice(0, 2), 0, 2)}
                                {renderTeamReportPage(categories.slice(2, 3), 1, 2)}
                            </>
                        );
                    }
                    return (
                        <>
                            <style>{`
                                    @media print {
                                        @page {
                                            size: A4 landscape;
                                            margin: 0;
                                        }
                                        body {
                                            -webkit-print-color-adjust: exact;
                                            print-color-adjust: exact;
                                        }
                                    }
                                `}</style>
                            {renderTeamReportPage(categories, 0, 1)}
                        </>
                    );
                })()
            }
        </div >
    );
};

export default HitterFeedback;

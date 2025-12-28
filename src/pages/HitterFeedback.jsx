import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Printer, Info } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ReferenceArea } from 'recharts';

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

    // Unique Grades for Team Report
    const uniqueGrades = useMemo(() => {
        const s = new Set(allData.map(d => (d['学年'] || d['Grade'] || d['Year'] || '').toString()).filter(Boolean));
        // Sort mechanism: numeric-ish
        return Array.from(s).sort();
    }, [allData]);

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
                const data = results.data;
                if (!data[0] || (!data[0]['Player Name'] && !data[0].PlayerName)) {
                    alert('Invalid CSV. Missing "Player Name" column.');
                    setLoading(false);
                    return;
                }
                setAllData(data);
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

        return {
            ev: avg('ExitVelocity'),
            angle: avg('LaunchAngle'),
            dist: avg('Distance'),
            spin: avg('SpinRate'),
            batSpeed: avg('BatSpeed') || '',
            accel: '',
            power: '',
            adjust: ''
        };
    };

    const getAverage = (tagConfig, key) => {
        const rows = getFilteredRows(tagConfig, null); // null = all players
        if (rows.length === 0) return 0;
        const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
        if (vals.length === 0) return 0;
        return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    };

    const getGradeAverage = (tagConfig, key, gradeRaw) => {
        // Filter by Grade
        const rows = getFilteredRows(tagConfig, null).filter(r => (r['学年'] || r['Grade'] || r['Year'] || '').toString() === gradeRaw);
        if (rows.length === 0) return '';
        const vals = rows.map(r => r[key] || r[key.replace(/\s/g, '')]).filter(v => typeof v === 'number');
        if (vals.length === 0) return '';
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
        <div className="p-6 max-w-[297mm] mx-auto bg-gray-50 min-h-screen text-black font-sans">

            {/* Force Print Styles & Reset */}
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    html, body { 
                        width: 210mm; 
                        height: 297mm; 
                        background: white !important; 
                        -webkit-print-color-adjust: exact; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        overflow: hidden !important; /* Prevent 2nd page if close */
                    }
                    /* Hide EVERYTHING by default */
                    body * { visibility: hidden; }
                    /* Only show the report container and its children */
                    #report-container, #report-container * { visibility: visible; }
                    
                    /* Position the report at absolute top-left */
                    #report-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 10mm !important; /* Internal padding */
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
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
                    {/* Benchmark Inputs */}
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
                            <div>
                                <label className="block text-[10px] font-bold mb-1">加速度</label>
                                <input
                                    type="text"
                                    className="border p-1 rounded w-full text-sm"
                                    value={benchmarks.prevAccel}
                                    onChange={e => setBenchmarks({ ...benchmarks, prevAccel: e.target.value })}
                                    placeholder="G"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1">パワー</label>
                                <input
                                    type="text"
                                    className="border p-1 rounded w-full text-sm"
                                    value={benchmarks.prevPower}
                                    onChange={e => setBenchmarks({ ...benchmarks, prevPower: e.target.value })}
                                    placeholder="kW"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold mb-1">アジャスト率</label>
                                <input
                                    type="text"
                                    className="border p-1 rounded w-full text-sm"
                                    value={benchmarks.prevAdjust}
                                    onChange={e => setBenchmarks({ ...benchmarks, prevAdjust: e.target.value })}
                                    placeholder="%"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============== INDIVIDUAL REPORT ============== */}
            {viewMode === 'individual' && selectedPlayer && (
                <div id="report-container" className="bg-white mx-auto text-black leading-tight border border-gray-200 shadow relative print:transform print:scale-[0.98] print:origin-top-center" style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}>
                    {/* Print Spacer (Adjust this height to lower the title in PDF) */}
                    <div className="hidden print:block print:h-[10px]"></div>

                    {/* Report Type / Page Toggle for Screen */}
                    <div className="absolute top-0 right-full mr-4 mt-4 flex flex-col gap-2 print:hidden">
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
                    <div className="flex justify-between items-end mb-1 border-b-4 border-red-600 pb-1" style={{ borderBottomStyle: 'dotted' }}>
                        <div className="text-2xl font-bold border-b-2 border-black pb-1">
                            {(() => {
                                const typeMap = { point: 'ポイント', height: '高低', course: 'コース', hand: '打撃' };
                                return `打球データ (${typeMap[reportType]}${subViewMode === 'detail' && reportType !== 'hand' ? '詳細' : ''}${reportType === 'hand' ? '別' : ''})`;
                            })()}
                        </div>
                        <div className="flex-grow text-center text-2xl font-bold mx-8 border-b-2 border-black pb-1">
                            <span className="text-sm mr-4 font-normal">氏名</span>
                            {selectedPlayer}
                        </div>
                        <div className="text-sm border-b-2 border-black pb-1 font-bold">
                            計測日 {reportDate.replace(/-/g, '/')}
                        </div>
                    </div>

                    {/* Decorative pattern */}
                    <div className="w-full h-4 mb-2 text-red-600 flex overflow-hidden whitespace-nowrap text-xs font-bold items-center opacity-50">
                        {'<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'}
                    </div>

                    {/* ==================== ANALYSIS VIEW (Chart 1 & 2) ==================== */}
                    {subViewMode === 'analysis' && (
                        <>
                            {/* Top Table */}
                            <div className="mb-6">
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
                                                            <td className="border border-black p-1 font-bold">{s ? s.ev : ''}</td>
                                                            <td className="border border-black p-1 font-bold">{s ? s.angle : ''}</td>
                                                            <td className="border border-black p-1 font-bold">{s ? s.batSpeed : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.accel : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.power : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.adjust : ''}</td>
                                                        </>;
                                                    })()}
                                                </tr>
                                                {/* Previous */}
                                                <tr className="h-8">
                                                    <td className="border border-black p-1 font-bold bg-white text-center text-[10px] leading-tight">前回<br /><small className="font-normal">(置きT)</small></td>
                                                    <td className="border border-black p-1 font-bold">{benchmarks.prevSpeed || ''}</td>
                                                    <td className="border border-black p-1 font-bold">{benchmarks.prevAngle || ''}</td>
                                                    <td className="border border-black p-1 font-bold">{benchmarks.prevBatSpeed || ''}</td>
                                                    <td className="border border-black p-1 font-bold">{benchmarks.prevAccel || ''}</td>
                                                    <td className="border border-black p-1 font-bold">{benchmarks.prevPower || ''}</td>
                                                    <td className="border border-black p-1 font-bold">{benchmarks.prevAdjust || ''}</td>
                                                </tr>
                                                {/* Hand */}
                                                <tr className="h-8">
                                                    <td className="border border-black p-1 font-bold bg-white text-center text-xs">手投げ</td>
                                                    {(() => {
                                                        const s = getStats({ tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス'] }, selectedPlayer);
                                                        return <>
                                                            <td className="border border-black p-1 font-bold">{s ? s.ev : ''}</td>
                                                            <td className="border border-black p-1 font-bold">{s ? s.angle : ''}</td>
                                                            <td className="border border-black p-1 font-bold">{s ? s.batSpeed : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.accel : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.power : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.adjust : ''}</td>
                                                        </>;
                                                    })()}
                                                </tr>
                                            </>
                                        ) : (
                                            CONFIG[reportType].map(cat => {
                                                const stats = getStats(cat, selectedPlayer);
                                                return (
                                                    <tr key={cat.id} className="h-8">
                                                        <td className="border border-black p-1 font-bold bg-white text-center">{cat.label.split(' ')[0]}</td>
                                                        <td className="border border-black p-1 font-bold">{stats ? stats.ev : ''}</td>
                                                        <td className="border border-black p-1 font-bold">{stats ? stats.angle : ''}</td>
                                                        <td className="border border-black p-1 font-bold">{stats ? stats.batSpeed : ''}</td>
                                                        <td className="border border-black p-1">{stats ? stats.accel : ''}</td>
                                                        <td className="border border-black p-1">{stats ? stats.power : ''}</td>
                                                        <td className="border border-black p-1">{stats ? stats.adjust : ''}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Charts Container */}
                            <div className="border border-green-500 p-1 relative flex flex-col justify-start h-[780px]">
                                {/* TOP SECTION */}
                                <div className="grid grid-cols-[1.3fr_1fr] gap-2 h-[320px] mb-14">
                                    {/* Left: Current Data */}
                                    <div className="border border-gray-200 flex flex-col relative w-full h-full">
                                        <h3 className="font-bold text-lg px-2 pt-1 z-10 bg-white absolute top-0 left-0">打球角度と打球速度の関係（全打球）</h3>

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
                                                        <XAxis
                                                            type="number"
                                                            dataKey="ev"
                                                            domain={[0, 200]}
                                                            tickCount={11}
                                                            tick={{ fontSize: 9 }}
                                                            label={{ value: '打球速度', position: 'insideBottom', offset: 1, fontSize: 11, fontWeight: 'bold' }}
                                                        />
                                                        <YAxis
                                                            type="number"
                                                            dataKey="ang"
                                                            domain={[-60, 60]}
                                                            tickCount={7}
                                                            tick={{ fontSize: 9 }}
                                                            label={{ value: '打球角度', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fontWeight: 'bold' }}
                                                        />
                                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                        <Scatter name="Hits" data={getScatterData(selectedPlayer)} fill="#8884d8">
                                                            {getScatterData(selectedPlayer).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={getTypeColor(entry.ang)} />
                                                            ))}
                                                        </Scatter>
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* Legend */}
                                        <div className="w-full flex justify-end pr-8 pb-1 h-[45px] absolute bottom-[-49px] right-0">
                                            <img src="/assets/launch_angle_legend.png" alt="Legend" className="h-full object-contain" />
                                        </div>
                                    </div>

                                    {/* Right: Previous Data */}
                                    <div className="border-l-2 border-dashed border-[#4ade80] pl-1 flex flex-col relative w-full h-full">
                                        <h3 className="text-center font-bold text-md mb-1 absolute w-full top-1">前回</h3>
                                        <div className="flex-grow w-full relative pt-8 pb-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis
                                                        type="number"
                                                        dataKey="ev"
                                                        domain={[0, 200]}
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
                                                        label={{ value: '打球角度', angle: -90, position: 'insideLeft', offset: 35, fontSize: 10 }}
                                                    />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                    <Scatter name="PrevHits" data={[]} fill="#9ca3af" shape="circle" />
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* SEPARATOR */}
                                <hr className="border-t-2 border-[#4ade80] my-0.5" />

                                {/* BOTTOM SECTION */}
                                <div className="grid grid-cols-[1.5fr_1fr] gap-5 items-center mt-24">
                                    {/* Grid / Heatmap */}
                                    <div className="relative pl-3 pb-3 pt-2">
                                        <h3 className="font-bold text-lg absolute top-[-25px] left-0">打球速度とバット速度 ({reportType === 'hand' ? '置きT' : '条件別'})</h3>

                                        <div className="relative h-[240px] w-full border border-black mt-1">
                                            {/* Top Gradient - Thicker, No Cap */}
                                            <div className="absolute top-[-10px] left-[18%] right-[2px] h-4 bg-gradient-to-r from-blue-300 via-white to-red-400 border border-gray-400 z-10"></div>

                                            {/* Right Gradient - Thicker, No Cap */}
                                            <div className="absolute top-[2px] right-[-10px] bottom-[18%] w-4 bg-gradient-to-t from-blue-300 via-white to-red-400 border border-gray-400 z-10"></div>

                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 10, right: 10, bottom: 15, left: 15 }}>
                                                    <Scatter name="CategoryAvg" data={
                                                        CONFIG[reportType].map(cat => {
                                                            const s = getStats(cat, selectedPlayer);
                                                            if (!s || s.ev === '' || s.batSpeed === '') return null;
                                                            return {
                                                                ev: parseFloat(s.ev),
                                                                bat: parseFloat(s.batSpeed),
                                                                label: cat.label,
                                                                fill: cat.label.includes('今回') || cat.label === '置きT' ? '#ef4444' : '#6b7280'
                                                            };
                                                        }).filter(Boolean)
                                                    }>
                                                        {CONFIG[reportType].map((cat, index) => {
                                                            const s = getStats(cat, selectedPlayer);
                                                            if (!s || s.ev === '' || s.batSpeed === '') return null;
                                                            const isCurrent = cat.label.includes('今回') || cat.label === '置きT';
                                                            return <Cell key={`cell-${index}`} fill={isCurrent ? '#ef4444' : '#6b7280'} stroke="black" strokeWidth={1.5} r={6} />;
                                                        })}
                                                    </Scatter>

                                                    {/* 9-Section Grid Lines (3x3) - Rendered after Scatter to ensure visibility */}
                                                    <ReferenceLine x={120} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine x={140} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={90} stroke="black" strokeWidth={2} />
                                                    <ReferenceLine y={110} stroke="black" strokeWidth={2} />
                                                    {/* Labels in diagonal cells */}
                                                    <ReferenceLine y={80} x={110} stroke="none" label={{ value: "低", position: 'center', fill: 'black', fontSize: 16, fontWeight: 'bold' }} />
                                                    <ReferenceLine y={100} x={130} stroke="none" label={{ value: "中", position: 'center', fill: 'black', fontSize: 16, fontWeight: 'bold' }} />
                                                    <ReferenceLine y={120} x={150} stroke="none" label={{ value: "高", position: 'center', fill: 'black', fontSize: 16, fontWeight: 'bold' }} />

                                                    <XAxis type="number" dataKey="ev" domain={[100, 160]} ticks={[100, 120, 140, 160]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                    <YAxis type="number" dataKey="bat" domain={[70, 130]} ticks={[70, 90, 110, 130]} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                </ScatterChart>
                                            </ResponsiveContainer>

                                            {/* Axis Titles - positioned inside chart margins */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 font-bold text-xs -rotate-90 origin-center">バット速度</div>
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-bold text-xs">打球速度</div>
                                        </div>
                                    </div>

                                    {/* Comparisons Table */}
                                    <div className="flex flex-col justify-center items-end">
                                        <table className="w-[90%] border-collapse border border-black text-center font-bold bg-white text-sm">
                                            <thead>
                                                <tr className="bg-gray-300">
                                                    <th className="border border-black p-1 w-[30%] bg-gray-400 text-xs">条件</th>
                                                    <th className="border border-black p-1"><span className="text-xs">打球速度</span><br />(km/h)</th>
                                                    <th className="border border-black p-1"><span className="text-xs">バット速度</span><br />(km/h)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="h-12"><td className="border border-black bg-red-600 text-white text-lg">今回</td><td className="border border-black text-xl">{(() => { const d = getScatterData(selectedPlayer); return d.length ? Math.max(...d.map(x => x.ev)).toFixed(1) : '' })()}</td><td className="border border-black text-xl">{(() => { const s = getStats({ tags: ['今回', '置きT', 'tee', 'hand_tee'] }, selectedPlayer); return s ? s.batSpeed : '' })()}</td></tr>
                                                <tr className="h-12"><td className="border border-black bg-gray-300 text-lg">前回</td><td className="border border-black text-xl">{benchmarks.prevSpeed}</td><td className="border border-black text-xl">{benchmarks.prevBatSpeed}</td></tr>
                                                <tr className="h-12"><td className="border border-black bg-[#eab308] text-base">チーム平均</td><td className="border border-black text-xl">{getTeamStats().ev}</td><td className="border border-black text-xl">{getTeamStats().bat}</td></tr>
                                                <tr className="h-12"><td className="border border-black bg-black text-white text-lg">甲子園</td><td className="border border-black text-xl">{benchmarks.targetSpeed}</td><td className="border border-black text-xl">{benchmarks.targetBatSpeed}</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ==================== DETAIL VIEW (4-BLOCK GRID) ==================== */}
                    {subViewMode === 'detail' && (
                        <>
                            {/* Top Table (Compact) */}
                            <div className="mb-8">
                                <table className="w-full border-collapse border border-black text-sm text-center table-fixed bg-white">
                                    <thead>
                                        <tr className="bg-gray-400 h-8 text-black font-bold">
                                            <th className="border border-black p-1 w-[20%]"></th>
                                            <th className="border border-black p-1">打球速度<span className="text-xs">(km/h)</span></th>
                                            <th className="border border-black p-1">打球角度<span className="text-xs">(deg.)</span></th>
                                            <th className="border border-black p-1">バット速度<span className="text-xs">(km/h)</span></th>
                                            <th className="border border-black p-1">加速度<span className="text-xs">(G)</span></th>
                                            <th className="border border-black p-1">パワー<span className="text-xs">(kW)</span></th>
                                            <th className="border border-black p-1">アジャスト率<span className="text-xs">(%)</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportType === 'hand' ? (
                                            <>
                                                {/* Tee */}
                                                <tr className="h-8 font-bold">
                                                    <td className="border border-black p-1 bg-white text-left pl-2">置きT</td>
                                                    {(() => {
                                                        const s = getStats({ tags: ['置きT', 'tee', 'hand_tee'] }, selectedPlayer);
                                                        return <>
                                                            <td className="border border-black p-1">{s ? s.ev : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.angle : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.batSpeed : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.accel : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.power : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.adjust : ''}</td>
                                                        </>;
                                                    })()}
                                                </tr>
                                                {/* Previous */}
                                                <tr className="h-8 font-bold">
                                                    <td className="border border-black p-1 bg-white text-left pl-2">前回<span className="text-xs font-normal ml-1">(置きT)</span></td>
                                                    <td className="border border-black p-1">{benchmarks.prevSpeed || ''}</td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1">{benchmarks.prevBatSpeed || ''}</td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                    <td className="border border-black p-1"></td>
                                                </tr>
                                                {/* Hand */}
                                                <tr className="h-8 font-bold">
                                                    <td className="border border-black p-1 bg-white text-left pl-2">手投げ</td>
                                                    {(() => {
                                                        const s = getStats({ tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス'] }, selectedPlayer);
                                                        return <>
                                                            <td className="border border-black p-1">{s ? s.ev : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.angle : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.batSpeed : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.accel : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.power : ''}</td>
                                                            <td className="border border-black p-1">{s ? s.adjust : ''}</td>
                                                        </>;
                                                    })()}
                                                </tr>
                                            </>
                                        ) : (
                                            CONFIG[reportType].map(cat => {
                                                const s = getStats(cat, selectedPlayer);
                                                return (
                                                    <tr key={cat.id} className="h-10 font-bold">
                                                        <td className="border border-black p-1 bg-white text-left pl-2">{cat.label.split(' ')[0]}</td>
                                                        <td className="border border-black p-1">{s ? s.ev : ''}</td>
                                                        <td className="border border-black p-1">{s ? s.angle : ''}</td>
                                                        <td className="border border-black p-1">{s ? s.batSpeed : ''}</td>
                                                        <td className="border border-black p-1">{s ? s.accel : ''}</td>
                                                        <td className="border border-black p-1">{s ? s.power : ''}</td>
                                                        <td className="border border-black p-1">{s ? s.adjust : ''}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* 4-Block Grid Detail Section */}
                            <div className="border border-green-600 p-2 relative h-[780px]">
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
                                    {/* Left Side: 4 Blocks Grid */}
                                    <div className="w-2/3 grid grid-cols-2 gap-x-6 gap-y-6">
                                        {[
                                            { label: '打球速度(km/h)', color: 'text-red-600', key: 'ev', target: benchmarks.prevSpeed },
                                            { label: 'バット速度(km/h)', color: 'text-red-600', key: 'batSpeed', target: benchmarks.prevBatSpeed },
                                            { label: '打球角度(°)', color: 'text-red-600', key: 'angle', target: null },
                                            { label: 'アジャスト率(%)', color: 'text-red-600', key: 'adjust', target: null }
                                        ].map((block) => (
                                            <div key={block.label} className="flex flex-col">
                                                <h4 className={`text-center font-bold text-2xl h-14 flex items-center justify-center p-1 ${block.color}`}>{block.label}</h4>
                                                <table className="w-full border-collapse border border-black text-center h-[240px] bg-white table-fixed">
                                                    <tbody>
                                                        {reportType === 'hand' ? (
                                                            <>
                                                                <tr>
                                                                    <td className="border border-black bg-white font-bold text-gray-400 text-xl align-middle">置きT</td>
                                                                    <td className="border border-black text-4xl font-bold align-middle">
                                                                        {(() => {
                                                                            const s = getStats({ tags: ['置きT', 'tee', 'hand_tee'] }, selectedPlayer);
                                                                            return s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-5xl leading-none block">&nbsp;</span>;
                                                                        })()}
                                                                    </td>
                                                                    <td className="border border-black bg-white w-[30%] text-gray-400 font-bold text-xl align-middle select-none">置きT</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="border border-black bg-white font-bold text-gray-400 text-xl align-middle">前回<span className="text-xs font-normal block">(置きT)</span></td>
                                                                    <td className="border border-black text-4xl font-bold text-gray-400 align-middle">{block.target || <span className="text-gray-300 text-5xl leading-none block">&nbsp;</span>}</td>
                                                                    <td className="border border-black bg-white text-gray-400 font-bold text-xl align-middle select-none">前回<span className="text-xs font-normal block">(置きT)</span></td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="border border-black bg-white font-bold text-gray-400 text-xl align-middle">手投げ</td>
                                                                    <td className="border border-black text-4xl font-bold align-middle">
                                                                        {(() => {
                                                                            const s = getStats({ tags: ['手投げ', 'live', 'hand_live', 'toss', 'トス'] }, selectedPlayer);
                                                                            return s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-5xl leading-none block">&nbsp;</span>;
                                                                        })()}
                                                                    </td>
                                                                    <td className="border border-black bg-white text-gray-400 font-bold text-xl align-middle select-none">手投げ</td>
                                                                </tr>
                                                            </>
                                                        ) : (
                                                            CONFIG[reportType].map((cat, i) => {
                                                                const s = getStats(cat, selectedPlayer);
                                                                return (
                                                                    <tr key={cat.id}>
                                                                        <td className="border border-black bg-white font-bold text-gray-400 text-xl w-[30%] p-0 whitespace-nowrap align-middle">
                                                                            {cat.shortLabel}
                                                                        </td>
                                                                        <td className="border border-black text-4xl font-bold p-0 align-middle">
                                                                            {s && s[block.key] !== '' ? s[block.key] : <span className="text-black text-5xl leading-none block">&nbsp;</span>}
                                                                        </td>
                                                                        <td className="border border-black bg-white text-gray-400 font-bold text-xl w-[30%] p-0 select-none whitespace-nowrap align-middle">
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
                                    <div className="w-1/3 flex items-center justify-center relative pl-4 overflow-hidden">
                                        <div>
                                            <img src="/assets/hitter_silhouette_blue.png" alt="Silhouette" className="object-contain max-h-[600px] opacity-50 scale-[2.0] origin-center" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            )
            }

            {/* ============== TEAM REPORT ============== */}
            {
                viewMode === 'team' && (
                    <div id="report-container" className="bg-white mx-auto text-black leading-tight border border-gray-200 shadow relative p-12 pt-12 flex flex-col items-stretch" style={{ width: '297mm', minHeight: '210mm', writingMode: 'horizontal-tb' }}>
                        {/* Print Spacer (Adjust this height to lower the title in PDF) */}
                        <div className="hidden print:block print:h-[30px]"></div>
                        <div className="mb-4">
                            <h2 className="text-3xl font-bold border-b border-black inline-block pb-1">チーム：打球データ一覧</h2>
                        </div>
                        <div className="text-red-600 text-xl font-bold leading-none select-none">
                            {"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"}
                        </div>
                        <div className="text-2xl font-bold mt-2 mb-4">
                            {reportDate.split('-')[0]}年{reportDate.split('-')[1].replace(/^0/, '')}月{reportDate.split('-')[2].replace(/^0/, '')}日
                        </div>


                        <table className="border-collapse border border-black text-[10px] text-center table-fixed bg-white" style={{ minWidth: CONFIG[reportType].length === 2 ? '1040px' : '1060px', width: '100%' }}>
                            <colgroup>
                                <col style={{ width: CONFIG[reportType].length === 2 ? '150px' : '165px' }} />
                                {Array.from({ length: CONFIG[reportType].length * 6 }).map((_, i) => (
                                    <col key={i} style={{ width: CONFIG[reportType].length === 2 ? '75px' : '50px' }} />
                                ))}
                            </colgroup>
                            <thead>
                                {/* 1st Row: Category Headers */}
                                <tr className="bg-white">
                                    <th className="border border-black p-2 align-middle text-base font-bold text-center" rowSpan="3">選手名</th>
                                    {CONFIG[reportType].map(cat => (
                                        <th key={cat.id} className="border border-black p-1 text-sm font-bold bg-white h-8" colSpan="6">{cat.label.split(' ')[0]}</th>
                                    ))}
                                </tr>
                                {/* 2nd Row: Metric Names */}
                                <tr className="bg-white font-bold text-white h-8">
                                    {CONFIG[reportType].map(cat => (
                                        <React.Fragment key={cat.id}>
                                            <th className="border border-black p-1 bg-[#ff0000] text-[10px] whitespace-nowrap">打球速度</th>
                                            <th className="border border-black p-1 bg-[#ff0000] text-[10px] whitespace-nowrap">打球角度</th>
                                            <th className="border border-black p-1 bg-[#ff0000] text-[10px] whitespace-nowrap">飛距離</th>
                                            <th className="border border-black p-1 bg-[#00ccff] text-[10px] whitespace-nowrap">バット速度</th>
                                            <th className="border border-black p-1 bg-[#00ccff] text-[10px] whitespace-nowrap">パワー</th>
                                            <th className="border border-black p-1 bg-[#00ccff] text-[10px] whitespace-nowrap">アジャスト率</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                                {/* 3rd Row: Units */}
                                <tr className="bg-white font-bold text-black h-6">
                                    {CONFIG[reportType].map(cat => (
                                        <React.Fragment key={cat.id}>
                                            <th className="border border-black p-0 text-[10px] whitespace-nowrap">(km/h)</th>
                                            <th className="border border-black p-0 text-[10px] whitespace-nowrap">(deg)</th>
                                            <th className="border border-black p-0 text-[10px] whitespace-nowrap">(m)</th>
                                            <th className="border border-black p-0 text-[10px] whitespace-nowrap">(km/h)</th>
                                            <th className="border border-black p-0 text-[10px] whitespace-nowrap">(kW)</th>
                                            <th className="border border-black p-0 text-[10px] whitespace-nowrap">(%)</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {players.map(player => (
                                    <tr key={player} className="h-6">
                                        <td className="border border-black p-1 font-bold text-red-600 text-center bg-white align-middle">{player}</td>
                                        {CONFIG[reportType].map((cat, idx) => {
                                            const stats = getStats(cat, player);
                                            // Calculate Team Average for this Category
                                            const teamEV = getAverage(cat, 'ExitVelocity');
                                            const teamAng = getAverage(cat, 'LaunchAngle');
                                            const teamDist = getAverage(cat, 'Distance');
                                            const teamBat = getAverage(cat, 'BatSpeed');
                                            // Placeholders for now for Power/Adjust if not calculated
                                            const teamPower = 0;
                                            const teamAdjust = 0;

                                            const isHighEV = stats && stats.ev !== '-' && parseFloat(stats.ev) >= teamEV;
                                            const isHighAng = stats && stats.angle !== '-' && parseFloat(stats.angle) >= teamAng;
                                            const isHighDist = stats && stats.dist !== '-' && parseFloat(stats.dist) >= teamDist;
                                            const isHighBat = stats && stats.batSpeed !== '-' && parseFloat(stats.batSpeed) >= teamBat;

                                            // Note: Power and Adjust are placeholders in getStats currently, so no highlight logic yet for them.

                                            return (
                                                <React.Fragment key={cat.id}>
                                                    <td className={`border border-black p-1 font-bold ${isHighEV ? 'bg-yellow-300' : ''}`}>{stats ? stats.ev : '-'}</td>
                                                    <td className={`border border-black p-1 font-bold ${isHighAng ? 'bg-yellow-300' : ''}`}>{stats ? stats.angle : '-'}</td>
                                                    <td className={`border border-black p-1 font-bold ${isHighDist ? 'bg-yellow-300' : ''}`}>{stats ? stats.dist : '-'}</td>
                                                    <td className={`border border-black p-1 font-bold ${isHighBat ? 'bg-yellow-300' : ''}`}>{stats ? stats.batSpeed : '-'}</td>
                                                    <td className="border border-black p-1 font-bold">{stats ? stats.power : '-'}</td>
                                                    <td className="border border-black p-1 font-bold">{stats ? stats.adjust : '-'}</td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                ))}
                                {/* Legend Row */}
                                <tr className="bg-white border text-[10px] h-6 border-black">
                                    <td className="border border-black p-0 bg-white"></td>
                                    <td className="border border-black p-0 bg-yellow-400 w-14" style={{ height: '1.5rem' }}></td>
                                    <td colSpan={CONFIG[reportType].length * 6 - 1} className="border border-black p-1 text-left bg-white font-normal align-middle">
                                        は同学年の平均値以上
                                    </td>
                                </tr>

                                {/* Grade Average Rows */}
                                {uniqueGrades.map(g => (
                                    <tr key={g} className="bg-white border text-xs h-6 font-bold text-red-600">
                                        <td className="border border-black p-1 text-center font-bold bg-white align-middle">{g === '中3' ? '中学3年生平均' : g === '中2' ? '中学2年生平均' : `${g}年生平均`}</td>
                                        {CONFIG[reportType].map(cat => (
                                            <React.Fragment key={cat.id}>
                                                <td className="border border-black p-1">{getGradeAverage(cat, 'ExitVelocity', g)}</td>
                                                <td className="border border-black p-1">{getGradeAverage(cat, 'LaunchAngle', g)}</td>
                                                <td className="border border-black p-1">{getGradeAverage(cat, 'Distance', g)}</td>
                                                <td className="border border-black p-1">{getGradeAverage(cat, 'BatSpeed', g)}</td>
                                                <td className="border border-black p-1">-</td>
                                                <td className="border border-black p-1">-</td>
                                            </React.Fragment>
                                        ))}
                                    </tr>
                                ))}
                                {/* Summary Rows */}
                                <tr className="bg-white border-t-2 border-black font-bold">
                                    <td className="border border-black p-1 text-center font-bold">平均値</td>
                                    {CONFIG[reportType].map(cat => (
                                        <React.Fragment key={cat.id}>
                                            <td className="border border-black p-1">{getAverage(cat, 'ExitVelocity').toFixed(1)}</td>
                                            <td className="border border-black p-1">{getAverage(cat, 'LaunchAngle').toFixed(1)}</td>
                                            <td className="border border-black p-1">{getAverage(cat, 'Distance').toFixed(1)}</td>
                                            <td className="border border-black p-1">{getAverage(cat, 'BatSpeed').toFixed(1)}</td>
                                            <td className="border border-black p-1">-</td>
                                            <td className="border border-black p-1">-</td>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )
            }
        </div >
    );
};

export default HitterFeedback;

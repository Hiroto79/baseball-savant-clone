import React, { useState, useMemo, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Feedback = () => {
    const { language, units } = useSettings();
    const [uploadData, setUploadData] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [customPlayerName, setCustomPlayerName] = useState(''); // Editable name for print
    const [loading, setLoading] = useState(false);

    // Manual Inputs for Comparison
    const [manualData, setManualData] = useState({
        prevVelocity: '',
        prevSpin: '',
        prevEfficiency: '',
        prevVB: '',
        prevHB: '',
        prevStrike: '',
        quickTimeBest: '',
        quickTimeAvg: '',
        quickTimeTeam: ''
    });

    // Sync custom name when player is selected
    useEffect(() => {
        if (selectedPlayer) {
            setCustomPlayerName(selectedPlayer);
        }
    }, [selectedPlayer]);

    // Handle File Upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                const data = results.data;
                if (!data[0] || (!data[0]['Player Name'] && !data[0].PlayerName)) {
                    alert(language === 'ja' ? 'Rapsodoの投球データではないようです。' : 'Invalid Rapsodo pitching data.');
                    setLoading(false);
                    return;
                }
                setUploadData(data);
                const uniquePlayers = [...new Set(data.map(d => d['Player Name'] || d.PlayerName).filter(Boolean))];
                setPlayers(uniquePlayers);
                if (uniquePlayers.length > 0) {
                    setSelectedPlayer(uniquePlayers[0]);
                }
                setLoading(false);
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
                alert('Failed to parse CSV file.');
                setLoading(false);
            }
        });
    };

    // Helper: Get Japanese Pitch Type
    const getJapanesePitchType = (type) => {
        const t = type.toLowerCase();
        if (t.includes('fastball') || t.includes('straight')) return 'ストレート';
        if (t.includes('two') || t.includes('2')) return 'ツーシーム';
        if (t.includes('slider')) return 'スライダー';
        if (t.includes('curve')) return 'カーブ';
        if (t.includes('cut')) return 'カットボール';
        if (t.includes('split')) return 'スプリット';
        if (t.includes('change')) return 'チェンジアップ';
        if (t.includes('sinker')) return 'シンカー';
        return type;
    };

    // Helper: Get Pitch Color
    const getTypeColor = (type) => {
        const t = type.toLowerCase();
        if (t.includes('fastball') || t.includes('straight') || t.includes('ストレート')) return '#ef4444'; // Red
        if (t.includes('two') || t.includes('ツーシーム')) return '#06b6d4'; // Cyan
        if (t.includes('slider') || t.includes('スライダー')) return '#a855f7'; // Purple
        if (t.includes('curve') || t.includes('カーブ')) return '#22c55e'; // Green
        if (t.includes('split') || t.includes('スプリット')) return '#f97316'; // Orange
        if (t.includes('change') || t.includes('チェンジ')) return '#eab308'; // Yellow
        if (t.includes('cut') || t.includes('カット')) return '#3b82f6'; // Blue
        if (t.includes('sinker') || t.includes('シンカー')) return '#06b6d4'; // Cyan
        return '#9ca3af'; // Gray
    };

    // Helper: Calculate Average Time (Spin Direction)
    const getAverageTime = (times) => {
        if (!times || times.length === 0) return '-';
        let sinSum = 0;
        let cosSum = 0;
        let validCount = 0;

        times.forEach(t => {
            if (!t) return;
            const parts = t.split(':');
            if (parts.length !== 2) return;
            let h = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            if (h === 12) h = 0;
            const angle = (h * 30) + (m * 0.5);
            const rad = angle * (Math.PI / 180);
            sinSum += Math.sin(rad);
            cosSum += Math.cos(rad);
            validCount++;
        });

        if (validCount === 0) return '-';
        const avgSin = sinSum / validCount;
        const avgCos = cosSum / validCount;
        let avgAngle = Math.atan2(avgSin, avgCos) * (180 / Math.PI);
        if (avgAngle < 0) avgAngle += 360;
        let totalMinutes = Math.round(avgAngle / 0.5);
        let avgH = Math.floor(totalMinutes / 60);
        let avgM = totalMinutes % 60;
        if (avgH === 0) avgH = 12;
        return `${avgH}:${avgM.toString().padStart(2, '0')}`;
    };

    // Helper: Get Minutes from 12:00 (for "Best" calculation)
    const getMinutesFrom12 = (timeStr) => {
        if (!timeStr) return Infinity;
        const parts = timeStr.split(':');
        if (parts.length !== 2) return Infinity;
        let h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (h === 12) h = 0;
        const totalMinutes = h * 60 + m;
        const dist = Math.min(totalMinutes, 720 - totalMinutes);
        return dist;
    };

    // Helper: Format Time (Ensure 12:xx instead of 0:xx)
    const formatTimeDisplay = (timeStr) => {
        if (!timeStr || timeStr === '-') return '-';
        const parts = timeStr.split(':');
        if (parts.length !== 2) return timeStr;
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        if (h === 0) h = 12;
        return `${h}:${m}`;
    };

    // Helper: Check if pitch type should show max velocity (Straight/Fastball ONLY)
    const shouldShowMax = (type) => {
        const t = type.toLowerCase();
        return t.includes('ストレート') || t.includes('fastball') || t.includes('straight');
    };

    // Calculate Team Averages
    const teamStats = useMemo(() => {
        if (uploadData.length === 0) return null;
        let velocitySum = 0;
        let spinSum = 0;
        let efficiencySum = 0;
        let vbSum = 0;
        let hbSum = 0;
        let count = 0;
        let strikeCount = 0;
        let strikeOppCount = 0;

        uploadData.forEach(d => {
            const vel = Number(d.Velocity);
            if (!isNaN(vel)) {
                velocitySum += vel;
                count++;
                const spin = Number(d['Total Spin'] || d.TotalSpin);
                if (!isNaN(spin)) spinSum += spin;
                const eff = Number(d['Spin Efficiency'] || d.SpinEfficiency || d['Spin Efficiency (release)']);
                if (!isNaN(eff)) efficiencySum += eff;
                const vb = Number(d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)']);
                if (!isNaN(vb)) vbSum += vb;
                const hb = Number(d['Horizontal Break'] || d.HorizontalBreak || d['HB (trajectory)']);
                if (!isNaN(hb)) hbSum += hb;

                const isStrikeCol = d['Is Strike'] || d.IsStrike;
                if (isStrikeCol !== undefined && isStrikeCol !== null && isStrikeCol !== '') {
                    strikeOppCount++;
                    const val = String(isStrikeCol).toLowerCase();
                    if (val === 'yes' || val === 'true' || val === 'y' || isStrikeCol === 1) {
                        strikeCount++;
                    }
                } else {
                    const hasStrikeData = d.PitchResult || (d['Strike Zone Height'] && d['Strike Zone Side']);
                    if (hasStrikeData) {
                        strikeOppCount++;
                        const isStrike = ['Strike', 'InPlay'].includes(d.PitchResult) || (d['Strike Zone Height'] && d['Strike Zone Side']);
                        if (isStrike) strikeCount++;
                    }
                }
            }
        });

        return {
            avgVelocity: count ? (velocitySum / count).toFixed(1) : '-',
            avgSpin: count ? Math.round(spinSum / count) : '-',
            avgEfficiency: count ? (efficiencySum / count).toFixed(1) : '-',
            avgVB: count ? (vbSum / count).toFixed(1) : '-',
            avgHB: count ? (hbSum / count).toFixed(1) : '-',
            strikeRate: strikeOppCount ? ((strikeCount / strikeOppCount) * 100).toFixed(1) : '-'
        };
    }, [uploadData]);


    // Calculate Averages for Selected Player
    const playerStats = useMemo(() => {
        if (!selectedPlayer || uploadData.length === 0) return null;
        const playerData = uploadData.filter(d => (d['Player Name'] || d.PlayerName) === selectedPlayer);
        const byType = {};
        const rawPitches = [];

        playerData.forEach(d => {
            const rawType = d['Pitch Type'] || d.PitchType || 'Unknown';
            const type = getJapanesePitchType(rawType);

            if (!byType[type]) {
                byType[type] = {
                    count: 0,
                    velocitySum: 0, maxVelocity: -Infinity,
                    spinSum: 0, maxSpin: -Infinity,
                    efficiencySum: 0, maxEfficiency: -Infinity,
                    vbSum: 0, maxVB: -Infinity,
                    hbSum: 0, maxHB: -Infinity,
                    releaseAngleSum: 0, maxRA: -Infinity,
                    releaseHeightSum: 0, maxRH: -Infinity,
                    releaseSideSum: 0, maxRS: -Infinity,
                    strikeCount: 0, strikeOppCount: 0,
                    gyroSum: 0, gyroCount: 0,
                    minGyro: Infinity, // For "Max" (Best) Gyro
                    spinDirections: [],
                    bestSpinDirection: '', minDistTo12: Infinity
                };
            }

            const stats = byType[type];
            stats.count++;

            const vel = Number(d.Velocity);
            if (!isNaN(vel)) {
                stats.velocitySum += vel;
                if (vel > stats.maxVelocity) stats.maxVelocity = vel;
            }
            const spin = Number(d['Total Spin'] || d.TotalSpin);
            if (!isNaN(spin)) {
                stats.spinSum += spin;
                if (spin > stats.maxSpin) stats.maxSpin = spin;
            }
            const eff = Number(d['Spin Efficiency'] || d.SpinEfficiency || d['Spin Efficiency (release)']);
            if (!isNaN(eff)) {
                stats.efficiencySum += eff;
                if (eff > stats.maxEfficiency) stats.maxEfficiency = eff;
            }
            const vb = Number(d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)']);
            if (!isNaN(vb)) {
                stats.vbSum += vb;
                if (vb > stats.maxVB) stats.maxVB = vb;
            }
            const hb = Number(d['Horizontal Break'] || d.HorizontalBreak || d['HB (trajectory)']);
            if (!isNaN(hb)) {
                stats.hbSum += hb;
                if (hb > stats.maxHB) stats.maxHB = hb;
            }
            const ra = Number(d['Release Angle'] || d.ReleaseAngle);
            if (!isNaN(ra)) {
                stats.releaseAngleSum += ra;
                if (ra > stats.maxRA) stats.maxRA = ra;
            }
            const rh = Number(d['Release Height'] || d.ReleaseHeight);
            if (!isNaN(rh)) {
                stats.releaseHeightSum += rh;
                if (rh > stats.maxRH) stats.maxRH = rh;
            }
            const rs = Number(d['Release Side'] || d.ReleaseSide);
            if (!isNaN(rs)) {
                stats.releaseSideSum += rs;
                if (rs > stats.maxRS) stats.maxRS = rs;
            }

            // Gyro
            const gyro = Number(d['Gyro Degree'] || d.GyroDegree || d['Gyro'] || d['Gyro Angle'] || d['Spin Axis (Gyro)']);
            if (!isNaN(gyro)) {
                if (gyro !== 0) {
                    stats.gyroSum += gyro;
                    stats.gyroCount++;
                }
                if (gyro < stats.minGyro) stats.minGyro = gyro;
            }

            // Spin Direction
            const sd = d['Spin Direction'] || d.SpinDirection || d['Spin Axis (Clock)'];
            if (sd) {
                stats.spinDirections.push(sd);
                const dist = getMinutesFrom12(sd);
                if (dist < stats.minDistTo12) {
                    stats.minDistTo12 = dist;
                    stats.bestSpinDirection = sd;
                }
            }

            // Strike
            const isStrikeCol = d['Is Strike'] || d.IsStrike;
            if (isStrikeCol !== undefined && isStrikeCol !== null && isStrikeCol !== '') {
                stats.strikeOppCount++;
                const val = String(isStrikeCol).toLowerCase();
                if (val === 'yes' || val === 'true' || val === 'y' || isStrikeCol === 1) {
                    stats.strikeCount++;
                }
            } else {
                const hasStrikeData = d.PitchResult || (d['Strike Zone Height'] && d['Strike Zone Side']);
                if (hasStrikeData) {
                    stats.strikeOppCount++;
                    const isStrike = ['Strike', 'InPlay'].includes(d.PitchResult) || (d['Strike Zone Height'] && d['Strike Zone Side']);
                    if (isStrike) stats.strikeCount++;
                }
            }

            if (!isNaN(vb) && !isNaN(hb)) {
                rawPitches.push({ type, vb, hb, velocity: vel });
            }
        });

        let averages = Object.keys(byType).map(type => {
            const s = byType[type];

            let avgGyro = '-';
            if (s.gyroCount > 0) {
                avgGyro = (s.gyroSum / s.gyroCount).toFixed(1);
            } else if (s.efficiencySum > 0 && s.count > 0) {
                const avgEff = s.efficiencySum / s.count;
                const effDecimal = Math.min(Math.max(avgEff / 100, 0), 1);
                const gyroRad = Math.acos(effDecimal);
                const gyroDeg = gyroRad * (180 / Math.PI);
                avgGyro = gyroDeg.toFixed(1);
            }

            let minGyroVal = s.minGyro;
            if (minGyroVal === Infinity && s.maxEfficiency !== -Infinity) {
                const effDecimal = Math.min(Math.max(s.maxEfficiency / 100, 0), 1);
                const gyroRad = Math.acos(effDecimal);
                minGyroVal = gyroRad * (180 / Math.PI);
            }

            const fmtMax = (val, fixed) => (val === -Infinity ? '-' : val.toFixed(fixed));
            const fmtMin = (val, fixed) => (val === Infinity ? '-' : val.toFixed(fixed));
            const fmtMaxInt = (val) => (val === -Infinity ? '-' : Math.round(val));

            return {
                type,
                count: s.count,
                avgVelocity: s.count ? (s.velocitySum / s.count).toFixed(1) : 0,
                maxVelocity: fmtMax(s.maxVelocity, 1),
                avgSpin: s.count ? Math.round(s.spinSum / s.count) : 0,
                maxSpin: fmtMaxInt(s.maxSpin),
                avgEfficiency: s.count ? (s.efficiencySum / s.count).toFixed(1) : 0,
                maxEfficiency: fmtMax(s.maxEfficiency, 1),
                avgVB: s.count ? (s.vbSum / s.count).toFixed(1) : 0,
                maxVB: fmtMax(s.maxVB, 1),
                avgHB: s.count ? (s.hbSum / s.count).toFixed(1) : 0,
                maxHB: fmtMax(s.maxHB, 1),
                avgRA: s.count ? (s.releaseAngleSum / s.count).toFixed(2) : 0,
                maxRA: fmtMax(s.maxRA, 2),
                avgRH: s.count ? (s.releaseHeightSum / s.count).toFixed(2) : 0,
                maxRH: fmtMax(s.maxRH, 2),
                avgRS: s.count ? (s.releaseSideSum / s.count).toFixed(2) : 0,
                maxRS: fmtMax(s.maxRS, 2),
                avgGyro: avgGyro,
                maxGyro: fmtMin(minGyroVal, 1),
                avgClock: getAverageTime(s.spinDirections),
                maxClock: formatTimeDisplay(s.bestSpinDirection),
                strikeRate: s.strikeOppCount ? ((s.strikeCount / s.strikeOppCount) * 100).toFixed(1) : '-'
            };
        });

        averages.sort((a, b) => {
            const isAStraight = a.type.includes('ストレート') || a.type.includes('Fastball');
            const isBStraight = b.type.includes('ストレート') || b.type.includes('Fastball');
            if (isAStraight && !isBStraight) return -1;
            if (!isAStraight && isBStraight) return 1;
            return b.count - a.count;
        });

        return { averages, rawPitches };
    }, [selectedPlayer, uploadData]);

    const handleManualChange = (e) => {
        const { name, value } = e.target;
        setManualData(prev => ({ ...prev, [name]: value }));
    };

    const handlePrint = () => {
        const originalTitle = document.title;
        if (customPlayerName) {
            document.title = customPlayerName;
        } else if (selectedPlayer) {
            document.title = selectedPlayer;
        }
        window.print();
        document.title = originalTitle;
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6 max-w-[210mm] mx-auto bg-white min-h-screen text-black">
            <div className="print:hidden mb-8 space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">Rapsodo Feedback Generator</h1>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <Printer size={20} />
                        {language === 'ja' ? 'PDF保存 / 印刷' : 'Print / Save PDF'}
                    </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{language === 'ja' ? 'データアップロード (CSV)' : 'Upload Data (CSV)'}</label>
                        <div className="relative">
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="feedback-upload" />
                            <label htmlFor="feedback-upload" className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                <Upload className="text-gray-500" />
                                <span className="text-gray-600">{uploadData.length > 0 ? `${uploadData.length} rows loaded` : 'Click to upload'}</span>
                            </label>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">{language === 'ja' ? '選手選択' : 'Select Player'}</label>
                        <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-white" disabled={players.length === 0}>
                            <option value="">Select a player...</option>
                            {players.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                {selectedPlayer && (
                    <div className="space-y-4 border-t pt-4">
                        <h3 className="font-semibold text-gray-700">{language === 'ja' ? '比較データ入力 (手動)' : 'Manual Comparison Data'}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="col-span-2 md:col-span-3">
                                <label className="block text-xs font-medium text-gray-500 mb-1">{language === 'ja' ? '表示名 (レポート・ファイル名用)' : 'Display Name (for Report & Filename)'}</label>
                                <input
                                    type="text"
                                    value={customPlayerName}
                                    onChange={(e) => setCustomPlayerName(e.target.value)}
                                    className="w-full p-2 border rounded bg-white font-bold text-lg"
                                    placeholder={selectedPlayer}
                                />
                            </div>
                            <input name="prevVelocity" placeholder="前回 球速" value={manualData.prevVelocity} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="prevSpin" placeholder="前回 回転数" value={manualData.prevSpin} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="prevEfficiency" placeholder="前回 回転効率" value={manualData.prevEfficiency} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="prevVB" placeholder="前回 縦変化" value={manualData.prevVB} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="prevHB" placeholder="前回 横変化" value={manualData.prevHB} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="prevStrike" placeholder="前回 制球率" value={manualData.prevStrike} onChange={handleManualChange} className="p-2 border rounded" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <input name="quickTimeBest" placeholder="クイック 最短 (秒)" value={manualData.quickTimeBest} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="quickTimeAvg" placeholder="クイック 平均 (秒)" value={manualData.quickTimeAvg} onChange={handleManualChange} className="p-2 border rounded" />
                            <input name="quickTimeTeam" placeholder="クイック チーム平均" value={manualData.quickTimeTeam} onChange={handleManualChange} className="p-2 border rounded" />
                        </div>
                    </div>
                )}
            </div>

            {selectedPlayer && playerStats && (
                <div className="print:block print:w-full print:h-auto bg-white text-black font-sans">
                    <style>{`
                        @media print {
                            @page { margin: 5mm; size: A4; }
                            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                            nav, aside, header { display: none !important; }
                            .print\\:hidden { display: none !important; }
                            .print\\:block { display: block !important; width: 100% !important; height: auto !important; }
                        }
                    `}</style>

                    <div className="flex justify-between items-end mb-1 px-2">
                        <div className="border-b-2 border-gray-400 pb-1 text-xl font-bold text-gray-700">投球データ（個人）</div>
                        <div className="border-b-2 border-gray-400 pb-1 text-xl font-bold flex-grow text-center mx-4 flex items-end justify-center">
                            <span className="text-gray-600 text-sm mr-2 mb-1">氏名</span>
                            <input
                                type="text"
                                value={customPlayerName}
                                onChange={(e) => setCustomPlayerName(e.target.value)}
                                className="font-bold text-xl text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-[200px]"
                            />
                        </div>
                        <div className="border-b-2 border-gray-400 pb-1 text-lg font-bold">
                            <span className="text-gray-600 text-sm mr-2">計測日</span>{new Date().toLocaleDateString()}
                        </div>
                    </div>

                    <div className="border-b-2 border-red-600 border-dashed mb-2 opacity-50"></div>

                    {/* 1. Averages Table */}
                    <div className="mb-2">
                        <table className="w-full border-collapse border border-black text-[10px] text-center table-fixed">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-0.5 w-[12%]">球種</th>
                                    <th className="border border-black p-0.5 w-[8%]"></th>
                                    <th className="border border-black p-0.5">投球速度<br />(km/h)</th>
                                    <th className="border border-black p-0.5">総回転数<br />(rpm)</th>
                                    <th className="border border-black p-0.5">回転効率<br />(%)</th>
                                    <th className="border border-black p-0.5">回転方向<br />(時:分)</th>
                                    <th className="border border-black p-0.5">縦の変化<br />(cm)</th>
                                    <th className="border border-black p-0.5">横の変化<br />(cm)</th>
                                    <th className="border border-black p-0.5">リリース<br />角度(°)</th>
                                    <th className="border border-black p-0.5">リリース<br />高さ(m)</th>
                                    <th className="border border-black p-0.5">リリース<br />横(m)</th>
                                    <th className="border border-black p-0.5">ジャイロ<br />角度(°)</th>
                                    <th className="border border-black p-0.5">制球率<br />(%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {playerStats.averages.map((stat, idx) => {
                                    const showMax = shouldShowMax(stat.type);
                                    return (
                                        <React.Fragment key={stat.type}>
                                            <tr className="h-6">
                                                <td className="border border-black font-bold text-white text-xs align-middle" style={{ backgroundColor: getTypeColor(stat.type) }} rowSpan={showMax ? 2 : 1}>{stat.type}</td>
                                                <td className="border border-black bg-gray-50 text-[9px] align-middle">平均値</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgVelocity}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgSpin}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgEfficiency}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgClock}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgVB}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgHB}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgRA}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgRH}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgRS}</td>
                                                <td className="border border-black font-bold text-sm align-middle">{stat.avgGyro}</td>
                                                <td className="border border-black font-bold text-sm align-middle" rowSpan={showMax ? 2 : 1}>{stat.strikeRate}</td>
                                            </tr>
                                            {showMax && (
                                                <tr className="h-6">
                                                    <td className="border border-black bg-gray-50 text-[9px] align-middle">最大値</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxVelocity}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxSpin}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxEfficiency}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxClock}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxVB}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxHB}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxRA}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxRH}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxRS}</td>
                                                    <td className="border border-black font-bold text-sm align-middle">{stat.maxGyro}</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* 2. Comparison Table */}
                    <div className="mb-2">
                        <table className="w-full border-collapse border border-black text-[10px] text-center table-fixed">
                            <thead>
                                <tr className="bg-red-600 text-white">
                                    <th className="border border-black p-0.5">ストレート</th>
                                    <th className="border border-black p-0.5">投球速度</th>
                                    <th className="border border-black p-0.5">総回転数</th>
                                    <th className="border border-black p-0.5">回転効率</th>
                                    <th className="border border-black p-0.5">縦の変化量</th>
                                    <th className="border border-black p-0.5">横の変化量</th>
                                    <th className="border border-black p-0.5">制球率</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black font-bold bg-gray-50">今回</td>
                                    {(() => {
                                        const fb = playerStats.averages.find(s => s.type.includes('ストレート')) || {};
                                        return (
                                            <>
                                                <td className="border border-black text-sm font-bold">{fb.maxVelocity || '-'}</td>
                                                <td className="border border-black text-sm font-bold">{fb.avgSpin || '-'}</td>
                                                <td className="border border-black text-sm font-bold">{fb.avgEfficiency || '-'}</td>
                                                <td className="border border-black text-sm font-bold">{fb.avgVB || '-'}</td>
                                                <td className="border border-black text-sm font-bold">{fb.avgHB || '-'}</td>
                                                <td className="border border-black text-sm font-bold">{fb.strikeRate || '-'}</td>
                                            </>
                                        );
                                    })()}
                                </tr>
                                <tr>
                                    <td className="border border-black font-bold bg-gray-50 text-green-700">前回</td>
                                    <td className="border border-black">{manualData.prevVelocity}</td>
                                    <td className="border border-black">{manualData.prevSpin}</td>
                                    <td className="border border-black">{manualData.prevEfficiency}</td>
                                    <td className="border border-black">{manualData.prevVB}</td>
                                    <td className="border border-black">{manualData.prevHB}</td>
                                    <td className="border border-black">{manualData.prevStrike}</td>
                                </tr>
                                <tr>
                                    <td className="border border-black font-bold bg-gray-50 text-red-700">チーム平均</td>
                                    <td className="border border-black">{teamStats?.avgVelocity}</td>
                                    <td className="border border-black">{teamStats?.avgSpin}</td>
                                    <td className="border border-black">{teamStats?.avgEfficiency}</td>
                                    <td className="border border-black">{teamStats?.avgVB}</td>
                                    <td className="border border-black">{teamStats?.avgHB}</td>
                                    <td className="border border-black">{teamStats?.strikeRate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 3. Quick Motion Times */}
                    <div className="mb-2 flex items-center gap-4">
                        <div className="bg-red-600 text-white font-bold px-4 py-1 border border-black text-xs">クイック</div>
                        <table className="border-collapse border border-black text-center flex-grow text-[10px]">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black p-0.5">最短タイム (秒)</th>
                                    <th className="border border-black p-0.5">平均タイム (秒)</th>
                                    <th className="border border-black p-0.5">平均のチーム平均</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black text-base font-bold p-0.5">{manualData.quickTimeBest || '-'}</td>
                                    <td className="border border-black text-base font-bold p-0.5">{manualData.quickTimeAvg || '-'}</td>
                                    <td className="border border-black text-base font-bold p-0.5">{manualData.quickTimeTeam || '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="text-sm font-bold ml-4">目標は1.29秒以内</div>
                    </div>

                    {/* 4. Charts Section - Reduced Height */}
                    <div className="grid grid-cols-2 gap-4 min-h-[350px]">
                        {/* Left: Break Chart */}
                        <div className="border border-green-600 p-1 flex flex-col items-center justify-center">
                            <h3 className="text-center font-bold text-sm mb-1">変化量チャートと球種別平均値</h3>
                            <div className="relative w-[280px] h-[280px] border border-gray-100">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" dataKey="hb" name="Horizontal Break" domain={[-70, 70]} label={{ value: '横の変化量', position: 'bottom', offset: 0, fontSize: 9, dy: 5 }} tick={{ fontSize: 9 }} />
                                        <YAxis type="number" dataKey="vb" name="Vertical Break" domain={[-70, 70]} label={{ value: '縦の変化量', angle: -90, position: 'left', offset: 0, fontSize: 9, dx: -5 }} tick={{ fontSize: 9 }} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Pitches" data={playerStats.rawPitches} fill="#8884d8" shape={<circle r={3} />}>
                                            {playerStats.rawPitches.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getTypeColor(entry.type)} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-1 text-[8px] w-full">
                                <table className="w-full border-collapse border border-black text-center table-fixed">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-black p-0 w-[20%]">球種</th>
                                            <th className="border border-black p-0 w-[20%]">回転数</th>
                                            <th className="border border-black p-0 w-[20%]">回転効率</th>
                                            <th className="border border-black p-0 w-[20%]">縦の変化量</th>
                                            <th className="border border-black p-0 w-[20%]">横の変化量</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playerStats.averages.map(s => (
                                            <tr key={s.type}>
                                                <td className="border border-black text-white p-0" style={{ backgroundColor: getTypeColor(s.type) }}>{s.type}</td>
                                                <td className="border border-black p-0">{s.avgSpin}</td>
                                                <td className="border border-black p-0">{s.avgEfficiency}</td>
                                                <td className="border border-black p-0">{s.avgVB}</td>
                                                <td className="border border-black p-0">{s.avgHB}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right: Velocity Difference */}
                        <div className="border border-green-600 p-1 flex flex-col">
                            <h3 className="text-center font-bold text-sm mb-1">球速緩急差（平均値）</h3>
                            <div className="flex items-start h-full">
                                <div className="w-[50px] h-full relative mr-1 flex-shrink-0">
                                    <div className="absolute left-[60%] top-0 bottom-0 w-0.5 bg-black transform -translate-x-1/2"></div>
                                    {(() => {
                                        const velocities = playerStats.averages.map(s => parseFloat(s.avgVelocity));
                                        const maxV = Math.max(...velocities);
                                        const minV = Math.min(...velocities);
                                        const yMax = Math.ceil((maxV + 10) / 10) * 10;
                                        const yMin = Math.floor((minV - 10) / 10) * 10;
                                        const range = yMax - yMin;
                                        const step = range > 60 ? 20 : 10;
                                        const ticks = [];
                                        for (let v = yMax; v >= yMin; v -= step) {
                                            ticks.push(v);
                                        }

                                        return (
                                            <>
                                                {ticks.map(tick => {
                                                    const bottomPct = ((tick - yMin) / range) * 100;
                                                    return (
                                                        <div key={tick} className="absolute right-[50%] text-[9px] text-right transform translate-y-1/2" style={{ bottom: `${bottomPct}%` }}>
                                                            {tick}
                                                        </div>
                                                    );
                                                })}
                                                {playerStats.averages.map(s => {
                                                    const vel = parseFloat(s.avgVelocity);
                                                    const percent = ((vel - yMin) / range) * 100;
                                                    if (percent < 0 || percent > 100) return null;
                                                    return (
                                                        <div key={s.type} className="absolute w-3 h-3 rounded-full border border-white shadow-sm z-50" style={{ backgroundColor: getTypeColor(s.type), bottom: `${percent}%`, left: '60%', transform: 'translate(-50%, 50%)' }} title={`${s.type}: ${vel}`} />
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="flex-grow flex justify-end pr-2">
                                    <table className="w-[85%] border-collapse border border-black text-center text-[10px]">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-black p-1 w-[35%]">球種</th>
                                                <th className="border border-black p-1">投球<br />速度</th>
                                                <th className="border border-black p-1">ストレート<br />に対する<br />割合(%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const fb = playerStats.averages.find(s => s.type.includes('ストレート'));
                                                const fbVel = fb ? parseFloat(fb.avgVelocity) : 0;
                                                return playerStats.averages.map(s => {
                                                    const vel = parseFloat(s.avgVelocity);
                                                    const ratio = fbVel > 0 ? ((vel / fbVel) * 100).toFixed(1) : '-';
                                                    return (
                                                        <tr key={s.type}>
                                                            <td className="border border-black text-white font-bold p-1" style={{ backgroundColor: getTypeColor(s.type) }}>{s.type}</td>
                                                            <td className="border border-black text-sm font-bold p-1">{s.avgVelocity}</td>
                                                            <td className="border border-black bg-gray-100 font-bold p-1">{ratio}</td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Feedback;

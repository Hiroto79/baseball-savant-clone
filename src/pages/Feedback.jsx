import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, ReferenceArea, ReferenceDot, ReferenceLine, Polygon, Customized, Label } from 'recharts';

const Feedback = () => {
    const { language, feedbackPitchingData, setFeedbackPitchingData, setFeedbackPitchingFile } = useSettings();
    const [uploadData, setUploadData] = useState(feedbackPitchingData || []);
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [customPlayerName, setCustomPlayerName] = useState(''); // Editable name for print
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'team' | 'print-all'
    const [teamPitchType, setTeamPitchType] = useState('ストレート');
    const [selectedThrowHand, setSelectedThrowHand] = useState('Right'); // 'Right' | 'Left'
    const [teamPlayersPerPage, setTeamPlayersPerPage] = useState(20); // Changed from 30 to 20
    const [teamPlayerSort, setTeamPlayerSort] = useState('original'); // 'original', 'grade', 'velocity_desc', 'spin_desc', 'strike_desc'

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
        quickTimeTeam: '',
        teamQuickAvg: '' // Manual input for team footer
    });

    // Per-Pitch-Type Manual Strike Rates
    const [manualStrikeRates, setManualStrikeRates] = useState({});

    // Sync custom name when player is selected
    useEffect(() => {
        if (selectedPlayer) {
            setCustomPlayerName(selectedPlayer);
        }
    }, [selectedPlayer]);

    // Auto-derive players from uploadData if it exists (e.g. from context)
    useEffect(() => {
        if (uploadData && uploadData.length > 0) {
            const uniquePlayers = [...new Set(uploadData.map(d => d['Player Name'] || d.PlayerName).filter(Boolean))];
            setPlayers(uniquePlayers);
            // If there's no selected player, default to the first
            if (uniquePlayers.length > 0 && !selectedPlayer) {
                setSelectedPlayer(uniquePlayers[0]);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploadData]);

    // Handle File Upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        if (setFeedbackPitchingFile) setFeedbackPitchingFile(file.name);

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
                if (setFeedbackPitchingData) setFeedbackPitchingData(data);
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
        if (!type) return '';
        const t = type.toLowerCase();

        if (t.includes('quick') && (t.includes('fastball') || t.includes('straight'))) return 'ストレート(クイック)';
        if (t.includes('two') || t.includes('2')) return 'ツーシーム';
        if (t.includes('cut')) return 'カットボール';
        if (t.includes('split') || t.includes('fork')) return 'スプリット';
        if (t.includes('change')) return 'チェンジアップ';
        if (t.includes('sinker')) return 'シンカー';
        if (t.includes('fastball') || t.includes('straight')) return 'ストレート';
        if (t.includes('slider')) return 'スライダー';
        if (t.includes('curve')) return 'カーブ';
        return type;
    };

    // Helper: Get Pitch Color
    const getTypeColor = (type) => {
        if (!type) return '#6b7280';
        const t = type.toLowerCase();
        if (t.includes('ストレート') || t.includes('straight') || t.includes('fastball') || t.includes('4シーム') || t.includes('4-seam')) return '#ef4444'; // Red for Straight
        if (t.includes('ツーシーム') || t.includes('2シーム') || t.includes('2-seam')) return '#00BFFF';
        if (t.includes('シュート') || t.includes('sinker') || t.includes('シンカー')) return '#A6A6A6';
        if (t.includes('カット') || t.includes('cutter')) return '#0070C0';
        if (t.includes('スプリット') || t.includes('split')) return '#FFC000';
        if (t.includes('フォーク') || t.includes('fork')) return '#D9D9D9';
        if (t.includes('スライダー') || t.includes('スラ') || t.includes('slider') || t.includes('sweeper')) return '#7030A0';
        if (t.includes('チェンジアップ') || t.includes('change')) return '#FFE599';
        if (t.includes('カーブ') || t.includes('curve')) return '#00B050';
        return '#6b7280';
    };

    // Helper: Get Pitch Text Color (for better contrast against background shape colors)
    const getTypeTextColor = (type) => {
        if (!type) return '#ffffff';
        const t = type.toLowerCase();
        if (t.includes('シュート') || t.includes('sinker') || t.includes('シンカー')) return '#000000';
        if (t.includes('スプリット') || t.includes('split')) return '#000000';
        if (t.includes('フォーク') || t.includes('fork')) return '#000000';
        if (t.includes('チェンジアップ') || t.includes('change')) return '#000000';
        return '#ffffff';
    };

    // Helper to format pitch type name with line break before parenthesis
    const formatPitchTypeName = (type) => {
        if (!type) return '';
        const match = type.match(/^([^(]+)\((.+)\)$/);
        if (match) {
            return (
                <>
                    {match[1].trim()}
                    <br />
                    {match[2]}
                </>
            );
        }
        return type;
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

    // Calculate Team Averages
    const teamStats = useMemo(() => {
        if (uploadData.length === 0) return null;

        // Group players by their name
        const playerNames = [...new Set(uploadData.map(d => d['Player Name'] || d.PlayerName).filter(Boolean))];

        const allPitchers = playerNames.map(name => {
            const pData = uploadData.filter(d => (d['Player Name'] || d.PlayerName) === name);

            // Normalize Hand
            const rawHand = pData[0]?.PitcherThrows || pData[0]?.['Pitcher Side'] || 'Right';
            let hand = 'Right';
            if (['L', 'Left', '左', '左投げ'].some(s => String(rawHand).includes(s))) {
                hand = 'Left';
            } else if (['R', 'Right', '右', '右投げ'].some(s => String(rawHand).includes(s))) {
                hand = 'Right';
            }

            // Get data for the selected pitch type (default Straight)
            const straightPitches = pData.filter(d => getJapanesePitchType(d['Pitch Type'] || d.PitchType).includes(teamPitchType));

            if (straightPitches.length === 0) {
                return { name, hand, avgVelocity: '-', maxVelocity: '-', avgSpin: '-', strikeRate: '-' };
            }

            // Robust Average Helper
            // Robust Average Helper
            const getAvg = (arr, key, precision = 1, allowZero = false) => {
                const getVal = (d, k) => {
                    if (k === 'Velocity') return d['Velocity'] || d['Speed'] || d.Velocity || d.Speed || d['投球速度(km/h)'] || d['投球速度'];
                    if (k === 'Vertical Break') return d['VB (spin)'] || d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)'];
                    if (k === 'Horizontal Break') return d['Horizontal Break'] || d.HorizontalBreak || d['HB (trajectory)'];
                    if (k === 'Total Spin') return d['Total Spin'] || d.TotalSpin || d['Spin'] || d['総回転数(rpm)'] || d['総回転数'];
                    if (k === 'Efficiency') {
                        const ek = Object.keys(d).find(x => x.toLowerCase().includes('efficienc') || x.includes('回転効率'));
                        return d['Spin Efficiency'] || d.SpinEfficiency || d['Spin Efficiency (release)'] || (ek ? d[ek] : undefined);
                    }
                    return d[k] || d[k.replace(' ', '')];
                };
                const valid = arr.map(d => {
                    const raw = getVal(d, key);
                    if (raw === undefined || raw === null || raw === '') return NaN;
                    return Number(raw);
                }).filter(v => !isNaN(v) && (allowZero || v !== 0));

                if (!valid.length) return '-';
                return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(precision);
            };
            const getAvgInt = (arr, key, allowZero = false) => {
                const getVal = (d, k) => {
                    if (k === 'Velocity') return d['Velocity'] || d['Speed'] || d.Velocity || d.Speed || d['投球速度(km/h)'] || d['投球速度'];
                    if (k === 'Vertical Break') return d['VB (spin)'] || d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)'];
                    if (k === 'Horizontal Break') return d['Horizontal Break'] || d.HorizontalBreak || d['HB (trajectory)'];
                    if (k === 'Total Spin') return d['Total Spin'] || d.TotalSpin || d['Spin'] || d['総回転数(rpm)'] || d['総回転数'];
                    if (k === 'Efficiency') {
                        const ek = Object.keys(d).find(x => x.toLowerCase().includes('efficienc') || x.includes('回転効率'));
                        return d['Spin Efficiency'] || d.SpinEfficiency || d['Spin Efficiency (release)'] || (ek ? d[ek] : undefined);
                    }
                    return d[k] || d[k.replace(' ', '')];
                };
                const valid = arr.map(d => Number(getVal(d, key) || 0)).filter(v => !isNaN(v) && (allowZero || v !== 0));
                if (!valid.length) return '-';
                return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
            };

            // Spin Direction (HH:MM) Average helper
            const timeToMin = (t) => {
                if (!t) return 0;
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            };
            const minToTime = (min) => {
                let h = Math.floor(min / 60);
                let m = Math.round(min % 60);
                if (m === 60) { h++; m = 0; }
                if (h > 12) h -= 12; // Keep 12h format roughly
                // Simple formatting
                return `${h}:${m.toString().padStart(2, '0')}`;
            };


            const avgVelocity = getAvg(straightPitches, 'Velocity', 1);
            const avgSpin = getAvgInt(straightPitches, 'Total Spin');
            const avgEff = getAvg(straightPitches, 'Efficiency', 1);
            const avgVB = getAvg(straightPitches, 'Vertical Break', 1, true); // Allow 0 for breaks
            const avgHB = getAvg(straightPitches, 'Horizontal Break', 1, true); // Allow 0 for breaks
            const avgRahActual = getAvg(straightPitches, 'Horizontal Angle', 1);
            const avgRavActual = getAvg(straightPitches, 'Release Angle', 1);
            const avgRh = getAvg(straightPitches, 'Release Height', 2);
            const avgRs = getAvg(straightPitches, 'Release Side', 2);
            // Check Gyro Angle or Gyro Degree or Japanese
            const getGyro = () => {
                const keys = ['Gyro Angle', 'GyroAngle', 'Gyro Degree', 'GyroDegree', 'Gyro', 'ジャイロ角度', 'Gyro Degree (deg)'];
                const validGyros = [];
                straightPitches.forEach(d => {
                    for (const k of keys) {
                        const valRaw = d[k];
                        if (valRaw !== undefined && valRaw !== null && valRaw !== '') {
                            const val = Number(valRaw);
                            if (!isNaN(val) && val !== 0) { // Ignore 0 for Gyro per instructions
                                validGyros.push(val);
                                break;
                            }
                        }
                    }
                });

                if (validGyros.length === 0) return '-';
                return (validGyros.reduce((a, b) => a + b, 0) / validGyros.length).toFixed(1);
            };
            const avgGyro = getGyro();


            // Explicitly calculate Max Straight Velocity for the "Max" row
            // AND Sync other max metrics to this specific pitch
            const distinctStraightPitches = pData.filter(d => {
                const t = getJapanesePitchType(d['Pitch Type'] || d.PitchType);
                return t.includes('ストレート') || t.includes('fastball') || t.includes('straight');
            });

            // Find the single pitch with the highest velocity
            let fastestPitch = null;
            let maxVelVal = -Infinity;

            distinctStraightPitches.forEach(d => {
                const v = Number(d.Velocity || d.Speed || d['Speed'] || d['投球速度(km/h)'] || d['投球速度']);
                const spin = Number(d['Total Spin'] || d.TotalSpin || d['Spin'] || d['総回転数(rpm)'] || d['総回転数']);
                const vb = Number(d['VB (spin)'] || d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)']);
                // Exclude pitches with purely missing tracking data
                if (!isNaN(v) && v > maxVelVal && (!isNaN(spin) || !isNaN(vb))) {
                    maxVelVal = v;
                    fastestPitch = d;
                }
            });

            const maxVelocity = maxVelVal > 0 ? maxVelVal.toFixed(1) : '-';
            const allPitchersMaxStraightVel = maxVelVal > 0 ? maxVelVal.toFixed(1) : 0;

            // Get metrics FROM THE FASTEST PITCH
            const maxSpinVal = fastestPitch ? Number(fastestPitch['Total Spin'] || fastestPitch.TotalSpin || fastestPitch['Spin'] || fastestPitch['総回転数(rpm)'] || fastestPitch['総回転数'] || 0).toFixed(0) : 0;
            const effKeyMax = fastestPitch ? Object.keys(fastestPitch).find(k => k.toLowerCase().includes('efficienc') || k.includes('回転効率')) : null;
            const maxEffVal = fastestPitch ? Number(fastestPitch['Spin Efficiency'] || fastestPitch.SpinEfficiency || fastestPitch['Spin Efficiency (release)'] || (effKeyMax ? fastestPitch[effKeyMax] : 0)) : 0;
            const maxSpinDir = fastestPitch ? (fastestPitch['Spin Direction'] || fastestPitch.SpinAxis || fastestPitch['Spin Axis'] || '-') : '-';

            // Helper for specific fastest pitch values
            const getFastestVal = (key) => {
                if (!fastestPitch) return '-';
                if (key === 'Vertical Break') return fastestPitch['VB (spin)'] || fastestPitch['Vertical Break'] || fastestPitch.VerticalBreak || fastestPitch['VB (trajectory)'];
                if (key === 'Horizontal Break') return fastestPitch['Horizontal Break'] || fastestPitch.HorizontalBreak || fastestPitch['HB (trajectory)'];
                if (key === 'Horizontal Angle') return fastestPitch['Horizontal Angle'] || fastestPitch.HorizontalAngle;
                if (key === 'Release Angle') return fastestPitch['Release Angle'] || fastestPitch.ReleaseAngle;
                if (key === 'Release Height') return fastestPitch['Release Height'] || fastestPitch.ReleaseHeight;
                if (key === 'Release Side') return fastestPitch['Release Side'] || fastestPitch.ReleaseSide;
                if (key === 'Gyro') return fastestPitch['Gyro Degree'] || fastestPitch.GyroDegree || fastestPitch['Gyro'] || fastestPitch['Gyro Angle'] || fastestPitch['Spin Axis (Gyro)'] || fastestPitch['Gyro Degree (deg)'];
                return fastestPitch[key];
            };



            const spinDirSum = straightPitches.reduce((sum, d) => sum + timeToMin(d['Spin Direction'] || d.SpinAxis || '0:00'), 0);

            let strikeCount = 0;
            let oppCount = 0;
            straightPitches.forEach(d => {
                const isStrikeCol = d['Is Strike'] || d.IsStrike;
                if (isStrikeCol !== undefined && isStrikeCol !== null && isStrikeCol !== '') {
                    oppCount++;
                    if (['yes', 'true', 'y', '1', 1].includes(String(isStrikeCol).toLowerCase())) strikeCount++;
                }
            });

            const count = straightPitches.length;

            // Grade Parsing
            // Try common column names
            const rawGrade = pData[0]?.['School Year'] || pData[0]?.['SchoolYear'] || pData[0]?.['Grade'] || pData[0]?.['学年'] || '';

            let gradeColor = 'text-black'; // Default 1st year
            let gradeGroup = '1'; // Default group

            if (rawGrade) {
                const gStr = String(rawGrade).trim();
                // Check if it CONTAINS '2' -> 2nd year
                // Check if it CONTAINS '3' -> 3rd year (or MS3)
                // Else 1st year
                if (gStr.includes('2') || gStr === '2') {
                    gradeColor = 'text-red-600';
                    gradeGroup = '2';
                } else if (gStr.includes('3') || gStr === '3') {
                    gradeColor = 'text-blue-600';
                    gradeGroup = '3';
                } else {
                    gradeColor = 'text-black';
                    gradeGroup = '1';
                }
            }


            return {
                name,
                hand,
                gradeGroup,
                gradeColor,
                avgVelocity,
                maxVelocity,
                maxStraightVelocity: allPitchersMaxStraightVel > 0 ? allPitchersMaxStraightVel : '-',
                avgSpin,
                maxSpin: maxSpinVal > 0 ? maxSpinVal : '-',
                avgEff,
                avgVB,
                avgHB,
                avgRah: avgRahActual,
                avgRav: avgRavActual,
                avgRh,
                avgRs,
                avgGyro,
                avgSpinDir: count ? minToTime(spinDirSum / count) : '-',
                strikeRate: oppCount ? ((strikeCount / oppCount) * 100).toFixed(1) : '-',
                maxEfficiency: maxEffVal > 0 ? maxEffVal.toFixed(1) : '-',
                maxSpinDir: maxSpinDir,
                // Max Magnitude Values -> NOW SYNCED TO FASTEST PITCH
                maxVB: fastestPitch ? Number(getFastestVal('Vertical Break')).toFixed(1) : '-',
                maxHB: fastestPitch ? Number(getFastestVal('Horizontal Break')).toFixed(1) : '-',
                maxRAH: fastestPitch ? Number(getFastestVal('Horizontal Angle')).toFixed(1) : '-',
                maxRAV: fastestPitch ? Number(getFastestVal('Release Angle')).toFixed(1) : '-',
                maxRH: fastestPitch ? Number(getFastestVal('Release Height')).toFixed(1) : '-',
                maxRS: fastestPitch ? Number(getFastestVal('Release Side')).toFixed(1) : '-',
                maxGyro: fastestPitch ? Number(getFastestVal('Gyro')).toFixed(1) : '-'
            };
        });



        // Current filtered pitchers by selected hand
        const filteredPitchers = allPitchers.filter(p => p.hand === selectedThrowHand);

        // Grade Averages Calculation
        // Order: Not strictly needed here, just calculation.
        const gradeStats = {};
        ['3', '2', '1'].forEach(g => {
            const gPitchers = filteredPitchers.filter(p => p.gradeGroup === g);
            if (gPitchers.length === 0) return;

            const validMaxVels = gPitchers.filter(p => p.maxStraightVelocity !== '-').map(p => Number(p.maxStraightVelocity));
            const validSpins = gPitchers.filter(p => p.avgSpin !== '-').map(p => Number(p.avgSpin));
            const validStrikes = gPitchers.filter(p => p.strikeRate !== '-').map(p => Number(p.strikeRate));

            gradeStats[g] = {
                avgMaxVelocity: validMaxVels.length ? (validMaxVels.reduce((a, b) => a + b, 0) / validMaxVels.length).toFixed(1) : '-',
                avgSpin: validSpins.length ? (validSpins.reduce((a, b) => a + b, 0) / validSpins.length).toFixed(1) : '-',
                avgStrikeRate: validStrikes.length ? (validStrikes.reduce((a, b) => a + b, 0) / validStrikes.length).toFixed(1) : '-',
                label: g === '3' ? (language === 'ja' ? '中学3年生平均' : '3rd Year Avg') : (g === '2' ? (language === 'ja' ? '2年生平均' : '2nd Year Avg') : (language === 'ja' ? '1年生平均' : '1st Year Avg'))
            };
        });


        // Team Average for footer
        const validVels = filteredPitchers.filter(p => p.avgVelocity !== '-').map(p => Number(p.avgVelocity));
        const validMaxVels = filteredPitchers.filter(p => p.maxStraightVelocity !== '-').map(p => Number(p.maxStraightVelocity));
        const validSpins = filteredPitchers.filter(p => p.avgSpin !== '-').map(p => Number(p.avgSpin));
        const validEffs = filteredPitchers.filter(p => p.avgEff !== '-').map(p => Number(p.avgEff));
        const validStrikes = filteredPitchers.filter(p => p.strikeRate !== '-').map(p => Number(p.strikeRate));

        return {
            pitchers: filteredPitchers,
            gradeStats,
            avgVelocity: validVels.length ? (validVels.reduce((a, b) => a + b, 0) / validVels.length).toFixed(1) : '-',
            avgMaxVelocity: validMaxVels.length ? (validMaxVels.reduce((a, b) => a + b, 0) / validMaxVels.length).toFixed(1) : '-',
            avgSpin: validSpins.length ? (validSpins.reduce((a, b) => a + b, 0) / validSpins.length).toFixed(1) : '-',
            avgEfficiency: validEffs.length ? (validEffs.reduce((a, b) => a + b, 0) / validEffs.length).toFixed(1) : '-',
            avgStrikeRate: validStrikes.length ? (validStrikes.reduce((a, b) => a + b, 0) / validStrikes.length).toFixed(1) : '-'
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uploadData, selectedThrowHand, teamPitchType]);


    // Calculate Averages for a Player
    const calcPitcherStats = (pName) => {
        if (!pName || uploadData.length === 0) return null;
        const playerData = uploadData.filter(d => (d['Player Name'] || d.PlayerName) === pName);

        const processData = (data) => {
            const byType = {};
            const rawPitches = [];

            data.forEach(d => {
                const rawType = d['Pitch Type'] || d.PitchType || 'Unknown';
                const type = getJapanesePitchType(rawType);

                if (!byType[type]) {
                    byType[type] = {
                        count: 0,
                        velocitySum: 0, velocityCount: 0, maxVelocity: -Infinity,
                        spinSum: 0, spinCount: 0, maxSpin: -Infinity,
                        efficiencySum: 0, efficiencyCount: 0,
                        vbSum: 0, vbCount: 0, maxVB: -Infinity,
                        hbSum: 0, hbCount: 0, maxHB: -Infinity,
                        releaseAngleSumV: 0, releaseAngleCountV: 0, maxRAV: -Infinity,
                        releaseAngleSumH: 0, releaseAngleCountH: 0, maxRAH: -Infinity,
                        releaseHeightSum: 0, releaseHeightCount: 0, maxRH: -Infinity,
                        releaseSideSum: 0, releaseSideCount: 0, maxRS: -Infinity,
                        releaseExtensionSum: 0, releaseExtensionCount: 0, maxRE: -Infinity,
                        strikeCount: 0, strikeOppCount: 0,
                        gyroSum: 0, gyroCount: 0,
                        spinDirections: [],
                        bestSpinDirection: '', minDistTo12: Infinity
                    };
                }

                const stats = byType[type];
                stats.count++;

                const vel = Number(d.Velocity || d.Speed || d['Speed'] || d['投球速度(km/h)'] || d['投球速度']);
                if (!isNaN(vel)) {
                    stats.velocitySum += vel;
                    stats.velocityCount++;
                    if (vel > stats.maxVelocity) stats.maxVelocity = vel;
                }
                const spin = Number(d['Total Spin'] || d.TotalSpin || d['Spin'] || d['総回転数(rpm)'] || d['総回転数']);
                if (!isNaN(spin)) {
                    stats.spinSum += spin;
                    stats.spinCount++;
                    if (spin > stats.maxSpin) stats.maxSpin = spin;
                }
                const effKey = Object.keys(d).find(k => k.toLowerCase().includes('efficienc') || k.includes('回転効率'));
                const eff = Number(d['Spin Efficiency'] || d.SpinEfficiency || d['Spin Efficiency (release)'] || (effKey ? d[effKey] : NaN));
                if (!isNaN(eff)) {
                    stats.efficiencySum += eff;
                    stats.efficiencyCount++;
                }
                const vb = Number(d['VB (spin)'] || d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)']);
                if (!isNaN(vb)) {
                    stats.vbSum += vb;
                    stats.vbCount++;
                    if (vb > stats.maxVB) stats.maxVB = vb;
                }
                const hb = Number(d['Horizontal Break'] || d.HorizontalBreak || d['HB (trajectory)']);
                if (!isNaN(hb)) {
                    stats.hbSum += hb;
                    stats.hbCount++;
                    if (hb > stats.maxHB) stats.maxHB = hb;
                }
                const raH = Number(d['Horizontal Angle'] || d.HorizontalAngle);
                if (!isNaN(raH)) {
                    stats.releaseAngleSumH += raH;
                    stats.releaseAngleCountH++;
                    if (raH > stats.maxRAH) stats.maxRAH = raH;
                }
                const raV = Number(d['Release Angle'] || d.ReleaseAngle);
                if (!isNaN(raV)) {
                    stats.releaseAngleSumV += raV;
                    stats.releaseAngleCountV++;
                    if (raV > stats.maxRAV) stats.maxRAV = raV;
                }
                const rh = Number(d['Release Height'] || d.ReleaseHeight);
                if (!isNaN(rh)) {
                    stats.releaseHeightSum += rh;
                    stats.releaseHeightCount++;
                    if (rh > stats.maxRH) stats.maxRH = rh;
                }
                const rs = Number(d['Release Side'] || d.ReleaseSide);
                if (!isNaN(rs)) {
                    stats.releaseSideSum += rs;
                    stats.releaseSideCount++;
                    if (rs > stats.maxRS) stats.maxRS = rs;
                }
                const reKey = Object.keys(d).find(k => k.toLowerCase().includes('extension'));
                const re = Number(d['Release Extension'] || d.ReleaseExtension || d.Extension || d['Extension'] || (reKey ? d[reKey] : NaN));
                if (!isNaN(re)) {
                    stats.releaseExtensionSum += re;
                    stats.releaseExtensionCount++;
                    if (re > stats.maxRE) { stats.maxRE = re; }
                }

                // FIX: Check Raw Value for Gyro before Number() to avoid converting empty string to 0 and filtering it or not.
                // We want to count 0 if it is explicitly 0, but ignore if empty.
                const gyroRaw = d['Gyro Degree'] || d.GyroDegree || d['Gyro'] || d['Gyro Angle'] || d['Spin Axis (Gyro)'] || d['Gyro Degree (deg)'];
                if (gyroRaw !== undefined && gyroRaw !== null && gyroRaw !== '') {
                    const gyro = Number(gyroRaw);
                    if (!isNaN(gyro) && gyro !== 0) { // Should we ignore 0? User says "Ignore - and 0".
                        stats.gyroSum += gyro;
                        stats.gyroCount++;
                        if (gyro > stats.maxGyro) stats.maxGyro = gyro;
                        if (gyro < stats.minGyro) stats.minGyro = gyro;
                    }
                }

                const sd = d['Spin Direction'] || d.SpinDirection || d['Spin Axis (Clock)'] || d['Spin Axis'] || d.SpinAxis;
                if (sd) {
                    stats.spinDirections.push(sd);
                    const dist = getMinutesFrom12(sd);
                    if (dist < stats.minDistTo12) {
                        stats.minDistTo12 = dist;
                        stats.bestSpinDirection = sd;
                    }
                    if (vel > stats.maxVelForClock) {
                        stats.maxVelForClock = vel;
                        stats.maxClock = sd;
                    }
                }

                const isStrikeCol = d['Is Strike'] || d.IsStrike;
                if (isStrikeCol !== undefined && isStrikeCol !== null && isStrikeCol !== '') {
                    stats.strikeOppCount++;
                    if (['yes', 'true', 'y', '1', 1].includes(String(isStrikeCol).toLowerCase())) stats.strikeCount++;
                }

                if (!isNaN(vb) && !isNaN(hb)) {
                    rawPitches.push({ type, vb, hb, velocity: vel });
                }
            });

            const getVelocityDistribution = (pitches) => {
                const buckets = {};
                pitches.forEach(p => {
                    const v = parseFloat(p.Velocity || p.Speed || p['Speed'] || p['投球速度(km/h)'] || p['投球速度']);
                    if (isNaN(v)) return;
                    const bin = Math.floor(v / 2) * 2; // 2km/h bins
                    buckets[bin] = (buckets[bin] || 0) + 1;
                });
                return Object.keys(buckets).map(bin => ({
                    velocity: Number(bin),
                    count: buckets[bin]
                })).sort((a, b) => a.velocity - b.velocity);
            };

            const velocityDistribution = getVelocityDistribution(data);

            let averages = Object.keys(byType).map(type => {
                const s = byType[type];
                let avgGyro = '-';
                if (s.gyroCount > 0) avgGyro = (s.gyroSum / s.gyroCount).toFixed(1);

                const fmtMax = (val, fixed) => {
                    if (val === undefined || val === null || isNaN(val) || val === -Infinity) return '-';
                    return Number(val).toFixed(fixed);
                };

                // Find Fastest Pitch for "Max" values in Individual Report
                let fastest = null;
                let maxV = -Infinity;
                const typePitches = data.filter(d => getJapanesePitchType(d['Pitch Type'] || d.PitchType) === type);

                typePitches.forEach(d => {
                    const v = Number(d.Velocity || d.Speed || d['Speed'] || d['投球速度(km/h)'] || d['投球速度']);
                    const spin = Number(d['Total Spin'] || d.TotalSpin || d['Spin'] || d['総回転数(rpm)'] || d['総回転数']);
                    const vb = Number(d['VB (spin)'] || d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)']);
                    // Exclude pitches with purely missing tracking data
                    if (!isNaN(v) && v > maxV && (!isNaN(spin) || !isNaN(vb))) {
                        maxV = v;
                        fastest = d;
                    }
                });

                const maxVVal = isFinite(maxV) ? maxV : 0;

                // Helper to get value from FASTEST pitch
                const getFV = (key) => {
                    if (!fastest) return '-';
                    if (key === 'Efficiency') {
                        const k = Object.keys(fastest).find(k => k.toLowerCase().includes('efficienc') || k.includes('回転効率'));
                        return fastest['Spin Efficiency'] || fastest.SpinEfficiency || fastest['Spin Efficiency (release)'] || (k ? fastest[k] : NaN);
                    }
                    if (key === 'Vertical Break') return fastest['VB (spin)'] || fastest['Vertical Break'] || fastest.VerticalBreak || fastest['VB (trajectory)'];
                    if (key === 'Horizontal Break') return fastest['Horizontal Break'] || fastest.HorizontalBreak || fastest['HB (trajectory)'];
                    if (key === 'Horizontal Angle') return fastest['Horizontal Angle'] || fastest.HorizontalAngle;
                    if (key === 'Release Angle') return fastest['Release Angle'] || fastest.ReleaseAngle;
                    if (key === 'Release Height') return fastest['Release Height'] || fastest.ReleaseHeight;
                    if (key === 'Release Side') return fastest['Release Side'] || fastest.ReleaseSide;
                    if (key === 'Release Extension') {
                        const k = Object.keys(fastest).find(k => k.toLowerCase().includes('extension'));
                        return fastest['Release Extension'] || fastest.ReleaseExtension || fastest.Extension || fastest['Extension'] || (k ? fastest[k] : NaN);
                    }
                    if (key === 'Gyro') return fastest['Gyro Degree'] || fastest.GyroDegree || fastest['Gyro'] || fastest['Gyro Angle'] || fastest['Spin Axis (Gyro)'] || fastest['Gyro Degree (deg)'];
                    if (key === 'Spin Direction') return fastest['Spin Direction'] || fastest.SpinDirection || fastest['Spin Axis (Clock)'] || fastest['Spin Axis'] || fastest.SpinAxis;
                    if (key === 'Spin') return fastest['Total Spin'] || fastest.TotalSpin || fastest['Spin'] || fastest['総回転数(rpm)'] || fastest['総回転数'];

                    return fastest[key];
                };

                return {
                    type,
                    count: s.count,
                    avgVelocity: s.velocityCount ? (s.velocitySum / s.velocityCount).toFixed(1) : '-',
                    maxVelocity: fmtMax(maxVVal, 1),
                    avgSpin: s.spinCount ? Math.round(s.spinSum / s.spinCount) : '-',
                    maxSpin: fmtMax(getFV('Spin'), 0), // Use fastest pitch's spin, integer per request
                    avgEfficiency: s.efficiencyCount ? (s.efficiencySum / s.efficiencyCount).toFixed(1) : '-',
                    maxEfficiency: fmtMax(getFV('Efficiency'), 1),
                    avgClock: getAverageTime(s.spinDirections),
                    avgVB: s.vbCount ? (s.vbSum / s.vbCount).toFixed(1) : '-',
                    maxVB: fmtMax(getFV('Vertical Break'), 1),
                    avgHB: s.hbCount ? (s.hbSum / s.hbCount).toFixed(1) : '-',
                    maxHB: fmtMax(getFV('Horizontal Break'), 1),
                    avgRAH: s.releaseAngleCountH ? (s.releaseAngleSumH / s.releaseAngleCountH).toFixed(2) : '-',
                    maxRAH: fmtMax(getFV('Horizontal Angle'), 2),
                    avgRAV: s.releaseAngleCountV ? (s.releaseAngleSumV / s.releaseAngleCountV).toFixed(2) : '-',
                    maxRAV: fmtMax(getFV('Release Angle'), 2),
                    avgRH: s.releaseHeightCount ? (s.releaseHeightSum / s.releaseHeightCount).toFixed(2) : 0,
                    maxRH: fmtMax(getFV('Release Height'), 2),
                    avgRS: s.releaseSideCount ? (s.releaseSideSum / s.releaseSideCount).toFixed(2) : 0,
                    maxRS: fmtMax(getFV('Release Side'), 2),
                    avgExtension: s.releaseExtensionCount ? (s.releaseExtensionSum / s.releaseExtensionCount).toFixed(2) : '-',
                    maxExtension: fmtMax(getFV('Release Extension'), 2),
                    avgGyro: avgGyro,
                    maxGyro: fmtMax(getFV('Gyro'), 1),
                    maxClock: getFV('Spin Direction') || '-',
                    strikeRate: s.strikeOppCount ? ((s.strikeCount / s.strikeOppCount) * 100).toFixed(1) : '-'
                };
            });

            averages.sort((a, b) => {
                const isAStraight = a.type.includes('ストレート');
                const isBStraight = b.type.includes('ストレート');
                if (isAStraight && !isBStraight) return -1;
                if (!isAStraight && isBStraight) return 1;
                return b.count - a.count;
            });

            return { averages, rawPitches, velocityDistribution };
        };

        return processData(playerData);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoPlayerStats = useMemo(() => calcPitcherStats(selectedPlayer), [selectedPlayer, uploadData]);

    const handleManualChange = (e) => {
        const { name, value } = e.target;
        setManualData(prev => ({ ...prev, [name]: value }));
    };

    const handleManualStrikeRateChange = (player, pitchType, value) => {
        setManualStrikeRates(prev => ({ ...prev, [`${player}-${pitchType}`]: value }));
    };

    const [teamManualStrikeRates, setTeamManualStrikeRates] = useState({});
    const handleTeamManualStrikeRateChange = (playerName, value) => {
        setTeamManualStrikeRates(prev => ({ ...prev, [playerName]: value }));
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

    // Fix ReferenceErrors for variables used in render
    const prevStats = null; // Placeholder for previous stats if logic is re-implemented later

    // Prepare Chart Data: Merge Quick Straight into Straight for visual chart only
    const calcChartData = (currentStats) => {
        if (!currentStats || !currentStats.averages) return [];

        const parseVal = (val) => {
            const num = Number(val);
            return isFinite(num) ? num : null;
        };

        const straight = currentStats.averages.find(s => s.type === 'ストレート');
        const quick = currentStats.averages.find(s => s.type === 'ストレート(クイック)');

        // Base data without straight types
        // Filter out any entries with invalid HB/VB to prevent chart errors
        let data = currentStats.averages
            .filter(s => s.type !== 'ストレート' && s.type !== 'ストレート(クイック)')
            .map(s => ({
                ...s,
                avgVB: parseVal(s.avgVB),
                avgHB: parseVal(s.avgHB)
            }))
            .filter(s => s.avgVB !== null && s.avgHB !== null);

        if (straight || quick) {
            let totalCount = 0;
            let sumVB = 0;
            let sumHB = 0;

            if (straight) {
                const vb = parseVal(straight.avgVB);
                const hb = parseVal(straight.avgHB);
                if (vb !== null && hb !== null) {
                    sumVB += vb * straight.count;
                    sumHB += hb * straight.count;
                    totalCount += straight.count;
                }
            }

            if (quick) {
                const vb = parseVal(quick.avgVB);
                const hb = parseVal(quick.avgHB);
                if (vb !== null && hb !== null) {
                    sumVB += vb * quick.count;
                    sumHB += hb * quick.count;
                    totalCount += quick.count;
                }
            }

            // Only add merged straight if we have valid data contributions
            if (totalCount > 0) {
                data.push({
                    ...(straight || quick), // Use metadata from whichever exists
                    type: 'ストレート',
                    count: totalCount, // This might differ from raw sum if some had invalid data, but for chart weighting it's correct context
                    avgVB: sumVB / totalCount,
                    avgHB: sumHB / totalCount
                });
            }
        }
        return data;
    };

    const memoChartData = useMemo(() => calcChartData(memoPlayerStats), [memoPlayerStats]);

    // Debug state
    // const [debugMsg, setDebugMsg] = useState('');

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6 mx-auto bg-gray-100 min-h-screen text-black print:p-0 print:px-0 print:min-h-0 print:h-auto print:pb-0 print:bg-white">
            <style>{`
                @media print {
                    @page {
                        size: ${viewMode === 'team' ? 'A4 landscape' : 'A4 portrait'};
                        margin: 4mm;
                    }
                    html,
                    body,
                    #root {
                        width: ${viewMode === 'team' ? '289mm' : '202mm'} !important;
                        min-width: ${viewMode === 'team' ? '289mm' : '202mm'} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    #root > div,
                    main,
                    main > div {
                        display: block !important;
                        width: 100% !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                        color: black !important;
                    }
                    aside,
                    header,
                    nav,
                    .print\\:hidden {
                        display: none !important;
                    }
                    .pitcher-report-container {
                        width: 202mm !important;
                        height: 288mm !important;
                        margin: 0 auto !important;
                        padding: 1.5mm 2mm 1mm !important;
                        box-sizing: border-box !important;
                        overflow: hidden !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 0 !important;
                        color: black !important;
                        font-family: Arial, "Helvetica Neue", sans-serif !important;
                    }
                    .pitcher-report-content {
                        height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        overflow: hidden !important;
                    }
                    .report-title-row {
                        height: 8mm !important;
                        align-items: flex-end !important;
                    }
                    .report-title-row h2 {
                        font-size: 15pt !important;
                        line-height: 1 !important;
                    }
                    .report-title-row div {
                        font-size: 9.5pt !important;
                        line-height: 1 !important;
                    }
                    .report-stitch {
                        height: 4mm !important;
                        margin-bottom: 1mm !important;
                    }
                    .main-stats-table {
                        font-size: 8pt !important;
                    }
                    .main-stats-table thead tr {
                        height: 10mm !important;
                    }
                    .main-stats-table tbody tr {
                        height: 7.5mm !important;
                    }
                    .main-stats-table th {
                        font-size: 7pt !important;
                        line-height: 1.15 !important;
                        padding: 0.6mm !important;
                    }
                    .main-stats-table td {
                        font-size: 9pt !important;
                        line-height: 1.05 !important;
                        padding: 0.3mm !important;
                    }
                    .main-stats-table td:first-child {
                        font-size: 7pt !important;
                    }
                    .comparison-block {
                        margin-top: 4mm !important;
                    }
                    .comparison-table {
                        font-size: 9pt !important;
                    }
                    .comparison-table thead tr {
                        height: 7.5mm !important;
                    }
                    .comparison-table tbody tr {
                        height: 7.5mm !important;
                    }
                    .comparison-table th,
                    .comparison-table td,
                    .comparison-table input {
                        font-size: 9pt !important;
                        line-height: 1 !important;
                    }
                    .quick-block {
                        height: 12mm !important;
                        margin-top: 4mm !important;
                    }
                    .quick-block > div:first-child {
                        width: 34mm !important;
                        font-size: 11pt !important;
                    }
                    .quick-block table,
                    .quick-block th,
                    .quick-block td {
                        font-size: 9pt !important;
                        line-height: 1 !important;
                    }
                    .quick-target {
                        margin-left: 10mm !important;
                        font-size: 9pt !important;
                        white-space: nowrap !important;
                    }
                    .movement-chart-area {
                        height: 70mm !important;
                        width: 70mm !important;
                        margin: 0 auto !important;
                        flex: none !important;
                    }
                    .chart-grid {
                        height: 125mm !important;
                        margin-top: 4mm !important;
                    }
                    .chart-panel {
                        height: 125mm !important;
                        padding: 1.5mm !important;
                    }
                    .chart-panel h3 {
                        font-size: 14pt !important;
                        line-height: 1 !important;
                        margin-bottom: 1.5mm !important;
                    }
                    .movement-summary-table {
                        width: 96% !important;
                        margin: 1.5mm auto 0 !important;
                        font-size: 7.5pt !important;
                    }
                    .movement-summary-table thead tr {
                        height: 8mm !important;
                    }
                    .movement-summary-table tbody tr {
                        height: 6.5mm !important;
                    }
                    .velocity-scale {
                        font-size: 11pt !important;
                    }
                    .speed-ratio-table {
                        font-size: 8pt !important;
                    }
                    .speed-ratio-table thead tr {
                        height: 10mm !important;
                    }
                    .speed-ratio-table tbody tr {
                        height: 8mm !important;
                    }
                    .speed-ratio-table th,
                    .speed-ratio-table td {
                        font-size: 8pt !important;
                        line-height: 1.1 !important;
                    }
                    .gap-reference {
                        font-size: 7pt !important;
                    }
                    .gap-reference > div > div {
                        min-height: 5.5mm !important;
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                    }
                    .pitcher-report-container:last-child {
                        break-after: auto !important;
                        page-break-after: auto !important;
                    }
                }
            `}</style>
            {/* Debug Info Overlay Removed */}

            <div className="print:hidden mb-8 space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-5xl mx-auto">
                <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center flex-grow">
                        <div className="flex bg-white rounded-lg border p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode('individual')}
                                className={`px-6 py-2 rounded-md font-bold transition-all ${viewMode === 'individual' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                個人分析
                            </button>
                            <button
                                onClick={() => setViewMode('team')}
                                className={`px-4 py-2 rounded-md font-bold transition-all text-sm ${viewMode === 'team' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                チーム一覧
                            </button>
                            <button
                                onClick={() => setViewMode('print-all')}
                                className={`px-4 py-2 rounded-md font-bold transition-all text-xs lg:text-sm ${viewMode === 'print-all' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                全員分一括印刷
                            </button>
                        </div>
                        <div className="h-10 w-px bg-gray-300 mx-2"></div>
                        <div className="grid grid-cols-2 gap-2 lg:gap-4 flex-grow">
                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500">{language === 'ja' ? 'データアップロード' : 'Upload CSV'}</label>
                                <div className="relative">
                                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="feedback-upload" />
                                    <label htmlFor="feedback-upload" className="flex items-center justify-between gap-2 px-3 py-1.5 border border-gray-300 rounded bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                                        <span className="text-xs text-gray-600 truncate">{uploadData.length > 0 ? `${uploadData.length} rows` : 'Click to upload'}</span>
                                        <Upload size={14} className="text-gray-500" />
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-500">{language === 'ja' ? '選手選択' : 'Select Player'}</label>
                                <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white text-xs font-bold" disabled={players.length === 0}>
                                    <option value="">Select...</option>
                                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="ml-6 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
                        title={language === 'ja' ? '印刷・PDF保存' : 'Print / Save as PDF'}
                    >
                        <Printer size={24} />
                        <span className="font-bold">印刷</span>
                    </button>
                </div>

                {/* Settings Section */}
                <div className="space-y-4 border-t pt-4">
                    {viewMode === 'individual' ? (
                        selectedPlayer && (
                            <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                                <div className="flex gap-4 items-center">
                                    <span className="font-bold text-gray-700">形式:</span>
                                    <div className="flex gap-2">
                                        <span className="px-4 py-1 rounded text-sm font-bold bg-gray-800 text-white">通常分析</span>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <label className="text-xs font-medium text-gray-500">表示名:</label>
                                    <input
                                        type="text"
                                        value={customPlayerName}
                                        onChange={(e) => setCustomPlayerName(e.target.value)}
                                        className="p-1.5 border rounded bg-white font-bold text-sm w-48"
                                        placeholder={selectedPlayer}
                                    />
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                                <div className="flex gap-2 lg:gap-4 items-center flex-wrap">
                                    <span className="font-bold text-gray-700 whitespace-nowrap">設定:</span>
                                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded">
                                        <select value={teamPitchType} onChange={(e) => setTeamPitchType(e.target.value)} className="p-1 border border-gray-300 rounded bg-white text-xs">
                                            <option value="ストレート">ストレート</option>
                                            <option value="スライダー">スライダー</option>
                                            <option value="カーブ">カーブ</option>
                                            <option value="チェンジ">チェンジアップ</option>
                                        </select>
                                        <select value={selectedThrowHand} onChange={(e) => setSelectedThrowHand(e.target.value)} className="p-1 border border-gray-300 rounded bg-white text-xs font-bold">
                                            <option value="Right">右投げ</option>
                                            <option value="Left">左投げ</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded">
                                        <label className="text-[10px] font-bold text-gray-600 whitespace-nowrap">表示順:</label>
                                        <select value={teamPlayerSort} onChange={(e) => setTeamPlayerSort(e.target.value)} className="p-1 border border-gray-300 rounded bg-white text-[10px] font-bold">
                                            <option value="original">デフォルト</option>
                                            <option value="grade">学年順</option>
                                            <option value="velocity_desc">球速順 (降順)</option>
                                            <option value="spin_desc">回転数順 (降順)</option>
                                            <option value="strike_desc">制球率順 (降順)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded">
                                        <label className="text-[10px] font-bold text-gray-600 whitespace-nowrap">1ページ上限:</label>
                                        <select value={teamPlayersPerPage} onChange={(e) => setTeamPlayersPerPage(Number(e.target.value))} className="p-1 border border-gray-300 rounded bg-white text-[10px] font-bold">
                                            <option value={15}>15人</option>
                                            <option value={20}>20人</option>
                                            <option value={25}>25人</option>
                                            <option value={30}>30人</option>
                                            <option value={40}>40人</option>
                                            <option value={50}>50人</option>
                                            <option value={1000}>無制限</option>
                                        </select>
                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Individual Report Content */}
            {
                (viewMode === 'individual' || viewMode === 'print-all') && (viewMode === 'print-all' ? players : [selectedPlayer]).map((mappedPlayer) => {
                    if (!mappedPlayer) return null;

                    const isPrintAll = viewMode === 'print-all';
                    const playerStats = isPrintAll ? calcPitcherStats(mappedPlayer) : memoPlayerStats;
                    const chartData = isPrintAll ? calcChartData(playerStats) : memoChartData;
                    const displayPlayerName = isPrintAll ? mappedPlayer : (customPlayerName || selectedPlayer);

                    if (!playerStats) return null;

                    return (
                        <div key={mappedPlayer} className={`mt-8 flex flex-col gap-4 ${isPrintAll ? 'print:break-after-page' : ''} max-w-[800px] mx-auto bg-white shadow-2xl p-8 border border-gray-200 pitcher-report-container`} type="A4">
                            <div className="pitcher-report-content print:block print:w-full bg-white text-black font-sans py-2 print:py-0">
                            <div className="report-title-row flex justify-between items-center mb-1 print:mb-0">
                                <h2 className="text-3xl font-bold border-b-2 border-black pb-1 print:pb-0">{displayPlayerName}</h2>
                                <div className="text-xl font-bold">{new Date().toLocaleDateString('ja-JP')}</div>
                            </div>
                            <div className="report-stitch w-full h-4 mb-4 print:mb-2 flex overflow-hidden items-center justify-center">
                                <img src="/assets/baseball_stitch_line.png" alt="Stitch Line" className="w-full h-full object-cover object-left" />
                            </div>

                            {/* 1. Main Stats Table */}
                            <div className="mb-2 print:mb-0">
                                <table className="main-stats-table w-full border-collapse border border-black text-center table-fixed">
                                    <thead>
                                        <tr className="bg-gray-100 h-8 text-[10px]">
                                            <th className="border border-black w-20">球種</th>
                                            <th className="border border-black w-10">項目</th>
                                            <th className="border border-black">投球速度<br />(km/h)</th>
                                            <th className="border border-black">総回転数<br />(rpm)</th>
                                            <th className="border border-black">回転効率<br />(%)</th>
                                            <th className="border border-black">回転軸<br />(時間)</th>
                                            <th className="border border-black">縦の変化量<br />(cm)</th>
                                            <th className="border border-black">横の変化量<br />(cm)</th>
                                            <th className="border border-black">リリース<br />角度<br />(横)<br />(°)</th>
                                            <th className="border border-black">リリース<br />角度<br />(縦)<br />(°)</th>
                                            <th className="border border-black">ジャイロ<br />角度(度)</th>
                                            <th className="border border-black">制球率<br />(%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playerStats.averages.map((stat) => {
                                            const isStraight = stat.type.includes('ストレート') || stat.type.toLowerCase().includes('straight') || stat.type.toLowerCase().includes('fastball');

                                            return (
                                                <React.Fragment key={stat.type}>
                                                    <tr className="h-7 print:h-[22px]">
                                                        <td className="border border-black font-bold text-xs print:text-[10px] align-middle print:leading-tight" style={{ backgroundColor: getTypeColor(stat.type), color: getTypeTextColor(stat.type) }} rowSpan={isStraight ? 2 : 1}>{formatPitchTypeName(stat.type)}</td>
                                                        <td className="border border-black bg-gray-50 text-[9px] align-middle">平均値</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgVelocity}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgSpin}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgEfficiency}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgClock}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgVB}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgHB}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgRAH}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgRAV}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle">{stat.avgGyro}</td>
                                                        <td className="border border-black font-bold text-sm print:text-xs align-middle p-0" rowSpan={isStraight ? 2 : 1}>
                                                            <input
                                                                type="text"
                                                                className="w-full h-full bg-transparent border-none outline-none text-center font-bold"
                                                                style={{ fontSize: 'inherit' }}
                                                                placeholder={stat.strikeRate}
                                                                value={manualStrikeRates[`${mappedPlayer}-${stat.type}`] !== undefined ? manualStrikeRates[`${mappedPlayer}-${stat.type}`] : (stat.strikeRate || '')}
                                                                onChange={(e) => handleManualStrikeRateChange(mappedPlayer, stat.type, e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </td>
                                                    </tr>
                                                    {isStraight && (
                                                        <tr className="h-7 print:h-[22px]">
                                                            <td className="border border-black bg-gray-50 text-[9px] align-middle">最大値</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxVelocity}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxSpin}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxEfficiency}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxClock}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxVB}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxHB}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxRAH || '-'}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxRAV || '-'}</td>
                                                            <td className="border border-black font-bold text-sm print:text-xs align-middle bg-gray-300">{stat.maxGyro}</td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* 2. Comparison Table */}
                            <div className="comparison-block mb-2 print:mt-2">
                                <table className="comparison-table w-full border-collapse border border-black text-[10px] text-center table-fixed">
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
                                        <tr className="h-6">
                                            <td className="border border-black font-bold bg-gray-50">今回</td>
                                            {(() => {
                                                const fb = playerStats.averages.find(s => s.type.includes('ストレート')) || {};

                                                return (
                                                    <>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxVelocity || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxSpin || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxEfficiency || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxVB || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxHB || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold p-0">
                                                            <input
                                                                type="text"
                                                                className="w-full h-full bg-transparent border-none outline-none text-center font-bold"
                                                                placeholder={fb.type ? fb.strikeRate : '-'}
                                                                value={fb.type && manualStrikeRates[`${mappedPlayer}-${fb.type}`] !== undefined ? manualStrikeRates[`${mappedPlayer}-${fb.type}`] : ''}
                                                                onChange={(e) => fb.type && handleManualStrikeRateChange(mappedPlayer, fb.type, e.target.value)}
                                                            />
                                                        </td>
                                                    </>
                                                );
                                            })()}
                                        </tr>
                                        <tr className="h-6">
                                            <td className="border border-black font-bold bg-gray-50 text-green-700">前回</td>
                                            <td className="border border-black font-bold p-0"><input name={`${mappedPlayer}-prevVelocity`} value={manualData[`${mappedPlayer}-prevVelocity`] || ''} onChange={handleManualChange} placeholder="-" className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs" /></td>
                                            <td className="border border-black font-bold p-0"><input name={`${mappedPlayer}-prevSpin`} value={manualData[`${mappedPlayer}-prevSpin`] || ''} onChange={handleManualChange} placeholder="-" className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name={`${mappedPlayer}-prevEfficiency`} value={manualData[`${mappedPlayer}-prevEfficiency`] || ''} onChange={handleManualChange} placeholder={prevStats?.avgEfficiency || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name={`${mappedPlayer}-prevVB`} value={manualData[`${mappedPlayer}-prevVB`] || ''} onChange={handleManualChange} placeholder={prevStats?.avgVB || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name={`${mappedPlayer}-prevHB`} value={manualData[`${mappedPlayer}-prevHB`] || ''} onChange={handleManualChange} placeholder={prevStats?.avgHB || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name={`${mappedPlayer}-prevStrikeRate`} value={manualData[`${mappedPlayer}-prevStrikeRate`] || ''} onChange={handleManualChange} placeholder="-" className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs" /></td>
                                        </tr>
                                        <tr className="h-6">
                                            <td className="border border-black font-bold bg-gray-50 text-red-700">チーム平均</td>
                                            <td className="border border-black font-bold bg-white p-0"><input name="teamVelocity" value={manualData.teamVelocity || ''} onChange={handleManualChange} placeholder={teamStats?.avgVelocity || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs text-red-700" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name="teamSpin" value={manualData.teamSpin || ''} onChange={handleManualChange} placeholder={teamStats?.avgSpin || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs text-red-700" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name="teamEfficiency" value={manualData.teamEfficiency || ''} onChange={handleManualChange} placeholder={teamStats?.avgEfficiency || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs text-red-700" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name="teamVB" value={manualData.teamVB || ''} onChange={handleManualChange} placeholder="-" className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs text-red-700" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name="teamHB" value={manualData.teamHB || ''} onChange={handleManualChange} placeholder="-" className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs text-red-700" /></td>
                                            <td className="border border-black font-bold bg-white p-0"><input name="teamStrikeRate" value={manualData.teamStrikeRate || ''} onChange={handleManualChange} placeholder={teamStats?.avgStrikeRate || '-'} className="w-full h-full bg-transparent border-none outline-none text-center font-bold text-xs text-red-700" /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. Quick Motion Times */}
                            <div className="quick-block mb-2 print:mb-0 flex items-stretch gap-0">
                                <div className="bg-red-600 text-white font-bold w-20 flex items-center justify-center border border-black border-r-0 text-sm">クイック</div>
                                <table className="border-collapse border border-black text-center flex-grow text-[10px] h-full">
                                    <thead>
                                        <tr className="bg-[#FFE5D9] h-7">
                                            <th className="border border-black p-0.5">最短タイム (秒)</th>
                                            <th className="border border-black p-0.5">平均タイム (秒)</th>
                                            <th className="border border-black p-0.5">前回タイム (秒)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="h-7">
                                            <td className="border border-black text-[10px] font-bold p-0.5 bg-white">{manualData.quickTimeBest || '-'}</td>
                                            <td className="border border-black text-[10px] font-bold p-0.5 bg-white">{manualData.quickTimeAvg || '-'}</td>
                                            <td className="border border-black text-[10px] font-bold p-0.5 bg-white">{manualData.quickTimeTeam || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div className="quick-target text-sm font-bold ml-4 flex items-center">目標は1.29秒以内</div>
                            </div>

                            {/* Equal Height Wrapper - Unified height strategy for consistent print rendering */}
                            <div className="chart-grid flex flex-row justify-center gap-4 items-stretch print:gap-2 print:min-h-0 print:w-full">


                                {/* Left: Change Chart & Table */}
                                <div className="chart-panel w-full md:w-[50%] border border-green-600 p-2 print:p-0 print:mt-1 flex flex-col relative h-[380px] print:h-[300px]">
                                    <h3 className="text-center font-bold text-xl mb-2 print:text-base print:mb-1">変化量チャートと球種別平均値</h3>
                                    <div className="movement-chart-area relative mx-auto w-[240px] h-[240px] print:mb-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <ReferenceLine x={0} stroke="black" strokeWidth={1.5} />
                                                <ReferenceLine y={0} stroke="black" strokeWidth={1.5} />
                                                <XAxis type="number" dataKey="avgHB" domain={[-70, 70]} tick={{ fontSize: 9 }} label={{ value: '横の変化量', position: 'insideBottom', offset: 0, fontSize: 10 }} />
                                                <YAxis type="number" dataKey="avgVB" domain={[-70, 70]} tick={{ fontSize: 9 }} label={{ value: '縦の変化量', angle: -90, position: 'insideLeft', dx: 20, dy: -5, textAnchor: 'middle', fontSize: 10 }} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />

                                                <Scatter data={chartData} shape="circle">
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={index} fill={getTypeColor(entry.type)} />
                                                    ))}
                                                </Scatter>

                                                <Customized component={(props) => {
                                                    const { xAxis, yAxis } = props;
                                                    if (!xAxis || !yAxis || !xAxis.scale || !yAxis.scale || chartData.length < 2) return null;

                                                    const points = chartData.map(s => ({
                                                        x: xAxis.scale(s.avgHB),
                                                        y: yAxis.scale(s.avgVB),
                                                    }));

                                                    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                                                    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

                                                    const sorted = [...points].sort((a, b) =>
                                                        Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
                                                    );

                                                    const pathData = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

                                                    return (
                                                        <g>
                                                            <path d={pathData} fill="#9ca3af" fillOpacity={0.35} stroke="#9ca3af" strokeWidth={1.5} />
                                                        </g>
                                                    );
                                                }} />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <table className="movement-summary-table w-full print:w-[95%] print:mx-auto border-collapse border border-black text-[10px] print:text-[8px] text-center table-fixed mt-auto print:mt-2">
                                        <thead>
                                            <tr className="bg-gray-100 h-8 print:h-6">
                                                <th className="border border-black">球種<br />(平均値)</th>
                                                <th className="border border-black">回転数</th>
                                                <th className="border border-black bg-gray-300">回転<br />効率</th>
                                                <th className="border border-black">縦の<br />変化量</th>
                                                <th className="border border-black bg-gray-300">横の<br />変化量</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {playerStats.averages.map(stat => (
                                                <tr key={stat.type} className="h-6 print:h-5">
                                                    <td className="border border-black font-bold print:text-[8px]" style={{ backgroundColor: getTypeColor(stat.type), color: getTypeTextColor(stat.type) }}>{formatPitchTypeName(stat.type)}</td>
                                                    <td className="border border-black">{stat.avgSpin}</td>
                                                    <td className="border border-black bg-gray-300">{stat.avgEfficiency}</td>
                                                    <td className="border border-black">{stat.avgVB}</td>
                                                    <td className="border border-black bg-gray-300">{stat.avgHB}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right: Velocity Difference Vertical Chart */}
                                <div className="chart-panel w-full md:w-[50%] border border-green-600 p-2 print:p-0 print:mt-1 flex flex-col relative h-[380px] print:h-[300px]">
                                    <h3 className="text-center font-bold text-xl mb-2 print:text-base print:mb-1">球速緩急差（平均値）</h3>
                                    <div className="flex flex-grow items-stretch relative print:pr-2">
                                        {/* Vertical Velocity Scale */}
                                        <div className="w-[30%] flex justify-end pr-2 print:pr-6">
                                            <div className="relative w-16 h-full">
                                                {/* The single vertical line */}
                                                <div className="absolute right-2 top-[12.5%] h-[75%] w-[2px] bg-gray-400"></div>

                                                {(() => {
                                                    // Dynamic Scale Calculation
                                                    const vels = playerStats.averages.map(s => Number(s.avgVelocity)).filter(v => !isNaN(v) && v > 0);
                                                    const minV = vels.length ? Math.min(...vels) : 100;
                                                    const maxV = vels.length ? Math.max(...vels) : 140;

                                                    let minScale = Math.floor(minV / 10) * 10;
                                                    let maxScale = maxV <= 125 ? 130 : Math.ceil(maxV / 10) * 10;

                                                    if (maxScale - minScale < 40) {
                                                        maxScale = minScale + 40;
                                                    }

                                                    const ticks = [];
                                                    for (let v = maxScale; v >= minScale; v -= 5) {
                                                        ticks.push(v);
                                                    }

                                                    return (
                                                        <>
                                                            {ticks.map(v => (
                                                                <div key={v} className="absolute flex items-center right-6"
                                                                    style={{ bottom: `calc(12.5% + ${((v - minScale) / (maxScale - minScale)) * 75}%)` }}>
                                                                    <span className="velocity-scale text-[11px] font-bold pr-1">{v}</span>
                                                                </div>
                                                            ))}

                                                            {playerStats.averages.map(stat => (
                                                                <div
                                                                    key={stat.type}
                                                                    className="absolute w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200"
                                                                    style={{
                                                                        bottom: `calc(12.5% + ${((Math.max(minScale, Math.min(maxScale, Number(stat.avgVelocity))) - minScale) / (maxScale - minScale)) * 75}% - 8px)`,
                                                                        right: '1px',
                                                                        backgroundColor: getTypeColor(stat.type),
                                                                        zIndex: 10
                                                                    }}
                                                                />
                                                            ))}
                                                        </>
                                                    );
                                                })()}

                                                <div className="absolute top-[88%] right-2 translate-x-1/2 text-[10px] font-bold text-center w-20 whitespace-nowrap">
                                                    投球速度
                                                </div>
                                            </div>
                                        </div>

                                        {/* Speed Ratio Table */}
                                        <div className="w-[70%] flex flex-col justify-center">
                                            <table className="speed-ratio-table border-collapse border border-black text-[8px] text-center table-fixed h-fit w-full">
                                                <thead>
                                                    <tr className="bg-gray-100 h-10">
                                                        <th className="border border-black w-[35%] text-[8px]">球種</th>
                                                        <th className="border border-black w-[30%] text-[8px]">投球<br />速度</th>
                                                        <th className="border border-black w-[35%] text-[8px] bg-gray-300">ストレート<br />に対する<br />割合<br />(%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const fb = playerStats.averages.find(s => s.type === 'ストレート' || s.type === 'Straight' || s.type === 'Fastball') || { avgVelocity: 1 };
                                                        return playerStats.averages.map(stat => (
                                                            <tr key={stat.type} className="h-8">
                                                                <td className="border border-black font-bold whitespace-nowrap" style={{ backgroundColor: getTypeColor(stat.type), color: getTypeTextColor(stat.type) }}>
                                                                    {stat.type.includes('(クイック)') || stat.type === 'ストレートクイック' ? 'クイック' : formatPitchTypeName(stat.type)}
                                                                </td>
                                                                <td className="border border-black font-bold text-[10px]">{stat.avgVelocity}</td>
                                                                <td className="border border-black bg-gray-300 font-bold text-[10px]">
                                                                    {stat.type === 'ストレート' || stat.type === 'Straight' || stat.type === 'Fastball' ? '100' : (Number(stat.avgVelocity) / Number(fb.avgVelocity) * 100).toFixed(1)}
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Velocity Gap Reference Table */}
                                    <div className="mt-auto print:mt-1">
                                        <div className="text-right text-[10px] font-bold mb-0.5 pr-1">緩急比基準 (%)</div>
                                        <div className="gap-reference flex w-full border border-black text-[9px] font-bold text-center">
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#00BFFF] text-white py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">ツーシーム</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">99</div>
                                            </div>
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#A6A6A6] py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">シュート</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">97 (99)</div>
                                            </div>
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#0070C0] text-white py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">カット</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">95</div>
                                            </div>
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#FFC000] py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">スプリット</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">93</div>
                                            </div>
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#D9D9D9] py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">フォーク</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">92</div>
                                            </div>
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#7030A0] text-white py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">スラ (縦)</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">90 (91)</div>
                                            </div>
                                            <div className="flex-1 flex flex-col border-r border-black">
                                                <div className="bg-[#FFE599] py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">チェンジ</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">90</div>
                                            </div>
                                            <div className="flex-1 flex flex-col">
                                                <div className="bg-[#00B050] text-white py-1 border-b border-black leading-none flex items-center justify-center min-h-[24px] text-[9px] whitespace-nowrap">カーブ</div>
                                                <div className="py-1 flex items-center justify-center min-h-[20px]">85</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                            </div>

                        </div>
                        </div>
                    );
                })
            }
            {
                viewMode === 'team' && teamStats && (() => {
                    let sortedPitchers = [...teamStats.pitchers];
                    if (teamPlayerSort === 'grade') {
                        sortedPitchers.sort((a, b) => b.gradeGroup.localeCompare(a.gradeGroup));
                    } else if (teamPlayerSort === 'velocity_desc') {
                        sortedPitchers.sort((a, b) => (Number(b.avgVelocity) || 0) - (Number(a.avgVelocity) || 0));
                    } else if (teamPlayerSort === 'spin_desc') {
                        sortedPitchers.sort((a, b) => (Number(b.avgSpin) || 0) - (Number(a.avgSpin) || 0));
                    } else if (teamPlayerSort === 'strike_desc') {
                        const getStrike = (p) => parseFloat(teamManualStrikeRates[p.name] !== undefined ? teamManualStrikeRates[p.name] : p.strikeRate) || 0;
                        sortedPitchers.sort((a, b) => getStrike(b) - getStrike(a));
                    }

                    const pages = [];
                    for (let i = 0; i < sortedPitchers.length; i += teamPlayersPerPage) {
                        pages.push(sortedPitchers.slice(i, i + teamPlayersPerPage));
                    }
                    if (pages.length === 0) pages.push([]);

                    return (
                        <div id="report-container" className="bg-white text-black font-sans">
                            {pages.map((pagePitchers, pageIndex) => (
                                <div key={pageIndex} className={`mt-8 print:block print:w-full print:py-0 print:pb-3 py-8 px-8 bg-white shadow-2xl border border-gray-200 max-w-[1123px] mx-auto print:shadow-none print:border-none print:max-w-none print:p-0 ${pageIndex < pages.length - 1 ? 'print:break-after-page' : ''}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h2 className="text-3xl font-bold border-b-2 border-black pb-1">チーム：{teamPitchType}データ一覧 {pages.length > 1 ? `(${pageIndex + 1}/${pages.length})` : ''}</h2>
                                        <div className="text-xl font-bold">{new Date().toLocaleDateString('ja-JP')}</div>
                                    </div>
                                    <div className="w-full h-4 mb-4 flex overflow-hidden items-center justify-center">
                                        <img src="/assets/baseball_stitch_line.png" alt="Stitch Line" className="w-full h-full object-cover object-left" />
                                    </div>

                                    <div className="text-red-600 font-bold text-2xl mb-4">{selectedThrowHand === 'Right' ? '右投げ' : '左投げ'}</div>

                                    <table className="w-full print:w-[98%] print:mx-auto border-collapse border border-black text-center text-[10px] table-fixed">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-black p-0.5 w-[10%]">氏名</th>
                                                <th className="border border-black p-0.5 w-[4%]"></th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">投球速度<br />(km/h)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">回転数<br />(rpm)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">回転効率<br />(%)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">回転方向<br />(時:分)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">縦の<br />変化量<br />(cm)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">横の<br />変化量<br />(cm)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">リリース<br />角度<br />(横)<br />(°)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">リリース<br />角度<br />(縦)<br />(°)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">ジャイロ<br />角度<br />(°)</th>
                                                <th className="border border-black p-0.5 bg-red-200 leading-none">制球率<br />(%)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagePitchers.map((p, index) => {
                                                const pStrikeRateRaw = teamManualStrikeRates[p.name] !== undefined ? teamManualStrikeRates[p.name] : p.strikeRate;
                                                const pStrikeRate = parseFloat(pStrikeRateRaw);
                                                
                                                const targetVelocity = teamStats.avgVelocity !== undefined ? teamStats.avgVelocity : (teamStats.avgMaxVelocity !== undefined ? teamStats.avgMaxVelocity : 0);
                                                const targetSpin = teamStats.avgSpin !== undefined ? teamStats.avgSpin : 0;
                                                
                                                const isHighVelocity = Number(p.avgVelocity) >= Number(targetVelocity);
                                                const isHighSpin = Number(p.avgSpin) >= Number(targetSpin);
                                                const isHighStrikeRate = !isNaN(pStrikeRate) && pStrikeRate >= 60;
                                                const isElite = isHighVelocity && isHighSpin && isHighStrikeRate;
                                                
                                                const nameBg = isElite ? 'bg-[#ffff00]' : (index % 2 === 1 ? 'bg-gray-200' : 'bg-white');
                                                const rowPattern = index % 2 === 1 ? 'bg-gray-200' : '';
                                                
                                                return (
                                                    <React.Fragment key={p.name}>
                                                        <tr className="h-5">
                                                            <td className={`border border-black font-bold p-0.5 align-middle ${nameBg}`} rowSpan={2}>{p.name}</td>
                                                            <td className={`border border-black p-0.5 text-[7px] text-gray-500 ${index % 2 === 1 ? 'bg-gray-200' : 'bg-gray-50'}`}>平均値</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern} ${isHighVelocity ? 'bg-[#ffff00]' : ''}`}>{p.avgVelocity}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern} ${isHighSpin ? 'bg-[#ffff00]' : ''}`}>{p.avgSpin}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgEff}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgSpinDir}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgVB}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgHB}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgRah}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgRav}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${rowPattern}`}>{p.avgGyro}</td>
                                                            <td className={`border border-black font-bold p-0.5 align-middle ${isHighStrikeRate ? 'bg-[#ffff00]' : (index % 2 === 1 ? 'bg-gray-200' : 'bg-white')}`} rowSpan={2}>
                                                                <input
                                                                    type="text"
                                                                    value={pStrikeRateRaw}
                                                                    onChange={(e) => handleTeamManualStrikeRateChange(p.name, e.target.value)}
                                                                    className="w-full h-full text-center bg-transparent border-none outline-none font-bold p-0 m-0"
                                                                />
                                                            </td>
                                                        </tr>
                                                        <tr className="h-5">
                                                            <td className={`border border-black p-0.5 text-[7px] text-gray-500 ${index % 2 === 1 ? 'bg-gray-200' : 'bg-gray-50'}`}>最大値</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxStraightVelocity}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxSpin}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxEfficiency}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxSpinDir || '-'}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxVB || '-'}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxHB || '-'}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxRAH || '-'}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxRAV || '-'}</td>
                                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxGyro || '-'}</td>
                                                        </tr>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {pageIndex === pages.length - 1 && (
                                        <>
                                            <div className="mt-4 flex justify-center items-center gap-4">
                                                <div className="bg-[#ffff00] w-12 h-6 border border-black"></div>
                                                <div className="font-bold text-lg">投球速度、回転数が平均以上、制球率が60%以上</div>
                                            </div>

                                            <div className="mt-4 flex justify-center">
                                                <table className="w-[70%] border-collapse border border-black text-center table-fixed">
                                                    <tbody className="h-12">
                                                        <tr className="bg-blue-600 text-white h-10">
                                                            <th className="border border-black text-white text-sm bg-blue-600 font-bold align-middle text-center leading-tight px-2" rowSpan={2}>最大速度時の<br />平均値</th>
                                                            <th className="border border-black text-sm">投球速度<br />(km/h)</th>
                                                            <th className="border border-black text-sm">総回転数<br />(rpm)</th>
                                                            <th className="border border-black text-sm">制球率<br />(%)</th>
                                                            <th className="border border-black text-sm">チーム平均<br />クイック<br />(秒)</th>
                                                        </tr>
                                                        <tr className="text-2xl font-bold">
                                                            <td className="border border-black">{teamStats.avgMaxVelocity}</td>
                                                            <td className="border border-black">{teamStats.avgSpin}</td>
                                                            <td className="border border-black">{teamStats.avgStrikeRate}</td>
                                                            <td className="border border-black text-blue-700 p-0 bg-white"><input name="teamQuickAvg" value={manualData.teamQuickAvg || ''} onChange={handleManualChange} placeholder="-" className="w-full h-full text-center bg-transparent border-none outline-none font-bold text-blue-700" /></td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })()
            }
        </div >
    );
};

export default Feedback;

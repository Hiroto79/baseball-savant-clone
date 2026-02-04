import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, Printer, ChevronDown, ChevronRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, ReferenceArea, ReferenceDot, Polygon, Customized, Label } from 'recharts';

const Feedback = () => {
    const { language } = useSettings();
    const [uploadData, setUploadData] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [customPlayerName, setCustomPlayerName] = useState(''); // Editable name for print
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('individual'); // 'individual' | 'team'
    const [teamPitchType, setTeamPitchType] = useState('ストレート');
    const [selectedThrowHand, setSelectedThrowHand] = useState('Right'); // 'Right' | 'Left'

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

        if (t.includes('quick') && (t.includes('fastball') || t.includes('straight'))) return 'ストレート(クイック)';
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
        if (!type) return '#6b7280';
        const t = type.toLowerCase();
        if (t.includes('ストレート') || t.includes('straight') || t.includes('fastball') || t.includes('4シーム') || t.includes('4-seam')) return '#ef4444';
        if (t.includes('カーブ') || t.includes('curve')) return '#3b82f6';
        if (t.includes('スライダー') || t.includes('slider')) return '#eab308';
        if (t.includes('チェンジ') || t.includes('change')) return '#22c55e';
        if (t.includes('フォーク') || t.includes('split') || t.includes('fork')) return '#a855f7';
        if (t.includes('カット') || t.includes('cutter')) return '#f97316';
        if (t.includes('シンカー') || t.includes('sinker') || t.includes('2シーム') || t.includes('2-seam')) return '#ec4899';
        return '#6b7280';
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
                    if (k === 'Vertical Break') return d['Vertical Break'] || d.VerticalBreak || d['VB (trajectory)'];
                    if (k === 'Horizontal Break') return d['Horizontal Break'] || d.HorizontalBreak || d['HB (trajectory)'];
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
                const valid = arr.map(d => Number(d[key] || d[key.replace(' ', '')] || 0)).filter(v => !isNaN(v) && (allowZero || v !== 0));
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
            // Calculate Avg Efficiency manually to ensure correct key usage and decimal formatting
            const avgEffValRaw = straightPitches.map(d => d['Spin Efficiency (release)'] || d['Spin Efficiency'] || d.SpinEfficiency).filter(v => v !== undefined && v !== '');
            const avgEff = avgEffValRaw.length ? (avgEffValRaw.reduce((a, b) => a + Number(b), 0) / avgEffValRaw.length).toFixed(1) : '-';
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
                const v = Number(d.Velocity);
                if (!isNaN(v) && v > maxVelVal) {
                    maxVelVal = v;
                    fastestPitch = d;
                }
            });

            const maxVelocity = maxVelVal > 0 ? maxVelVal.toFixed(1) : '-';
            const allPitchersMaxStraightVel = maxVelVal > 0 ? maxVelVal.toFixed(1) : 0;

            // Get metrics FROM THE FASTEST PITCH
            const maxSpinVal = fastestPitch ? Number(fastestPitch['Total Spin'] || fastestPitch.TotalSpin || 0).toFixed(0) : 0;
            const maxEffVal = fastestPitch ? Number(fastestPitch['Spin Efficiency'] || fastestPitch.SpinEfficiency || fastestPitch['Spin Efficiency (release)'] || 0) : 0;
            const maxSpinDir = fastestPitch ? (fastestPitch['Spin Direction'] || fastestPitch.SpinAxis || '-') : '-';

            // Helper for specific fastest pitch values
            const getFastestVal = (key) => {
                if (!fastestPitch) return '-';
                if (key === 'Vertical Break') return fastestPitch['Vertical Break'] || fastestPitch.VerticalBreak || fastestPitch['VB (trajectory)'];
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
    }, [uploadData, selectedThrowHand, teamPitchType]);


    // Calculate Averages for Selected Player
    const playerStats = useMemo(() => {
        if (!selectedPlayer || uploadData.length === 0) return null;
        const playerData = uploadData.filter(d => (d['Player Name'] || d.PlayerName) === selectedPlayer);

        const processData = (data) => {
            const byType = {};
            const rawPitches = [];

            data.forEach(d => {
                const rawType = d['Pitch Type'] || d.PitchType || 'Unknown';
                const type = getJapanesePitchType(rawType);

                if (!byType[type]) {
                    byType[type] = {
                        count: 0,
                        velocitySum: 0, maxVelocity: -Infinity,
                        spinSum: 0, maxSpin: -Infinity,
                        efficiencySum: 0,
                        vbSum: 0,
                        hbSum: 0,
                        releaseAngleSum: 0,
                        releaseHeightSum: 0,
                        releaseSideSum: 0,
                        strikeCount: 0, strikeOppCount: 0,
                        gyroSum: 0, gyroCount: 0,
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

                const sd = d['Spin Direction'] || d.SpinDirection || d['Spin Axis (Clock)'];
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
                    const v = parseFloat(p.Velocity);
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
                const fmtMin = (val, fixed) => {
                    if (val === undefined || val === null || isNaN(val) || val === Infinity) return '-';
                    return Number(val).toFixed(fixed);
                };

                // Find Fastest Pitch for "Max" values in Individual Report
                let fastest = null;
                let maxV = -Infinity;
                const typePitches = data.filter(d => getJapanesePitchType(d['Pitch Type'] || d.PitchType) === type);

                typePitches.forEach(d => {
                    const v = Number(d.Velocity);
                    if (!isNaN(v) && v > maxV) {
                        maxV = v;
                        fastest = d;
                    }
                });

                const maxVVal = isFinite(maxV) ? maxV : 0;

                // Helper to get value from FASTEST pitch
                const getFV = (key) => {
                    if (!fastest) return '-';
                    if (key === 'Efficiency') return fastest['Spin Efficiency'] || fastest.SpinEfficiency || fastest['Spin Efficiency (release)'];
                    if (key === 'Vertical Break') return fastest['Vertical Break'] || fastest.VerticalBreak || fastest['VB (trajectory)'];
                    if (key === 'Horizontal Break') return fastest['Horizontal Break'] || fastest.HorizontalBreak || fastest['HB (trajectory)'];
                    if (key === 'Horizontal Angle') return fastest['Horizontal Angle'] || fastest.HorizontalAngle;
                    if (key === 'Release Angle') return fastest['Release Angle'] || fastest.ReleaseAngle;
                    if (key === 'Release Height') return fastest['Release Height'] || fastest.ReleaseHeight;
                    if (key === 'Release Side') return fastest['Release Side'] || fastest.ReleaseSide;
                    if (key === 'Gyro') return fastest['Gyro Degree'] || fastest.GyroDegree || fastest['Gyro'] || fastest['Gyro Angle'] || fastest['Spin Axis (Gyro)'] || fastest['Gyro Degree (deg)'];
                    if (key === 'Spin Direction') return fastest['Spin Direction'] || fastest.SpinDirection || fastest['Spin Axis (Clock)'];
                    if (key === 'Spin') return fastest['Total Spin'] || fastest.TotalSpin;

                    return fastest[key];
                };

                return {
                    type,
                    count: s.count,
                    avgVelocity: s.count ? Number((s.velocitySum / s.count).toFixed(1)) : 0,
                    maxVelocity: fmtMax(maxVVal, 1),
                    avgSpin: s.count ? Math.round(s.spinSum / s.count) : 0,
                    maxSpin: fmtMax(getFV('Spin'), 0), // Use fastest pitch's spin, integer per request
                    avgEfficiency: s.count ? Number((s.efficiencySum / s.count).toFixed(1)) : 0,
                    maxEfficiency: fmtMax(getFV('Efficiency'), 1),
                    avgClock: getAverageTime(s.spinDirections),
                    avgVB: s.count ? Number((s.vbSum / s.count).toFixed(1)) : 0,
                    maxVB: fmtMax(getFV('Vertical Break'), 1),
                    avgHB: s.count ? Number((s.hbSum / s.count).toFixed(1)) : 0,
                    maxHB: fmtMax(getFV('Horizontal Break'), 1),
                    avgRA: s.count ? (s.releaseAngleSum / s.count).toFixed(2) : 0,
                    maxRA: fmtMax(getFV('Horizontal Angle'), 2), // Release Angle (Horizontal)
                    avgRH: s.count ? (s.releaseHeightSum / s.count).toFixed(2) : 0,
                    maxRH: fmtMax(getFV('Release Height'), 2),
                    avgRS: s.count ? (s.releaseSideSum / s.count).toFixed(2) : 0,
                    maxRS: fmtMax(getFV('Release Side'), 2),
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
    }, [selectedPlayer, uploadData]);

    const handleManualChange = (e) => {
        const { name, value } = e.target;
        setManualData(prev => ({ ...prev, [name]: value }));
    };

    const handleManualStrikeRateChange = (type, value) => {
        setManualStrikeRates(prev => ({ ...prev, [type]: value }));
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
    const teamListStats = teamStats;
    const prevStats = null; // Placeholder for previous stats if logic is re-implemented later

    // Prepare Chart Data: Merge Quick Straight into Straight for visual chart only
    const chartData = useMemo(() => {
        if (!playerStats || !playerStats.averages) return [];

        const parseVal = (val) => {
            const num = Number(val);
            return isFinite(num) ? num : null;
        };

        const straight = playerStats.averages.find(s => s.type === 'ストレート');
        const quick = playerStats.averages.find(s => s.type === 'ストレート(クイック)');

        // Base data without straight types
        // Filter out any entries with invalid HB/VB to prevent chart errors
        let data = playerStats.averages
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
    }, [playerStats]);

    // Debug state
    // const [debugMsg, setDebugMsg] = useState('');

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="p-6 max-w-[210mm] print:max-w-[206mm] mx-auto bg-white min-h-screen text-black print:p-2 print:min-h-0 print:h-auto print:pb-0 print:overflow-hidden">
            {/* Debug Info Overlay Removed */}

            <div className="print:hidden mb-8 space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-200">
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
                                className={`px-6 py-2 rounded-md font-bold transition-all ${viewMode === 'team' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                チーム一覧
                            </button>
                        </div>
                        <div className="h-10 w-px bg-gray-300 mx-2"></div>
                        <div className="grid grid-cols-2 gap-4 flex-grow">
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
                            {/* Team List Strike Rate Input Section */}
                            <div className="mb-4 bg-blue-50 border border-blue-200 p-2 rounded print:hidden">
                                <h3 className="font-bold text-sm mb-2">制球率調整 (球種別・%)</h3>
                                <div className="overflow-x-auto whitespace-nowrap pb-2">
                                    {teamListStats?.pitchers?.map(p => (
                                        <div key={p.name} className="inline-block mr-4 text-center">
                                            <div className="text-[10px] font-bold mb-1 text-blue-700">{p.name} ({p.avgStrikeRate}%)</div>
                                            <input
                                                type="text"
                                                className="border border-gray-300 rounded text-center w-20 text-sm font-bold p-1"
                                                placeholder={p.strikeRate}
                                                value={teamManualStrikeRates[p.name] !== undefined ? teamManualStrikeRates[p.name] : ''}
                                                onChange={(e) => handleTeamManualStrikeRateChange(p.name, e.target.value)}
                                            />
                                        </div>
                                    )) || <div className="text-gray-400 text-xs">データがありません</div>}
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-white p-4 rounded-lg border">
                                <div className="flex gap-4 items-center">
                                    <span className="font-bold text-gray-700">チームレポート設定:</span>
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
                                </div>
                                <div className="flex gap-3">
                                    <input name="teamQuickAvg" placeholder="チーム Ｑ平均 (秒)" value={manualData.teamQuickAvg} onChange={handleManualChange} className="p-1.5 border rounded bg-yellow-50 text-xs w-32" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Individual Report Content */}
            {
                viewMode === 'individual' && selectedPlayer && (
                    <div className="mt-8 flex flex-col gap-4">
                        {/* Expanded Manual Inputs */}
                        <div className="mb-4 bg-blue-50 border border-blue-200 p-2 rounded text-[10px] print:hidden">
                            <h3 className="font-bold mb-1">比較データ手動入力 (前回・チーム平均)</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {/* Previous Data */}
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-0.5">前回</h4>
                                    <div className="grid grid-cols-3 gap-1">
                                        <input name="prevVelocity" placeholder="球速" value={manualData.prevVelocity || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="prevSpin" placeholder="回転数" value={manualData.prevSpin || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="prevEfficiency" placeholder="効率(%)" value={manualData.prevEfficiency || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="prevVB" placeholder="縦変化" value={manualData.prevVB || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="prevHB" placeholder="横変化" value={manualData.prevHB || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="prevStrikeRate" placeholder="制球率" value={manualData.prevStrikeRate || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                    </div>
                                </div>
                                {/* Team Average Data */}
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-0.5">チーム平均</h4>
                                    <div className="grid grid-cols-3 gap-1">
                                        <input name="teamVelocity" placeholder="球速" value={manualData.teamVelocity || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="teamSpin" placeholder="回転数" value={manualData.teamSpin || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="teamEfficiency" placeholder="効率(%)" value={manualData.teamEfficiency || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="teamVB" placeholder="縦変化" value={manualData.teamVB || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="teamHB" placeholder="横変化" value={manualData.teamHB || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                        <input name="teamStrikeRate" placeholder="制球率" value={manualData.teamStrikeRate || ''} onChange={handleManualChange} className="border p-1 w-full" />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-3 gap-1">
                                <input name="quickTimeBest" placeholder="Ｑ最短 (秒)" value={manualData.quickTimeBest} onChange={handleManualChange} className="border p-1 w-full" />
                                <input name="quickTimeAvg" placeholder="Ｑ平均 (秒)" value={manualData.quickTimeAvg} onChange={handleManualChange} className="border p-1 w-full" />
                                <input name="quickTimeTeam" placeholder="前回タイム" value={manualData.quickTimeTeam} onChange={handleManualChange} className="border p-1 w-full" />
                            </div>
                        </div>

                        {playerStats && playerStats.averages && playerStats.averages.length > 0 && (
                            <>
                                <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg print:hidden">
                                    <label className="block text-xs font-bold text-blue-800 mb-2">制球率調整 (球種別・%)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {playerStats.averages.map((stat, idx) => {
                                            const isStraight = stat.type.includes('ストレート') || stat.type.toLowerCase().includes('straight') || stat.type.toLowerCase().includes('fastball');
                                            // Apply Manual Strike Rate Override
                                            const displayStrikeRate = manualStrikeRates[stat.type] || stat.strikeRate;

                                            return (
                                                <div key={stat.type} className="flex gap-2 items-center text-xs">
                                                    <span className="font-bold" style={{ color: getTypeColor(stat.type) }}>{stat.type}</span>
                                                    <input
                                                        className="border rounded w-12 text-center"
                                                        placeholder={stat.strikeRate}
                                                        value={manualStrikeRates[stat.type] !== undefined ? manualStrikeRates[stat.type] : ''}
                                                        onChange={(e) => handleManualStrikeRateChange(stat.type, e.target.value)}
                                                    />
                                                    <span>%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="print:block print:w-full bg-white text-black font-sans py-4 print:py-0">
                            <div className="flex justify-between items-center mb-1 print:mb-0">
                                <h2 className="text-3xl font-bold border-b-2 border-black pb-1 print:pb-0">{customPlayerName || selectedPlayer}</h2>
                                <div className="text-xl font-bold">{new Date().toLocaleDateString('ja-JP')}</div>
                            </div>
                            <div className="w-full h-6 mb-4 print:mb-2 flex overflow-hidden items-center justify-center">
                                <img src="/assets/baseball_stitch_line.png" alt="Stitch Line" className="w-full h-full object-cover object-left" />
                            </div>

                            {/* 1. Main Stats Table */}
                            <div className="mb-2 print:mb-0">
                                <table className="w-full border-collapse border border-black text-center table-fixed">
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
                                            <th className="border border-black">リリース高<br />(cm)</th>
                                            <th className="border border-black">リリース横<br />(cm)</th>
                                            <th className="border border-black">リリース<br />前後(cm)</th>
                                            <th className="border border-black">ジャイロ<br />角度(度)</th>
                                            <th className="border border-black">制球率<br />(%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playerStats.averages.map((stat, idx) => {
                                            const isStraight = stat.type.includes('ストレート') || stat.type.toLowerCase().includes('straight') || stat.type.toLowerCase().includes('fastball');
                                            // Apply Manual Strike Rate Override
                                            const displayStrikeRate = manualStrikeRates[stat.type] || stat.strikeRate;

                                            return (
                                                <React.Fragment key={stat.type}>
                                                    <tr className="h-6 print:h-5">
                                                        <td className="border border-black font-bold text-white text-xs print:text-[10px] align-middle print:leading-tight" style={{ backgroundColor: getTypeColor(stat.type) }} rowSpan={isStraight ? 2 : 1}>{formatPitchTypeName(stat.type)}</td>
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
                                                        <td className="border border-black font-bold text-sm align-middle" rowSpan={isStraight ? 2 : 1}>{displayStrikeRate}</td>
                                                    </tr>
                                                    {isStraight && (
                                                        <tr className="h-6 print:h-5">
                                                            <td className="border border-black bg-gray-50 text-[9px] align-middle">最大値</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxVelocity}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxSpin}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxEfficiency}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxClock}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxVB}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxHB}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxRA}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxRH}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxRS}</td>
                                                            <td className="border border-black font-bold text-sm align-middle bg-gray-300">{stat.maxGyro}</td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* 2. Comparison Table */}
                            <div className="mb-2 print:mt-2">
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
                                        <tr className="h-6">
                                            <td className="border border-black font-bold bg-gray-50">今回</td>
                                            {(() => {
                                                const fb = playerStats.averages.find(s => s.type.includes('ストレート')) || {};
                                                const displayStrikeRate = fb.type ? (manualStrikeRates[fb.type] || fb.strikeRate) : '-';
                                                return (
                                                    <>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxVelocity || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxSpin || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxEfficiency || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxVB || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{fb.maxHB || '-'}</td>
                                                        <td className="border border-black text-[10px] font-bold">{displayStrikeRate}</td>
                                                    </>
                                                );
                                            })()}
                                        </tr>
                                        <tr className="h-6">
                                            <td className="border border-black font-bold bg-gray-50 text-green-700">前回</td>
                                            <td className="border border-black font-bold">{manualData.prevVelocity || '-'}</td>
                                            <td className="border border-black font-bold">{manualData.prevSpin || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.prevEfficiency || prevStats?.avgEfficiency || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.prevVB || prevStats?.avgVB || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.prevHB || prevStats?.avgHB || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.prevStrikeRate || '-'}</td>
                                        </tr>
                                        <tr className="h-6">
                                            <td className="border border-black font-bold bg-gray-50 text-red-700">チーム平均</td>
                                            <td className="border border-black font-bold bg-white">{manualData.teamVelocity || teamStats?.avgVelocity || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.teamSpin || teamStats?.avgSpin || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.teamEfficiency || teamStats?.avgEfficiency || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.teamVB || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.teamHB || '-'}</td>
                                            <td className="border border-black font-bold bg-white">{manualData.teamStrikeRate || teamStats?.avgStrikeRate || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* 3. Quick Motion Times */}
                            <div className="mb-2 print:mb-0 flex items-stretch gap-0">
                                <div className="bg-red-600 text-white font-bold w-20 flex items-center justify-center border border-black border-r-0 text-sm">クイック</div>
                                <table className="border-collapse border border-black text-center flex-grow text-[10px] h-full">
                                    <thead>
                                        <tr className="bg-[#FFE5D9] h-7">
                                            <th className="border border-black p-0.5">最短タイム (秒)</th>
                                            <th className="border border-black p-0.5">平均タイム (秒)</th>
                                            <th className="border border-black p-0.5">前回タイム</th>
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
                                <div className="text-sm font-bold ml-4 flex items-center">目標は1.29秒以内</div>
                            </div>

                            {/* Equal Height Wrapper - Unified height strategy for consistent print rendering */}
                            <div className="flex flex-row justify-center gap-4 items-stretch print:gap-1 print:gap-2 min-h-[400px] print:min-h-0 break-inside-avoid print:w-[98%] print:mx-auto">


                                {/* Left: Change Chart & Table */}
                                <div className="w-full md:w-[50%] border border-green-600 p-2 print:p-0 print:mt-4 print:pb-[26px] flex flex-col h-full relative" style={{ height: 'auto' }}>
                                    <h3 className="text-center font-bold text-xl mb-2 print:text-base print:mb-1">変化量チャートと球種別平均値</h3>
                                    <div className="relative ml-0 print:ml-[-6px] h-[240px] print:h-[200px] mb-2 print:mb-0 w-[90%] print:w-[75%]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" dataKey="avgHB" domain={[-70, 70]} tick={{ fontSize: 9 }} label={{ value: '横の変化量', position: 'insideBottom', offset: 0, fontSize: 10 }} />
                                                <YAxis type="number" dataKey="avgVB" domain={[-70, 70]} tick={{ fontSize: 9 }} label={{ value: '縦の変化量', angle: -90, position: 'insideLeft', dx: 20, dy: -5, textAnchor: 'middle', fontSize: 10 }} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />

                                                <Scatter data={chartData} shape="circle">
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={index} fill={getTypeColor(entry.type)} />
                                                    ))}
                                                </Scatter>

                                                <Customized component={({ xAxis, yAxis, width, height }) => {
                                                    // Visual Debug: Render a red rect at top-left to prove component is mounted
                                                    // and print coordinate info
                                                    if (!xAxis || !yAxis || chartData.length < 2) return null;

                                                    const points = chartData.map(s => {
                                                        const x = xAxis.scale(s.avgHB);
                                                        const y = yAxis.scale(s.avgVB);
                                                        return { x, y, type: s.type };
                                                    });

                                                    const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                                                    const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

                                                    points.sort((a, b) => {
                                                        return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
                                                    });

                                                    const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ') + ' Z';

                                                    return (
                                                        <g>
                                                            {/* Debug: Red Box at 0,0 to confirming rendering context */}
                                                            <rect x={0} y={0} width={20} height={20} fill="red" opacity={0.5} />

                                                            {/* The Polygon */}
                                                            <path d={pathData} fill="#9ca3af" fillOpacity={0.3} stroke="#9ca3af" strokeWidth={1} />

                                                            {/* Debug: Labels at each vertex */}
                                                            {points.map((p, i) => (
                                                                <text key={i} x={p.x} y={p.y} fontSize={8} fill="black">
                                                                    {`${Math.round(p.x)},${Math.round(p.y)}`}
                                                                </text>
                                                            ))}
                                                        </g>
                                                    );
                                                }} />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <table className="w-full print:w-[95%] print:mx-auto border-collapse border border-black text-[10px] print:text-[8px] text-center table-fixed mt-auto print:mt-[48px]">
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
                                                    <td className="border border-black text-white font-bold print:text-[8px]" style={{ backgroundColor: getTypeColor(stat.type) }}>{formatPitchTypeName(stat.type)}</td>
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
                                <div className="w-full md:w-[50%] border border-green-600 p-2 print:p-0 print:mt-4 print:pb-[26px] flex flex-col h-full relative" style={{ height: 'auto' }}>
                                    <h3 className="text-center font-bold text-xl mb-2 print:text-base print:mb-1">球速緩急差（平均値）</h3>
                                    <div className="flex flex-grow items-stretch relative print:pr-2">
                                        {/* Vertical Velocity Scale */}
                                        <div className="w-[30%] relative flex justify-end pr-6 print:pr-8">
                                            {/* The single vertical line - Reduced to 3/4 length, centered */}
                                            <div className="absolute right-4 top-[12.5%] h-[75%] w-[2px] bg-gray-400"></div>

                                            {(() => {
                                                // Dynamic Scale Calculation
                                                const vels = playerStats.averages.map(s => Number(s.avgVelocity)).filter(v => !isNaN(v) && v > 0);
                                                const minV = vels.length ? Math.min(...vels) : 100;
                                                const maxV = vels.length ? Math.max(...vels) : 140;

                                                let minScale = Math.floor(minV / 10) * 10;
                                                let maxScale = Math.ceil(maxV / 10) * 10;

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
                                                            <div key={v} className="absolute flex items-center"
                                                                style={{ bottom: `calc(12.5% + ${((v - minScale) / (maxScale - minScale)) * 75}%)` }}>
                                                                <span className="text-[11px] font-bold pr-3">{v}</span>
                                                            </div>
                                                        ))}

                                                        {playerStats.averages.map(stat => (
                                                            <div
                                                                key={stat.type}
                                                                className="absolute w-4 h-4 rounded-full border border-white shadow-sm ring-1 ring-gray-200"
                                                                style={{
                                                                    bottom: `calc(12.5% + ${((Math.max(minScale, Math.min(maxScale, Number(stat.avgVelocity))) - minScale) / (maxScale - minScale)) * 75}% - 8px)`,
                                                                    right: '9px',
                                                                    backgroundColor: getTypeColor(stat.type),
                                                                    zIndex: 10
                                                                }}
                                                            />
                                                        ))}
                                                    </>
                                                );
                                            })()}

                                            <div className="absolute top-[88%] right-4 translate-x-1/2 text-[10px] font-bold text-center w-20 whitespace-nowrap">
                                                投球速度
                                            </div>
                                        </div>

                                        {/* Speed Ratio Table */}
                                        <div className="w-[70%] flex flex-col justify-center">
                                            <table className="border-collapse border border-black text-[9px] text-center table-fixed h-fit">
                                                <thead>
                                                    <tr className="bg-gray-100 h-10">
                                                        <th className="border border-black w-[30%] text-[8px]">球種</th>
                                                        <th className="border border-black w-[30%] text-[8px]">投球<br />速度</th>
                                                        <th className="border border-black w-[40%] text-[8px] bg-gray-300">ストレート<br />に対する<br />割合<br />(%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const fb = playerStats.averages.find(s => s.type.includes('ストレート')) || { avgVelocity: 1 };
                                                        return playerStats.averages.map(stat => (
                                                            <tr key={stat.type} className="h-8">
                                                                <td className="border border-black text-white font-bold" style={{ backgroundColor: getTypeColor(stat.type) }}>
                                                                    {stat.type.includes('(クイック)') ? 'クイック' : formatPitchTypeName(stat.type)}
                                                                </td>
                                                                <td className="border border-black font-bold text-[10px]">{stat.avgVelocity}</td>
                                                                <td className="border border-black bg-gray-300 font-bold text-[10px]">
                                                                    {stat.type.includes('ストレート') ? '100' : (Number(stat.avgVelocity) / Number(fb.avgVelocity) * 100).toFixed(0)}
                                                                </td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>


                            </div>

                        </div>
                    </div>
                )
            }
            {
                viewMode === 'team' && teamStats && (
                    <div id="report-container" className="print:block print:w-full bg-white text-black font-sans print:py-0 print:pb-3 py-4">
                        <div className="flex justify-between items-center mb-1">
                            <h2 className="text-3xl font-bold border-b-2 border-black pb-1">チーム：{teamPitchType}データ一覧</h2>
                            <div className="text-xl font-bold">{new Date().toLocaleDateString('ja-JP')}</div>
                        </div>
                        <div className="w-full h-6 mb-4 flex overflow-hidden items-center justify-center">
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
                                    <th className="border border-black p-0.5 bg-red-200 leading-none">リリース<br />高さ<br />(m)</th>
                                    <th className="border border-black p-0.5 bg-red-200 leading-none">リリース<br />横<br />(m)</th>
                                    <th className="border border-black p-0.5 bg-red-200 leading-none">ジャイロ<br />角度<br />(°)</th>
                                    <th className="border border-black p-0.5 bg-red-200 leading-none">制球率<br />(%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamStats.pitchers.map((p, index) => (
                                    <React.Fragment key={p.name}>
                                        <tr className="h-5">
                                            <td className={`border border-black font-bold p-0.5 align-middle ${index % 2 === 1 ? 'bg-gray-200' : 'bg-white'}`} rowSpan={2}>{p.name}</td>
                                            <td className={`border border-black p-0.5 text-[7px] text-gray-500 ${index % 2 === 1 ? 'bg-gray-200' : 'bg-gray-50'}`}>平均値</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''} ${Number(p.avgVelocity) >= Number(teamStats.avgVelocity) ? 'bg-yellow-200' : ''}`}>{p.avgVelocity}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''} ${Number(p.avgSpin) >= Number(teamStats.avgSpin) ? 'bg-yellow-200' : ''}`}>{p.avgSpin}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgEff}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgSpinDir}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgVB}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgHB}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgRah}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgRav}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgRh}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgRs}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.avgGyro}</td>
                                            <td className={`border border-black font-bold p-0.5 align-middle ${index % 2 === 1 ? 'bg-gray-200' : ''}`} rowSpan={2}>
                                                <input
                                                    type="text"
                                                    value={teamManualStrikeRates[p.name] !== undefined ? teamManualStrikeRates[p.name] : p.strikeRate}
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
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxRH || '-'}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxRS || '-'}</td>
                                            <td className={`border border-black font-bold p-0.5 ${index % 2 === 1 ? 'bg-gray-200' : ''}`}>{p.maxGyro || '-'}</td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>

                        <div className="mt-4 flex justify-center items-center gap-4">
                            <div className="bg-yellow-200 w-12 h-6 border border-black"></div>
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
                                        <td className="border border-black text-blue-700">{manualData.teamQuickAvg || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Feedback;
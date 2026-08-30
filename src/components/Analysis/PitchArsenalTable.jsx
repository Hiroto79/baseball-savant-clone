import React, { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { getSpinDirection, getModeSpinDirection } from '../../utils/spinDirection';

const COLOR_MAP = {
    "4-Seam Fastball": "#ef4444",
    "ストレート": "#ef4444",
    "Slider": "#eab308",
    "スライダー": "#eab308",
    "Curveball": "#06b6d4",
    "カーブ": "#06b6d4",
    "Changeup": "#22c55e",
    "チェンジアップ": "#22c55e",
    "Cutter": "#a855f7",
    "カッター": "#a855f7",
    "Sinker": "#f97316",
    "シンカー": "#f97316",
    "Split-Finger": "#3b82f6",
    "スプリット": "#3b82f6",
    "Sweeper": "#d97706",
    "スイーパー": "#d97706",
    "Knuckle Curve": "#1d4ed8",
    "ナックルカーブ": "#1d4ed8",
    "Other": "#94a3b8"
};

const PITCH_MAP = {
    'FF': 'ストレート', '4-Seam Fastball': 'ストレート',
    'FC': 'カッター', 'Cutter': 'カッター',
    'CH': 'チェンジアップ', 'Changeup': 'チェンジアップ',
    'CU': 'カーブ', 'Curveball': 'カーブ',
    'SL': 'スライダー', 'Slider': 'スライダー',
    'SI': 'シンカー', 'Sinker': 'シンカー',
    'FS': 'スプリット', 'Split-Finger': 'スプリット',
    'EP': 'イーファスピッチ', 'Eephus': 'イーファスピッチ',
    'ST': 'スイーパー', 'Sweeper': 'スイーパー',
    'SV': 'スラーブ', 'Slurve': 'スラーブ',
    'KC': 'ナックルカーブ', 'Knuckle Curve': 'ナックルカーブ',
    'KN': 'ナックル', 'Knuckleball': 'ナックル',
    'FO': 'フォーク', 'Forkball': 'フォーク',
    'CS': 'スローカーブ'
};

const PitchArsenalTable = ({ data, selectedPlayers, standFilter = 'all' }) => {
    const { language, units } = useSettings();

    const MPH_TO_KMH = 1.60934;

    const convertVel = (val) => {
        if (val === null || val === undefined || isNaN(val)) return null;
        return units === 'metric' ? val * MPH_TO_KMH : val;
    };

    const isSwing = (desc) => ['swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'missed_bunt', 'foul_bunt'].includes(desc);
    const isWhiff = (desc) => ['swinging_strike', 'swinging_strike_blocked'].includes(desc);
    const isCalledStrike = (desc) => desc === 'called_strike';
    const isStrike = (desc) => isCalledStrike(desc) || isSwing(desc);

    const stats = useMemo(() => {
        if (!data || data.length === 0 || selectedPlayers.length === 0) return [];

        const filtered = data.filter(d => {
            if (!d.player_name || !selectedPlayers.includes(d.player_name)) return false;
            if (standFilter !== 'all' && d.stand && d.stand !== standFilter) return false;
            return true;
        });

        const totalPitches = filtered.length;
        if (totalPitches === 0) return [];

        const pitchGroups = {};

        filtered.forEach(d => {
            const rawType = d.pitch_type || d.pitch_name || d.type || 'Other';
            const pitchName = PITCH_MAP[rawType] || PITCH_MAP[d.pitch_name] || rawType;

            if (!pitchGroups[pitchName]) {
                pitchGroups[pitchName] = {
                    name: pitchName,
                    count: 0,
                    veloSum: 0,
                    maxVelo: 0,
                    spinSum: 0,
                    spinCount: 0,
                    spinDirs: [],
                    ivbSum: 0,
                    hbSum: 0,
                    movCount: 0,
                    swings: 0,
                    whiffs: 0,
                    calledStrikes: 0,
                    strikes: 0,
                    inZone: 0,
                    battedBalls: 0,
                    exitVeloSum: 0
                };
            }

            const g = pitchGroups[pitchName];
            g.count++;

            // Velocity
            if (d.release_speed != null && !isNaN(d.release_speed)) {
                const v = Number(d.release_speed);
                g.veloSum += v;
                if (v > g.maxVelo) g.maxVelo = v;
            }

            // Spin Rate & Spin Direction (spin_axis)
            if (d.release_spin_rate != null && !isNaN(d.release_spin_rate)) {
                g.spinSum += Number(d.release_spin_rate);
                g.spinCount++;
            }

            if (d.spin_axis != null && !isNaN(d.spin_axis)) {
                const dir = getSpinDirection(d.spin_axis);
                if (dir) g.spinDirs.push(dir);
            }

            // Movement (pfx_x, pfx_z)
            if (d.pfx_x != null && d.pfx_z != null && !isNaN(d.pfx_x) && !isNaN(d.pfx_z)) {
                let hb = -Number(d.pfx_x) * 12;
                let ivb = Number(d.pfx_z) * 12;
                if (units === 'metric') {
                    hb *= 2.54;
                    ivb *= 2.54;
                }
                g.hbSum += hb;
                g.ivbSum += ivb;
                g.movCount++;
            }

            // Swings & Whiffs
            const desc = d.description || '';
            if (isSwing(desc)) g.swings++;
            if (isWhiff(desc)) g.whiffs++;
            if (isCalledStrike(desc)) g.calledStrikes++;
            if (isStrike(desc)) g.strikes++;

            // Zone (zones 1-9 are in-zone)
            if (d.zone && Number(d.zone) >= 1 && Number(d.zone) <= 9) {
                g.inZone++;
            }

            // Batted balls
            if (d.launch_speed != null && !isNaN(d.launch_speed)) {
                g.battedBalls++;
                g.exitVeloSum += Number(d.launch_speed);
            }
        });

        // Convert to array and calculate rates
        return Object.values(pitchGroups)
            .map(g => {
                const usage = (g.count / totalPitches) * 100;
                const avgVelo = g.count > 0 ? g.veloSum / g.count : null;
                const avgSpin = g.spinCount > 0 ? g.spinSum / g.spinCount : null;
                const spinDirMode = getModeSpinDirection(g.spinDirs);
                const avgIvb = g.movCount > 0 ? g.ivbSum / g.movCount : null;
                const avgHb = g.movCount > 0 ? g.hbSum / g.movCount : null;
                const whiffRate = g.swings > 0 ? (g.whiffs / g.swings) * 100 : 0;
                const cswRate = g.count > 0 ? ((g.calledStrikes + g.whiffs) / g.count) * 100 : 0;
                const strikeRate = g.count > 0 ? (g.strikes / g.count) * 100 : 0;
                const zoneRate = g.count > 0 ? (g.inZone / g.count) * 100 : 0;
                const avgExitVelo = g.battedBalls > 0 ? g.exitVeloSum / g.battedBalls : null;

                return {
                    name: g.name,
                    count: g.count,
                    usage: usage.toFixed(1),
                    avgVelo: avgVelo ? convertVel(avgVelo).toFixed(1) : '-',
                    maxVelo: g.maxVelo > 0 ? convertVel(g.maxVelo).toFixed(1) : '-',
                    avgSpin: avgSpin ? Math.round(avgSpin) : '-',
                    spinDirMode,
                    avgIvb: avgIvb != null ? (avgIvb > 0 ? `+${avgIvb.toFixed(1)}` : avgIvb.toFixed(1)) : '-',
                    avgHb: avgHb != null ? (avgHb > 0 ? `+${avgHb.toFixed(1)}` : avgHb.toFixed(1)) : '-',
                    whiffRate: whiffRate.toFixed(1),
                    cswRate: cswRate.toFixed(1),
                    strikeRate: strikeRate.toFixed(1),
                    zoneRate: zoneRate.toFixed(1),
                    avgExitVelo: avgExitVelo ? convertVel(avgExitVelo).toFixed(1) : '-',
                    color: COLOR_MAP[g.name] || '#94a3b8'
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [data, selectedPlayers, standFilter, units]);

    if (stats.length === 0) return null;

    const velUnit = units === 'metric' ? 'km/h' : 'mph';
    const movUnit = units === 'metric' ? 'cm' : 'in';

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card">
                <div>
                    <h3 className="font-bold text-base text-foreground">
                        {language === 'ja' ? '球種別スタッツ (Pitch Arsenal)' : 'Pitch Arsenal Breakdown'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {language === 'ja' 
                            ? `投球割合・球速・回転数・回転方向(Tilt)・変化量・Whiff%・CSW%の一覧`
                            : 'Pitch usage, velocity, spin rate, spin direction, movement, whiff% and CSW%'}
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-4 py-3">{language === 'ja' ? '球種' : 'Pitch'}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? '投球数' : 'Pitches'}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? '割合' : 'Usage'}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? `平均 (${velUnit})` : `Avg (${velUnit})`}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? `最高 (${velUnit})` : `Max (${velUnit})`}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? '回転数 (rpm)' : 'Spin (rpm)'}</th>
                            <th className="px-3 py-3 text-center">{language === 'ja' ? '回転方向 (Tilt)' : 'Spin Direction'}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? `縦変化 iVB (${movUnit})` : `iVB (${movUnit})`}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? `横変化 HB (${movUnit})` : `HB (${movUnit})`}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? 'Whiff%' : 'Whiff%'}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? 'CSW%' : 'CSW%'}</th>
                            <th className="px-3 py-3 text-right">{language === 'ja' ? 'Zone%' : 'Zone%'}</th>
                            <th className="px-4 py-3 text-right">{language === 'ja' ? `被平均打速 (${velUnit})` : `Exit Velo`}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {stats.map((row) => (
                            <tr key={row.name} className="hover:bg-muted/40 transition-colors">
                                <td className="px-4 py-3 font-medium flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }}></span>
                                    <span className="text-foreground font-semibold">{row.name}</span>
                                </td>
                                <td className="px-3 py-3 text-right text-muted-foreground font-mono">{row.count}</td>
                                <td className="px-3 py-3 text-right font-bold text-foreground font-mono">{row.usage}%</td>
                                <td className="px-3 py-3 text-right font-semibold text-foreground font-mono">{row.avgVelo}</td>
                                <td className="px-3 py-3 text-right text-muted-foreground font-mono">{row.maxVelo}</td>
                                <td className="px-3 py-3 text-right text-muted-foreground font-mono">{row.avgSpin}</td>
                                <td className="px-3 py-3 text-center font-mono font-bold text-amber-400 bg-amber-500/5 rounded">
                                    {row.spinDirMode}
                                </td>
                                <td className="px-3 py-3 text-right font-mono font-medium text-cyan-400">{row.avgIvb}</td>
                                <td className="px-3 py-3 text-right font-mono font-medium text-amber-400">{row.avgHb}</td>
                                <td className="px-3 py-3 text-right font-mono font-semibold">
                                    <span className={Number(row.whiffRate) >= 25 ? 'text-emerald-400 font-bold' : 'text-foreground'}>
                                        {row.whiffRate}%
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono font-semibold">
                                    <span className={Number(row.cswRate) >= 30 ? 'text-emerald-400 font-bold' : 'text-foreground'}>
                                        {row.cswRate}%
                                    </span>
                                </td>
                                <td className="px-3 py-3 text-right text-muted-foreground font-mono">{row.zoneRate}%</td>
                                <td className="px-4 py-3 text-right text-muted-foreground font-mono">{row.avgExitVelo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PitchArsenalTable;

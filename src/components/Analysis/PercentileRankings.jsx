import React, { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';

const PercentileRankings = ({ data, allData, selectedPlayers, mode = 'pitching' }) => {
    const { language, units } = useSettings();

    const MPH_TO_KMH = 1.60934;
    const convertVel = (val) => {
        if (val === null || val === undefined || isNaN(val)) return null;
        return units === 'metric' ? Number(val) * MPH_TO_KMH : Number(val);
    };
    const velUnit = units === 'metric' ? 'km/h' : 'mph';

    // Calculate Percentiles relative to all players in dataset
    const rankings = useMemo(() => {
        if (!allData || !Array.isArray(allData) || allData.length === 0 || !selectedPlayers || selectedPlayers.length === 0) {
            return [];
        }

        const isSwing = (desc) => ['swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'missed_bunt', 'foul_bunt'].includes(desc);
        const isWhiff = (desc) => ['swinging_strike', 'swinging_strike_blocked'].includes(desc);

        if (mode === 'pitching') {
            // Aggregate metrics per pitcher across entire dataset
            const pitcherStats = {};

            allData.forEach(d => {
                if (!d || !d.player_name) return;
                const name = d.player_name;
                if (!pitcherStats[name]) {
                    pitcherStats[name] = {
                        count: 0,
                        fbVeloSum: 0, fbVeloCount: 0,
                        fbSpinSum: 0, fbSpinCount: 0,
                        swings: 0, whiffs: 0,
                        chaseOpps: 0, chaseSwings: 0,
                        inZone: 0,
                        battedBalls: 0, hardHits: 0, groundBalls: 0
                    };
                }
                const st = pitcherStats[name];
                st.count++;

                // Fastball Velo & Spin (FF, SI, FC)
                const isFB = ['FF', 'SI', 'FC', '4-Seam Fastball', 'Sinker', 'Cutter'].includes(d.pitch_type || d.pitch_name);
                if (isFB && d.release_speed) {
                    st.fbVeloSum += Number(d.release_speed);
                    st.fbVeloCount++;
                }
                if (isFB && d.release_spin_rate) {
                    st.fbSpinSum += Number(d.release_spin_rate);
                    st.fbSpinCount++;
                }

                // Swings & Whiffs
                const desc = d.description || '';
                if (isSwing(desc)) st.swings++;
                if (isWhiff(desc)) st.whiffs++;

                // Zone & Chase
                const zone = Number(d.zone);
                if (zone >= 1 && zone <= 9) {
                    st.inZone++;
                } else if (zone >= 11 && zone <= 14) {
                    st.chaseOpps++;
                    if (isSwing(desc)) st.chaseSwings++;
                }

                // Batted balls
                if (d.launch_speed) {
                    st.battedBalls++;
                    if (Number(d.launch_speed) >= 95) st.hardHits++;
                }
                if (d.bb_type === 'ground_ball') st.groundBalls++;
            });

            const validPitchers = Object.entries(pitcherStats)
                .filter(([_, st]) => st.count >= 1)
                .map(([name, st]) => ({
                    name,
                    fbVelo: st.fbVeloCount > 0 ? st.fbVeloSum / st.fbVeloCount : null,
                    fbSpin: st.fbSpinCount > 0 ? st.fbSpinSum / st.fbSpinCount : null,
                    whiffRate: st.swings > 0 ? (st.whiffs / st.swings) * 100 : null,
                    chaseRate: st.chaseOpps > 0 ? (st.chaseSwings / st.chaseOpps) * 100 : null,
                    zoneRate: st.count > 0 ? (st.inZone / st.count) * 100 : null,
                    hardHitAvoid: st.battedBalls > 0 ? 100 - ((st.hardHits / st.battedBalls) * 100) : null,
                    gbRate: st.count > 0 ? (st.groundBalls / st.count) * 100 : null
                }));

            const targetPitcher = validPitchers.find(p => selectedPlayers.includes(p.name));
            if (!targetPitcher) return [];

            const calcPercentile = (metricKey, targetVal) => {
                if (targetVal === null || targetVal === undefined) return 50;
                const vals = validPitchers.map(p => p[metricKey]).filter(v => v !== null).sort((a, b) => a - b);
                if (vals.length <= 1) return 50;
                const idx = vals.findIndex(v => v >= targetVal);
                const rank = idx === -1 ? vals.length : idx;
                return Math.min(99, Math.max(1, Math.round((rank / (vals.length - 1 || 1)) * 100)));
            };

            const fbVeloDisplay = targetPitcher.fbVelo ? `${convertVel(targetPitcher.fbVelo).toFixed(1)} ${velUnit}` : '-';

            return [
                {
                    key: 'fbVelo',
                    label: language === 'ja' ? 'ストレート球速' : 'Fastball Velo',
                    valText: fbVeloDisplay,
                    percentile: calcPercentile('fbVelo', targetPitcher.fbVelo)
                },
                {
                    key: 'fbSpin',
                    label: language === 'ja' ? 'ストレート回転数' : 'Fastball Spin',
                    valText: targetPitcher.fbSpin ? `${Math.round(targetPitcher.fbSpin)} rpm` : '-',
                    percentile: calcPercentile('fbSpin', targetPitcher.fbSpin)
                },
                {
                    key: 'whiffRate',
                    label: language === 'ja' ? '空振り率 (Whiff%)' : 'Whiff Rate',
                    valText: targetPitcher.whiffRate ? `${targetPitcher.whiffRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('whiffRate', targetPitcher.whiffRate)
                },
                {
                    key: 'chaseRate',
                    label: language === 'ja' ? 'ボール球誘い率 (Chase%)' : 'Chase Rate',
                    valText: targetPitcher.chaseRate ? `${targetPitcher.chaseRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('chaseRate', targetPitcher.chaseRate)
                },
                {
                    key: 'zoneRate',
                    label: language === 'ja' ? 'ゾーン内投球率 (Zone%)' : 'Zone Rate',
                    valText: targetPitcher.zoneRate ? `${targetPitcher.zoneRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('zoneRate', targetPitcher.zoneRate)
                },
                {
                    key: 'hardHitAvoid',
                    label: language === 'ja' ? '被強打抑制率 (HardHit% 抑制)' : 'Hard-Hit Suppression',
                    valText: targetPitcher.hardHitAvoid ? `${targetPitcher.hardHitAvoid.toFixed(1)}%` : '-',
                    percentile: calcPercentile('hardHitAvoid', targetPitcher.hardHitAvoid)
                },
                {
                    key: 'gbRate',
                    label: language === 'ja' ? 'ゴロ誘導率 (GB%)' : 'Ground Ball Rate',
                    valText: targetPitcher.gbRate ? `${targetPitcher.gbRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('gbRate', targetPitcher.gbRate)
                }
            ];
        } else {
            // Hitting Percentiles
            const batterStats = {};

            allData.forEach(d => {
                if (!d || !d.batter_name) return;
                const name = d.batter_name;
                if (!batterStats[name]) {
                    batterStats[name] = {
                        count: 0,
                        batSpeedSum: 0, batSpeedCount: 0,
                        evSum: 0, evCount: 0, maxEv: 0,
                        battedBalls: 0, hardHits: 0, sweetSpots: 0,
                        swings: 0, whiffs: 0
                    };
                }
                const st = batterStats[name];
                st.count++;

                if (d.bat_speed) {
                    st.batSpeedSum += Number(d.bat_speed);
                    st.batSpeedCount++;
                }

                if (d.launch_speed) {
                    const ev = Number(d.launch_speed);
                    st.evSum += ev;
                    st.evCount++;
                    if (ev > st.maxEv) st.maxEv = ev;
                    st.battedBalls++;
                    if (ev >= 95) st.hardHits++;
                }

                if (d.launch_angle) {
                    const la = Number(d.launch_angle);
                    if (la >= 8 && la <= 32) st.sweetSpots++;
                }

                const desc = d.description || '';
                if (isSwing(desc)) st.swings++;
                if (isWhiff(desc)) st.whiffs++;
            });

            const validBatters = Object.entries(batterStats)
                .filter(([_, st]) => st.count >= 1)
                .map(([name, st]) => ({
                    name,
                    batSpeed: st.batSpeedCount > 0 ? st.batSpeedSum / st.batSpeedCount : null,
                    avgEv: st.evCount > 0 ? st.evSum / st.evCount : null,
                    maxEv: st.maxEv > 0 ? st.maxEv : null,
                    hardHitRate: st.battedBalls > 0 ? (st.hardHits / st.battedBalls) * 100 : null,
                    sweetSpotRate: st.battedBalls > 0 ? (st.sweetSpots / st.battedBalls) * 100 : null,
                    contactRate: st.swings > 0 ? 100 - ((st.whiffs / st.swings) * 100) : null
                }));

            const targetBatter = validBatters.find(p => selectedPlayers.includes(p.name));
            if (!targetBatter) return [];

            const calcPercentile = (metricKey, targetVal) => {
                if (targetVal === null || targetVal === undefined) return 50;
                const vals = validBatters.map(p => p[metricKey]).filter(v => v !== null).sort((a, b) => a - b);
                if (vals.length <= 1) return 50;
                const idx = vals.findIndex(v => v >= targetVal);
                const rank = idx === -1 ? vals.length : idx;
                return Math.min(99, Math.max(1, Math.round((rank / (vals.length - 1 || 1)) * 100)));
            };

            const batSpeedDisplay = targetBatter.batSpeed ? `${convertVel(targetBatter.batSpeed).toFixed(1)} ${velUnit}` : '-';
            const avgEvDisplay = targetBatter.avgEv ? `${convertVel(targetBatter.avgEv).toFixed(1)} ${velUnit}` : '-';
            const maxEvDisplay = targetBatter.maxEv ? `${convertVel(targetBatter.maxEv).toFixed(1)} ${velUnit}` : '-';

            return [
                {
                    key: 'batSpeed',
                    label: language === 'ja' ? 'バットスピード' : 'Bat Speed',
                    valText: batSpeedDisplay,
                    percentile: calcPercentile('batSpeed', targetBatter.batSpeed)
                },
                {
                    key: 'avgEv',
                    label: language === 'ja' ? '平均打球初速 (Avg EV)' : 'Avg Exit Velo',
                    valText: avgEvDisplay,
                    percentile: calcPercentile('avgEv', targetBatter.avgEv)
                },
                {
                    key: 'maxEv',
                    label: language === 'ja' ? '最高打球初速 (Max EV)' : 'Max Exit Velo',
                    valText: maxEvDisplay,
                    percentile: calcPercentile('maxEv', targetBatter.maxEv)
                },
                {
                    key: 'hardHitRate',
                    label: language === 'ja' ? 'ハードヒット率 (Hard-Hit%)' : 'Hard-Hit Rate',
                    valText: targetBatter.hardHitRate ? `${targetBatter.hardHitRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('hardHitRate', targetBatter.hardHitRate)
                },
                {
                    key: 'sweetSpotRate',
                    label: language === 'ja' ? '最適角度率 (Sweet-Spot%)' : 'Sweet-Spot Rate',
                    valText: targetBatter.sweetSpotRate ? `${targetBatter.sweetSpotRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('sweetSpotRate', targetBatter.sweetSpotRate)
                },
                {
                    key: 'contactRate',
                    label: language === 'ja' ? 'コンタクト率 (100 - Whiff%)' : 'Contact Rate',
                    valText: targetBatter.contactRate ? `${targetBatter.contactRate.toFixed(1)}%` : '-',
                    percentile: calcPercentile('contactRate', targetBatter.contactRate)
                }
            ];
        }
    }, [allData, selectedPlayers, mode, language, units]);

    if (rankings.length === 0) return null;

    // Helper for Savant Percentile Color
    const getPercentileColor = (p) => {
        if (p >= 90) return '#dc2626'; // Red Elite (90-99)
        if (p >= 70) return '#ef4444'; // Bright Red (70-89)
        if (p >= 55) return '#f97316'; // Orange (55-69)
        if (p >= 45) return '#64748b'; // Gray Average (45-54)
        if (p >= 30) return '#3b82f6'; // Blue Below Avg (30-44)
        return '#1d4ed8'; // Dark Blue Poor (1-29)
    };

    return (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                    <h3 className="font-extrabold text-sm md:text-base text-foreground tracking-tight flex items-center gap-2">
                        <span>{language === 'ja' ? '能力パーセンタイル評価' : 'Statcast Percentile Rankings'}</span>
                        <span className="text-[10px] bg-blue-500/15 text-blue-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            MLB Benchmark
                        </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {language === 'ja' 
                            ? '全選手内での順位を1〜99のパーセンタイル（赤: エリート上位 / 青: 下位）で評価' 
                            : 'Rank relative to all players in dataset (Red: Top Elite / Blue: Poor)'}
                    </p>
                </div>
            </div>

            {/* Grid of Percentile Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
                {rankings.map(item => {
                    const color = getPercentileColor(item.percentile);
                    return (
                        <div key={item.key} className="bg-muted/40 p-3 rounded-xl border border-border/80 flex flex-col justify-between space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-semibold text-foreground leading-snug">
                                    {item.label}
                                </span>
                                <span className="text-xs font-mono font-bold text-muted-foreground whitespace-nowrap">
                                    {item.valText}
                                </span>
                            </div>

                            {/* Slider Bar */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-muted-foreground text-[10px]">0</span>
                                    <span 
                                        className="font-extrabold px-1.5 py-0.2 rounded-md text-white shadow-sm text-[11px]" 
                                        style={{ backgroundColor: color }}
                                    >
                                        {item.percentile}
                                    </span>
                                    <span className="text-muted-foreground text-[10px]">100</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full rounded-full transition-all duration-700 shadow-sm"
                                        style={{ 
                                            width: `${item.percentile}%`, 
                                            backgroundColor: color 
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PercentileRankings;

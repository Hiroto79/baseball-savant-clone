import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useRapsodo } from '../context/RapsodoContext';
import { useBlast } from '../context/BlastContext';
import { useSettings } from '../context/SettingsContext';
import { 
    Trophy, 
    Medal, 
    Activity, 
    Zap, 
    Target, 
    Wind, 
    Flame, 
    TrendingUp, 
    Search, 
    Filter, 
    ArrowRight,
    Sparkles,
    BarChart2,
    Crown
} from 'lucide-react';

const Leaderboard = () => {
    const { data: savantData = [], loading: savantLoading } = useData() || {};
    const { pitchingData: rapsodoPitching = [], battingData: rapsodoBatting = [], loading: rapsodoLoading } = useRapsodo() || {};
    const { blastData = [], loading: blastLoading } = useBlast() || {};
    const { language, units } = useSettings();

    const [activeTab, setActiveTab] = useState('savant'); // 'savant' | 'rapsodo' | 'blast'
    const [category, setCategory] = useState('pitching'); // 'pitching' | 'batting'
    const [metric, setMetric] = useState('max_velo'); // Default metric
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('ALL');
    const [ageCategory, setAgeCategory] = useState('All');

    const MPH_TO_KMH = 1.60934;
    const FT_TO_M = 0.3048;

    const convertVel = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 0;
        return units === 'metric' ? Number(val) * MPH_TO_KMH : Number(val);
    };

    const convertDist = (val) => {
        if (val === null || val === undefined || isNaN(val)) return 0;
        return units === 'metric' ? Number(val) * FT_TO_M : Number(val);
    };

    const velUnit = units === 'metric' ? 'km/h' : 'mph';
    const distUnit = units === 'metric' ? 'm' : 'ft';

    // 1. Available Metrics by Tab & Category
    const metricsConfig = {
        savant: {
            pitching: [
                { id: 'max_velo', label: language === 'ja' ? '最高球速' : 'Max Velocity', subLabel: 'Max Speed', icon: Zap, unit: velUnit, color: 'text-red-400', bg: 'bg-red-500/10' },
                { id: 'avg_velo', label: language === 'ja' ? '平均球速' : 'Avg Velocity', subLabel: 'Avg Speed', icon: Flame, unit: velUnit, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { id: 'max_spin', label: language === 'ja' ? '最高回転数' : 'Max Spin Rate', subLabel: 'Max RPM', icon: Activity, unit: 'rpm', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { id: 'whiff_rate', label: language === 'ja' ? '空振り奪取率' : 'Whiff Rate', subLabel: 'Whiff %', icon: TrendingUp, unit: '%', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { id: 'max_ivb', label: language === 'ja' ? '最大縦ホップ量' : 'Max iVB (Hop)', subLabel: 'Vertical Break', icon: Wind, unit: units === 'metric' ? 'cm' : 'in', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { id: 'max_hb', label: language === 'ja' ? '最大横変化量' : 'Max HB (Sweep)', subLabel: 'Horizontal Break', icon: Target, unit: units === 'metric' ? 'cm' : 'in', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ],
            batting: [
                { id: 'max_ev', label: language === 'ja' ? '最高打球初速' : 'Max Exit Velo', subLabel: 'Max EV', icon: Zap, unit: velUnit, color: 'text-red-400', bg: 'bg-red-500/10' },
                { id: 'avg_ev', label: language === 'ja' ? '平均打球初速' : 'Avg Exit Velo', subLabel: 'Avg EV', icon: Flame, unit: velUnit, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { id: 'max_dist', label: language === 'ja' ? '最長飛距離' : 'Max Distance', subLabel: 'Max Distance', icon: Target, unit: distUnit, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { id: 'bat_speed', label: language === 'ja' ? 'バットスピード' : 'Bat Speed', subLabel: 'Swing Speed', icon: Wind, unit: velUnit, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { id: 'hard_hit', label: language === 'ja' ? 'ハードヒット率' : 'Hard-Hit %', subLabel: '95mph+ Rate', icon: Activity, unit: '%', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { id: 'sweet_spot', label: language === 'ja' ? '最適角度率' : 'Sweet-Spot %', subLabel: '8°-32° Rate', icon: Sparkles, unit: '%', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ]
        },
        rapsodo: {
            pitching: [
                { id: 'rap_p_max_vel', label: language === 'ja' ? '最高球速' : 'Max Velocity', icon: Zap, unit: velUnit, color: 'text-red-400', bg: 'bg-red-500/10' },
                { id: 'rap_p_avg_vel', label: language === 'ja' ? '平均球速' : 'Avg Velocity', icon: Flame, unit: velUnit, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { id: 'rap_p_spin', label: language === 'ja' ? '最高回転数' : 'Max Spin Rate', icon: Activity, unit: 'rpm', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { id: 'rap_p_eff', label: language === 'ja' ? '回転効率' : 'Spin Efficiency', icon: TrendingUp, unit: '%', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            ],
            batting: [
                { id: 'rap_b_max_ev', label: language === 'ja' ? '最高打球初速' : 'Max Exit Velo', icon: Zap, unit: velUnit, color: 'text-red-400', bg: 'bg-red-500/10' },
                { id: 'rap_b_avg_ev', label: language === 'ja' ? '平均打球初速' : 'Avg Exit Velo', icon: Flame, unit: velUnit, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { id: 'rap_b_dist', label: language === 'ja' ? '最長飛距離' : 'Max Distance', icon: Target, unit: distUnit, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ]
        },
        blast: {
            batting: [
                { id: 'blast_bs', label: language === 'ja' ? 'バットスピード' : 'Bat Speed', icon: Wind, unit: velUnit, color: 'text-red-400', bg: 'bg-red-500/10' },
                { id: 'blast_phs', label: language === 'ja' ? 'ハンドスピード' : 'Hand Speed', icon: Zap, unit: velUnit, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { id: 'blast_pwr', label: language === 'ja' ? 'パワー' : 'Power', icon: Activity, unit: 'kW', color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { id: 'blast_ope', label: language === 'ja' ? 'オンプレーン効率' : 'On-Plane %', icon: Target, unit: '%', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            ]
        }
    };

    // Auto update metric when changing tab/category
    const currentMetrics = metricsConfig[activeTab]?.[category] || metricsConfig[activeTab]?.batting || [];

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        const nextCat = newTab === 'blast' ? 'batting' : category;
        setCategory(nextCat);
        const available = metricsConfig[newTab]?.[nextCat] || metricsConfig[newTab]?.batting || [];
        if (available.length > 0) setMetric(available[0].id);
    };

    const handleCategoryChange = (newCat) => {
        setCategory(newCat);
        const available = metricsConfig[activeTab]?.[newCat] || [];
        if (available.length > 0) setMetric(available[0].id);
    };

    // 2. Extract Teams in dataset
    const availableTeams = useMemo(() => {
        const teams = new Set();
        savantData.forEach(d => {
            if (d.home_team) teams.add(String(d.home_team));
            if (d.away_team) teams.add(String(d.away_team));
        });
        return ['ALL', ...Array.from(teams).sort()];
    }, [savantData]);

    // 3. Aggregate Leaderboard Data
    const leaderboardData = useMemo(() => {
        const isSwing = (desc) => ['swinging_strike', 'swinging_strike_blocked', 'foul', 'foul_tip', 'hit_into_play', 'missed_bunt', 'foul_bunt'].includes(desc);
        const isWhiff = (desc) => ['swinging_strike', 'swinging_strike_blocked'].includes(desc);

        const playerMap = {};

        if (activeTab === 'savant') {
            savantData.forEach(d => {
                if (!d) return;

                if (category === 'pitching') {
                    const p = d.player_name;
                    if (!p) return;

                    const team = d.home_team || d.away_team || '-';
                    if (selectedTeam !== 'ALL' && d.home_team !== selectedTeam && d.away_team !== selectedTeam) return;

                    if (!playerMap[p]) {
                        playerMap[p] = {
                            name: p,
                            team: team,
                            count: 0,
                            veloSum: 0, veloCount: 0, maxVelo: 0,
                            spinSum: 0, spinCount: 0, maxSpin: 0,
                            swings: 0, whiffs: 0,
                            maxIvb: -999, maxHb: -999,
                            topPitch: d.pitch_name || d.pitch_type || '-'
                        };
                    }
                    const st = playerMap[p];
                    st.count++;

                    if (d.release_speed) {
                        const v = Number(d.release_speed);
                        st.veloSum += v;
                        st.veloCount++;
                        if (v > st.maxVelo) {
                            st.maxVelo = v;
                            st.topPitch = d.pitch_name || d.pitch_type || st.topPitch;
                        }
                    }

                    if (d.release_spin_rate) {
                        const s = Number(d.release_spin_rate);
                        st.spinSum += s;
                        st.spinCount++;
                        if (s > st.maxSpin) st.maxSpin = s;
                    }

                    const desc = d.description || '';
                    if (isSwing(desc)) st.swings++;
                    if (isWhiff(desc)) st.whiffs++;

                    if (d.pfx_z) {
                        const ivb = Number(d.pfx_z) * 12;
                        if (ivb > st.maxIvb) st.maxIvb = ivb;
                    }
                    if (d.pfx_x) {
                        const hb = Math.abs(Number(d.pfx_x) * 12);
                        if (hb > st.maxHb) st.maxHb = hb;
                    }
                } else {
                    // Batting
                    const p = d.batter_name;
                    if (!p) return;

                    const team = d.home_team || d.away_team || '-';
                    if (selectedTeam !== 'ALL' && d.home_team !== selectedTeam && d.away_team !== selectedTeam) return;

                    if (!playerMap[p]) {
                        playerMap[p] = {
                            name: p,
                            team: team,
                            count: 0,
                            evSum: 0, evCount: 0, maxEv: 0,
                            distSum: 0, distCount: 0, maxDist: 0,
                            bsSum: 0, bsCount: 0, maxBs: 0,
                            battedCount: 0, hardHitCount: 0, sweetSpotCount: 0
                        };
                    }
                    const st = playerMap[p];
                    st.count++;

                    if (d.launch_speed) {
                        const ev = Number(d.launch_speed);
                        st.evSum += ev;
                        st.evCount++;
                        if (ev > st.maxEv) st.maxEv = ev;
                        st.battedCount++;
                        if (ev >= 95) st.hardHitCount++;
                    }

                    if (d.hit_distance_sc) {
                        const dist = Number(d.hit_distance_sc);
                        st.distSum += dist;
                        st.distCount++;
                        if (dist > st.maxDist) st.maxDist = dist;
                    }

                    if (d.bat_speed) {
                        const bs = Number(d.bat_speed);
                        st.bsSum += bs;
                        st.bsCount++;
                        if (bs > st.maxBs) st.maxBs = bs;
                    }

                    if (d.launch_angle) {
                        const la = Number(d.launch_angle);
                        if (la >= 8 && la <= 32) st.sweetSpotCount++;
                    }
                }
            });

            // Map metrics to sortable value
            return Object.values(playerMap).map(st => {
                let sortVal = 0;
                let displayVal = '-';
                let subVal = '-';

                if (category === 'pitching') {
                    const avgV = st.veloCount > 0 ? convertVel(st.veloSum / st.veloCount).toFixed(1) : '-';
                    const maxV = st.maxVelo > 0 ? convertVel(st.maxVelo).toFixed(1) : '-';
                    const whiff = st.swings > 0 ? ((st.whiffs / st.swings) * 100).toFixed(1) : '0.0';

                    let ivbText = '-';
                    if (st.maxIvb > -990) {
                        ivbText = units === 'metric' ? (st.maxIvb * 2.54).toFixed(1) : st.maxIvb.toFixed(1);
                    }
                    let hbText = '-';
                    if (st.maxHb > -990) {
                        hbText = units === 'metric' ? (st.maxHb * 2.54).toFixed(1) : st.maxHb.toFixed(1);
                    }

                    if (metric === 'max_velo') {
                        sortVal = st.maxVelo;
                        displayVal = maxV;
                        subVal = `平均 ${avgV} ${velUnit}`;
                    } else if (metric === 'avg_velo') {
                        sortVal = st.veloCount > 0 ? st.veloSum / st.veloCount : 0;
                        displayVal = avgV;
                        subVal = `最高 ${maxV} ${velUnit}`;
                    } else if (metric === 'max_spin') {
                        sortVal = st.maxSpin;
                        displayVal = Math.round(st.maxSpin).toLocaleString();
                        subVal = `平均 ${st.spinCount > 0 ? Math.round(st.spinSum / st.spinCount) : '-'} rpm`;
                    } else if (metric === 'whiff_rate') {
                        sortVal = st.swings > 0 ? (st.whiffs / st.swings) * 100 : 0;
                        displayVal = `${whiff}%`;
                        subVal = `${st.whiffs}空振り / ${st.swings}スイング`;
                    } else if (metric === 'max_ivb') {
                        sortVal = st.maxIvb;
                        displayVal = ivbText;
                        subVal = `縦ホップ (iVB)`;
                    } else if (metric === 'max_hb') {
                        sortVal = st.maxHb;
                        displayVal = hbText;
                        subVal = `横スイープ (HB)`;
                    }

                    return {
                        name: st.name,
                        team: st.team,
                        sampleCount: st.count,
                        sampleLabel: `${st.count}球`,
                        badge: st.topPitch,
                        sortVal,
                        displayVal,
                        subVal
                    };
                } else {
                    // Batting
                    const avgEv = st.evCount > 0 ? convertVel(st.evSum / st.evCount).toFixed(1) : '-';
                    const maxEv = st.maxEv > 0 ? convertVel(st.maxEv).toFixed(1) : '-';
                    const maxDist = st.maxDist > 0 ? convertDist(st.maxDist).toFixed(0) : '-';
                    const batSpeed = st.bsCount > 0 ? convertVel(st.bsSum / st.bsCount).toFixed(1) : (st.maxBs > 0 ? convertVel(st.maxBs).toFixed(1) : '-');
                    const hardHit = st.battedCount > 0 ? ((st.hardHitCount / st.battedCount) * 100).toFixed(1) : '0.0';
                    const sweetSpot = st.battedCount > 0 ? ((st.sweetSpotCount / st.battedCount) * 100).toFixed(1) : '0.0';

                    if (metric === 'max_ev') {
                        sortVal = st.maxEv;
                        displayVal = maxEv;
                        subVal = `平均 ${avgEv} ${velUnit}`;
                    } else if (metric === 'avg_ev') {
                        sortVal = st.evCount > 0 ? st.evSum / st.evCount : 0;
                        displayVal = avgEv;
                        subVal = `最高 ${maxEv} ${velUnit}`;
                    } else if (metric === 'max_dist') {
                        sortVal = st.maxDist;
                        displayVal = maxDist;
                        subVal = `最長飛距離`;
                    } else if (metric === 'bat_speed') {
                        sortVal = st.maxBs > 0 ? st.maxBs : (st.bsCount > 0 ? st.bsSum / st.bsCount : 0);
                        displayVal = batSpeed;
                        subVal = `バットスピード`;
                    } else if (metric === 'hard_hit') {
                        sortVal = st.battedCount > 0 ? (st.hardHitCount / st.battedCount) * 100 : 0;
                        displayVal = `${hardHit}%`;
                        subVal = `${st.hardHitCount}本 / 95mph+`;
                    } else if (metric === 'sweet_spot') {
                        sortVal = st.battedCount > 0 ? (st.sweetSpotCount / st.battedCount) * 100 : 0;
                        displayVal = `${sweetSpot}%`;
                        subVal = `角度 8°-32°`;
                    }

                    return {
                        name: st.name,
                        team: st.team,
                        sampleCount: st.count,
                        sampleLabel: `${st.count}打席/球`,
                        badge: `${st.battedCount}打球`,
                        sortVal,
                        displayVal,
                        subVal
                    };
                }
            })
            .filter(item => item.sortVal > 0 && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.sortVal - a.sortVal)
            .map((item, idx) => ({ ...item, rank: idx + 1 }));

        } else if (activeTab === 'rapsodo') {
            const dataList = category === 'pitching' ? rapsodoPitching : rapsodoBatting;
            dataList.forEach(d => {
                if (ageCategory !== 'All' && d.player_category !== ageCategory) return;
                const p = d['Player Name'] || d.player_name;
                if (!p) return;

                if (!playerMap[p]) {
                    playerMap[p] = { name: p, team: d.player_category || 'Rapsodo', count: 0, valSum: 0, valCount: 0, maxVal: 0 };
                }
                const st = playerMap[p];
                st.count++;

                let v = 0;
                if (metric === 'rap_p_max_vel' || metric === 'rap_p_avg_vel') v = Number(d.Velocity || d.velocity || 0);
                else if (metric === 'rap_p_spin') v = Number(d['Total Spin'] || d.total_spin || 0);
                else if (metric === 'rap_p_eff') v = Number(d['Spin Efficiency'] || d.spin_efficiency || 0);
                else if (metric === 'rap_b_max_ev' || metric === 'rap_b_avg_ev') v = Number(d.ExitVelocity || d.exit_velocity || 0);
                else if (metric === 'rap_b_dist') v = Number(d.Distance || d.distance || 0);

                if (v > 0) {
                    st.valSum += v;
                    st.valCount++;
                    if (v > st.maxVal) st.maxVal = v;
                }
            });

            return Object.values(playerMap).map(st => {
                let sortVal = metric.includes('avg') ? (st.valCount > 0 ? st.valSum / st.valCount : 0) : st.maxVal;
                let displayVal = sortVal.toFixed(1);
                if (metric.includes('spin')) displayVal = Math.round(sortVal).toLocaleString();

                return {
                    name: st.name,
                    team: st.team,
                    sampleCount: st.count,
                    sampleLabel: `${st.count}球`,
                    badge: st.team,
                    sortVal,
                    displayVal,
                    subVal: metric.includes('avg') ? `Max ${st.maxVal.toFixed(1)}` : `Avg ${st.valCount > 0 ? (st.valSum / st.valCount).toFixed(1) : '-'}`
                };
            })
            .filter(item => item.sortVal > 0 && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.sortVal - a.sortVal)
            .map((item, idx) => ({ ...item, rank: idx + 1 }));

        } else if (activeTab === 'blast') {
            blastData.forEach(d => {
                const p = d.player_name || d.PlayerName;
                if (!p) return;

                if (!playerMap[p]) {
                    playerMap[p] = { name: p, team: 'Blast', count: 0, valSum: 0, valCount: 0, maxVal: 0 };
                }
                const st = playerMap[p];
                st.count++;

                let v = 0;
                if (metric === 'blast_bs') v = Number(d.bat_speed || d.BatSpeed || 0);
                else if (metric === 'blast_phs') v = Number(d.peak_hand_speed || d.PeakHandSpeed || 0);
                else if (metric === 'blast_pwr') v = Number(d.power || d.Power || 0);
                else if (metric === 'blast_ope') v = Number(d.on_plane_efficiency || d.OnPlaneEfficiency || 0);

                if (v > 0) {
                    st.valSum += v;
                    st.valCount++;
                    if (v > st.maxVal) st.maxVal = v;
                }
            });

            return Object.values(playerMap).map(st => {
                let sortVal = st.maxVal;
                let displayVal = sortVal.toFixed(1);

                return {
                    name: st.name,
                    team: st.team,
                    sampleCount: st.count,
                    sampleLabel: `${st.count}スイング`,
                    badge: 'Blast',
                    sortVal,
                    displayVal,
                    subVal: `Avg ${st.valCount > 0 ? (st.valSum / st.valCount).toFixed(1) : '-'}`
                };
            })
            .filter(item => item.sortVal > 0 && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.sortVal - a.sortVal)
            .map((item, idx) => ({ ...item, rank: idx + 1 }));
        }

        return [];
    }, [activeTab, category, metric, savantData, rapsodoPitching, rapsodoBatting, blastData, selectedTeam, ageCategory, searchQuery, units]);

    const activeMetricConfig = currentMetrics.find(m => m.id === metric) || currentMetrics[0] || {};
    const top3 = leaderboardData.slice(0, 3);
    const maxValRank1 = top3.length > 0 ? top3[0].sortVal : 1;

    const isLoading = savantLoading || rapsodoLoading || blastLoading;

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
            {/* Top Hero Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-card to-card p-6 rounded-3xl border border-border shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Trophy className="h-8 w-8 text-amber-400 drop-shadow-md" />
                        <span>{language === 'ja' ? 'Statcast リーダーボード' : 'Statcast Leaderboard'}</span>
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        {language === 'ja' 
                            ? '球速・打球速度・回転数・バットスピード等のトップパフォーマーランキング' 
                            : 'Top performers across advanced Statcast, Rapsodo, and Blast metrics.'}
                    </p>
                </div>

                {/* DataSource Tabs (Savant / Rapsodo / Blast) */}
                <div className="flex bg-muted/80 p-1.5 rounded-2xl border border-border">
                    {[
                        { id: 'savant', label: 'Savant (MLB)' },
                        { id: 'rapsodo', label: 'Rapsodo' },
                        { id: 'blast', label: 'Blast Motion' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sub Filter Controls Bar */}
            <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Category Toggle (Pitching / Batting) */}
                {activeTab !== 'blast' && (
                    <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
                        <button
                            onClick={() => handleCategoryChange('pitching')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                category === 'pitching'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {language === 'ja' ? '投手部門 (Pitching)' : 'Pitching'}
                        </button>
                        <button
                            onClick={() => handleCategoryChange('batting')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                category === 'batting'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {language === 'ja' ? '打者部門 (Batting)' : 'Batting'}
                        </button>
                    </div>
                )}

                {/* Search Bar & Team Filter */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {activeTab === 'savant' && (
                        <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-xl border border-border text-xs">
                            <Filter size={13} className="text-muted-foreground" />
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer text-xs"
                            >
                                <option value="ALL" className="bg-card">全チーム (ALL)</option>
                                {availableTeams.filter(t => t !== 'ALL').map(t => (
                                    <option key={t} value={t} className="bg-card">{t}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={language === 'ja' ? '選手名を検索...' : 'Search player...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted/60 text-foreground text-xs pl-9 pr-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Metric Selector Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {currentMetrics.map(m => {
                    const Icon = m.icon;
                    const isSelected = metric === m.id;
                    return (
                        <button
                            key={m.id}
                            onClick={() => setMetric(m.id)}
                            className={`p-3 rounded-2xl border transition-all flex flex-col justify-between text-left ${
                                isSelected
                                    ? 'border-amber-500/80 bg-amber-500/10 shadow-md ring-1 ring-amber-500/40'
                                    : 'border-border bg-card hover:bg-muted/40'
                            }`}
                        >
                            <div className="flex items-center justify-between w-full mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-muted-foreground'}`}>
                                    {m.subLabel || m.unit}
                                </span>
                                <div className={`p-1.5 rounded-lg ${m.bg}`}>
                                    <Icon size={14} className={m.color} />
                                </div>
                            </div>
                            <div className="font-extrabold text-xs text-foreground mt-1 truncate">
                                {m.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* TOP 3 PODIUM CARDS (Gold, Silver, Bronze) */}
            {top3.length > 0 && !isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {/* 2nd Place (Silver) */}
                    {top3[1] && (
                        <div className="order-2 md:order-1 bg-gradient-to-b from-slate-800/40 to-card p-5 rounded-3xl border border-slate-700/60 shadow-md flex flex-col justify-between relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-300/20 text-slate-300 font-extrabold flex items-center justify-center text-sm border border-slate-300/30">
                                        2
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SILVER</span>
                                </div>
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{top3[1].team}</span>
                            </div>
                            <div className="my-4">
                                <h3 className="text-lg font-extrabold text-foreground truncate">{top3[1].name}</h3>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-black text-slate-200 font-mono">{top3[1].displayVal}</span>
                                    <span className="text-xs font-bold text-muted-foreground">{activeMetricConfig.unit}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{top3[1].subVal}</p>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-border pt-2.5">
                                <span>{top3[1].sampleLabel}</span>
                                <Link to="/analysis" className="text-blue-400 hover:underline flex items-center gap-1 font-semibold">
                                    <span>分析</span>
                                    <ArrowRight size={11} />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* 1st Place (Gold Champion) */}
                    {top3[0] && (
                        <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-card to-card p-6 rounded-3xl border-2 border-amber-500/50 shadow-xl flex flex-col justify-between relative overflow-hidden transform md:-translate-y-2">
                            <div className="absolute top-2 right-3 text-amber-500/20">
                                <Crown size={64} />
                            </div>
                            <div className="flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-lg">
                                        1
                                    </div>
                                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                        <Crown size={13} />
                                        CHAMPION
                                    </span>
                                </div>
                                <span className="text-xs font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                                    {top3[0].team}
                                </span>
                            </div>
                            <div className="my-4 z-10">
                                <h3 className="text-xl font-black text-foreground truncate">{top3[0].name}</h3>
                                <div className="flex items-baseline gap-1.5 mt-1">
                                    <span className="text-4xl font-black text-amber-400 font-mono tracking-tight">{top3[0].displayVal}</span>
                                    <span className="text-sm font-bold text-amber-400/80">{activeMetricConfig.unit}</span>
                                </div>
                                <p className="text-xs text-amber-200/70 font-medium mt-0.5">{top3[0].subVal}</p>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-amber-500/20 pt-3 z-10">
                                <span>{top3[0].sampleLabel}</span>
                                <Link to="/analysis" className="text-amber-400 hover:underline flex items-center gap-1 font-bold">
                                    <span>詳細分析へ</span>
                                    <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place (Bronze) */}
                    {top3[2] && (
                        <div className="order-3 md:order-3 bg-gradient-to-b from-amber-900/20 to-card p-5 rounded-3xl border border-amber-800/40 shadow-md flex flex-col justify-between relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-amber-700/30 text-amber-600 font-extrabold flex items-center justify-center text-sm border border-amber-700/30">
                                        3
                                    </div>
                                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">BRONZE</span>
                                </div>
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{top3[2].team}</span>
                            </div>
                            <div className="my-4">
                                <h3 className="text-lg font-extrabold text-foreground truncate">{top3[2].name}</h3>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-black text-amber-600/90 font-mono">{top3[2].displayVal}</span>
                                    <span className="text-xs font-bold text-muted-foreground">{activeMetricConfig.unit}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{top3[2].subVal}</p>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-border pt-2.5">
                                <span>{top3[2].sampleLabel}</span>
                                <Link to="/analysis" className="text-blue-400 hover:underline flex items-center gap-1 font-semibold">
                                    <span>分析</span>
                                    <ArrowRight size={11} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* FULL RANKING TABLE */}
            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                        <h3 className="font-extrabold text-sm md:text-base text-foreground flex items-center gap-2">
                            <span>{activeMetricConfig.label} 全体ランキング</span>
                            <span className="text-xs font-normal text-muted-foreground">({leaderboardData.length}名)</span>
                        </h3>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] font-semibold border-b border-border">
                            <tr>
                                <th className="px-5 py-3.5 w-16 text-center">Rank</th>
                                <th className="px-5 py-3.5">選手名 (Player)</th>
                                <th className="px-5 py-3.5">チーム</th>
                                <th className="px-5 py-3.5 text-right">{activeMetricConfig.label} ({activeMetricConfig.unit})</th>
                                <th className="px-5 py-3.5 hidden md:table-cell text-right">サブ指標</th>
                                <th className="px-5 py-3.5 hidden sm:table-cell w-36">トップ比</th>
                                <th className="px-5 py-3.5 text-center w-20">リンク</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-mono">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground font-sans">
                                        データを読み込み中...
                                    </td>
                                </tr>
                            ) : leaderboardData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-muted-foreground font-sans">
                                        該当するデータがありません。
                                    </td>
                                </tr>
                            ) : (
                                leaderboardData.map((row) => {
                                    const percentOfTop = maxValRank1 > 0 ? Math.min(100, Math.max(10, (row.sortVal / maxValRank1) * 100)) : 100;
                                    return (
                                        <tr key={`${row.rank}-${row.name}`} className="hover:bg-muted/40 transition-colors group">
                                            {/* Rank */}
                                            <td className="px-5 py-3 text-center">
                                                <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-xs ${
                                                    row.rank === 1 ? 'bg-amber-500 text-slate-950 shadow-sm' :
                                                    row.rank === 2 ? 'bg-slate-300 text-slate-950' :
                                                    row.rank === 3 ? 'bg-amber-700 text-white' :
                                                    'text-muted-foreground bg-muted/70'
                                                }`}>
                                                    {row.rank}
                                                </div>
                                            </td>

                                            {/* Player Name */}
                                            <td className="px-5 py-3 font-sans font-bold text-foreground text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span>{row.name}</span>
                                                    {row.badge && (
                                                        <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.2 rounded">
                                                            {row.badge}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Team */}
                                            <td className="px-5 py-3 text-muted-foreground">
                                                {row.team || '-'}
                                            </td>

                                            {/* Main Value */}
                                            <td className="px-5 py-3 text-right">
                                                <span className={`text-base font-black ${
                                                    row.rank === 1 ? 'text-amber-400' :
                                                    row.rank <= 3 ? 'text-foreground' : 'text-slate-200'
                                                }`}>
                                                    {row.displayVal}
                                                </span>
                                            </td>

                                            {/* Sub Value */}
                                            <td className="px-5 py-3 text-right text-muted-foreground text-[11px] hidden md:table-cell">
                                                {row.subVal}
                                            </td>

                                            {/* Top Compare Bar */}
                                            <td className="px-5 py-3 hidden sm:table-cell">
                                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            row.rank === 1 ? 'bg-amber-400' :
                                                            row.rank <= 3 ? 'bg-blue-400' : 'bg-slate-500'
                                                        }`}
                                                        style={{ width: `${percentOfTop}%` }}
                                                    />
                                                </div>
                                            </td>

                                            {/* Quick Link */}
                                            <td className="px-5 py-3 text-center">
                                                <Link
                                                    to="/analysis"
                                                    className="inline-flex p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-muted rounded-lg transition-colors"
                                                    title="詳細分析へ"
                                                >
                                                    <ArrowRight size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { KMH_TO_MPH, MPH_TO_KMH } from '../utils/units';
import StrikeZone from '../components/StrikeZone';
import SprayChart from '../components/SprayChart';

const PlayerDetails = () => {
    const { playerId } = useParams();
    const { data, loading, players } = useData();
    const { language, units } = useSettings();

    const playerData = useMemo(() => {
        if (loading || !data.length) return { pitches: [], hits: [], stats: {} };

        // Filter data where this player is Pitcher OR Batter
        // Support both ID matching and Name matching (for legacy data or when ID is missing)
        const pitches = data.filter(row =>
            row.pitcher == playerId ||
            row.pitcher_name === playerId ||
            row.player_name === playerId // Savant CSV uses player_name for pitcher
        );
        const atBats = data.filter(row =>
            row.batter == playerId ||
            row.batter_name === playerId
        );

        // Determine if primarily pitcher or batter for this view
        const isPitcher = pitches.length > 0;

        // Helper to convert velocity based on settings
        // Savant data is in mph
        const convertVel = (val) => units === 'metric' ? val * MPH_TO_KMH : val;

        // Calculate Stats
        const stats = {
            name: players[playerId] || (isPitcher ? pitches[0]?.player_name : atBats[0]?.batter_name) || `Player ${playerId}`,
            role: isPitcher ? 'Pitcher' : 'Batter',
            totalPitches: pitches.length,
            avgVelocity: isPitcher
                ? convertVel(pitches.reduce((acc, p) => acc + (p.release_speed || 0), 0) / (pitches.filter(p => p.release_speed).length || 1)).toFixed(1)
                : 0,
            maxSpin: isPitcher
                ? Math.max(...pitches.map(p => p.release_spin_rate || 0))
                : 0,
            strikeRate: isPitcher
                ? ((pitches.filter(p => p.type === 'S').length / (pitches.length || 1)) * 100).toFixed(1)
                : 0,
            // Batting stats
            totalPA: atBats.length,
            hits: atBats.filter(row => ['single', 'double', 'triple', 'home_run'].includes(row.events)).length,
            avgExitVel: convertVel(atBats.reduce((acc, p) => acc + (p.launch_speed || 0), 0) / (atBats.filter(p => p.launch_speed).length || 1)).toFixed(1),
            maxExitVel: convertVel(Math.max(...atBats.map(p => p.launch_speed || 0), 0)).toFixed(1),
        };

        // For pitchers, hits should be hits ALLOWED (from pitches)
        // For batters, hits are hits MADE (from atBats)
        const hitsSource = isPitcher ? pitches : atBats;

        // For Spray Chart: Include all batted balls (hits + outs) that have coordinates
        // Filter out events that are not batted balls (e.g., strikeouts, walks) if necessary, 
        // but checking for coordinates (hc_x, hc_y) or hit_location is usually sufficient.
        // We also want to keep the 'hits' variable name for compatibility or rename it.
        // Let's keep 'hits' but expand it to include outs for the spray chart.
        // Note: The stats calculation above (stats.hits) specifically filters for hits, which is correct.

        const hits = hitsSource.filter(row => {
            // Must have coordinates to be on spray chart
            const hasCoords = (row.hc_x !== null && row.hc_x !== undefined) || (row.hit_location !== null && row.hit_location !== undefined);
            // Must be a batted ball event (not a ball/strike/foul unless it's a catchable foul)
            // Actually, Savant 'events' field is null for non-events (balls/strikes).
            // We want everything that resulted in a hit or out in play.
            const validEvent = row.events && row.events !== 'null' && row.events !== '';
            return hasCoords && validEvent;
        });

        return { pitches, hits, stats, isPitcher };
    }, [data, loading, playerId, players, units]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg font-medium">{language === 'ja' ? '選手データを読み込み中...' : 'Loading Player Data...'}</span>
            </div>
        );
    }

    const { pitches, hits, stats, isPitcher } = playerData;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                    {language === 'ja' ? 'チーム' : 'Teams'}
                </Link>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{language === 'ja' ? '選手' : 'Player'}</span>
                <span className="text-muted-foreground">/</span>
                <h2 className="text-3xl font-bold tracking-tight">{stats.name}</h2>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {stats.role}
                </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Summary Cards */}
                {isPitcher ? (
                    <>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '総投球数' : 'Total Pitches'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.totalPitches}</div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '平均球速' : 'Avg Velocity'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.avgVelocity} <span className="text-lg font-normal text-muted-foreground">mph</span></div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '最大回転数' : 'Max Spin Rate'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.maxSpin} <span className="text-lg font-normal text-muted-foreground">rpm</span></div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? 'ストライク率' : 'Strike Rate'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.strikeRate}%</div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '打席数' : 'Plate Appearances'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.totalPA}</div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? 'ヒット数' : 'Hits'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.hits}</div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '平均打球速度' : 'Avg Exit Vel'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.avgExitVel} <span className="text-lg font-normal text-muted-foreground">{units === 'imperial' ? 'mph' : 'km/h'}</span></div>
                        </div>
                        <div className="p-6 rounded-xl border border-border bg-card shadow-sm">
                            <h3 className="text-sm font-medium text-muted-foreground">{language === 'ja' ? '最大打球速度' : 'Max Exit Vel'}</h3>
                            <div className="mt-2 text-3xl font-bold">{stats.maxExitVel} <span className="text-lg font-normal text-muted-foreground">{units === 'imperial' ? 'mph' : 'km/h'}</span></div>
                        </div>
                    </>
                )}

                {/* Main Charts Area */}
                <div className="col-span-full lg:col-span-2 min-h-[500px] rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? 'ストライクゾーン分析' : 'Strike Zone Analysis'}</h3>
                    <div className="flex-1 w-full">
                        {/* Pass pitches if pitcher, or atBats (as pitches seen) if batter */}
                        <StrikeZone pitches={isPitcher ? pitches : hits} />
                    </div>
                </div>
                <div className="col-span-full lg:col-span-2 min-h-[500px] rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold mb-4">{language === 'ja' ? '打球分布（ヒット位置）' : 'Spray Chart (Hit Locations)'}</h3>
                    <div className="flex-1 w-full">
                        <SprayChart hits={hits} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetails;

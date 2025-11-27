import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';

const TeamDetails = () => {
    const { teamId } = useParams();
    const { data, loading, players } = useData();

    const teamPlayers = useMemo(() => {
        if (loading || !data.length) return { pitchers: [], batters: [] };

        const pitchersMap = new Map();
        const battersMap = new Map();

        data.forEach(row => {
            // Check if player belongs to this team (either home or away)
            const isHome = row.home_team === teamId;
            const isAway = row.away_team === teamId;

            if (!isHome && !isAway) return;

            // Logic to determine which player belongs to THIS team
            // Usually: 
            // If team is Home, Pitcher is Home Team, Batter is Away Team (WAIT! Pitcher defends for Home, Batter attacks for Away)
            // Top of Inning: Away batters vs Home Pitcher
            // Bottom of Inning: Home batters vs Away Pitcher

            const isTop = row.inning_topbot === 'Top';

            // Pitcher belongs to the fielding team
            // Top: Fielding = Home, Batting = Away
            // Bot: Fielding = Away, Batting = Home

            let pitcherTeam = isTop ? row.home_team : row.away_team;
            let batterTeam = isTop ? row.away_team : row.home_team;

            // Use ID if available, otherwise fallback to name (for legacy data)
            const pitcherId = row.pitcher || row.player_name;
            const batterId = row.batter || row.batter_name;

            if (pitcherTeam === teamId && pitcherId) {
                if (!pitchersMap.has(pitcherId)) {
                    pitchersMap.set(pitcherId, {
                        id: pitcherId,
                        name: row.player_name, // Pitcher name is usually here
                        position: 'P'
                    });
                }
            }

            if (batterTeam === teamId && batterId) {
                if (!battersMap.has(batterId)) {
                    battersMap.set(batterId, {
                        id: batterId,
                        name: row.batter_name || `Player ${row.batter}`, // Use mapped name
                        position: 'B' // Generic for now
                    });
                }
            }
        });

        return {
            pitchers: Array.from(pitchersMap.values()),
            batters: Array.from(battersMap.values())
        };
    }, [data, loading, teamId]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg font-medium">Loading Roster...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                    Teams
                </Link>
                <span className="text-muted-foreground">/</span>
                <h2 className="text-3xl font-bold tracking-tight">{teamId} Roster</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Pitchers */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h3 className="text-lg font-semibold">Pitchers</h3>
                    </div>
                    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                        {teamPlayers.pitchers.map((player) => (
                            <Link
                                key={player.id}
                                to={`/player/${player.id}`}
                                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                                        P
                                    </div>
                                    <div>
                                        <p className="font-medium group-hover:text-primary transition-colors">{player.name}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {teamPlayers.pitchers.length === 0 && (
                            <div className="p-4 text-muted-foreground text-center">No pitchers found</div>
                        )}
                    </div>
                </div>

                {/* Batters */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="p-6 border-b border-border bg-muted/20">
                        <h3 className="text-lg font-semibold">Batters</h3>
                    </div>
                    <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                        {teamPlayers.batters.map((player) => (
                            <Link
                                key={player.id}
                                to={`/player/${player.id}`}
                                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-medium text-xs">
                                        B
                                    </div>
                                    <div>
                                        <p className="font-medium group-hover:text-primary transition-colors">{player.name}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {teamPlayers.batters.length === 0 && (
                            <div className="p-4 text-muted-foreground text-center">No batters found</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamDetails;

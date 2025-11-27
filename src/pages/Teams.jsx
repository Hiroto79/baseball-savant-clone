import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

const Teams = () => {
    const { teams, loading } = useData();
    const { language } = useSettings();

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg font-medium">{language === 'ja' ? 'データを読み込み中...' : 'Loading Data...'}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">{language === 'ja' ? 'チーム' : 'Teams'}</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Rapsodo Analysis Card */}
                <Link
                    to="/rapsodo"
                    className="group relative overflow-hidden rounded-xl border border-primary/50 bg-primary/5 p-6 shadow-sm hover:shadow-md transition-all hover:border-primary"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-primary">{language === 'ja' ? 'Rapsodo分析' : 'Rapsodo Analysis'}</h3>
                            <p className="text-sm text-muted-foreground">{language === 'ja' ? 'インポートされたピッチング・バッティングデータを表示' : 'View imported pitching & batting data'}</p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                            R
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                        <Users size={16} />
                        <span>{language === 'ja' ? 'ダッシュボードへ' : 'Go to Dashboard'}</span>
                    </div>
                </Link>

                {teams.map((team) => (
                    <Link
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/50"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{team.name}</h3>
                                <p className="text-sm text-muted-foreground">{team.league}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                {team.id}
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                            <Users size={16} />
                            <span>{language === 'ja' ? 'ロスターを見る' : 'View Roster'}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Teams;

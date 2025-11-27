import React, { useState, useEffect } from 'react';
import { useRapsodo } from '../context/RapsodoContext';
import PitchingDashboard from '../components/Rapsodo/PitchingDashboard';
import BattingDashboard from '../components/Rapsodo/BattingDashboard';
import PlayerSearch from '../components/Analysis/PlayerSearch';
import { Loader2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Rapsodo = () => {
    const { language } = useSettings();

    const { pitchingData, battingData, loading } = useRapsodo();
    const [activeTab, setActiveTab] = useState('pitching');
    const [selectedTeam, setSelectedTeam] = useState(''); // Default to empty to force selection
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Extract unique players and dates
    const { players, dates } = React.useMemo(() => {
        const pNames = new Set();
        const dSet = new Set();

        const process = (data) => {
            data.forEach(d => {
                if (d['Player Name']) pNames.add(d['Player Name']);
                if (d.Date) dSet.add(d.Date);
            });
        };

        process(pitchingData);
        process(battingData);

        return {
            players: Array.from(pNames).sort(),
            dates: Array.from(dSet).sort()
        };
    }, [pitchingData, battingData]);

    // Set default dates on load
    useEffect(() => {
        if (dates.length > 0 && !startDate) {
            setStartDate(dates[0]);
            setEndDate(dates[dates.length - 1]);
        }
    }, [dates]);

    // Filter data
    const filterByDate = (data) => {
        if (!startDate || !endDate) return data;
        return data.filter(d => d.Date >= startDate && d.Date <= endDate);
    };

    const filteredPitching = React.useMemo(() => {
        let data = pitchingData;
        if (selectedPlayers.length > 0) {
            data = data.filter(d => selectedPlayers.includes(d['Player Name']));
        }
        const result = filterByDate(data);
        console.log(`Pitching Filter: Players=${selectedPlayers.join(',')}, Date=${startDate}~${endDate}, Input=${pitchingData.length}, Output=${result.length}`);
        return result;
    }, [pitchingData, selectedPlayers, startDate, endDate]);

    const filteredBatting = React.useMemo(() => {
        let data = battingData;
        if (selectedPlayers.length > 0) {
            data = data.filter(d => selectedPlayers.includes(d['Player Name']));
        }
        const result = filterByDate(data);
        console.log(`Batting Filter: Players=${selectedPlayers.join(',')}, Date=${startDate}~${endDate}, Input=${battingData.length}, Output=${result.length}`);
        return result;
    }, [battingData, selectedPlayers, startDate, endDate]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg font-medium">{language === 'ja' ? 'Rapsodoデータを読み込み中...' : 'Loading Rapsodo Data...'}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">{language === 'ja' ? 'Rapsodo分析' : 'Rapsodo Analysis'}</h2>

                <div className="flex items-center gap-4">
                    {/* Team Select (Mock) */}
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1">{language === 'ja' ? 'チーム' : 'Team'}</span>
                        <select
                            className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[150px]"
                            value={selectedTeam}
                            onChange={(e) => {
                                setSelectedTeam(e.target.value);
                                setSelectedPlayers([]); // Reset player when team changes
                            }}
                        >
                            <option value="" disabled>{language === 'ja' ? 'チームを選択' : 'Select Team'}</option>
                            <option value="Imported Team">{language === 'ja' ? 'インポートされたチーム' : 'Imported Team'}</option>
                        </select>
                    </div>

                    {/* Player Search - Only show if team is selected */}
                    {selectedTeam && (
                        <div className="w-full md:w-[400px] animate-in fade-in slide-in-from-left-4 duration-300">
                            <PlayerSearch
                                players={players}
                                selectedPlayers={selectedPlayers}
                                onTogglePlayer={(player) => {
                                    setSelectedPlayers(prev =>
                                        prev.includes(player)
                                            ? prev.filter(p => p !== player)
                                            : [...prev, player]
                                    );
                                }}
                            />
                        </div>
                    )}



                    {/* Date Filter - Only show if team is selected */}
                    {selectedTeam && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground mb-1">{language === 'ja' ? '開始日' : 'Start Date'}</span>
                                <input
                                    type="date"
                                    className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={startDate}
                                    min={dates[0]}
                                    max={endDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground mb-1">{language === 'ja' ? '終了日' : 'End Date'}</span>
                                <input
                                    type="date"
                                    className="bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={endDate}
                                    min={startDate}
                                    max={dates[dates.length - 1]}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex p-1 bg-muted rounded-lg">
                        <button
                            onClick={() => setActiveTab('pitching')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'pitching'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {language === 'ja' ? 'ピッチング' : 'Pitching'}
                        </button>
                        <button
                            onClick={() => setActiveTab('batting')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'batting'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {language === 'ja' ? 'バッティング' : 'Batting'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className="min-h-[500px]">
                {!selectedTeam ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
                        <p className="text-lg font-medium">{language === 'ja' ? 'データを表示するにはチームを選択してください' : 'Please select a team to view data'}</p>
                        <p className="text-sm">{language === 'ja' ? '上のドロップダウンからチームを選択してください' : 'Choose a team from the dropdown above'}</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'pitching' ? (
                            <PitchingDashboard data={filteredPitching} />
                        ) : (
                            <BattingDashboard data={filteredBatting} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Rapsodo;

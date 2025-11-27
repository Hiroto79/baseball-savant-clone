import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Check } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

const PlayerSearch = ({ players, selectedPlayers, onTogglePlayer }) => {
    const { language } = useSettings();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Filter players based on query
    const filteredPlayers = players.filter(p =>
        String(p).toLowerCase().includes(query.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full relative" ref={wrapperRef}>
            <label className="text-xs text-muted-foreground mb-1 block">
                {language === 'ja' ? '選手を検索・選択' : 'Search & Select Players'}
            </label>

            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    className="w-full bg-card border border-border rounded-md pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={language === 'ja' ? '選手名を入力...' : 'Type player name...'}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                    >
                        <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                )}
            </div>

            {/* Dropdown List */}
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    {filteredPlayers.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            {language === 'ja' ? '見つかりません' : 'No players found'}
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredPlayers.map(p => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        onTogglePlayer(p);
                                        // Keep open for multiple selection
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-sm flex items-center justify-between hover:bg-accent hover:text-accent-foreground transition-colors ${selectedPlayers.includes(p) ? 'bg-primary/10 text-primary font-medium' : ''
                                        }`}
                                >
                                    <span>{p}</span>
                                    {selectedPlayers.includes(p) && <Check className="h-4 w-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Selected Tags */}
            {selectedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedPlayers.map(p => (
                        <span
                            key={p}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                            {p}
                            <button
                                onClick={() => onTogglePlayer(p)}
                                className="hover:bg-primary/20 rounded-full p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlayerSearch;

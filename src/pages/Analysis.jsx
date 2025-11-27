import React, { useState, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useRapsodo } from '../context/RapsodoContext';
import { useData } from '../context/DataContext';
import { useBlast } from '../context/BlastContext';
import { BarChart3, Activity, Database } from 'lucide-react';

// Sub-components (will be implemented next)
import RapsodoAnalysis from '../components/Analysis/RapsodoAnalysis';
import SavantAnalysis from '../components/Analysis/SavantAnalysis';
import BlastAnalysis from '../components/Analysis/BlastAnalysis';

const Analysis = () => {
    const { language } = useSettings();
    const [activeTab, setActiveTab] = useState('rapsodo');

    // Contexts
    const { pitchingData: rapPitching, battingData: rapBatting } = useRapsodo();
    const { data: savantData } = useData();
    const { blastData } = useBlast();

    // Get unique players from all sources for a unified selector if needed, 
    // but usually it's better to filter players per source as IDs might not match across systems.
    // For this implementation, we'll let each sub-component handle its own player selection 
    // because the datasets might have different player names/IDs.

    const tabs = [
        { id: 'rapsodo', label: 'Rapsodo', icon: Activity },
        { id: 'savant', label: 'Savant', icon: Database },
        { id: 'blast', label: 'Blast', icon: BarChart3 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    {language === 'ja' ? 'データ分析・比較' : 'Analysis & Comparison'}
                </h2>
                <p className="text-muted-foreground">
                    {language === 'ja'
                        ? '複数の選手のデータを比較・分析します。'
                        : 'Compare and analyze data across multiple players.'}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-muted rounded-lg w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[600px]">
                {activeTab === 'rapsodo' && (
                    <RapsodoAnalysis pitchingData={rapPitching} battingData={rapBatting} />
                )}
                {activeTab === 'savant' && (
                    <SavantAnalysis data={savantData} />
                )}
                {activeTab === 'blast' && (
                    <BlastAnalysis data={blastData} />
                )}
            </div>
        </div>
    );
};

export default Analysis;

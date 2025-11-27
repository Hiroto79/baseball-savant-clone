import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { Check } from 'lucide-react';

const PitchTypeSelector = ({ pitchTypes, selectedPitchTypes, onToggle }) => {
    const { language } = useSettings();

    if (!pitchTypes || pitchTypes.length === 0) return null;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
                {language === 'ja' ? '球種を選択' : 'Select Pitch Types'}
            </span>
            <div className="flex flex-wrap gap-2">
                {pitchTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => onToggle(type)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${selectedPitchTypes.includes(type)
                                ? 'bg-secondary text-secondary-foreground border-secondary'
                                : 'bg-background border-border text-muted-foreground hover:border-secondary/50'
                            }`}
                    >
                        {type}
                        {selectedPitchTypes.includes(type) && <Check size={12} />}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PitchTypeSelector;

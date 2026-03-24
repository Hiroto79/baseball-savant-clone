import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [language, setLanguageState] = useState('ja'); // Default to Japanese
    const [units, setUnitsState] = useState('metric'); // Default to Metric

    // Transient state for preserving feedback uploads across page navigation
    const [feedbackPitchingData, setFeedbackPitchingData] = useState(null);
    const [feedbackBattingData, setFeedbackBattingData] = useState(null);
    const [feedbackPitchingFile, setFeedbackPitchingFile] = useState('');
    const [feedbackBattingFile, setFeedbackBattingFile] = useState('');

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedLanguage = localStorage.getItem('language');
        const savedUnits = localStorage.getItem('units');

        if (savedLanguage) setLanguageState(savedLanguage);
        if (savedUnits) setUnitsState(savedUnits);
    }, []);

    const setLanguage = (lang) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const setUnits = (unitSystem) => {
        setUnitsState(unitSystem);
        localStorage.setItem('units', unitSystem);
    };

    return (
        <SettingsContext.Provider value={{ 
            language, units, setLanguage, setUnits,
            feedbackPitchingData, setFeedbackPitchingData,
            feedbackBattingData, setFeedbackBattingData,
            feedbackPitchingFile, setFeedbackPitchingFile,
            feedbackBattingFile, setFeedbackBattingFile
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

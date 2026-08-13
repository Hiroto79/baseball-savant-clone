import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        try {
            return localStorage.getItem('language') || 'ja';
        } catch {
            return 'ja';
        }
    });

    const [units, setUnitsState] = useState(() => {
        try {
            return localStorage.getItem('units') || 'metric';
        } catch {
            return 'metric';
        }
    });

    // Transient state for preserving feedback uploads across page navigation
    const [feedbackPitchingData, setFeedbackPitchingData] = useState(null);
    const [feedbackBattingData, setFeedbackBattingData] = useState(null);
    const [feedbackPitchingFile, setFeedbackPitchingFile] = useState('');
    const [feedbackBattingFile, setFeedbackBattingFile] = useState('');

    const setLanguage = (lang) => {
        setLanguageState(lang);
        try {
            localStorage.setItem('language', lang);
        } catch (e) {
            console.warn('Failed to save language to localStorage:', e);
        }
    };

    const setUnits = (unitSystem) => {
        setUnitsState(unitSystem);
        try {
            localStorage.setItem('units', unitSystem);
        } catch (e) {
            console.warn('Failed to save units to localStorage:', e);
        }
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

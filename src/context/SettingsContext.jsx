import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [language, setLanguageState] = useState('ja'); // Default to Japanese
    const [units, setUnitsState] = useState('metric'); // Default to Metric

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
        <SettingsContext.Provider value={{ language, units, setLanguage, setUnits }}>
            {children}
        </SettingsContext.Provider>
    );
};

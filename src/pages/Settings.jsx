import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { t } from '../utils/translations';
import { Settings as SettingsIcon, Globe, Ruler } from 'lucide-react';

const Settings = () => {
    const { language, units, setLanguage, setUnits } = useSettings();

    return (
        <div className="space-y-6 max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight">{t('settingsTitle', language)}</h2>

            {/* Language Settings */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Globe className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('languageSettings', language)}</h3>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t('selectLanguage', language)}</p>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="language"
                                value="en"
                                checked={language === 'en'}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="font-medium">{t('english', language)}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="language"
                                value="ja"
                                checked={language === 'ja'}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="font-medium">{t('japanese', language)}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Unit Settings */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Ruler className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('unitSettings', language)}</h3>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t('selectUnits', language)}</p>
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="units"
                                value="imperial"
                                checked={units === 'imperial'}
                                onChange={(e) => setUnits(e.target.value)}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="font-medium">{t('imperial', language)}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="units"
                                value="metric"
                                checked={units === 'metric'}
                                onChange={(e) => setUnits(e.target.value)}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="font-medium">{t('metric', language)}</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Current Settings Display */}
            <div className="rounded-xl border border-primary/50 bg-primary/5 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <SettingsIcon className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-primary">{t('currentSettings', language)}</h3>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">{t('language', language)}</span>
                        <span className="text-lg font-medium">
                            {language === 'en' ? t('english', language) : t('japanese', language)}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">{t('units', language)}</span>
                        <span className="text-lg font-medium">
                            {units === 'imperial' ? t('imperial', language) : t('metric', language)}
                        </span>
                    </div>
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                {language === 'en'
                    ? 'Settings are automatically saved and will persist across sessions.'
                    : '設定は自動的に保存され、セッション間で保持されます。'}
            </p>
        </div>
    );
};

export default Settings;

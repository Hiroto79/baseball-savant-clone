import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Lock } from 'lucide-react';

const Login = ({ onLogin }) => {
    const { language } = useSettings();
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Simple hash check - in production, use proper hashing
        const correctPassword = import.meta.env.VITE_ACCESS_PASSWORD || 'baseball2024';

        if (password === correctPassword) {
            sessionStorage.setItem('authenticated', 'true');
            onLogin();
        } else {
            setError(true);
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-foreground">
                        {language === 'ja' ? 'アクセス制限' : 'Access Restricted'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {language === 'ja'
                            ? 'このアプリケーションにアクセスするにはパスワードが必要です'
                            : 'Please enter the password to access this application'}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="password" className="sr-only">
                            {language === 'ja' ? 'パスワード' : 'Password'}
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-muted-foreground text-foreground bg-card rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder={language === 'ja' ? 'パスワードを入力' : 'Enter password'}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(false);
                            }}
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 text-center">
                            {language === 'ja' ? 'パスワードが正しくありません' : 'Incorrect password'}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                    >
                        {language === 'ja' ? 'ログイン' : 'Login'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        {language === 'ja'
                            ? '※ このアプリケーションは個人情報を含むため、アクセスが制限されています'
                            : '※ Access is restricted as this application contains personal information'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

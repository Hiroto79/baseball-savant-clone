import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Lock } from 'lucide-react';

// ソルト付きSHA-256ハッシュ生成関数 (WebCrypto API)
async function hashPassword(plainText) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode('savant-salt-v1:' + plainText.trim());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.error('Hash calculation failed:', e);
        return null;
    }
}

// 許可ハッシュ値リスト（平文パスワードはJSバンドルに一切含めない）
const ALLOWED_PASSWORD_HASHES = new Set([
    import.meta.env.VITE_ACCESS_PASSWORD_HASH,
    '8a1e49e6552386f2dada72eca60cea6f45699936f2213428770e9feb950caac3', // 7911
    '881cc0f7524a729264aeeebb59e404e28f871951ba43dcd96d68da5247d37933', // baseball2024
].filter(Boolean));

const Login = ({ onLogin }) => {
    const { language } = useSettings();
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password || isVerifying) return;

        setIsVerifying(true);
        setError(false);

        const inputHash = await hashPassword(password);

        if (inputHash && ALLOWED_PASSWORD_HASHES.has(inputHash)) {
            try {
                sessionStorage.setItem('authenticated', 'true');
            } catch (error) {
                console.warn('Failed to save authentication to sessionStorage:', error);
            }
            onLogin();
        } else {
            setError(true);
            setPassword('');
        }
        setIsVerifying(false);
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
                        disabled={isVerifying}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                    >
                        {isVerifying
                            ? (language === 'ja' ? '認証中...' : 'Verifying...')
                            : (language === 'ja' ? 'ログイン' : 'Login')}
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

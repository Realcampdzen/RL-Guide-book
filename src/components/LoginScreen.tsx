import React, { useCallback, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginScreenProps {
    onLegacyCode?: (code: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLegacyCode }) => {
    const [showEmail, setShowEmail] = useState(false);
    const [showLegacy, setShowLegacy] = useState(false);
    const [email, setEmail] = useState('');
    const [legacyCode, setLegacyCode] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOAuth = useCallback(async (provider: 'google' | 'yandex' | 'vk') => {
        setBusy(true);
        setError(null);
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: provider === 'vk' ? ('vk' as 'google') : provider === 'yandex' ? ('yandex' as 'google') : provider,
                options: { redirectTo: window.location.origin },
            });
            if (err) setError(err.message);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка входа');
        } finally {
            setBusy(false);
        }
    }, []);

    const handleMagicLink = useCallback(async () => {
        if (!email.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const { error: err } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: { emailRedirectTo: window.location.origin },
            });
            if (err) { setError(err.message); }
            else { setEmailSent(true); }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка отправки');
        } finally {
            setBusy(false);
        }
    }, [email]);

    const handleLegacy = useCallback(() => {
        if (!legacyCode.trim()) return;
        onLegacyCode?.(legacyCode.trim());
    }, [legacyCode, onLegacyCode]);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            <div style={{
                width: '90%', maxWidth: 400, padding: 32, borderRadius: 20,
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            }}>
                {/* Logo */}
                <div style={{ fontSize: 48, lineHeight: 1 }}>🏕️</div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>Путеводитель</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Реальный Лагерь</div>
                </div>

                {/* OAuth buttons */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button type="button" disabled={busy} onClick={() => void handleOAuth('google')}
                        style={{
                            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                            background: '#fff', color: '#333', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}>
                        <span style={{ fontSize: 18 }}>🔵</span> Войти через Google
                    </button>

                    <button type="button" disabled={busy} onClick={() => void handleOAuth('yandex')}
                        style={{
                            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                            background: '#fc3f1d', color: '#fff', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}>
                        <span style={{ fontSize: 18 }}>🔴</span> Войти через Яндекс
                    </button>

                    <button type="button" disabled={busy} onClick={() => void handleOAuth('vk')}
                        style={{
                            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                            background: '#0077ff', color: '#fff', fontSize: 14, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                        }}>
                        <span style={{ fontSize: 18 }}>🔷</span> Войти через VK ID
                    </button>
                </div>

                {/* Divider */}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>или</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                </div>

                {/* Magic Link */}
                {!showEmail ? (
                    <button type="button" onClick={() => setShowEmail(true)}
                        style={{
                            width: '100%', padding: '12px 20px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', fontSize: 13, cursor: 'pointer',
                        }}>
                        ✉️ Войти по email
                    </button>
                ) : emailSent ? (
                    <div style={{
                        width: '100%', padding: 16, borderRadius: 12,
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>✉️</div>
                        <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Ссылка отправлена!</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Проверьте почту {email}</div>
                    </div>
                ) : (
                    <div style={{ width: '100%', display: 'flex', gap: 6 }}>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                            style={{
                                flex: 1, padding: '12px 14px', borderRadius: 12,
                                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff', fontSize: 13, outline: 'none',
                            }} />
                        <button type="button" disabled={busy || !email.trim()} onClick={() => void handleMagicLink()}
                            style={{
                                padding: '12px 18px', borderRadius: 12, border: 'none',
                                background: '#d97706', color: '#fff', fontSize: 13, fontWeight: 600,
                                cursor: 'pointer',
                            }}>
                            {busy ? '…' : '→'}
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Legacy code */}
                <div style={{ width: '100%', textAlign: 'center' }}>
                    {!showLegacy ? (
                        <button type="button" onClick={() => setShowLegacy(true)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                            У меня есть код доступа
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input type="text" value={legacyCode} onChange={e => setLegacyCode(e.target.value)} placeholder="Код доступа"
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 8,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: 12, outline: 'none',
                                }} />
                            <button type="button" onClick={handleLegacy} disabled={!legacyCode.trim()}
                                style={{
                                    padding: '8px 14px', borderRadius: 8, border: 'none',
                                    background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, cursor: 'pointer',
                                }}>
                                Войти
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;

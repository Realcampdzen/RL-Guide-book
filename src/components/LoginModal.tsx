import React, { useCallback, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { NAV_HOME_IMAGE } from '../utils/imageSources';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginModalProps {
    open: boolean;
    onClose: () => void;
    onLegacyCode?: (code: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LoginModal: React.FC<LoginModalProps> = ({ open, onClose, onLegacyCode }) => {
    const [showEmail, setShowEmail] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [email, setEmail] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleOAuth = useCallback(async (provider: 'google' | 'yandex' | 'vk') => {
        setBusy(true);
        setError(null);
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: provider === 'vk' ? ('vk' as 'google') : provider === 'yandex' ? ('yandex' as 'google') : provider,
                options: { redirectTo: window.location.origin + window.location.pathname },
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
                options: { emailRedirectTo: window.location.origin + window.location.pathname },
            });
            if (err) { setError(err.message); }
            else { setEmailSent(true); }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ошибка отправки');
        } finally {
            setBusy(false);
        }
    }, [email]);

    const handleInviteCode = useCallback(() => {
        if (!inviteCode.trim()) return;
        onLegacyCode?.(inviteCode.trim());
        onClose();
    }, [inviteCode, onLegacyCode, onClose]);

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    animation: 'rl-modal-fade-in 0.2s ease-out',
                }}
            />

            {/* Modal wrapper — centered via flexbox to avoid transform conflicts */}
            <div style={{
                position: 'fixed', inset: 0, zIndex: 10001,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                <div style={{
                    width: '90%', maxWidth: 380, padding: 28, borderRadius: 20,
                    background: 'rgba(15,12,41,0.97)', backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    animation: 'rl-modal-appear 0.2s ease-out',
                    pointerEvents: 'auto',
                }}>
                    {/* Close button */}
                    <button type="button" onClick={onClose}
                        style={{
                            position: 'absolute', top: 12, right: 14,
                            background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.4)', fontSize: 18,
                            cursor: 'pointer', lineHeight: 1,
                        }}>✕</button>

                    {/* Header */}
                    <img src={`${import.meta.env.BASE_URL}${NAV_HOME_IMAGE}`} alt="Реальный Лагерь"
                        style={{ width: 96, height: 96, borderRadius: 48, objectFit: 'cover' }} />
                    <div style={{ textAlign: 'center', marginBottom: 4 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
                            Войти в Путеводитель
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                            Откройте все возможности Реального Лагеря
                        </div>
                    </div>

                    {/* OAuth buttons */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button type="button" disabled={busy} onClick={() => void handleOAuth('google')}
                            style={{
                                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                                background: '#fff', color: '#333', fontSize: 14, fontWeight: 600,
                                cursor: busy ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.1s',
                            }}>
                            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            Войти через Google
                        </button>

                        <button type="button" disabled={busy} onClick={() => void handleOAuth('yandex')}
                            style={{
                                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                                background: '#fc3f1d', color: '#fff', fontSize: 14, fontWeight: 600,
                                cursor: busy ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.1s',
                            }}>
                            <span style={{ fontSize: 16, fontWeight: 900 }}>Я</span>
                            Войти через Яндекс
                        </button>

                        <button type="button" disabled={busy} onClick={() => void handleOAuth('vk')}
                            style={{
                                width: '100%', padding: '13px 20px', borderRadius: 12, border: 'none',
                                background: '#0077ff', color: '#fff', fontSize: 14, fontWeight: 600,
                                cursor: busy ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                opacity: busy ? 0.6 : 1, transition: 'opacity 0.15s, transform 0.1s',
                            }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.587-1.496c.596-.19 1.362 1.259 2.174 1.815.613.42 1.08.328 1.08.328l2.172-.03s1.136-.07.598-.964c-.044-.073-.314-.661-1.618-1.869-1.365-1.263-1.183-1.058.462-3.241.999-1.328 1.398-2.14 1.273-2.487-.12-.331-.86-.244-.86-.244l-2.443.015s-.181-.025-.316.056c-.133.079-.218.264-.218.264s-.392 1.044-.914 1.932c-1.103 1.876-1.544 1.976-1.724 1.86-.419-.27-.314-1.086-.314-1.665 0-1.81.274-2.564-.534-2.76-.268-.065-.466-.107-1.152-.115-.88-.009-1.624.003-2.046.209-.28.137-.496.443-.364.46.163.022.532.1.728.364.253.342.244 1.108.244 1.108s.145 2.13-.34 2.394c-.332.18-.789-.188-1.767-1.872-.502-.863-.88-1.816-.88-1.816s-.073-.179-.203-.275c-.158-.116-.378-.153-.378-.153l-2.322.015s-.349.01-.477.162c-.114.134-.009.413-.009.413s1.839 4.304 3.924 6.478c1.91 1.994 4.08 1.862 4.08 1.862h.983z" /></svg>
                            Войти через VK ID
                        </button>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>или</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                    </div>

                    {/* Magic Link */}
                    {!showEmail ? (
                        <button type="button" onClick={() => setShowEmail(true)}
                            style={{
                                width: '100%', padding: '11px 20px', borderRadius: 12,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'rgba(255,255,255,0.8)', fontSize: 13, cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}>
                            ✉️ Войти по email
                        </button>
                    ) : emailSent ? (
                        <div style={{
                            width: '100%', padding: 14, borderRadius: 12,
                            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: 22, marginBottom: 4 }}>✉️</div>
                            <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Ссылка отправлена!</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                Проверьте почту {email}
                            </div>
                        </div>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', gap: 6 }}>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                onKeyDown={e => e.key === 'Enter' && void handleMagicLink()}
                                style={{
                                    flex: 1, padding: '11px 14px', borderRadius: 12,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.12)',
                                    color: '#fff', fontSize: 13, outline: 'none',
                                }} />
                            <button type="button" disabled={busy || !email.trim()}
                                onClick={() => void handleMagicLink()}
                                style={{
                                    padding: '11px 16px', borderRadius: 12, border: 'none',
                                    background: '#d97706', color: '#fff', fontSize: 14, fontWeight: 600,
                                    cursor: 'pointer', opacity: (!email.trim() || busy) ? 0.5 : 1,
                                }}>
                                {busy ? '…' : '→'}
                            </button>
                        </div>
                    )}

                    {/* Invite Code */}
                    {!showCode ? (
                        <button type="button" onClick={() => setShowCode(true)}
                            style={{
                                background: 'none', border: 'none',
                                color: 'rgba(255,255,255,0.3)', fontSize: 11,
                                cursor: 'pointer', textDecoration: 'underline',
                            }}>
                            У меня есть код приглашения
                        </button>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', gap: 6 }}>
                            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
                                placeholder="CAMP-XXX-XXXX"
                                onKeyDown={e => e.key === 'Enter' && handleInviteCode()}
                                style={{
                                    flex: 1, padding: '9px 12px', borderRadius: 10,
                                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: 12, outline: 'none',
                                    fontFamily: 'monospace', letterSpacing: 1,
                                }} />
                            <button type="button" onClick={handleInviteCode} disabled={!inviteCode.trim()}
                                style={{
                                    padding: '9px 14px', borderRadius: 10, border: 'none',
                                    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 12,
                                    cursor: 'pointer', opacity: !inviteCode.trim() ? 0.5 : 1,
                                }}>
                                Войти
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 11,
                        }}>
                            ⚠️ {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes rl-modal-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes rl-modal-appear {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </>
    );
};

export default LoginModal;

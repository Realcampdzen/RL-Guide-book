import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LoginModal } from './LoginModal';
import { RoleSelectionModal, getPendingOAuthRole, clearPendingOAuthRole } from './RoleSelectionModal';
import type { RoleFlowResult } from './RoleSelectionModal';
import type { Session } from '@supabase/supabase-js';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/authRole';

// ---------------------------------------------------------------------------
// Role display config
// ---------------------------------------------------------------------------

const ROLE_DISPLAY: Record<string, { label: string; icon: string; color: string }> = {
    participant: { label: 'Участник', icon: '👤', color: '#6b7280' },
    counselor: { label: 'Вожатый', icon: '🏕️', color: '#22c55e' },
    educator: { label: 'Педагог', icon: '📚', color: '#a855f7' },
    shift_leader: { label: 'Ст. Вожатый', icon: '⭐', color: '#f59e0b' },
    camp_director: { label: 'Директор', icon: '🏛️', color: '#ef4444' },
    parent: { label: 'Родитель', icon: '👨‍👩‍👧', color: '#3b82f6' },
    developer: { label: 'Dev', icon: '🔧', color: '#06b6d4' },
};

const TRAVELER = { label: 'Путешественник', icon: '🧭', color: '#8b5cf6' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
}

function getDeviceId(): string {
    try {
        let id = localStorage.getItem('rl-device-id');
        if (!id) {
            id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
            localStorage.setItem('rl-device-id', id);
        }
        return id;
    } catch {
        return 'anon';
    }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ActiveModal = 'none' | 'role-select' | 'oauth-login';

export const AuthFloatingButton: React.FC = () => {
    const auth = useAuth();
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(() => {
        // Initialize role from persisted auth context (survives page reload)
        return auth.role && auth.role !== 'traveler' ? auth.role : null;
    });
    const [activeModal, setActiveModal] = useState<ActiveModal>('none');
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pendingToast, setPendingToast] = useState<string | null>(null);

    // Hide when PersonalCabinet is open (sets data-cabinet-open on body)
    const [cabinetOpen, setCabinetOpen] = useState(() =>
        typeof document !== 'undefined' && document.body.hasAttribute('data-cabinet-open')
    );
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setCabinetOpen(document.body.hasAttribute('data-cabinet-open'));
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-cabinet-open'] });
        return () => observer.disconnect();
    }, []);
    const [oauthError, setOauthError] = useState<string | null>(null);

    const deviceId = getDeviceId();

    // Persist dev OAuth pending flag in localStorage (survives page reload)
    const LS_PENDING_DEV = 'rl-pending-dev-oauth';

    const setPendingDevOAuth = (v: boolean) => {
        try { if (v) localStorage.setItem(LS_PENDING_DEV, '1'); else localStorage.removeItem(LS_PENDING_DEV); } catch { /* */ }
    };
    const isPendingDevOAuth = (): boolean => {
        try { return localStorage.getItem(LS_PENDING_DEV) === '1'; } catch { return false; }
    };

    // ── Listen to auth state ──
    useEffect(() => {
        console.log('[AUTH] useEffect: checking getSession...');
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            console.log('[AUTH] getSession result:', s ? `email=${s.user?.email}, has_token=${!!s.access_token}` : 'null');
            console.log('[AUTH] isPendingDevOAuth:', isPendingDevOAuth());
            setSession(s);
            if (s?.access_token) {
                const pendingRole = getPendingOAuthRole();
                if (pendingRole || isPendingDevOAuth()) {
                    if (isPendingDevOAuth()) {
                        console.log('[AUTH] ✅ Pending dev OAuth detected! Calling resolveDevOAuth...');
                        setPendingDevOAuth(false);
                        void resolveDevOAuth(s);
                    } else {
                        // Regular role OAuth
                        void resolveAllRolesOAuth(s);
                    }
                }
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            console.log('[AUTH] onAuthStateChange:', _event, s ? `email=${s.user?.email}` : 'null');
            setSession(s);
            if (s?.access_token) {
                const pendingRole = getPendingOAuthRole();
                if (pendingRole) {
                    // Regular role OAuth callback
                    void resolveAllRolesOAuth(s);
                } else if (isPendingDevOAuth()) {
                    // Developer OAuth callback
                    console.log('[AUTH] ✅ onAuthStateChange: Pending dev OAuth! Resolving...');
                    setPendingDevOAuth(false);
                    void resolveDevOAuth(s);
                }
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return () => { subscription.unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



    // ── B-4b: Resolve OAuth for ALL roles ──
    const resolveAllRolesOAuth = useCallback(async (s: Session) => {
        const email = s.user?.email;
        if (!email) return false;
        const desiredRole = getPendingOAuthRole();
        clearPendingOAuthRole();
        const base = getApiBase();
        try {
            const res = await fetch(`${base}/api/auth/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, deviceId, desiredRole: desiredRole || undefined }),
            });
            const data = await res.json().catch(() => ({})) as Record<string, unknown>;
            if (!res.ok) return false;
            const resolvedRole = data.role as string;
            if (resolvedRole === 'pending') {
                const label = desiredRole || 'роль';
                setPendingToast(`Заявка отправлена! Ожидайте одобрения для роли «${label}»`);
                setTimeout(() => setPendingToast(null), 6000);
                setActiveModal('none');
                return true;
            }
            if (resolvedRole && resolvedRole !== 'traveler') {
                setRole(resolvedRole);
                auth.setAuth({ role: resolvedRole as UserRole, accessToken: data.accessToken as string || undefined });
                setActiveModal('none');
                return true;
            }
        } catch { /* ignore */ }
        return false;
    }, [auth, deviceId]);

    // ── B-4: Resolve OAuth for developer ──
    const resolveDevOAuth = async (s: Session) => {
        const email = s.user?.email;
        const token = s.access_token;
        console.log('[AUTH] resolveDevOAuth called. email:', email, 'token:', token ? 'yes' : 'no');
        if (!email || !token) {
            console.log('[AUTH] ❌ No email or token');
            setOauthError('Не удалось получить email из OAuth.');
            return;
        }

        // Client-side check first: VITE_DEV_EMAILS = comma-separated emails
        const devEmailsRaw = import.meta.env.VITE_DEV_EMAILS as string || '';
        console.log('[AUTH] VITE_DEV_EMAILS raw:', JSON.stringify(devEmailsRaw));
        const devEmails = devEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        console.log('[AUTH] devEmails parsed:', devEmails, 'checking against:', email.toLowerCase());
        if (devEmails.includes(email.toLowerCase())) {
            console.log('[AUTH] ✅ Email matched! Setting role to developer');
            setRole('developer');
            auth.setAuth({ role: 'developer' as UserRole, accessToken: token });
            setActiveModal('none');
            setOauthError(null);
            return;
        }
        console.log('[AUTH] ❌ Email NOT in devEmails, trying backend fallback...');
        try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/auth/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, supabaseToken: token }),
            });
            const data = await res.json().catch(() => ({})) as Record<string, unknown>;
            if (res.ok && data.role === 'developer') {
                setRole('developer');
                auth.setAuth({ role: 'developer' as UserRole, accessToken: data.accessToken as string || token });
                setActiveModal('none');
                setOauthError(null);
            } else {
                setOauthError(`Нет доступа для ${email}`);
                await supabase.auth.signOut();
                setSession(null);
                setRole(null);
            }
        } catch {
            setOauthError('Ошибка при проверке доступа. Попробуйте позже.');
        }
    };

    // ── Handle RoleSelectionModal results ──
    const handleRoleResult = useCallback((result: RoleFlowResult) => {
        switch (result.type) {
            case 'code-redeemed':
                setRole(result.role);
                auth.setAuth({ role: result.role as UserRole, accessToken: result.accessToken });
                setActiveModal('none');
                break;

            case 'request-sent':
                // User stays as traveler, modal stays open (polling for approval)
                // Don't close modal — we want to show the "waiting" screen
                break;

            case 'oauth-started':
                // OAuth redirect started — close modal, redirect handles the rest
                setActiveModal('none');
                break;

            case 'request-approved':
                // Admin approved the request — auto-login with the approved role
                setRole(result.role);
                auth.setAuth({ role: result.role as UserRole, accessToken: result.accessToken || undefined });
                setActiveModal('none');
                break;

            case 'dev-pin-ok':
                // Developer authenticated via PIN — exchange PIN for JWT token
                console.log('[AUTH] ✅ Dev PIN ok! Getting JWT from backend...');
                setRole('developer');
                auth.setAuth({ role: 'developer' as UserRole });
                setActiveModal('none');
                // Async: exchange PIN for JWT (non-blocking, updates token when received)
                void (async () => {
                    try {
                        const pin = (import.meta.env.VITE_DEV_PIN as string) || '';
                        if (!pin) return;
                        const base = getApiBase();
                        const res = await fetch(`${base}/api/auth/dev-pin`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pin, deviceId }),
                        });
                        const data = await res.json().catch(() => ({})) as Record<string, unknown>;
                        if (res.ok && data.accessToken) {
                            auth.setAuth({ role: 'developer' as UserRole, accessToken: data.accessToken as string });
                            console.log('[AUTH] ✅ Developer JWT obtained via PIN exchange');
                        }
                    } catch { /* ignore, developer is still set */ }
                })();
                break;


            case 'developer-oauth':
                // Legacy OAuth flow (kept for compatibility)
                setPendingDevOAuth(true);
                setOauthError(null);
                setActiveModal('oauth-login');
                break;

            case 'cancelled':
                setActiveModal('none');
                break;
        }
    }, [auth]);


    const handleSignOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setRole(null);
        auth.clearAuth();
        setShowMenu(false);
    }, [auth]);

    const handleLegacyCode = useCallback((code: string) => {
        const event = new CustomEvent('rl-auth-code', { detail: code });
        window.dispatchEvent(event);
    }, []);

    if (loading) return null;
    if (cabinetOpen) return null; // Hide when PersonalCabinet is open

    const isLoggedIn = !!session || !!role;
    const roleInfo = role ? (ROLE_DISPLAY[role] || TRAVELER) : TRAVELER;
    const displayInfo = isLoggedIn ? roleInfo : TRAVELER;
    const userEmail = session?.user?.email;
    const avatarUrl = session?.user?.user_metadata?.avatar_url;

    return (
        <>
            {/* Floating Button — bottom-left */}
            <div style={{
                position: 'fixed', bottom: 16, left: 16, zIndex: 9998,
                animation: 'rl-fab-slide-in 0.4s ease-out',
            }}>
                {isLoggedIn ? (
                    /* Logged in — show role badge */
                    <div style={{ position: 'relative' }}>
                        <button type="button"
                            onClick={() => setShowMenu(!showMenu)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 16px', borderRadius: 24,
                                background: '#fff', backdropFilter: 'blur(12px)',
                                border: 'none',
                                color: '#1a1a2e', cursor: 'pointer',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" style={{
                                    width: 24, height: 24, borderRadius: 12,
                                }} />
                            ) : (
                                <span style={{
                                    width: 8, height: 8, borderRadius: 4,
                                    background: displayInfo.color,
                                    flexShrink: 0,
                                }} />
                            )}
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                                {displayInfo.label}
                            </span>
                        </button>

                        {/* Dropdown menu */}
                        {showMenu && (
                            <div style={{
                                position: 'absolute', bottom: 48, left: 0,
                                background: '#fff', borderRadius: 12,
                                padding: 4, minWidth: 190,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)',
                                animation: 'rl-modal-scale-in 0.15s ease-out',
                                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                            }}>
                                {userEmail && (
                                    <div style={{
                                        padding: '8px 12px', fontSize: 11, fontWeight: 500,
                                        color: '#999',
                                        borderBottom: '1px solid #f0f0f0',
                                        marginBottom: 2,
                                    }}>
                                        {userEmail}
                                    </div>
                                )}
                                <button type="button" onClick={() => { setShowMenu(false); }}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        background: 'none', border: 'none',
                                        color: '#444', fontSize: 13, fontWeight: 500,
                                        cursor: 'pointer', textAlign: 'left',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 3, background: displayInfo.color }} />
                                    {displayInfo.label}
                                </button>
                                <button type="button" onClick={() => { setShowMenu(false); setActiveModal('role-select'); setOauthError(null); }}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        background: 'none', border: 'none',
                                        color: '#444', fontSize: 13, fontWeight: 500,
                                        cursor: 'pointer', textAlign: 'left',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                    🔄 Сменить роль
                                </button>
                                <button type="button" onClick={() => void handleSignOut()}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        background: 'none', border: 'none',
                                        color: '#dc2626', fontSize: 13, fontWeight: 500,
                                        cursor: 'pointer', textAlign: 'left',
                                    }}>
                                    Выйти
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Not logged in — show login button */
                    <button type="button" onClick={() => { setActiveModal('role-select'); setOauthError(null); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 20px', borderRadius: 24,
                            background: '#fff',
                            border: 'none',
                            color: '#1a1a2e', cursor: 'pointer',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                        }}>
                        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
                            Войти
                        </span>
                    </button>
                )}
            </div>

            {/* Close dropdown on outside click */}
            {showMenu && (
                <div
                    onClick={() => setShowMenu(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
                />
            )}

            {/* Role Selection Modal (B-3: new primary flow) */}
            {activeModal === 'role-select' && (
                <RoleSelectionModal
                    onResult={handleRoleResult}
                    deviceId={deviceId}
                />
            )}

            {/* OAuth Login Modal (for developer flow) */}
            <LoginModal
                open={activeModal === 'oauth-login'}
                onClose={() => { setActiveModal('none'); setPendingDevOAuth(false); }}
                onLegacyCode={handleLegacyCode}
            />

            {/* OAuth error toast */}
            {oauthError && (
                <div style={{
                    position: 'fixed', bottom: 70, left: 16, zIndex: 10000,
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', fontSize: 12, maxWidth: 280,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                    {oauthError}
                    <button type="button" onClick={() => setOauthError(null)}
                        style={{ marginLeft: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 10 }}>
                        ✕
                    </button>
                </div>
            )}

            {/* Pending role toast (shown after OAuth creates a pending request) */}
            {pendingToast && (
                <div style={{
                    position: 'fixed', bottom: 70, left: 16, zIndex: 10000,
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(15,12,41,0.95)', border: '1px solid rgba(245,158,11,0.4)',
                    color: '#f59e0b', fontSize: 12, maxWidth: 300,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span>✉️</span>
                    <span>{pendingToast}</span>
                    <button type="button" onClick={() => setPendingToast(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 10 }}>
                        ✕
                    </button>
                </div>
            )}

            {/* Animations */}
            <style>{`
        @keyframes rl-fab-slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rl-modal-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
        </>
    );
};

export default AuthFloatingButton;

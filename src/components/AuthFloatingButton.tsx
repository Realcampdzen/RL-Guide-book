import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LoginModal } from './LoginModal';
import { RoleSelectionModal } from './RoleSelectionModal';
import type { RoleFlowResult } from './RoleSelectionModal';
import type { Session } from '@supabase/supabase-js';

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
    return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
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
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<ActiveModal>('none');
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [oauthError, setOauthError] = useState<string | null>(null);

    // When developer selects OAuth, we wait for the callback to resolve their role.
    const pendingDevOAuthRef = useRef(false);

    const deviceId = getDeviceId();

    // ── Listen to auth state ──
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            if (s?.access_token) void fetchRole(s.access_token);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            if (s?.access_token) {
                if (pendingDevOAuthRef.current) {
                    // Developer OAuth callback
                    pendingDevOAuthRef.current = false;
                    void resolveDevOAuth(s);
                } else {
                    void fetchRole(s.access_token);
                }
            } else {
                setRole(null);
            }
            setLoading(false);
        });

        return () => { subscription.unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Fetch existing role from /api/auth/me ──
    const fetchRole = async (token: string) => {
        try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRole(data.role || null);
            }
        } catch { /* silent */ }
    };

    // ── B-4: Resolve OAuth for developer ──
    const resolveDevOAuth = async (s: Session) => {
        const email = s.user?.email;
        const token = s.access_token;
        if (!email || !token) {
            setOauthError('Не удалось получить email из OAuth.');
            return;
        }
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
                setActiveModal('none');
                setOauthError(null);
            } else {
                setOauthError(`Нет доступа для ${email}`);
                // Sign out since not authorized
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
                setActiveModal('none');
                // Dispatch to existing auth context
                try {
                    const event = new CustomEvent('rl-auth-code-redeemed', {
                        detail: { role: result.role, accessToken: result.accessToken },
                    });
                    window.dispatchEvent(event);
                } catch { /* */ }
                break;

            case 'request-sent':
                // User stays as traveler, modal closes
                setActiveModal('none');
                break;

            case 'developer-oauth':
                // Switch to OAuth login flow for developers
                pendingDevOAuthRef.current = true;
                setOauthError(null);
                setActiveModal('oauth-login');
                break;

            case 'cancelled':
                setActiveModal('none');
                break;
        }
    }, []);

    const handleSignOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setRole(null);
        setShowMenu(false);
    }, []);

    const handleLegacyCode = useCallback((code: string) => {
        const event = new CustomEvent('rl-auth-code', { detail: code });
        window.dispatchEvent(event);
    }, []);

    if (loading) return null;

    const isLoggedIn = !!session;
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
                                padding: '8px 14px 8px 8px', borderRadius: 24,
                                background: 'rgba(15,12,41,0.92)', backdropFilter: 'blur(12px)',
                                border: `1px solid ${displayInfo.color}44`,
                                color: '#fff', cursor: 'pointer',
                                boxShadow: `0 4px 16px ${displayInfo.color}22`,
                                transition: 'transform 0.15s, box-shadow 0.15s',
                            }}>
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" style={{
                                    width: 28, height: 28, borderRadius: 14,
                                    border: `2px solid ${displayInfo.color}`,
                                }} />
                            ) : (
                                <span style={{
                                    width: 28, height: 28, borderRadius: 14,
                                    background: `${displayInfo.color}22`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14,
                                }}>{displayInfo.icon}</span>
                            )}
                            <span style={{ fontSize: 11, fontWeight: 600, color: displayInfo.color }}>
                                {displayInfo.label}
                            </span>
                        </button>

                        {/* Dropdown menu */}
                        {showMenu && (
                            <div style={{
                                position: 'absolute', bottom: 52, left: 0,
                                background: 'rgba(15,12,41,0.97)', backdropFilter: 'blur(16px)',
                                borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                                padding: 6, minWidth: 180,
                                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                                animation: 'rl-modal-scale-in 0.15s ease-out',
                            }}>
                                {userEmail && (
                                    <div style={{
                                        padding: '8px 12px', fontSize: 11,
                                        color: 'rgba(255,255,255,0.4)',
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        marginBottom: 4,
                                    }}>
                                        {userEmail}
                                    </div>
                                )}
                                <button type="button" onClick={() => { setShowMenu(false); }}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        background: 'none', border: 'none',
                                        color: 'rgba(255,255,255,0.7)', fontSize: 12,
                                        cursor: 'pointer', textAlign: 'left',
                                    }}>
                                    {displayInfo.icon} {displayInfo.label}
                                </button>
                                <button type="button" onClick={() => void handleSignOut()}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        background: 'none', border: 'none',
                                        color: '#ef4444', fontSize: 12,
                                        cursor: 'pointer', textAlign: 'left',
                                    }}>
                                    🚪 Выйти
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Not logged in — show login button → opens RoleSelectionModal */
                    <button type="button" onClick={() => { setActiveModal('role-select'); setOauthError(null); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px 10px 12px', borderRadius: 24,
                            background: 'rgba(15,12,41,0.92)', backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            color: '#fff', cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(139,92,246,0.15)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}>
                        <span style={{
                            width: 28, height: 28, borderRadius: 14,
                            background: 'rgba(139,92,246,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14,
                        }}>🧭</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>
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
                onClose={() => { setActiveModal('none'); pendingDevOAuthRef.current = false; }}
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

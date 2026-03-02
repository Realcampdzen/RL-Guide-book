import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LoginModal } from './LoginModal';
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AuthFloatingButton: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [loading, setLoading] = useState(true);

    // Listen to auth state
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            if (s?.access_token) void fetchRole(s.access_token);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            if (s?.access_token) { void fetchRole(s.access_token); }
            else { setRole(null); }
            setLoading(false);
        });

        return () => { subscription.unsubscribe(); };
    }, []);

    const fetchRole = async (token: string) => {
        try {
            const base = getApiBase();
            const res = await fetch(`${base}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setRole(data.role || 'participant');
            }
        } catch { /* silent */ }
    };

    const handleSignOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setRole(null);
        setShowMenu(false);
    }, []);

    const handleLegacyCode = useCallback((code: string) => {
        // Dispatch to existing auth context
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
                    /* Not logged in — show login button */
                    <button type="button" onClick={() => setShowModal(true)}
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

            {/* Login Modal */}
            <LoginModal
                open={showModal}
                onClose={() => setShowModal(false)}
                onLegacyCode={handleLegacyCode}
            />

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

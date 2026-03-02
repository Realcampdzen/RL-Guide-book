import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
    id: string;
    email?: string;
    nickname?: string;
    role?: string;
    deviceId?: string;
    avatarUrl?: string;
}

export interface AuthState {
    loading: boolean;
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    accessToken: string | null;
    signOut: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

async function fetchProfile(token: string): Promise<UserProfile | null> {
    try {
        const base = getApiBase();
        const res = await fetch(`${base}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return null;
        return (await res.json()) as UserProfile;
    } catch {
        return null;
    }
}

async function linkDevice(token: string, deviceId: string): Promise<void> {
    try {
        const base = getApiBase();
        await fetch(`${base}/api/auth/link-device`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ deviceId }),
        });
    } catch { /* silent */ }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthState {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const linked = useRef(false);

    // Fetch profile and optionally link device
    const resolveProfile = useCallback(async (token: string) => {
        const prof = await fetchProfile(token);
        setProfile(prof);

        // Link existing localStorage device_id if present
        if (!linked.current) {
            const deviceId = localStorage.getItem('rl-device-id');
            if (deviceId) {
                linked.current = true;
                void linkDevice(token, deviceId);
            }
        }
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: s } }) => {
            setSession(s);
            if (s?.access_token) void resolveProfile(s.access_token);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s);
            if (s?.access_token) {
                void resolveProfile(s.access_token);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => { subscription.unsubscribe(); };
    }, [resolveProfile]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        linked.current = false;
    }, []);

    return {
        loading,
        session,
        user: session?.user ?? null,
        profile,
        accessToken: session?.access_token ?? null,
        signOut,
    };
}

export default useAuth;

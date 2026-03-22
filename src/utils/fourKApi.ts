/**
 * 4K Skills API utility.
 * Backend endpoints from M13-4K-ENGINE-C.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FourKStats {
    critical_thinking: number; // 0-100
    creativity: number;
    communication: number;
    cooperation: number;
    badgeContributions: FourKBadgeContribution[];
}

export interface FourKBadgeContribution {
    badgeId: string;
    badgeTitle: string;
    skill: 'critical_thinking' | 'creativity' | 'communication' | 'cooperation';
    points: number;
}

export interface FourKMapping {
    badgeId: string;
    skill: string;
    weight: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
    const base = getApiBase();
    const res = await fetch(`${base}${path}`, options);
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
        const message = (typeof data.error === 'string' && data.error) || `Request failed: ${res.status}`;
        throw new ApiError(message, res.status, data);
    }
    return data as T;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Fetch 4K skill stats for a device. */
export async function fetchStats(deviceId: string): Promise<FourKStats> {
    return requestJson<FourKStats>(`/api/fourk/stats?device_id=${encodeURIComponent(deviceId)}`);
}

/** Fetch badge→skill mapping. */
export async function fetchMapping(): Promise<FourKMapping[]> {
    const data = await requestJson<{ mapping: FourKMapping[] }>('/api/fourk/mapping');
    return data.mapping || [];
}

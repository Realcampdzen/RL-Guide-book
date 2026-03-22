/**
 * Badge Art API utility.
 * Backend endpoints from M9-ART-MODERATION-A.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArtItem {
    id: string;
    badgeId: string;
    imageUrl: string;
    source?: string;
    status: 'pending' | 'approved' | 'rejected' | 'canon';
    submittedBy?: string;
    submittedByNickname?: string;
    createdAt: string;
    reviewedAt?: string;
    reviewNote?: string;
    badgeTitle?: string;
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

/**
 * Submit a new art for a badge.
 */
export async function submitArt(
    accessToken: string,
    payload: { badgeId: string; imageUrl: string; source?: string }
): Promise<ArtItem> {
    return requestJson<ArtItem>('/api/arts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
    });
}

/**
 * Fetch arts list (optionally by badgeId and/or status).
 */
export async function fetchArts(
    badgeId?: string,
    status?: string
): Promise<ArtItem[]> {
    const params = new URLSearchParams();
    if (badgeId) params.set('badge_id', badgeId);
    if (status) params.set('status', status);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const data = await requestJson<{ arts: ArtItem[] }>(`/api/arts${suffix}`);
    return data.arts || [];
}

/**
 * Fetch pending arts inbox (staff only).
 */
export async function fetchArtsInbox(
    accessToken: string
): Promise<ArtItem[]> {
    const data = await requestJson<{ arts: ArtItem[] }>('/api/arts/inbox', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.arts || [];
}

/**
 * Review an art submission (approve, reject, or set as canon).
 */
export async function reviewArt(
    accessToken: string,
    id: string,
    payload: { status: 'approved' | 'rejected' | 'canon'; note?: string }
): Promise<{ art: ArtItem }> {
    return requestJson<{ art: ArtItem }>(`/api/arts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
    });
}

/**
 * Council Initiatives API utility.
 * Backend endpoints: §3.3 + §3.8 of BACKEND_CONTRACT_GUARD.md
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CouncilInitiativeItem {
    id: string;
    title: string;
    status: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
    campId?: string;
    teamId?: string | null;
    createdBy?: string;
    createdByNickname?: string;
    votesUp?: number;
    voters?: string[];
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
 * Create a council initiative.
 */
export async function createInitiative(
    accessToken: string,
    payload: { title: string; campId?: string; description?: string }
): Promise<CouncilInitiativeItem> {
    const body: Record<string, unknown> = { title: payload.title };
    if (payload.campId) body.camp_id = payload.campId;
    if (payload.description) body.description = payload.description;
    return requestJson<CouncilInitiativeItem>('/api/council/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
    });
}

/**
 * Fetch council initiatives list.
 */
export async function fetchInitiatives(
    accessToken: string,
    campId?: string
): Promise<CouncilInitiativeItem[]> {
    const params = new URLSearchParams();
    if (campId) params.set('camp_id', campId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const data = await requestJson<{ initiatives: CouncilInitiativeItem[] }>(`/api/council/initiatives${suffix}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.initiatives || [];
}

/**
 * Update initiative status / team / description (staff only).
 */
export async function updateInitiativeStatus(
    accessToken: string,
    id: string,
    patch: { status?: string; teamId?: string | null; description?: string }
): Promise<{ initiative: CouncilInitiativeItem }> {
    return requestJson<{ initiative: CouncilInitiativeItem }>(`/api/council/initiatives/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(patch),
    });
}

/**
 * Toggle vote on an initiative (POST = toggle).
 */
export async function voteInitiative(
    accessToken: string,
    id: string
): Promise<{ initiative: { id: string; votesUp: number; voters: string[] }; voted: boolean }> {
    return requestJson<{ initiative: { id: string; votesUp: number; voters: string[] }; voted: boolean }>(`/api/council/initiatives/${encodeURIComponent(id)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: '{}',
    });
}

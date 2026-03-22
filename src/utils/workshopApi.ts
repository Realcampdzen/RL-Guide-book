/**
 * Educator Workshop API utility.
 * Backend endpoints from M13-EDUCATOR-WORKSHOP-A.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Workshop {
    id: string;
    educatorId: string;
    name: string;
    direction?: string;
    participants: WorkshopParticipant[];
    badges: WorkshopBadge[];
    createdAt: string;
}

export interface WorkshopParticipant {
    deviceId: string;
    nickname?: string;
    addedAt: string;
}

export interface WorkshopBadge {
    badgeId: string;
    badgeTitle?: string;
    addedAt: string;
    confirmations: WorkshopConfirmation[];
}

export interface WorkshopConfirmation {
    deviceId: string;
    confirmedAt: string;
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

/** Create a workshop. */
export async function createWorkshop(
    accessToken: string,
    data: { name: string; direction?: string }
): Promise<{ workshop: Workshop }> {
    return requestJson<{ workshop: Workshop }>('/api/workshops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
    });
}

/** Fetch all workshops. */
export async function fetchWorkshops(): Promise<Workshop[]> {
    const data = await requestJson<{ workshops: Workshop[] }>('/api/workshops');
    return data.workshops || [];
}

/** Fetch a single workshop. */
export async function fetchWorkshop(id: string): Promise<Workshop> {
    const data = await requestJson<{ workshop: Workshop }>(`/api/workshops/${encodeURIComponent(id)}`);
    return data.workshop;
}

/** Update workshop info. */
export async function updateWorkshop(
    accessToken: string,
    id: string,
    data: Partial<{ name: string; direction: string }>
): Promise<{ workshop: Workshop }> {
    return requestJson<{ workshop: Workshop }>(`/api/workshops/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
    });
}

/** Add participant to workshop. */
export async function addParticipant(
    accessToken: string,
    id: string,
    data: { deviceId: string; nickname?: string }
): Promise<{ workshop: Workshop }> {
    return requestJson<{ workshop: Workshop }>(`/api/workshops/${encodeURIComponent(id)}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
    });
}

/** Add a badge to workshop. */
export async function addBadge(accessToken: string, id: string, badgeId: string): Promise<{ workshop: Workshop }> {
    return requestJson<{ workshop: Workshop }>(`/api/workshops/${encodeURIComponent(id)}/badges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ badgeId }),
    });
}

/** Remove a badge from workshop. */
export async function removeBadge(accessToken: string, id: string, badgeId: string): Promise<{ ok: true }> {
    return requestJson<{ ok: true }>(`/api/workshops/${encodeURIComponent(id)}/badges/${encodeURIComponent(badgeId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/** Confirm badge for participant. */
export async function confirmBadge(
    accessToken: string,
    id: string,
    badgeId: string,
    deviceId: string
): Promise<{ ok: true }> {
    return requestJson<{ ok: true }>(`/api/workshops/${encodeURIComponent(id)}/badges/${encodeURIComponent(badgeId)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ deviceId }),
    });
}

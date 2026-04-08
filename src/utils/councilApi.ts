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
    readStatus?: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
    sentAt?: string;
    campId?: string;
    teamId?: string | null;
    teamName?: string;
    sourceInitiativeId?: string;
    createdBy?: string;
    createdByNickname?: string;
    authorNickname?: string;
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

export async function deleteInitiative(
    accessToken: string,
    id: string
): Promise<{ deleted: boolean; id: string }> {
    return requestJson<{ deleted: boolean; id: string }>(`/api/council/initiatives/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

/**
 * Toggle vote on an initiative (POST = toggle).
 */
export async function voteInitiative(
    accessToken: string,
    id: string,
    direction: 'up' | 'down' = 'up'
): Promise<{ initiative: { id: string; votesUp: number; votesDown: number; voters: string[]; downVoters: string[] }; voted: boolean; direction: string }> {
    return requestJson<{ initiative: { id: string; votesUp: number; votesDown: number; voters: string[]; downVoters: string[] }; voted: boolean; direction: string }>(`/api/council/initiatives/${encodeURIComponent(id)}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ direction }),
    });
}

// ---------------------------------------------------------------------------
// Initiative Comments
// ---------------------------------------------------------------------------

export interface InitiativeComment {
    id: string;
    deviceId: string;
    nickname: string;
    text: string;
    createdAt: string;
}

export async function getInitiativeComments(
    accessToken: string,
    id: string
): Promise<{ comments: InitiativeComment[] }> {
    return requestJson<{ comments: InitiativeComment[] }>(`/api/council/initiatives/${encodeURIComponent(id)}/comments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

export async function postInitiativeComment(
    accessToken: string,
    id: string,
    text: string,
    nickname?: string
): Promise<{ comment: InitiativeComment; comments: InitiativeComment[] }> {
    return requestJson<{ comment: InitiativeComment; comments: InitiativeComment[] }>(`/api/council/initiatives/${encodeURIComponent(id)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ text, nickname }),
    });
}

// ---------------------------------------------------------------------------
// Council Protocols
// ---------------------------------------------------------------------------

export interface CouncilProtocol {
    id: string;
    title: string;
    date: string;
    summary?: string;
    decisions?: string[];
    participants?: string[];
    createdBy?: string;
    createdByNickname?: string;
    createdAt: string;
}

export async function fetchProtocols(
    accessToken: string
): Promise<CouncilProtocol[]> {
    const data = await requestJson<{ protocols: CouncilProtocol[] }>('/api/council/protocols', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.protocols || [];
}

export async function createProtocol(
    accessToken: string,
    payload: { title: string; date?: string; summary?: string; decisions?: string[]; participants?: string[] }
): Promise<CouncilProtocol> {
    const res = await requestJson<{ protocol: CouncilProtocol }>('/api/council/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
    });
    return res.protocol;
}

// ---------------------------------------------------------------------------
// Council Members
// ---------------------------------------------------------------------------

export interface CouncilMember {
    id: string;
    nickname: string;
    role: 'member' | 'chair' | 'secretary';
    deviceId?: string;
    joinedAt: string;
    addedBy?: string;
    avatar?: string;
}

export async function fetchMembers(
    accessToken: string
): Promise<CouncilMember[]> {
    const data = await requestJson<{ members: CouncilMember[] }>('/api/council/members', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.members || [];
}

export async function addMember(
    accessToken: string,
    payload: { nickname: string; role?: string; deviceId?: string }
): Promise<CouncilMember> {
    const res = await requestJson<{ member: CouncilMember }>('/api/council/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
    });
    return res.member;
}

export async function removeMember(
    accessToken: string,
    memberId: string
): Promise<void> {
    await requestJson<{ deleted: string }>(`/api/council/members/${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

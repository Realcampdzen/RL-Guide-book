/**
 * Engine (Движок) API utility.
 * Backend endpoints from M11-DVIZHKI-BACKEND-A.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineItem {
  id: string;
  squadId: string;
  name: string;
  avatarUrl?: string | null;
  status: 'pending' | 'approved';
  goal?: string | null;
  goalStatus?: 'draft' | 'submitted' | 'approved';
  createdAt: string;
  createdBy?: string;
  members?: EngineMember[];
}

export interface EngineMember {
  deviceId: string;
  nickname?: string | null;
  role?: string;
  joinedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal
    ? ''
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, options);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      (typeof data.error === 'string' && data.error) || `Request failed: ${res.status}`;
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Create a new engine for a squad. */
export async function createEngine(
  accessToken: string,
  squadId: string,
  data: { name: string; avatarUrl?: string }
): Promise<EngineItem> {
  return requestJson<EngineItem>('/api/engines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ squadId, ...data }),
  });
}

/** Fetch engines for a squad. */
export async function fetchEngines(squadId: string): Promise<EngineItem[]> {
  const data = await requestJson<{ engines: EngineItem[] }>(
    `/api/engines?squad_id=${encodeURIComponent(squadId)}`
  );
  return data.engines || [];
}

/** Approve a pending engine (staff). */
export async function approveEngine(
  accessToken: string,
  id: string
): Promise<{ engine: EngineItem }> {
  return requestJson<{ engine: EngineItem }>(`/api/engines/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Join an engine. */
export async function joinEngine(accessToken: string, id: string): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`/api/engines/${encodeURIComponent(id)}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Leave an engine. */
export async function leaveEngine(accessToken: string, id: string): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`/api/engines/${encodeURIComponent(id)}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Update engine goal. */
export async function updateGoal(
  accessToken: string,
  id: string,
  goal: string
): Promise<{ engine: EngineItem }> {
  return requestJson<{ engine: EngineItem }>(`/api/engines/${encodeURIComponent(id)}/goal`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ goal }),
  });
}

/** Approve engine goal (staff). */
export async function approveGoal(
  accessToken: string,
  id: string
): Promise<{ engine: EngineItem }> {
  return requestJson<{ engine: EngineItem }>(
    `/api/engines/${encodeURIComponent(id)}/goal/approve`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

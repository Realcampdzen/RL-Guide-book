/**
 * BRO (Бросвящение) API utility.
 * Backend endpoints from M12-BRO-BACKEND-A.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BroEvent {
  id: string;
  squadId: string;
  status: 'active' | 'completed';
  createdAt: string;
  createdBy: string;
}

export interface BroPassport {
  id: string;
  deviceId: string;
  broEventId: string;
  status: 'in_progress' | 'completed';
  tasks: BroTask[];
  completedAt?: string;
}

export interface BroTask {
  id: string;
  title: string;
  description?: string;
  order: number;
  done: boolean;
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

/** Initiate a BRO ceremony for a squad (staff). */
export async function initiateBro(
  accessToken: string,
  squadId: string
): Promise<{ event: BroEvent }> {
  return requestJson<{ event: BroEvent }>('/api/bro/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ squadId }),
  });
}

/** Fetch BRO events for a squad. */
export async function fetchBroEvents(squadId: string): Promise<BroEvent[]> {
  const data = await requestJson<{ events: BroEvent[] }>(
    `/api/bro/events?squad_id=${encodeURIComponent(squadId)}`
  );
  return data.events || [];
}

/** Fetch my BRO passport. */
export async function fetchMyPassport(deviceId: string): Promise<BroPassport | null> {
  try {
    const data = await requestJson<{ passport: BroPassport | null }>(
      `/api/bro/passport?device_id=${encodeURIComponent(deviceId)}`
    );
    return data.passport ?? null;
  } catch {
    return null;
  }
}

/** Start a BRO passport for a participant. */
export async function startPassport(
  accessToken: string,
  broEventId: string
): Promise<{ passport: BroPassport }> {
  return requestJson<{ passport: BroPassport }>('/api/bro/passport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ broEventId }),
  });
}

/** Mark a task as done in BRO passport. */
export async function markTask(
  accessToken: string,
  passportId: string,
  taskId: string
): Promise<{ passport: BroPassport }> {
  return requestJson<{ passport: BroPassport }>(
    `/api/bro/passport/${encodeURIComponent(passportId)}/task/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

/** Create a Wing (Крыло) — reuses engine endpoint with type=bro_wing. */
export async function createWing(
  accessToken: string,
  squadId: string,
  data: { name: string }
): Promise<{ engine: { id: string; name: string } }> {
  return requestJson<{ engine: { id: string; name: string } }>('/api/engines', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ squadId, name: data.name, type: 'bro_wing' }),
  });
}

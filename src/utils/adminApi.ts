/**
 * Admin Dashboard API utility.
 * Backend endpoints from M16-DASHBOARD-BACKEND-A.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InboxItemType =
  | 'badge'
  | 'initiative'
  | 'art'
  | 'engine'
  | 'inspector'
  | 'ugc'
  | 'tradition'
  | 'role_request'
  | 'bro_submission'
  | 'badge_plan'
  | 'vozhatifikator_proof'
  | 'squad_join_request'
  | 'engine_join_request';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  userId: string;
  nickname?: string;
  avatarUrl?: string;
  title: string;
  preview?: string;
  photoUrl?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
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

/** Get stored dev PIN for X-Dev-Pin header fallback (developer role without JWT). */
function devPinHeaders(accessToken?: string): Record<string, string> {
  const h: Record<string, string> = {};
  if (accessToken) {
    h['Authorization'] = `Bearer ${accessToken}`;
  } else {
    try {
      const pin = localStorage.getItem('rl-dev-pin');
      if (pin) h['X-Dev-Pin'] = pin;
    } catch {}
  }
  return h;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Fetch inbox items with optional type filter. */
export async function fetchInbox(
  filter?: InboxItemType,
  accessToken?: string
): Promise<InboxItem[]> {
  const qs = filter ? `?type=${encodeURIComponent(filter)}` : '';
  const headers = devPinHeaders(accessToken);
  const data = await requestJson<{ items: InboxItem[] }>(`/api/admin/inbox${qs}`, { headers });
  return data.items || [];
}

/** Perform action on inbox item. */
export interface ActionResult {
  ok: true;
  roleCode?: string;
  accessToken?: string;
  approvedRole?: string;
  approvedDeviceId?: string;
  emailDelivery?: {
    attempted: boolean;
    sent: boolean;
    provider: string;
    error?: string;
  };
}

/** Submit an engine join request. */
export async function submitEngineJoinRequest(
  payload: {
    engineId: string;
    nickname: string;
    message?: string;
  },
  accessToken: string
): Promise<{ status: string; request: Record<string, unknown> | null }> {
  return requestJson<{ status: string; request: Record<string, unknown> | null }>(
    `/api/engines/${encodeURIComponent(payload.engineId)}/join-requests`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...devPinHeaders(accessToken),
      },
      body: JSON.stringify({
        nickname: payload.nickname,
        message: payload.message || '',
      }),
    }
  );
}

export async function performAction(
  accessToken: string,
  itemType: InboxItemType,
  itemId: string,
  action: 'approve' | 'reject',
  comment?: string
): Promise<ActionResult> {
  return requestJson<ActionResult>('/api/admin/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...devPinHeaders(accessToken) },
    body: JSON.stringify({ item_type: itemType, item_id: itemId, action, comment }),
  });
}

/** Generate a one-time role code. */
export async function generateRoleCode(
  accessToken: string,
  role: string
): Promise<{ code: string; role: string; expiresAt: string }> {
  return requestJson<{ code: string; role: string; expiresAt: string }>(
    '/api/role-codes/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...devPinHeaders(accessToken) },
      body: JSON.stringify({ role }),
    }
  );
}

/** Submit a Вожатификатор (Путеводные огни) proof for approval. */
export async function submitVozhatifikatorProof(payload: {
  deviceId: string;
  nickname: string;
  userRole: string;
  completedIds: string[];
  totalPoints: number;
  level: string;
  photo?: string; // base64 data URL
}): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>('/api/admin/inbox', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'vozhatifikator_proof',
      data: {
        nickname: payload.nickname,
        userRole: payload.userRole,
        completedIds: payload.completedIds,
        totalPoints: payload.totalPoints,
        level: payload.level,
        photos: payload.photo ? [payload.photo] : [],
      },
      device_id: payload.deviceId,
    }),
  });
}

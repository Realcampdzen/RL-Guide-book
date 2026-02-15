export interface BadgeRequestEvidence {
  reflection?: string;
  impact?: string;
  link?: string;
}

export interface BadgeRequestItem {
  id: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  levelId: string;
  badgeTitle?: string | null;
  requestedBy?: { deviceId?: string; nickname?: string | null };
  campId?: string;
  squadId?: string | null;
  evidence?: BadgeRequestEvidence | null;
  resolvedAt?: string | null;
  resolvedBy?: { deviceId?: string | null; role?: string | null } | null;
  resolutionNote?: string;
}

export interface BadgeApprovalItem {
  requestId?: string;
  levelId: string;
  approvedAt?: string;
  evidence?: BadgeRequestEvidence | null;
  badgeTitle?: string | null;
  campId?: string;
  squadId?: string | null;
}

export interface SquadMembership {
  deviceId: string;
  campId: string;
  squadId: string;
  role: string;
  joinedAt: string;
  nickname?: string;
}

export interface SquadMeta {
  id: string;
  shiftId: string;
  name: string;
  createdAt?: string;
}

export interface ShiftMeta {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export interface SquadMineResponse {
  membership: SquadMembership | null;
  squad: SquadMeta | null;
  shift: ShiftMeta | null;
  participants: Array<{ deviceId: string; nickname?: string | null; joinedAt?: string }>;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && (data.error as string)) || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function createBadgeRequest(
  accessToken: string,
  payload: { levelId: string; badgeTitle?: string; evidence?: BadgeRequestEvidence; nickname?: string }
): Promise<BadgeRequestItem> {
  const data = await requestJson<{ request: BadgeRequestItem }>('/api/badges/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
  return data.request;
}

export async function loadMyBadgeRequests(accessToken: string): Promise<BadgeRequestItem[]> {
  const data = await requestJson<{ requests: BadgeRequestItem[] }>('/api/badges/requests/mine', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data.requests || [];
}

export async function loadBadgeRequestsInbox(
  accessToken: string,
  filters?: { campId?: string; squadId?: string; status?: 'pending' | 'approved' | 'rejected' }
): Promise<BadgeRequestItem[]> {
  const params = new URLSearchParams();
  if (filters?.campId) params.set('campId', filters.campId);
  if (filters?.squadId) params.set('squadId', filters.squadId);
  if (filters?.status) params.set('status', filters.status);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await requestJson<{ requests: BadgeRequestItem[] }>(`/api/badges/requests/inbox${suffix}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data.requests || [];
}

export async function approveBadgeRequest(accessToken: string, requestId: string, note?: string): Promise<BadgeRequestItem> {
  const data = await requestJson<{ request: BadgeRequestItem }>(`/api/badges/requests/${encodeURIComponent(requestId)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(note ? { note } : {})
  });
  return data.request;
}

export async function rejectBadgeRequest(accessToken: string, requestId: string, note?: string): Promise<BadgeRequestItem> {
  const data = await requestJson<{ request: BadgeRequestItem }>(`/api/badges/requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(note ? { note } : {})
  });
  return data.request;
}

export async function loadMyApprovals(accessToken: string): Promise<BadgeApprovalItem[]> {
  const data = await requestJson<{ approvals: BadgeApprovalItem[] }>('/api/badges/approvals/mine', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return data.approvals || [];
}

export async function joinSquad(
  accessToken: string,
  squadId: string,
  payload?: { nickname?: string; role?: 'participant' | 'counselor' }
): Promise<{ membership: SquadMembership; squad: SquadMeta }> {
  return requestJson<{ membership: SquadMembership; squad: SquadMeta }>(`/api/squads/${encodeURIComponent(squadId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload || {})
  });
}

export async function loadMySquad(accessToken: string): Promise<SquadMineResponse> {
  return requestJson<SquadMineResponse>('/api/squads/mine', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

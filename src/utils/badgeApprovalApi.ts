export interface BadgeRequestEvidence {
  reflection?: string;
  impact?: string;
  link?: string;
  photos?: string[]; // base64 data URLs
  /** Inspector-specific fields */
  source?: 'inspector' | 'badge';
  durationMs?: number;
  completedTasks?: string[];
  missionDay?: number;
  missionTitle?: string;
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
  avatarUrl?: string | null;
}

export interface SquadMeta {
  id: string;
  shiftId: string;
  name: string;
  createdAt?: string;
  avatarUrl?: string | null;
}

export interface ShiftMeta {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  durationDays?: number;
  createdAt?: string;
}

export interface SquadMineResponse {
  membership: SquadMembership | null;
  squad: SquadMeta | null;
  shift: ShiftMeta | null;
  participants: Array<{ deviceId: string; nickname?: string | null; joinedAt?: string; avatarUrl?: string | null }>;
  members?: Array<{ deviceId: string; nickname?: string | null; role: string; joinedAt?: string; avatarUrl?: string | null }>;
}

export type SquadCornerPlanGrid = {
  shiftLength: 9 | 21;
  days: Record<
    string,
    { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }
  >;
};

export interface SquadCorner {
  name?: string;
  motto?: string;
  chants?: string;
  greeting?: string;
  memes?: string;
  photoCorner?: string;
  photoFlag?: string;
  photoSquad?: string;
  photoWithCounselors?: string;
  planGridA?: SquadCornerPlanGrid | null;
  planGridB?: SquadCornerPlanGrid | null;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SquadCornerResponse {
  squadId: string;
  corner: SquadCorner | null;
  updatedAt?: string;
}

export interface SquadInviteCodeResponse {
  squadId: string;
  code: string;
  createdAt: string;
  expiresAt: string;
}

export interface SquadInviteResolveResponse {
  squadId: string;
  squadName?: string | null;
  shiftId?: string | null;
  shiftName?: string | null;
}

export interface SquadPreviewResponse {
  squadId: string;
  squadName?: string | null;
  shiftId?: string | null;
  shiftName?: string | null;
}

export interface SquadMessage {
  id: string;
  squadId: string;
  createdAt: string;
  deviceId?: string | null;
  nickname?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  text: string;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
}

export class ApiError extends Error {
  status: number;
  reason?: string;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.reason = typeof data.reason === 'string' ? data.reason : undefined;
    this.data = data;
  }
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

export async function createBadgeRequest(
  accessToken: string,
  payload: { levelId: string; badgeTitle?: string; evidence?: BadgeRequestEvidence; nickname?: string },
  deviceId?: string
): Promise<BadgeRequestItem> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (deviceId) headers['X-Device-Id'] = deviceId;
  const data = await requestJson<{ request: BadgeRequestItem }>('/api/badges/requests', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return data.request;
}

export async function loadMyBadgeRequests(accessToken: string, extraHeaders?: Record<string, string>): Promise<BadgeRequestItem[]> {
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const data = await requestJson<{ requests: BadgeRequestItem[] }>('/api/badges/requests/mine', {
    headers: { ...headers, ...extraHeaders }
  });
  return data.requests || [];
}

export async function loadBadgeRequestsInbox(
  accessToken: string,
  filters?: { campId?: string; squadId?: string; status?: 'pending' | 'approved' | 'rejected' },
  extraHeaders?: Record<string, string>
): Promise<BadgeRequestItem[]> {
  const params = new URLSearchParams();
  if (filters?.campId) params.set('campId', filters.campId);
  if (filters?.squadId) params.set('squadId', filters.squadId);
  if (filters?.status) params.set('status', filters.status);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const data = await requestJson<{ requests: BadgeRequestItem[] }>(`/api/badges/requests/inbox${suffix}`, {
    headers: { ...headers, ...extraHeaders }
  });
  return data.requests || [];
}

export async function approveBadgeRequest(accessToken: string, requestId: string, note?: string, extraHeaders?: Record<string, string>): Promise<BadgeRequestItem> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...extraHeaders };
  const data = await requestJson<{ request: BadgeRequestItem }>(`/api/badges/requests/${encodeURIComponent(requestId)}/approve`, {
    method: 'POST',
    headers,
    body: JSON.stringify(note ? { note } : {})
  });
  return data.request;
}

export async function rejectBadgeRequest(accessToken: string, requestId: string, note?: string, extraHeaders?: Record<string, string>): Promise<BadgeRequestItem> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...extraHeaders };
  const data = await requestJson<{ request: BadgeRequestItem }>(`/api/badges/requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST',
    headers,
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
  payload?: { nickname?: string; role?: 'participant' | 'counselor' | 'shift_leader' }
): Promise<{ membership: SquadMembership; squad: SquadMeta }> {
  return requestJson<{ membership: SquadMembership; squad: SquadMeta }>(`/api/squads/${encodeURIComponent(squadId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload || {})
  });
}

export async function loadMySquad(accessToken: string, deviceId?: string): Promise<SquadMineResponse> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (deviceId) {
    headers['X-Device-Id'] = deviceId;
  }
  return requestJson<SquadMineResponse>('/api/squads/mine', { headers });
}

export async function fetchSquadCorner(accessToken: string, squadId: string): Promise<SquadCornerResponse> {
  return requestJson<SquadCornerResponse>(`/api/squads/${encodeURIComponent(squadId)}/corner`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function patchSquadCorner(
  accessToken: string,
  squadId: string,
  payload: Partial<SquadCorner>
): Promise<SquadCornerResponse> {
  return requestJson<SquadCornerResponse>(`/api/squads/${encodeURIComponent(squadId)}/corner`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload || {})
  });
}

export async function createSquadInviteCode(accessToken: string, squadId: string): Promise<SquadInviteCodeResponse> {
  return requestJson<SquadInviteCodeResponse>(`/api/squads/${encodeURIComponent(squadId)}/invite-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({})
  });
}

export async function resolveSquadByInviteCode(accessToken: string, code: string): Promise<SquadInviteResolveResponse> {
  const params = new URLSearchParams({ code });
  return requestJson<SquadInviteResolveResponse>(`/api/squads/by-invite-code?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function fetchSquadPreview(accessToken: string, squadId: string): Promise<SquadPreviewResponse> {
  return requestJson<SquadPreviewResponse>(`/api/squads/${encodeURIComponent(squadId)}/preview`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function kickSquadMember(accessToken: string, squadId: string, targetDeviceId: string): Promise<void> {
  await requestJson<{ squadId: string }>(`/api/squads/${encodeURIComponent(squadId)}/members/${encodeURIComponent(targetDeviceId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function leaveSquad(
  accessToken: string,
  squadId: string
): Promise<{ status: string; squadId: string; membership: null }> {
  return requestJson<{ status: string; squadId: string; membership: null }>(`/api/squads/${encodeURIComponent(squadId)}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({})
  });
}

export async function fetchSquadMessages(
  accessToken: string,
  squadId: string,
  opts?: { limit?: number; before?: string },
  extraHeaders?: Record<string, string>
): Promise<{ squadId: string; messages: SquadMessage[]; hasMore?: boolean }> {
  const params = new URLSearchParams();
  if (typeof opts?.limit === 'number') params.set('limit', String(opts.limit));
  if (opts?.before) params.set('before', opts.before);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return requestJson<{ squadId: string; messages: SquadMessage[]; hasMore?: boolean }>(`/api/squads/${encodeURIComponent(squadId)}/messages${suffix}`, {
    headers: { ...headers, ...extraHeaders }
  });
}

export async function postSquadMessage(
  accessToken: string,
  squadId: string,
  text: string,
  nickname?: string,
  extraHeaders?: Record<string, string>,
  avatarUrl?: string
): Promise<{ squadId: string; message: SquadMessage }> {
  const payload: Record<string, string> = { text };
  if (nickname) payload.nickname = nickname;
  if (avatarUrl) payload.avatarUrl = avatarUrl;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...extraHeaders };
  const created = await requestJson<{ squadId?: string; message: SquadMessage }>(`/api/squads/${encodeURIComponent(squadId)}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return { squadId: created.squadId || squadId, message: created.message };
}

export async function deleteShift(accessToken: string, shiftId: string): Promise<{ ok: true; deleted: Record<string, number> }> {
  return requestJson<{ ok: true; deleted: Record<string, number> }>(`/api/shifts/${encodeURIComponent(shiftId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function deleteSquad(accessToken: string, squadId: string): Promise<{ ok: true; deleted: Record<string, number> }> {
  return requestJson<{ ok: true; deleted: Record<string, number> }>(`/api/squads/${encodeURIComponent(squadId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function deleteSquadMessage(accessToken: string, squadId: string, msgId: string, extraHeaders?: Record<string, string>): Promise<{ ok: true }> {
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return requestJson<{ ok: true }>(`/api/squads/${encodeURIComponent(squadId)}/messages/${encodeURIComponent(msgId)}`, {
    method: 'DELETE',
    headers: { ...headers, ...extraHeaders }
  });
}

export async function pinSquadMessage(accessToken: string, squadId: string, msgId: string, pinned: boolean, extraHeaders?: Record<string, string>): Promise<{ ok: true; pinned: boolean; message: SquadMessage | null }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...extraHeaders };
  return requestJson<{ ok: true; pinned: boolean; message: SquadMessage | null }>(`/api/squads/${encodeURIComponent(squadId)}/messages/${encodeURIComponent(msgId)}/pin`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ pinned })
  });
}

export async function fetchPinnedMessage(accessToken: string, squadId: string, extraHeaders?: Record<string, string>): Promise<{ message: SquadMessage | null }> {
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return requestJson<{ message: SquadMessage | null }>(`/api/squads/${encodeURIComponent(squadId)}/pinned`, {
    headers: { ...headers, ...extraHeaders }
  });
}

// ── Team chat (Engine) — routes to /api/teams/:id/messages ──

export async function fetchTeamMessages(
  accessToken: string,
  teamId: string,
  opts?: { limit?: number; before?: string },
  extraHeaders?: Record<string, string>
): Promise<{ squadId: string; messages: SquadMessage[]; hasMore?: boolean }> {
  const params = new URLSearchParams();
  if (typeof opts?.limit === 'number') params.set('limit', String(opts.limit));
  if (opts?.before) params.set('before', opts.before);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return requestJson<{ squadId: string; messages: SquadMessage[]; hasMore?: boolean }>(`/api/teams/${encodeURIComponent(teamId)}/messages${suffix}`, {
    headers: { ...headers, ...extraHeaders }
  });
}

export async function postTeamMessage(
  accessToken: string,
  teamId: string,
  text: string,
  nickname?: string,
  extraHeaders?: Record<string, string>,
  avatarUrl?: string
): Promise<{ squadId: string; message: SquadMessage }> {
  const payload: Record<string, string> = { text };
  if (nickname) payload.nickname = nickname;
  if (avatarUrl) payload.avatarUrl = avatarUrl;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...extraHeaders };
  const created = await requestJson<{ squadId?: string; message: SquadMessage }>(`/api/teams/${encodeURIComponent(teamId)}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  return { squadId: created.squadId || teamId, message: created.message };
}

export async function deleteTeamMessage(accessToken: string, teamId: string, msgId: string, extraHeaders?: Record<string, string>): Promise<{ ok: true }> {
  const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  return requestJson<{ ok: true }>(`/api/teams/${encodeURIComponent(teamId)}/messages/${encodeURIComponent(msgId)}`, {
    method: 'DELETE',
    headers: { ...headers, ...extraHeaders }
  });
}

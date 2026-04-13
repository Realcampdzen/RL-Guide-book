/**
 * Workshop Proposals API client.
 *
 * Mirrors the badge_requests pattern from badgeApprovalApi.ts.
 * Routes: POST /api/workshop/proposals, GET /mine, GET /inbox, POST /:id/approve, POST /:id/reject
 */

// ── Types ──

export type WorkshopProposalType = 'badge' | 'category' | 'version' | 'art';
export type WorkshopProposalStatus = 'pending' | 'approved' | 'rejected';

export interface WorkshopProposal {
  id: string;
  type: WorkshopProposalType;
  title: string;
  description?: string;
  emoji?: string | null;
  badgeId?: string | null;
  image?: string | null;
  status: WorkshopProposalStatus;
  createdBy?: { deviceId?: string; nickname?: string | null };
  campId?: string;
  squadId?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  resolvedBy?: { deviceId?: string | null; role?: string | null } | null;
  resolutionNote?: string | null;
}

// ── Helpers ──

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal
    ? ''
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
}

class WpApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'WpApiError';
    this.status = status;
  }
}

async function wpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, options);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      (typeof data.error === 'string' && data.error) || `Request failed: ${res.status}`;
    throw new WpApiError(message, res.status);
  }
  return data as T;
}

function authHeaders(token: string, extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  return { ...h, ...extra };
}

// ── API Functions ──

export async function createWorkshopProposal(
  accessToken: string,
  payload: {
    type: WorkshopProposalType;
    title: string;
    description?: string;
    emoji?: string;
    badgeId?: string;
    image?: string;
    nickname?: string;
  }
): Promise<WorkshopProposal> {
  const data = await wpRequest<{ proposal: WorkshopProposal }>('/api/workshop/proposals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
    body: JSON.stringify(payload),
  });
  return data.proposal;
}

export async function fetchMyProposals(accessToken: string): Promise<WorkshopProposal[]> {
  const data = await wpRequest<{ proposals: WorkshopProposal[] }>('/api/workshop/proposals/mine', {
    headers: authHeaders(accessToken),
  });
  return data.proposals || [];
}

export async function fetchProposalsInbox(
  accessToken: string,
  filters?: { campId?: string; status?: WorkshopProposalStatus }
): Promise<WorkshopProposal[]> {
  const params = new URLSearchParams();
  if (filters?.campId) params.set('campId', filters.campId);
  if (filters?.status) params.set('status', filters.status);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await wpRequest<{ proposals: WorkshopProposal[] }>(
    `/api/workshop/proposals/inbox${suffix}`,
    {
      headers: authHeaders(accessToken),
    }
  );
  return data.proposals || [];
}

export async function approveProposal(
  accessToken: string,
  proposalId: string,
  note?: string
): Promise<WorkshopProposal> {
  const data = await wpRequest<{ proposal: WorkshopProposal }>(
    `/api/workshop/proposals/${encodeURIComponent(proposalId)}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(note ? { note } : {}),
    }
  );
  return data.proposal;
}

export async function rejectProposal(
  accessToken: string,
  proposalId: string,
  note?: string
): Promise<WorkshopProposal> {
  const data = await wpRequest<{ proposal: WorkshopProposal }>(
    `/api/workshop/proposals/${encodeURIComponent(proposalId)}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(note ? { note } : {}),
    }
  );
  return data.proposal;
}

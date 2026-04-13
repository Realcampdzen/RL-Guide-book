/**
 * Badge Plans API utility — mirrors badgeApprovalApi.ts patterns.
 * Server endpoints implemented by Agent A (M7-PLAN-WORKFLOW-A).
 */

// Re-use shared helpers from badgeApprovalApi
import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgePlanChecklistItem {
  text: string;
  done: boolean;
}

export interface BadgePlanItem {
  id: string;
  deviceId?: string;
  campId?: string;
  badgeId: string;
  levelId?: string;
  planText: string;
  checklist: BadgePlanChecklistItem[];
  /** Server status: draft | submitted | approved | rejected */
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  counselorNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers (same as badgeApprovalApi — duplicated to keep module self-contained)
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

/**
 * Create or update a badge plan (upsert by device_id + badge_id).
 * Pass `submit: true` to move status from draft → submitted.
 */
export async function submitBadgePlan(
  accessToken: string,
  payload: {
    badgeId: string;
    levelId?: string;
    planText: string;
    checklist?: BadgePlanChecklistItem[];
    submit?: boolean;
  }
): Promise<BadgePlanItem> {
  const data = await requestJson<{ plan: BadgePlanItem }>('/api/badges/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
  return data.plan;
}

/**
 * Fetch my badge plans, optionally filtered by status.
 */
export async function fetchMyPlans(
  accessToken: string,
  status?: 'draft' | 'submitted' | 'approved' | 'rejected'
): Promise<BadgePlanItem[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await requestJson<{ plans: BadgePlanItem[] }>(`/api/badges/plans/mine${suffix}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.plans || [];
}

/**
 * Fetch submitted badge plans for staff inbox (counselor / educator / shift_leader / developer).
 */
export async function fetchPlansInbox(accessToken: string): Promise<BadgePlanItem[]> {
  const data = await requestJson<{ plans: BadgePlanItem[] }>('/api/badges/plans/inbox', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data.plans || [];
}

/**
 * Approve or reject a submitted badge plan.
 */
export async function reviewPlan(
  accessToken: string,
  planId: string,
  status: 'approved' | 'rejected',
  counselorNote?: string
): Promise<BadgePlanItem> {
  const data = await requestJson<{ plan: BadgePlanItem }>(
    `/api/badges/plans/${encodeURIComponent(planId)}/review`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status, counselorNote: counselorNote || undefined }),
    }
  );
  return data.plan;
}

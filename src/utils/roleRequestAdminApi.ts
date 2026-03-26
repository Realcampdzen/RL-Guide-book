/**
 * Role Request Admin API — manage role requests (approve/reject).
 * Used by staff (shift_leader, camp_director, developer) in the Personal Cabinet.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleRequestAdmin {
    id: string;
    deviceId: string;
    desiredRole: string;
    name?: string;
    email?: string;
    comment?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    roleCode?: string;
    accessToken?: string;
    emailDelivery?: {
        attempted: boolean;
        sent: boolean;
        provider: string;
        error?: string;
    };
}

export interface ReviewResult {
    ok: boolean;
    request: RoleRequestAdmin;
    roleCode?: string;
    accessToken?: string;
    emailDelivery?: {
        attempted: boolean;
        sent: boolean;
        provider: string;
        error?: string;
    };
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

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Fetch all role requests (admin mode). Requires staff JWT. */
export async function fetchAllRoleRequests(accessToken: string): Promise<RoleRequestAdmin[]> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/role-requests?all=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : `Request failed: ${res.status}`);
    }
    return (data.requests as RoleRequestAdmin[]) || [];
}

/** Approve a role request. Returns the generated role code. */
export async function approveRoleRequest(accessToken: string, requestId: string): Promise<ReviewResult> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/role-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'approved' }),
    });
    const data = await res.json().catch(() => ({})) as ReviewResult;
    if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error || `Request failed: ${res.status}`);
    }
    return data;
}

/** Reject a role request. */
export async function rejectRoleRequest(accessToken: string, requestId: string): Promise<ReviewResult> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/role-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: 'rejected' }),
    });
    const data = await res.json().catch(() => ({})) as ReviewResult;
    if (!res.ok) {
        throw new Error((data as unknown as { error?: string }).error || `Request failed: ${res.status}`);
    }
    return data;
}

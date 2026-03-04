/**
 * Role Request API — подача заявок на смену роли.
 * Backend endpoints from M18-ROLE-REQUEST-C.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoleRequest {
    id: string;
    deviceId: string;
    desiredRole: string;
    comment?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBase(): string {
    if (typeof window === 'undefined') return '';
    const hostname = window.location.hostname;
    const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/** Submit a role request. */
export async function submitRoleRequest(
    accessToken: string,
    desiredRole: string,
    comment?: string,
): Promise<RoleRequest> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/role-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ desiredRole, comment }),
    });
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
        throw new ApiError(
            (typeof data.error === 'string' && data.error) || `Request failed: ${res.status}`,
            res.status,
            data,
        );
    }
    return data.roleRequest as RoleRequest;
}

/** Fetch my role requests. */
export async function fetchMyRoleRequests(deviceId: string): Promise<RoleRequest[]> {
    const base = getApiBase();
    const res = await fetch(`${base}/api/role-requests?deviceId=${encodeURIComponent(deviceId)}`);
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
        throw new ApiError(
            (typeof data.error === 'string' && data.error) || `Request failed: ${res.status}`,
            res.status,
            data,
        );
    }
    return (data.requests as RoleRequest[]) || [];
}

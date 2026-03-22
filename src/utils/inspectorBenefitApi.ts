/**
 * Inspector Benefit API utility.
 * Backend endpoints from M11-INSPECTOR-C.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InspectorChecklist {
    id: string;
    title: string;
    order: number;
    tasks: InspectorTask[];
}

export interface InspectorTask {
    id: string;
    checklistId: string;
    title: string;
    description?: string;
    skill4k?: string; // e.g. 'critical_thinking' | 'communication' | 'creativity' | 'collaboration'
    order: number;
}

export interface InspectorTaskProgress {
    taskId: string;
    status: 'not_started' | 'done_pending' | 'approved';
    completedAt?: string;
    approvedAt?: string;
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

/** Fetch all inspector checklists with tasks. */
export async function fetchChecklists(): Promise<InspectorChecklist[]> {
    const data = await requestJson<{ checklists: InspectorChecklist[] }>('/api/inspector/checklists');
    return data.checklists || [];
}

/** Fetch progress for a specific device. */
export async function fetchProgress(deviceId: string): Promise<InspectorTaskProgress[]> {
    const data = await requestJson<{ progress: InspectorTaskProgress[] }>(`/api/inspector/progress?device_id=${encodeURIComponent(deviceId)}`);
    return data.progress || [];
}

/** Mark a task as done (pending approval). */
export async function markTaskDone(
    accessToken: string,
    data: { taskId: string }
): Promise<{ progress: InspectorTaskProgress }> {
    return requestJson<{ progress: InspectorTaskProgress }>('/api/inspector/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
    });
}

/** Approve a completed task (staff). */
export async function approveTask(
    accessToken: string,
    taskId: string
): Promise<{ progress: InspectorTaskProgress }> {
    return requestJson<{ progress: InspectorTaskProgress }>(`/api/inspector/progress/${encodeURIComponent(taskId)}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

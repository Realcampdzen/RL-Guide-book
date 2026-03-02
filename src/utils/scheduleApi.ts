/**
 * Schedule (План-сетка) API utility.
 * Backend endpoints from M12-SHIFT-PLANNER-A.
 */

import { ApiError } from './badgeApprovalApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleEventType = 'event' | 'training' | 'workshop' | 'tradition' | 'free_time' | 'meal';

export interface ScheduleEvent {
    id: string;
    shiftId: string;
    dayIndex: number;
    startTime: string; // "HH:MM"
    endTime?: string;
    title: string;
    type: ScheduleEventType;
    responsible?: string | null;
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

/** Fetch all events for a shift. */
export async function fetchSchedule(shiftId: string): Promise<ScheduleEvent[]> {
    const data = await requestJson<{ events: ScheduleEvent[] }>(`/api/schedule?shift_id=${encodeURIComponent(shiftId)}`);
    return data.events || [];
}

/** Fetch events for a specific day. */
export async function fetchDaySchedule(shiftId: string, dayIndex: number): Promise<ScheduleEvent[]> {
    const data = await requestJson<{ events: ScheduleEvent[] }>(`/api/schedule?shift_id=${encodeURIComponent(shiftId)}&day=${dayIndex}`);
    return data.events || [];
}

/** Create a schedule event (staff). */
export async function createEvent(
    accessToken: string,
    shiftId: string,
    data: { dayIndex: number; startTime: string; endTime?: string; title: string; type: ScheduleEventType; responsible?: string }
): Promise<{ event: ScheduleEvent }> {
    return requestJson<{ event: ScheduleEvent }>('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ shiftId, ...data }),
    });
}

/** Update a schedule event (staff). */
export async function updateEvent(
    accessToken: string,
    eventId: string,
    data: Partial<{ title: string; type: ScheduleEventType; startTime: string; endTime: string; responsible: string }>
): Promise<{ event: ScheduleEvent }> {
    return requestJson<{ event: ScheduleEvent }>(`/api/schedule/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(data),
    });
}

/** Delete a schedule event (staff). */
export async function deleteEvent(accessToken: string, eventId: string): Promise<{ ok: true }> {
    return requestJson<{ ok: true }>(`/api/schedule/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

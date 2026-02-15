/**
 * Auth storage: role, deviceId, accessToken in localStorage.
 * Key: rl_auth_v1
 */
import type { UserRole } from '../types/authRole';
import { DEFAULT_ROLE } from '../types/authRole';

const AUTH_STORAGE_KEY = 'rl_auth_v1';
const DEVICE_ID_KEY = 'rl_device_id_v1';

export interface AuthStorage {
  role: UserRole;
  accessToken?: string;
  campId?: string;
  exp?: number;
  deviceId: string;
}

function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function loadAuthStorage(): AuthStorage {
  if (typeof window === 'undefined') {
    return { role: DEFAULT_ROLE, deviceId: '' };
  }
  const deviceId = getOrCreateDeviceId();
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { role: DEFAULT_ROLE, deviceId };
    const data = JSON.parse(raw) as Partial<AuthStorage>;
    const rawRoleValue: unknown = (data as { role?: unknown }).role;
    // Keep as plain string to support legacy values (e.g. "organizer") without fighting TS unions.
    const rawRole: string = typeof rawRoleValue === 'string' ? rawRoleValue : '';
    const role: UserRole =
      rawRole === 'organizer'
        ? 'shift_leader'
        : (['traveler', 'participant', 'parent', 'counselor', 'educator', 'shift_leader', 'camp_director', 'developer'] as const).includes(rawRole as UserRole)
          ? (rawRole as UserRole)
          : DEFAULT_ROLE;
    const exp = data.exp;
    const expired = exp != null && exp * 1000 < Date.now();
    if (expired) {
      clearAuthStorage();
      return { role: DEFAULT_ROLE, deviceId };
    }
    // В production всегда возвращаем traveler — иначе пользователь мог бы иметь developer из dev-сессии
    const effectiveRole = import.meta.env.PROD && role !== 'traveler' ? 'traveler' : role;
    return {
      role: effectiveRole,
      accessToken: data.accessToken,
      campId: data.campId,
      exp: data.exp,
      deviceId
    };
  } catch {
    return { role: DEFAULT_ROLE, deviceId };
  }
}

export function saveAuthStorage(data: Partial<AuthStorage>): void {
  if (typeof window === 'undefined') return;
  const current = loadAuthStorage();
  const next: AuthStorage = {
    ...current,
    ...data,
    deviceId: current.deviceId
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getDeviceId(): string {
  return getOrCreateDeviceId();
}

let _on401: (() => void) | null = null;
export function setOn401(fn: (() => void) | null): void {
  _on401 = fn;
}
export function fireOn401(): void {
  _on401?.();
}

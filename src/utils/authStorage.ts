/**
 * Auth storage: role, identity claims, access token in localStorage.
 * Keys:
 * - rl_auth_v1
 * - rl_device_id_v1 (canonical installation id)
 */
import type { UserRole } from '../types/authRole';
import { DEFAULT_ROLE } from '../types/authRole';

const AUTH_STORAGE_KEY = 'rl_auth_v1';
const DEVICE_ID_KEY = 'rl_device_id_v1';
const LEGACY_DEVICE_ID_KEY = 'rl-device-id';

export interface AuthStorage {
  role: UserRole;
  accessToken?: string;
  campId?: string;
  exp?: number;
  // v2 identity model
  deviceId: string; // scoped actor id from JWT (defaults to baseDeviceId when no token)
  baseDeviceId: string; // stable installation id
  personId?: string;
  accountId?: string;
  legacyRoleOwner?: UserRole;
  legacyMigrated?: boolean;
  /** True when the stored token was expired and cleared on load */
  _expired?: boolean;
}

type TokenClaims = {
  exp?: number;
  role?: string;
  deviceId?: string;
  baseDeviceId?: string;
  personId?: string;
  accountId?: string;
  legacyOwnerRole?: string;
};

function normalizeRole(input: unknown): UserRole {
  const raw = typeof input === 'string' ? input : '';
  if (raw === 'organizer') return 'shift_leader';
  if ((['traveler', 'participant', 'parent', 'counselor', 'educator', 'shift_leader', 'camp_director', 'developer'] as const).includes(raw as UserRole)) {
    return raw as UserRole;
  }
  return DEFAULT_ROLE;
}

function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function decodeTokenClaims(token: string | undefined): TokenClaims {
  if (!token) return {};
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (payload.length % 4)) % 4;
    const padded = payload + '='.repeat(padLength);
    const json = atob(padded);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      exp: typeof parsed.exp === 'number' ? parsed.exp : undefined,
      role: typeof parsed.role === 'string' ? parsed.role : undefined,
      deviceId: typeof parsed.deviceId === 'string' ? parsed.deviceId : undefined,
      baseDeviceId: typeof parsed.baseDeviceId === 'string' ? parsed.baseDeviceId : undefined,
      personId: typeof parsed.personId === 'string' ? parsed.personId : undefined,
      accountId: typeof parsed.accountId === 'string' ? parsed.accountId : undefined,
      legacyOwnerRole: typeof parsed.legacyOwnerRole === 'string' ? parsed.legacyOwnerRole : undefined,
    };
  } catch {
    return {};
  }
}

function getOrCreateBaseDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // Legacy migration: older code used rl-device-id.
    const legacy = localStorage.getItem(LEGACY_DEVICE_ID_KEY);
    if (legacy) {
      id = legacy;
    } else {
      id = generateDeviceId();
    }
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function normalizeLegacyRoleOwner(input: unknown): UserRole | undefined {
  const role = normalizeRole(input);
  if (role === 'traveler') return undefined;
  return role;
}

export function loadAuthStorage(): AuthStorage {
  if (typeof window === 'undefined') {
    return { role: DEFAULT_ROLE, deviceId: '', baseDeviceId: '' };
  }

  const baseDeviceId = getOrCreateBaseDeviceId();
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { role: DEFAULT_ROLE, deviceId: baseDeviceId, baseDeviceId };
    }

    const data = JSON.parse(raw) as Partial<AuthStorage>;
    const tokenClaims = decodeTokenClaims(data.accessToken);
    const role = normalizeRole(data.role ?? tokenClaims.role);
    const exp = typeof data.exp === 'number' ? data.exp : tokenClaims.exp;
    const expired = exp != null && exp * 1000 < Date.now();
    if (expired) {
      clearAuthStorage();
      return { role: DEFAULT_ROLE, deviceId: baseDeviceId, baseDeviceId, _expired: true };
    }

    const scopedDeviceId = (data.deviceId || tokenClaims.deviceId || baseDeviceId).trim();
    const resolvedBaseDeviceId = (data.baseDeviceId || tokenClaims.baseDeviceId || baseDeviceId).trim() || baseDeviceId;
    const personId = (data.personId || tokenClaims.personId || '').trim() || undefined;
    const accountId = (data.accountId || tokenClaims.accountId || '').trim() || undefined;
    const legacyRoleOwner = normalizeLegacyRoleOwner(data.legacyRoleOwner ?? tokenClaims.legacyOwnerRole);

    return {
      role,
      accessToken: data.accessToken,
      campId: data.campId,
      exp,
      deviceId: scopedDeviceId || resolvedBaseDeviceId,
      baseDeviceId: resolvedBaseDeviceId,
      personId,
      accountId,
      legacyRoleOwner,
      legacyMigrated: data.legacyMigrated === true,
    };
  } catch {
    return { role: DEFAULT_ROLE, deviceId: baseDeviceId, baseDeviceId };
  }
}

export function saveAuthStorage(data: Partial<AuthStorage>): void {
  if (typeof window === 'undefined') return;
  const current = loadAuthStorage();
  const hasIncomingToken = Object.prototype.hasOwnProperty.call(data, 'accessToken');
  const resolvedToken = hasIncomingToken ? data.accessToken : current.accessToken;
  const tokenClaims = decodeTokenClaims(resolvedToken);
  const keepCurrentIdentity = !hasIncomingToken || !resolvedToken;

  const nextRole = normalizeRole(data.role ?? tokenClaims.role ?? current.role);
  const nextBaseDeviceId = (
    data.baseDeviceId ||
    tokenClaims.baseDeviceId ||
    current.baseDeviceId ||
    getOrCreateBaseDeviceId()
  ).trim();

  let nextDeviceId = (
    data.deviceId ||
    tokenClaims.deviceId ||
    (keepCurrentIdentity ? current.deviceId : '') ||
    nextBaseDeviceId
  ).trim();

  if (!data.accessToken && !current.accessToken) {
    nextDeviceId = nextBaseDeviceId;
  }
  if (!data.accessToken && data.role) {
    // Manual role switch before token exchange: keep actor id at base device.
    nextDeviceId = nextBaseDeviceId;
  }

  const next: AuthStorage = {
    role: nextRole,
    accessToken: resolvedToken,
    campId: data.campId ?? current.campId,
    exp: data.exp ?? tokenClaims.exp ?? current.exp,
    deviceId: nextDeviceId || nextBaseDeviceId,
    baseDeviceId: nextBaseDeviceId,
    personId:
      (data.personId ?? tokenClaims.personId ?? (keepCurrentIdentity ? current.personId : undefined))?.trim() ||
      undefined,
    accountId:
      (data.accountId ?? tokenClaims.accountId ?? (keepCurrentIdentity ? current.accountId : undefined))?.trim() ||
      undefined,
    legacyRoleOwner:
      normalizeLegacyRoleOwner(data.legacyRoleOwner) ??
      normalizeLegacyRoleOwner(tokenClaims.legacyOwnerRole) ??
      current.legacyRoleOwner ??
      undefined,
    legacyMigrated: data.legacyMigrated ?? current.legacyMigrated ?? false,
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getBaseDeviceId(): string {
  return getOrCreateBaseDeviceId();
}

// Backward-compatible alias (returns base installation device id).
export function getDeviceId(): string {
  return getOrCreateBaseDeviceId();
}

export function markLegacyProgressMigrated(): void {
  saveAuthStorage({ legacyMigrated: true });
}

let _on401: (() => void) | null = null;
export function setOn401(fn: (() => void) | null): void {
  _on401 = fn;
}
export function fireOn401(): void {
  _on401?.();
}

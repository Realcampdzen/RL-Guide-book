function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal
    ? ''
    : (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
}

export interface AuthProfilePatchPayload {
  nickname?: string;
  avatar_url?: string;
}

export async function syncAuthProfile(
  accessToken: string,
  payload: AuthProfilePatchPayload
): Promise<void> {
  if (!accessToken) return;

  const body: Record<string, string> = {};
  if (typeof payload.nickname === 'string') body.nickname = payload.nickname.trim();
  if (typeof payload.avatar_url === 'string') body.avatar_url = payload.avatar_url.trim();
  if (!('nickname' in body) && !('avatar_url' in body)) return;

  const res = await fetch(`${getApiBase()}/api/auth/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = typeof data?.error === 'string' ? data.error : 'Failed to sync profile';
    throw new Error(message);
  }
}

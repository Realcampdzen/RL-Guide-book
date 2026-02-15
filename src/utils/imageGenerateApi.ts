/**
 * Client for POST /api/images/generate (universal image generate/process for LK sections).
 * See .memory-bank/tech_context.md § POST /api/images/generate.
 */
import { getDeviceId } from './authStorage';

export interface RequestImageGenerateOptions {
  mode: 'generate' | 'process';
  context: string;
  prompt?: string;
  imageBase64?: string;
  teamId?: string;
  teamName?: string;
  captainName?: string;
  style?: string;
}

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

/** Error response body from POST /api/images/generate (429/503 etc.) */
interface ImageGenerateErrorBody {
  error?: string;
  hint?: string;
  retryAfter?: number;
}

function hasCyrillic(s: string): boolean {
  return /[\u0400-\u04FF]/.test(s);
}

function userMessageFromStatus(status: number, data: ImageGenerateErrorBody): string {
  const err = (data?.error || '').trim();
  if (status === 429) {
    const base = hasCyrillic(err) ? err : 'Слишком много запросов.';
    const hint =
      typeof data?.retryAfter === 'number'
        ? data.retryAfter === 60
          ? ' Можно повторить через минуту.'
          : ` Повторите через ${Math.ceil(data.retryAfter / 60)} мин.`
        : '';
    return base + hint;
  }
  if (status === 503) {
    const hintStr = (data?.hint || '').trim();
    if (hasCyrillic(err)) {
      return hintStr ? `${err}. ${hintStr}` : err;
    }
    const mapped =
      err === 'Image generation not configured'
        ? 'Генерация изображений не настроена.'
        : err === 'Image generation failed'
          ? 'Не удалось сгенерировать изображение.'
          : err
            ? err
            : null;
    const base = mapped || 'Генерация изображений временно недоступна.';
    const suffix = hintStr ? ` ${hintStr}` : ' Можно загрузить своё фото или повторить позже.';
    return base + suffix;
  }
  const base =
    data?.error ||
    (status === 401 ? 'Требуется вход в аккаунт' : null) ||
    (status === 403 ? 'Нет доступа' : null) ||
    (status === 501 ? 'Обработка изображений пока не поддерживается' : null) ||
    'Ошибка запроса';
  return base;
}

/** Strip data URL prefix to get raw base64 for API */
function toRawBase64(dataUrlOrBase64: string): string {
  const s = (dataUrlOrBase64 || '').trim();
  const i = s.indexOf('base64,');
  return i >= 0 ? s.slice(i + 7) : s;
}

/**
 * Calls POST /api/images/generate. Returns data URL of the image (with data: prefix if needed).
 * Throws on non-2xx with a user-facing message.
 */
export async function requestImageGenerate(
  options: RequestImageGenerateOptions,
  accessToken: string | null,
  apiBase?: string
): Promise<string> {
  const base = apiBase ?? getApiBase();
  const url = `${base}/api/images/generate`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    const devId = getDeviceId();
    if (devId) headers['X-Device-Id'] = devId;
  }
  const body: Record<string, unknown> = {
    mode: options.mode,
    context: options.context,
    prompt: (options.prompt ?? '').trim(),
    imageBase64: options.mode === 'process' ? toRawBase64(options.imageBase64 ?? '') : ''
  };
  if (options.context === 'gerb') {
    if (options.teamId) body.teamId = options.teamId;
    if (options.teamName) body.teamName = options.teamName;
    if (options.captainName) body.captainName = options.captainName;
    if (options.style) body.style = options.style;
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string; hint?: string; retryAfter?: number; imageBase64?: string };

  if (!res.ok) {
    throw new Error(userMessageFromStatus(res.status, data));
  }

  const b64 = data.imageBase64;
  if (!b64 || typeof b64 !== 'string') throw new Error('Некорректный ответ сервера');
  return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
}

/** Map ImageSourceBlock context id to backend context string */
export const IMAGE_CONTEXT_TO_BACKEND: Record<string, string> = {
  squad_photo: 'squad_corner',
  wing_avatar: 'wing',
  passport_avatar: 'passport',
  workshop_badge: 'workshop',
  team_flag: 'team_flag',
  gerb: 'gerb'
};

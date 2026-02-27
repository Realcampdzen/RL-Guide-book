import type { SquadCorner } from './badgeApprovalApi';

export type SquadCornerReadiness = 'empty' | 'partial' | 'ready';

export interface NormalizedSquadCorner {
  name?: string;
  motto?: string;
  chants?: string;
  greeting?: string;
  memes?: string;
  photoCorner?: string;
  photoFlag?: string;
  photoSquad?: string;
  photoWithCounselors?: string;
}

const TEXT_KEYS: Array<keyof NormalizedSquadCorner> = ['name', 'motto', 'chants', 'greeting', 'memes'];
const PHOTO_KEYS: Array<keyof NormalizedSquadCorner> = ['photoCorner', 'photoFlag', 'photoSquad', 'photoWithCounselors'];

const isImageLike = (v?: string): boolean => !!v && (v.startsWith('data:') || v.startsWith('http'));

export function normalizeSquadCorner(input?: Partial<SquadCorner> | null): NormalizedSquadCorner {
  const safe = (input || {}) as Record<string, unknown>;
  const out: NormalizedSquadCorner = {};
  for (const key of [...TEXT_KEYS, ...PHOTO_KEYS]) {
    const raw = safe[key as string];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (PHOTO_KEYS.includes(key)) {
      if (isImageLike(trimmed)) out[key] = trimmed;
      continue;
    }
    out[key] = trimmed;
  }
  return out;
}

export function getSquadCornerReadiness(input?: Partial<SquadCorner> | null): SquadCornerReadiness {
  const normalized = normalizeSquadCorner(input);
  const textCount = TEXT_KEYS.filter((k) => Boolean(normalized[k])).length;
  const photoCount = PHOTO_KEYS.filter((k) => Boolean(normalized[k])).length;

  if (textCount === 0 && photoCount === 0) return 'empty';
  if (textCount >= 2 && photoCount >= 1) return 'ready';
  return 'partial';
}

export function getSquadCornerReadinessLabel(readiness: SquadCornerReadiness): string {
  switch (readiness) {
    case 'ready': return 'Уголок готов';
    case 'partial': return 'Уголок частично заполнен';
    default: return 'Уголок пуст';
  }
}

export function getSquadCornerReadinessTone(readiness: SquadCornerReadiness): 'muted' | 'warn' | 'success' {
  switch (readiness) {
    case 'ready': return 'success';
    case 'partial': return 'warn';
    default: return 'muted';
  }
}

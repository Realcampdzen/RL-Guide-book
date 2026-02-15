export const BADGE_STATUS_LIMIT = 3;
export const MAX_BADGE_AI_SKINS = BADGE_STATUS_LIMIT;
export const MAX_BADGE_APPROVED_ARTS = BADGE_STATUS_LIMIT;

const AI_SKIN_PREFIX = 'ai:';
const AI_SKIN_RE = /^ai:(\d+)$/;
const APPROVED_ART_PREFIX = 'approved:';
const APPROVED_ART_RE = /^approved:(\d+)$/;

export const isDataOrUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return value.startsWith('data:') || value.startsWith('http') || value.startsWith('/');
};

export const getAiSkinId = (slotIndex: number): string => {
  return `${AI_SKIN_PREFIX}${slotIndex + 1}`;
};

export const parseAiSkinSlotIndex = (skinId: unknown): number | null => {
  if (typeof skinId !== 'string') return null;
  const match = AI_SKIN_RE.exec(skinId.trim());
  if (!match) return null;
  const rawSlot = Number(match[1]);
  if (!Number.isInteger(rawSlot)) return null;
  if (rawSlot < 1 || rawSlot > MAX_BADGE_AI_SKINS) return null;
  return rawSlot - 1;
};

export const isAiSkinId = (skinId: unknown): boolean => {
  return parseAiSkinSlotIndex(skinId) !== null;
};

export const getApprovedArtSkinId = (slotIndex: number): string => {
  return `${APPROVED_ART_PREFIX}${slotIndex + 1}`;
};

export const parseApprovedArtSkinSlotIndex = (skinId: unknown): number | null => {
  if (typeof skinId !== 'string') return null;
  const match = APPROVED_ART_RE.exec(skinId.trim());
  if (!match) return null;
  const rawSlot = Number(match[1]);
  if (!Number.isInteger(rawSlot)) return null;
  if (rawSlot < 1 || rawSlot > MAX_BADGE_APPROVED_ARTS) return null;
  return rawSlot - 1;
};

export const isApprovedArtSkinId = (skinId: unknown): boolean => {
  return parseApprovedArtSkinSlotIndex(skinId) !== null;
};

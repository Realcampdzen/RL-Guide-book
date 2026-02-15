import type { Badge, Category } from '../types/guide';

type AiDataCache = {
  version: string;
  cachedAt: string;
  categories: Category[];
  // badges can be partial when we load data lazily (per category / per badge)
  badges: Badge[];
  // optional metadata for lazy-load flows
  loadedCategoryIds?: string[];
};

const STORAGE_KEY = 'rl-guide-ai-data-cache';

const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__rl_cache_test__';
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const readAiDataCache = (version: string): AiDataCache | null => {
  if (!isStorageAvailable()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiDataCache;
    if (!parsed || parsed.version !== version) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeAiDataCache = (version: string, payload: { categories: Category[]; badges: Badge[] }): void => {
  if (!isStorageAvailable()) return;
  try {
    const loadedCategoryIds = Array.from(
      new Set(payload.badges.map((b) => String(b.category_id || '')).filter(Boolean))
    );
    const data: AiDataCache = {
      version,
      cachedAt: new Date().toISOString(),
      categories: payload.categories,
      badges: payload.badges,
      loadedCategoryIds,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore cache write errors.
  }
};

export const clearAiDataCache = (): void => {
  if (!isStorageAvailable()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore cache clear errors.
  }
};

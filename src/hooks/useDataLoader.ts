import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Badge, Category } from '../types/guide';
import { readAiDataCache, writeAiDataCache } from '../utils/dataCache';
import { cleanHtmlContent, markdownToHtml } from '../utils/markdown';

type MasterCategory = {
  id: string;
  title: string;
  emoji?: string;
  path: string;
  badges?: number;
};

type MasterIndex = {
  version?: string;
  lastUpdated?: string;
  totalCategories?: number;
  totalBadges?: number;
  totalLevels?: number;
  categories: MasterCategory[];
};

export type MasterIndexMeta = {
  totalCategories: number;
  totalBadges: number;
  totalLevels: number;
  lastUpdated: string;
  version?: string;
} | null;

type CategoryIndex = {
  levels?: number;
  totalLevels?: number;
  badgesData?: Array<{ id: string }>;
  additional_materials?: Category['additional_materials'];
};

type AiBadge = {
  id: string;
  title: string;
  emoji?: string;
  description?: string;
  criteria?: string | string[];
  confirmation?: string | string[];
  nameExplanation?: string;
  skillTips?: string;
  examples?: string;
  importance?: string;
  philosophy?: string;
  howToBecome?: string;
  levels?: Array<{
    id: string;
    level?: string | number;
    title?: string;
    emoji?: string;
    criteria?: string | string[];
    confirmation?: string | string[];
  }>;
};

const MASTER_URL = '/RL-Guide-book/ai-data/MASTER_INDEX.json';
const CATEGORY_INTRO_URL = (categoryId: string) => `/RL-Guide-book/ai-data/category-${categoryId}/introduction.md`;
const CATEGORY_INDEX_URL = (path: string) => `/RL-Guide-book/ai-data/${path}index.json`;
const BADGE_URL = (path: string, id: string) => `/RL-Guide-book/ai-data/${path}${id}.json`;
const CUSTOM_BADGES_KEY = 'rl_custom_badges_v1';
const COMMUNITY_BADGES_CACHE_KEY = 'rl_community_badges_cache_v1';
const COMMUNITY_PUBLISH_QUEUE_KEY = 'rl_community_publish_queue_v1';
const COMMUNITY_LIKES_KEY = 'rl_community_badge_likes_v1';
const COMMUNITY_API_URL = '/api/community/badges';
const BRO_MISSIONS_API_URL = '/api/bro-missions';

function getCommunityPublishQueue(): Array<{ badge: Badge; timestamp: number }> {
  try {
    const raw = localStorage.getItem(COMMUNITY_PUBLISH_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setCommunityPublishQueue(queue: Array<{ badge: Badge; timestamp: number }>): void {
  try {
    localStorage.setItem(COMMUNITY_PUBLISH_QUEUE_KEY, JSON.stringify(queue));
  } catch (_) { /* ignore */ }
}

function getCommunityLikes(): Set<string> {
  try {
    const raw = localStorage.getItem(COMMUNITY_LIKES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function setCommunityLikes(ids: Set<string>): void {
  try {
    localStorage.setItem(COMMUNITY_LIKES_KEY, JSON.stringify([...ids]));
  } catch (_) { /* ignore */ }
}

const canonicalizeLevel = (lvl: unknown): string => {
  const raw = String(lvl ?? '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (low === '1' || low === '\u0431\u0430\u0437\u043e\u0432\u044b\u0439' || low === '\u0431\u0430\u0437\u043e\u0432\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c') return '\u0411\u0430\u0437\u043e\u0432\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c';
  if (low === '2' || low === '\u043f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439' || low === '\u043f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c') return '\u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c';
  if (low === '3' || low === '\u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u044b\u0439' || low === '\u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c' || low === '\u0432\u043e\u0436\u0430\u0442\u0441\u043a\u0438\u0439' || low === '\u0432\u043e\u0436\u0430\u0442\u0441\u043a\u0438\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c') {
    return '\u042d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c';
  }
  return raw;
};

const getFallbackEmojiFor = (categoryId: string): string => {
  switch (categoryId) {
    case '12':
      return '\u{1f916}';
    case '11':
      return '\u{1f575}\ufe0f';
    case '14':
      return '\u2b50';
    default:
      return '\u2728';
  }
};

const normalizeListField = (raw: unknown): string => {
  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s).trim())
      .filter(Boolean)
      .map((s) => `\u2022 ${s}`)
      .join('\n');
  }
  return typeof raw === 'string' ? raw : '';
};

const resolveEmoji = (raw: unknown, fallback: string): string => {
  if (typeof raw === 'string' && raw.replace(/\?/g, '').trim().length > 0) return raw;
  return fallback;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

const getDataVersion = (master: MasterIndex): string => {
  return master.version || master.lastUpdated || 'unknown';
};

const baseBadgeIdFrom = (id: string): string => {
  const parts = String(id || '').split('.');
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return String(id || '');
};

const countLoadedBaseBadges = (categoryId: string, items: Badge[]): number => {
  const set = new Set<string>();
  items.forEach((b) => {
    if (String(b.category_id || '') !== String(categoryId)) return;
    const baseId = baseBadgeIdFrom(b.id || '');
    if (baseId) set.add(baseId);
  });
  return set.size;
};

const buildBadgeEntries = (aiCategory: MasterCategory, aiBadge: AiBadge): Badge[] => {
  const fallbackEmoji = getFallbackEmojiFor(aiCategory.id);

  if (aiBadge.levels && aiBadge.levels.length) {
    return aiBadge.levels.map((level) => {
      const criteriaText = normalizeListField(level.criteria);
      const confirmationText = normalizeListField(level.confirmation);
      return {
        id: level.id,
        title: level.title || aiBadge.title, // Используем название уровня, если оно есть
        emoji: resolveEmoji(level.emoji ?? aiBadge.emoji, fallbackEmoji),
        category_id: aiCategory.id,
        level: canonicalizeLevel(level.level ?? level),
        description: aiBadge.description,
        criteria: criteriaText,
        confirmation: confirmationText,
        nameExplanation: aiBadge.nameExplanation,
        skillTips: aiBadge.skillTips,
        examples: aiBadge.examples,
        importance: aiBadge.importance,
        philosophy: aiBadge.philosophy,
        howToBecome: aiBadge.howToBecome,
      };
    });
  }

  const criteriaText = normalizeListField(aiBadge.criteria);
  const confirmationText = normalizeListField(aiBadge.confirmation);
  return [
    {
      id: aiBadge.id,
      title: aiBadge.title,
      emoji: resolveEmoji(aiBadge.emoji, fallbackEmoji),
      category_id: aiCategory.id,
      level: '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435',
      description: aiBadge.description,
      criteria: criteriaText,
      confirmation: confirmationText,
      nameExplanation: aiBadge.nameExplanation,
      skillTips: aiBadge.skillTips,
      examples: aiBadge.examples,
      importance: aiBadge.importance,
      philosophy: aiBadge.philosophy,
      howToBecome: aiBadge.howToBecome,
    },
  ];
};

export const useDataLoader = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);
  const [communityBadges, setCommunityBadges] = useState<Badge[]>([]);
  const [communityPendingCount, setCommunityPendingCount] = useState(0);
  const [communitySyncing, setCommunitySyncing] = useState(false);
  const [communityLikedIds, setCommunityLikedIds] = useState<Set<string>>(() => getCommunityLikes());
  const [dynamicBroMissions, setDynamicBroMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryBadgeLoadState, setCategoryBadgeLoadState] = useState<
    Record<string, 'idle' | 'loading' | 'loaded' | 'error'>
  >({});
  const [categoryBadgeLoadError, setCategoryBadgeLoadError] = useState<Record<string, string | undefined>>({});
  const [masterIndex, setMasterIndex] = useState<MasterIndexMeta>(null);

  const masterRef = useRef<MasterIndex | null>(null);
  const versionRef = useRef<string>('unknown');
  const inflightControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Load community badges: first from localStorage (cache), then from API; write back to cache on success
  const syncCommunityBadges = useCallback(async () => {
    const cached = localStorage.getItem(COMMUNITY_BADGES_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Badge[];
        if (Array.isArray(parsed) && parsed.length >= 0) setCommunityBadges(parsed.slice(0, 10));
      } catch (_) { /* ignore */ }
    }
    try {
      const res = await fetch(COMMUNITY_API_URL);
      if (res.ok) {
        const data = await res.json();
        const list = (Array.isArray(data) ? data : []).slice(0, 10);
        setCommunityBadges(list);
        try {
          localStorage.setItem(COMMUNITY_BADGES_CACHE_KEY, JSON.stringify(list));
        } catch (_) { /* ignore */ }
      }
    } catch (e) {
      console.warn('Failed to sync Incubator:', e);
    }
  }, []);

  // Sync Bro-Missions (Passport)
  const syncBroMissions = useCallback(async () => {
    try {
      const res = await fetch(BRO_MISSIONS_API_URL);
      if (res.ok) {
        const data = await res.json();
        setDynamicBroMissions(data);
      }
    } catch (e) {
      console.warn('Failed to sync Bro-Missions:', e);
    }
  }, []);

  const updateBroMissionsOnServer = useCallback(async (missions: any[]) => {
    try {
      const res = await fetch(BRO_MISSIONS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missions)
      });
      if (res.ok) {
        setDynamicBroMissions(missions);
        return true;
      }
    } catch (e) {
      console.error('Failed to update Bro-Missions:', e);
    }
    return false;
  }, []);

  useEffect(() => {
    void syncCommunityBadges();
    void syncBroMissions();
  }, [syncCommunityBadges, syncBroMissions]);

  // Load custom badges from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CUSTOM_BADGES_KEY);
    if (stored) {
      try {
        setCustomBadges(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse custom badges', e);
      }
    }
  }, []);

  const allBadges = useMemo(() => {
    // Unique by ID
    const map = new Map<string, Badge>();
    badges.forEach(b => map.set(b.id, b));
    communityBadges.forEach(b => map.set(b.id, b));
    customBadges.forEach(b => map.set(b.id, b));
    return Array.from(map.values());
  }, [badges, customBadges, communityBadges]);

  const addCustomBadge = useCallback((badge: Badge) => {
    setCustomBadges(prev => {
      const updated = [...prev, badge];
      localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const restoreCustomBadges = useCallback((badges: Badge[]) => {
    const list = Array.isArray(badges) ? badges : [];
    setCustomBadges(list);
    try {
      localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(list));
    } catch (_) { /* ignore */ }
  }, []);

  const removeCustomBadge = useCallback((badgeId: string) => {
    setCustomBadges(prev => {
      const updated = prev.filter(b => b.id !== badgeId);
      if (updated.length !== prev.length) {
        try {
          localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(updated));
        } catch (_) { /* ignore */ }
      }
      return updated;
    });
  }, []);

  const processCommunityQueue = useCallback(async () => {
    const queue = getCommunityPublishQueue();
    if (queue.length === 0) return;
    setCommunitySyncing(true);
    const remaining: Array<{ badge: Badge; timestamp: number }> = [];
    for (const { badge, timestamp } of queue) {
      try {
        const res = await fetch(COMMUNITY_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badge)
        });
        if (!res.ok) remaining.push({ badge, timestamp });
      } catch (_) {
        remaining.push({ badge, timestamp });
      }
    }
    setCommunityPublishQueue(remaining);
    setCommunityPendingCount(remaining.length);
    setCommunitySyncing(false);
    void syncCommunityBadges();
  }, [syncCommunityBadges]);

  useEffect(() => {
    setCommunityPendingCount(getCommunityPublishQueue().length);
  }, []);

  useEffect(() => {
    const onOnline = () => void processCommunityQueue();
    window.addEventListener('online', onOnline);
    if (typeof navigator !== 'undefined' && navigator.onLine) void processCommunityQueue();
    return () => window.removeEventListener('online', onOnline);
  }, [processCommunityQueue]);

  const toggleCommunityLike = useCallback((badgeId: string) => {
    setCommunityLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(badgeId)) next.delete(badgeId);
      else next.add(badgeId);
      setCommunityLikes(next);
      return next;
    });
  }, []);

  const publishBadgeToCommunity = useCallback(async (badge: Badge): Promise<{ ok: boolean; queued?: boolean; error?: string; status?: number }> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queue = getCommunityPublishQueue();
      queue.push({ badge, timestamp: Date.now() });
      setCommunityPublishQueue(queue);
      setCommunityPendingCount(queue.length);
      return { ok: true, queued: true };
    }
    try {
      const res = await fetch(COMMUNITY_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badge)
      });
      if (res.ok) {
        void syncCommunityBadges();
        void processCommunityQueue();
        return { ok: true };
      }
      const status = res.status;
      let error = '';
      try {
        const data = await res.json();
        error = (data && typeof data.error === 'string') ? data.error : '';
      } catch {
        // non-JSON response
      }
      if (!error && status === 429) error = 'Слишком много отправок. Подождите минуту.';
      if (!error && status >= 500) error = 'Ошибка сервера. Попробуйте позже.';
      if (!error && status >= 400) error = error || 'Не удалось отправить. Проверьте подключение.';
      return { ok: false, status, error };
    } catch (e) {
      console.error('Failed to publish badge:', e);
      return { ok: false, error: 'Проверьте подключение к интернету.' };
    }
  }, [syncCommunityBadges, processCommunityQueue]);

  // Master-derived map (categoryId -> path). We keep it in a ref-derived memo so it stays stable
  // after master is loaded, without needing to load all category indexes on startup.
  const categoryPathById = useMemo(() => {
    const master = masterRef.current;
    const map = new Map<string, string>();
    if (!master) return map;
    master.categories.forEach((c) => map.set(c.id, c.path));
    return map;
  }, [categories.length]);

  const loadCategoryIntroduction = useCallback(async (categoryId: string) => {
    try {
      const res = await fetch(CATEGORY_INTRO_URL(categoryId));
      if (!res.ok) return null;
      const md = await res.text();
      const html = markdownToHtml(md);
      const cleaned = cleanHtmlContent(html);
      return { html: cleaned, markdown: md };
    } catch (e) {
      console.error('App: failed to load introduction.md for category', categoryId, e);
      return null;
    }
  }, []);

  const mergeBadges = useCallback((incoming: Badge[]) => {
    if (!incoming.length) return;
    setBadges((prev) => {
      const seen = new Set(prev.map((b) => b.id));
      const merged = prev.slice();
      for (const b of incoming) {
        if (seen.has(b.id)) continue;
        merged.push(b);
        seen.add(b.id);
      }
      return merged;
    });
  }, []);

  const getLoadedCategoryIds = useCallback(() => {
    return Object.entries(categoryBadgeLoadState)
      .filter(([, state]) => state === 'loaded')
      .map(([id]) => id);
  }, [categoryBadgeLoadState]);

  const ensureCategoryBadgesLoaded = useCallback(async (categoryId: string): Promise<void> => {
    const master = masterRef.current;
    const path = categoryPathById.get(categoryId);
    if (!master || !path) {
      setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'error' }));
      return;
    }

    const expected =
      categories.find((c) => c.id === categoryId)?.expected_badges ||
      categories.find((c) => c.id === categoryId)?.badge_count ||
      master.categories.find((c) => c.id === categoryId)?.badges ||
      0;
    const loadedCount = countLoadedBaseBadges(categoryId, badges);

    // Don't refetch if already loading/loaded and complete.
    const cur = categoryBadgeLoadState[categoryId];
    if (cur === 'loading' || (cur === 'loaded' && expected > 0 && loadedCount >= expected)) return;

    setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'loading' }));

    const requestKey = `cat:${categoryId}`;
    if (inflightControllersRef.current.has(requestKey)) return;
    const ctrl = new AbortController();
    inflightControllersRef.current.set(requestKey, ctrl);

    try {
      const aiCategory = master.categories.find((c) => c.id === categoryId);
      if (!aiCategory) throw new Error(`Unknown category ${categoryId}`);

      const catIndex = await fetchJson<CategoryIndex>(CATEGORY_INDEX_URL(path));
      const badgeIds = (catIndex.badgesData || []).map((b) => b.id).filter(Boolean);

      // update category metadata (badge count + materials)
      const badgeCount = badgeIds.length || aiCategory.badges || 0;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                badge_count: badgeCount,
                expected_badges: badgeCount,
                additional_materials: catIndex.additional_materials,
              }
            : c
        )
      );

      const allEntries: Badge[] = [];
      const batches = chunk(badgeIds, 20);
      for (const batch of batches) {
        const results = await Promise.all(
          batch.map(async (badgeBaseId) => {
            try {
              const res = await fetch(BADGE_URL(path, badgeBaseId), { signal: ctrl.signal });
              if (!res.ok) throw new Error(`Failed to fetch ${badgeBaseId}: ${res.status}`);
              const aiBadge = (await res.json()) as AiBadge;
              return buildBadgeEntries(aiCategory, aiBadge);
            } catch (e) {
              if ((e as any)?.name !== 'AbortError') {
                console.error('App: failed to load badge data', path, badgeBaseId, e);
              }
              return null;
            }
          })
        );
        results.forEach((r) => {
          if (!r) return;
          allEntries.push(...r);
        });
      }

      mergeBadges(allEntries);
      const loadedCategoryIds = Array.from(new Set([...getLoadedCategoryIds(), categoryId]));
      writeAiDataCache(
        versionRef.current,
        { categories, badges: [...badges, ...allEntries] },
        loadedCategoryIds
      );

      setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'loaded' }));
      setCategoryBadgeLoadError((prev) => ({ ...prev, [categoryId]: undefined }));
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.error('App: Error loading category badges', categoryId, e);
      }
      setCategoryBadgeLoadError((prev) => ({ ...prev, [categoryId]: (e as Error)?.message || String(e) }));
      setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'error' }));
    } finally {
      inflightControllersRef.current.delete(requestKey);
    }
  }, [badges, categories, categoryBadgeLoadState, categoryPathById, mergeBadges, getLoadedCategoryIds]);

  const ensureBadgeLoaded = useCallback(async (badgeId: string): Promise<Badge[] | null> => {
    // Check custom badges first
    const custom = customBadges.filter(b => b.id === badgeId || b.id === baseBadgeIdFrom(badgeId));
    if (custom.length) return custom;

    const master = masterRef.current;
    if (!master) return null;
    const categoryId = String(badgeId || '').split('.')[0];
    const path = categoryPathById.get(categoryId);
    if (!path) return null;

    const baseId = baseBadgeIdFrom(badgeId);
    const requestKey = `badge:${categoryId}:${baseId}`;
    if (inflightControllersRef.current.has(requestKey)) return null;
    const ctrl = new AbortController();
    inflightControllersRef.current.set(requestKey, ctrl);

    try {
      const aiCategory = master.categories.find((c) => c.id === categoryId);
      if (!aiCategory) return null;

      const res = await fetch(BADGE_URL(path, baseId), { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Failed to fetch ${baseId}: ${res.status}`);
      const aiBadge = (await res.json()) as AiBadge;
      const entries = buildBadgeEntries(aiCategory, aiBadge);
      mergeBadges(entries);
      writeAiDataCache(versionRef.current, { categories, badges: [...badges, ...entries] }, getLoadedCategoryIds());
      return entries;
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.error('App: failed to load badge data', path, baseId, e);
      }
      return null;
    } finally {
      inflightControllersRef.current.delete(requestKey);
    }
  }, [badges, categories, categoryPathById, mergeBadges, getLoadedCategoryIds]);

  const loadDataFromAi = useCallback(async () => {
    try {
      setLoading(true);

      const master = await fetchJson<MasterIndex>(MASTER_URL);
      const version = getDataVersion(master);
      masterRef.current = master;
      versionRef.current = version;
      setMasterIndex({
        totalCategories: master.totalCategories ?? master.categories.length,
        totalBadges: master.totalBadges ?? 0,
        totalLevels: master.totalLevels ?? 0,
        lastUpdated: master.lastUpdated ?? '',
        version: master.version
      });
      const cached = readAiDataCache(version);
      if (cached) {
        setCategories(cached.categories);
        setBadges(cached.badges);
        const loadedCategoryIds = cached.categories
          .map((c) => c.id)
          .filter((id) => {
            const category = cached.categories.find((c) => c.id === id);
            const expected = category?.expected_badges || category?.badge_count || 0;
            if (!expected) return false;
            return countLoadedBaseBadges(id, cached.badges) >= expected;
          });
        if (loadedCategoryIds.length) {
          const st: Record<string, 'loaded'> = {};
          loadedCategoryIds.forEach((id) => (st[id] = 'loaded'));
          setCategoryBadgeLoadState(st);
        }
        return;
      }

      const categoriesData: Category[] = [];
      master.categories.forEach((aiCategory) => {
        const badgeCount = aiCategory.badges || 0;
        categoriesData.push({
          id: aiCategory.id,
          title: aiCategory.title,
          emoji: aiCategory.emoji,
          badge_count: badgeCount,
          expected_badges: badgeCount,
          introduction: { has_introduction: true, html: '', markdown: '' },
          additional_materials: undefined,
        });
      });

      setCategories(categoriesData);
      setBadges([]);
      writeAiDataCache(version, { categories: categoriesData, badges: [] });
    } catch (e) {
      console.error('App: Error loading AI data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDataFromAi();
  }, [loadDataFromAi]);

  return {
    categories,
    badges: allBadges,
    customBadges,
    communityBadges,
    communityPendingCount,
    communitySyncing,
    communityLikedIds,
    toggleCommunityLike,
    loading,
    reload: loadDataFromAi,
    loadCategoryIntroduction,
    ensureCategoryBadgesLoaded,
    ensureBadgeLoaded,
    addCustomBadge,
    restoreCustomBadges,
    removeCustomBadge,
    publishBadgeToCommunity,
    dynamicBroMissions,
    updateBroMissionsOnServer,
    categoryBadgeLoadState,
    categoryBadgeLoadError,
    masterIndex,
  };
};

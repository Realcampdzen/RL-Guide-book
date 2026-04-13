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
  categories: MasterCategory[];
};

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
const CATEGORY_INTRO_URL = (categoryId: string) =>
  `/RL-Guide-book/ai-data/category-${categoryId}/introduction.md`;
const CATEGORY_INDEX_URL = (path: string) => `/RL-Guide-book/ai-data/${path}index.json`;
const BADGE_URL = (path: string, id: string) => `/RL-Guide-book/ai-data/${path}${id}.json`;

const canonicalizeLevel = (lvl: unknown): string => {
  const raw = String(lvl ?? '').trim();
  if (!raw) return '';
  const low = raw.toLowerCase();
  if (
    low === '1' ||
    low === '\u0431\u0430\u0437\u043e\u0432\u044b\u0439' ||
    low === '\u0431\u0430\u0437\u043e\u0432\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c'
  )
    return '\u0411\u0430\u0437\u043e\u0432\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c';
  if (
    low === '2' ||
    low === '\u043f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439' ||
    low ===
      '\u043f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c'
  )
    return '\u041f\u0440\u043e\u0434\u0432\u0438\u043d\u0443\u0442\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c';
  if (
    low === '3' ||
    low === '\u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u044b\u0439' ||
    low ===
      '\u044d\u043a\u0441\u043f\u0435\u0440\u0442\u043d\u044b\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c' ||
    low === '\u0432\u043e\u0436\u0430\u0442\u0441\u043a\u0438\u0439' ||
    low ===
      '\u0432\u043e\u0436\u0430\u0442\u0441\u043a\u0438\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c'
  ) {
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

const chunk = <T>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchJson = async <T>(url: string): Promise<T> => {
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
  const [loading, setLoading] = useState(true);
  const [categoryBadgeLoadState, setCategoryBadgeLoadState] = useState<
    Record<string, 'idle' | 'loading' | 'loaded' | 'error'>
  >({});
  const [categoryBadgeLoadError, setCategoryBadgeLoadError] = useState<
    Record<string, string | undefined>
  >({});

  const masterRef = useRef<MasterIndex | null>(null);
  const versionRef = useRef<string>('unknown');
  const inflightControllersRef = useRef<Map<string, AbortController>>(new Map());

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

  const ensureCategoryBadgesLoaded = useCallback(
    async (categoryId: string): Promise<void> => {
      // Don't refetch if already loading/loaded
      const cur = categoryBadgeLoadState[categoryId];
      if (cur === 'loading' || cur === 'loaded') return;

      setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'loading' }));

      const master = masterRef.current;
      const path = categoryPathById.get(categoryId);
      if (!master || !path) {
        setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'error' }));
        return;
      }

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
        writeAiDataCache(versionRef.current, { categories, badges: [...badges, ...allEntries] });

        setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'loaded' }));
        setCategoryBadgeLoadError((prev) => ({ ...prev, [categoryId]: undefined }));
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          console.error('App: Error loading category badges', categoryId, e);
        }
        setCategoryBadgeLoadError((prev) => ({
          ...prev,
          [categoryId]: (e as Error)?.message || String(e),
        }));
        setCategoryBadgeLoadState((prev) => ({ ...prev, [categoryId]: 'error' }));
      } finally {
        inflightControllersRef.current.delete(requestKey);
      }
    },
    [badges, categories, categoryBadgeLoadState, categoryPathById, mergeBadges]
  );

  const ensureBadgeLoaded = useCallback(
    async (badgeId: string): Promise<Badge[] | null> => {
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
        writeAiDataCache(versionRef.current, { categories, badges: [...badges, ...entries] });
        return entries;
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          console.error('App: failed to load badge data', path, baseId, e);
        }
        return null;
      } finally {
        inflightControllersRef.current.delete(requestKey);
      }
    },
    [badges, categories, categoryPathById, mergeBadges]
  );

  const loadDataFromAi = useCallback(async () => {
    try {
      setLoading(true);

      const master = await fetchJson<MasterIndex>(MASTER_URL);
      const version = getDataVersion(master);
      masterRef.current = master;
      versionRef.current = version;
      const cached = readAiDataCache(version);
      if (cached) {
        setCategories(cached.categories);
        setBadges(cached.badges);
        if (cached.loadedCategoryIds?.length) {
          const st: Record<string, 'loaded'> = {};
          cached.loadedCategoryIds.forEach((id) => (st[id] = 'loaded'));
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
    badges,
    loading,
    reload: loadDataFromAi,
    loadCategoryIntroduction,
    ensureCategoryBadgesLoaded,
    ensureBadgeLoaded,
    categoryBadgeLoadState,
    categoryBadgeLoadError,
  };
};

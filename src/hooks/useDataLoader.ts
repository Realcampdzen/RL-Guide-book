import { useCallback, useEffect, useState } from 'react';
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
    emoji?: string;
    criteria?: string | string[];
    confirmation?: string | string[];
  }>;
};

const MASTER_URL = '/RL-Guide-book/ai-data/MASTER_INDEX.json';
const CATEGORY_INTRO_URL = (categoryId: string) => `/RL-Guide-book/ai-data/category-${categoryId}/introduction.md`;
const CATEGORY_INDEX_URL = (path: string) => `/RL-Guide-book/ai-data/${path}index.json`;
const BADGE_URL = (path: string, id: string) => `/RL-Guide-book/ai-data/${path}${id}.json`;

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

const buildBadgeEntries = (aiCategory: MasterCategory, aiBadge: AiBadge): Badge[] => {
  const fallbackEmoji = getFallbackEmojiFor(aiCategory.id);

  if (aiBadge.levels && aiBadge.levels.length) {
    return aiBadge.levels.map((level) => {
      const criteriaText = normalizeListField(level.criteria);
      const confirmationText = normalizeListField(level.confirmation);
      return {
        id: level.id,
        title: aiBadge.title,
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

  const loadDataFromAi = useCallback(async () => {
    try {
      console.log('App: Loading AI data...');
      setLoading(true);

      const master = await fetchJson<MasterIndex>(MASTER_URL);
      const version = getDataVersion(master);
      const cached = readAiDataCache(version);
      if (cached) {
        setCategories(cached.categories);
        setBadges(cached.badges);
        console.log('App: Loaded AI data from cache', cached.categories.length, cached.badges.length);
        return;
      }

      const categoryEntries = await Promise.all(
        master.categories.map(async (aiCategory) => {
          try {
            const catIndex = await fetchJson<CategoryIndex>(CATEGORY_INDEX_URL(aiCategory.path));
            return { aiCategory, catIndex };
          } catch (error) {
            console.error('App: failed to load category index', aiCategory.path, error);
            return null;
          }
        })
      );

      const categoriesData: Category[] = [];
      const badgeRequests: Array<{ aiCategory: MasterCategory; badgeId: string }> = [];

      categoryEntries.forEach((entry) => {
        if (!entry) return;
        const { aiCategory, catIndex } = entry;

        categoriesData.push({
          id: aiCategory.id,
          title: aiCategory.title,
          emoji: aiCategory.emoji,
          badge_count: catIndex.levels || catIndex.totalLevels || aiCategory.badges || 0,
          expected_badges: catIndex.levels || catIndex.totalLevels || aiCategory.badges || 0,
          introduction: { has_introduction: true, html: '', markdown: '' },
          additional_materials: catIndex.additional_materials,
        });

        (catIndex.badgesData || []).forEach((badgeIndex) => {
          badgeRequests.push({ aiCategory, badgeId: badgeIndex.id });
        });
      });

      const badgesData: Badge[] = [];
      const batches = chunk(badgeRequests, 20);

      for (const batch of batches) {
        const results = await Promise.all(
          batch.map(async ({ aiCategory, badgeId }) => {
            try {
              const aiBadge = await fetchJson<AiBadge>(BADGE_URL(aiCategory.path, badgeId));
              return { aiCategory, aiBadge };
            } catch (error) {
              console.error('App: failed to load badge data', aiCategory.path, badgeId, error);
              return null;
            }
          })
        );

        results.forEach((result) => {
          if (!result) return;
          badgesData.push(...buildBadgeEntries(result.aiCategory, result.aiBadge));
        });
      }

      setCategories(categoriesData);
      setBadges(badgesData);
      writeAiDataCache(version, { categories: categoriesData, badges: badgesData });
      console.log('App: AI data loaded:', categoriesData.length, 'categories,', badgesData.length, 'badges');
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
  };
};

import { useCallback, useEffect, useState } from 'react';
import type { Badge } from '../../types/guide';
import { getApiBase } from '../../utils/apiBase';

export const COMMUNITY_API_URL = () => `${getApiBase()}/api/community/badges`;
export const COMMUNITY_BADGES_CACHE_KEY = 'rl_community_badges_cache_v1';
export const COMMUNITY_PUBLISH_QUEUE_KEY = 'rl_community_publish_queue_v1';
export const COMMUNITY_LIKES_KEY = 'rl_community_badge_likes_v1';

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
  } catch (_) {
    /* ignore */
  }
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
  } catch (_) {
    /* ignore */
  }
}

export const useCommunityBadges = () => {
  const [communityBadges, setCommunityBadges] = useState<Badge[]>([]);
  const [communityPendingCount, setCommunityPendingCount] = useState(0);
  const [communitySyncing, setCommunitySyncing] = useState(false);
  const [communityLikedIds, setCommunityLikedIds] = useState<Set<string>>(() =>
    getCommunityLikes()
  );

  const syncCommunityBadges = useCallback(async () => {
    const cached = localStorage.getItem(COMMUNITY_BADGES_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Badge[];
        if (Array.isArray(parsed) && parsed.length >= 0) setCommunityBadges(parsed.slice(0, 10));
      } catch (_) {
        /* ignore */
      }
    }
    try {
      const res = await fetch(COMMUNITY_API_URL());
      if (res.ok) {
        const data = await res.json();
        const list = (Array.isArray(data) ? data : []).slice(0, 10);
        setCommunityBadges(list);
        try {
          localStorage.setItem(COMMUNITY_BADGES_CACHE_KEY, JSON.stringify(list));
        } catch (_) {
          /* ignore */
        }
      }
    } catch (e) {
      console.warn('Failed to sync Incubator:', e);
    }
  }, []);

  const processCommunityQueue = useCallback(async () => {
    const queue = getCommunityPublishQueue();
    if (queue.length === 0) return;
    setCommunitySyncing(true);
    const remaining: Array<{ badge: Badge; timestamp: number }> = [];
    for (const { badge, timestamp } of queue) {
      try {
        const res = await fetch(COMMUNITY_API_URL(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badge),
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
    setCommunityLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(badgeId)) next.delete(badgeId);
      else next.add(badgeId);
      setCommunityLikes(next);
      return next;
    });
  }, []);

  const publishBadgeToCommunity = useCallback(
    async (
      badge: Badge
    ): Promise<{ ok: boolean; queued?: boolean; error?: string; status?: number }> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const queue = getCommunityPublishQueue();
        queue.push({ badge, timestamp: Date.now() });
        setCommunityPublishQueue(queue);
        setCommunityPendingCount(queue.length);
        return { ok: true, queued: true };
      }
      try {
        const res = await fetch(COMMUNITY_API_URL(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(badge),
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
          error = data && typeof data.error === 'string' ? data.error : '';
        } catch {
          // non-JSON response
        }
        if (!error && status === 429) error = 'Слишком много отправок. Подождите минуту.';
        if (!error && status >= 500) error = 'Ошибка сервера. Попробуйте позже.';
        if (!error && status >= 400)
          error = error || 'Не удалось отправить. Проверьте подключение.';
        return { ok: false, status, error };
      } catch (e) {
        console.error('Failed to publish badge:', e);
        return { ok: false, error: 'Проверьте подключение к интернету.' };
      }
    },
    [syncCommunityBadges, processCommunityQueue]
  );

  return {
    communityBadges,
    communityPendingCount,
    communitySyncing,
    communityLikedIds,
    syncCommunityBadges,
    toggleCommunityLike,
    publishBadgeToCommunity,
  };
};

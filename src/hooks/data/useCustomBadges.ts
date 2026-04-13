import { useCallback, useEffect, useState } from 'react';
import type { Badge } from '../../types/guide';

export const CUSTOM_BADGES_KEY = 'rl_custom_badges_v1';

export const useCustomBadges = () => {
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);

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

  const addCustomBadge = useCallback((badge: Badge) => {
    setCustomBadges((prev) => {
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
    } catch (_) {
      /* ignore */
    }
  }, []);

  const removeCustomBadge = useCallback((badgeId: string) => {
    setCustomBadges((prev) => {
      const updated = prev.filter((b) => b.id !== badgeId);
      if (updated.length !== prev.length) {
        try {
          localStorage.setItem(CUSTOM_BADGES_KEY, JSON.stringify(updated));
        } catch (_) {
          /* ignore */
        }
      }
      return updated;
    });
  }, []);

  return {
    customBadges,
    addCustomBadge,
    restoreCustomBadges,
    removeCustomBadge,
  };
};

import React, { createContext, useMemo } from 'react';
import type { Badge } from '../types/guide';
import { useBroMissions } from '../hooks/data/useBroMissions';
import { useCommunityBadges } from '../hooks/data/useCommunityBadges';
import { useCoreBadges } from '../hooks/data/useCoreBadges';
import { useCustomBadges } from '../hooks/data/useCustomBadges';

type DataContextType = ReturnType<typeof useCoreBadges> &
  ReturnType<typeof useCommunityBadges> &
  ReturnType<typeof useCustomBadges> &
  ReturnType<typeof useBroMissions> & {
    badges: Badge[]; // The unified pool
    ensureBadgeLoaded: (badgeId: string) => Promise<Badge[] | null>;
  };

export const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const core = useCoreBadges();
  const community = useCommunityBadges();
  const custom = useCustomBadges();
  const bro = useBroMissions();

  const allBadges = useMemo(() => {
    const map = new Map<string, Badge>();
    core.coreBadges.forEach((b) => map.set(b.id, b));
    community.communityBadges.forEach((b) => map.set(b.id, b));
    custom.customBadges.forEach((b) => map.set(b.id, b));
    return Array.from(map.values());
  }, [core.coreBadges, custom.customBadges, community.communityBadges]);

  const ensureBadgeLoaded = useMemo(() => async (badgeId: string) => {
    return core.getEnsuredBadge(badgeId, custom.customBadges);
  }, [core.getEnsuredBadge, custom.customBadges]);

  const value = useMemo(
    () => ({
      ...core,
      ...community,
      ...custom,
      ...bro,
      badges: allBadges,
      ensureBadgeLoaded,
    }),
    [core, community, custom, bro, allBadges, ensureBadgeLoaded]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

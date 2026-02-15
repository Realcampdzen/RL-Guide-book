import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import {
  IUserData,
  ILevelProgress,
  LevelStatus,
  BadgeLevelId,
  BadgeFavoriteId,
  IUserProfile,
  IBadgePlan,
  BadgePlanStatus,
  BadgeSkinId,
  BadgeArtProposalStatus,
  IBadgeArtProposal,
  ShiftScheduleKey,
  MyActivityKey,
  WingPlanGridData
} from '../types/userProgress';
import {
  getAiSkinId,
  getApprovedArtSkinId,
  isDataOrUrl,
  MAX_BADGE_AI_SKINS,
  MAX_BADGE_APPROVED_ARTS,
  parseAiSkinSlotIndex,
  parseApprovedArtSkinSlotIndex
} from '../utils/badgeSkins';

interface ProgressContextType {
  userData: IUserData;
  isLoading: boolean;
  updateLevelStatus: (levelId: BadgeLevelId, status: LevelStatus, reflection?: string) => void;
  applyApprovedLevel: (levelId: BadgeLevelId, evidence?: { reflection?: string; impact?: string; link?: string } | null) => void;
  updateLevelEvidence: (levelId: BadgeLevelId, evidence: ILevelProgress['evidence']) => void;
  updateBadgeSkin: (badgeBaseId: string, skinId: string) => void;
  setCustomBadgeImage: (badgeBaseId: string, dataUrl: string | null) => void;
  addGeneratedBadgeSkin: (badgeBaseId: string, dataUrl: string) => { ok: true; skinId: string } | { ok: false; reason: 'limit' | 'invalid' };
  removeGeneratedBadgeSkin: (badgeBaseId: string, slotIndex: number) => boolean;
  submitBadgeArtProposal: (proposal: {
    badgeBaseId: string;
    badgeTitle: string;
    categoryId?: string;
    categoryTitle?: string;
    imageUrl: string;
  }) => { ok: true; proposalId: string } | { ok: false; reason: 'invalid' | 'duplicate' };
  approveBadgeArtProposal: (
    proposalId: string,
    moderatorRole?: string
  ) => { ok: true; skinId: string } | { ok: false; reason: 'not_found' | 'limit' };
  rejectBadgeArtProposal: (proposalId: string, moderatorRole?: string) => boolean;
  removeApprovedBadgeSkin: (badgeBaseId: string, slotIndex: number) => boolean;
  startRoute: (levelId: BadgeLevelId, callbacks?: { onAdded?: (slotsLeft: number) => void; onLimit?: () => void }) => void;
  removeRoute: (badgeBaseId: string) => void;
  toggleFavorite: (favoriteId: BadgeFavoriteId, callbacks?: { onAdded?: (slotsLeft: number) => void; onLimit?: () => void }) => void;
  pathFavToast: PathFavToastState;
  setPathFavToast: (t: PathFavToastState) => void;
  toggleLike: (badgeBaseId: string) => void;
  setNickname: (nickname: string) => void;
  setAvatar: (avatar: string) => void;
  setProfileStatus: (status: string) => void;
  setProfileBio: (bio: string) => void;
  resetProfile: () => void;
  getLevelProgress: (levelId: BadgeLevelId) => ILevelProgress | undefined;
  getBadgeProgress: (badgeId: string) => { total: number; achieved: number; started: number };
  exportData: (extras?: Record<string, unknown>) => void;
  importData: (file: File) => Promise<{ success: boolean; data?: Record<string, unknown> }>;
  resetProgress: () => void;
  completeTutorial: () => void;
  updateInspectorTask: (dayIndex: number, taskIndex: string, completed: boolean) => void;
  setInspectorDay: (day: number) => void;
  updateBroDeed: (dayIndex: number, deedId: string, completed: boolean) => void;
  setBroDay: (day: number) => void;
  setWingAvatar: (avatar: string) => void;
  setWingName: (name: string) => void;
  updateBroWingPlans: (fields: { wingPlanGridA?: WingPlanGridData; wingPlanGridB?: WingPlanGridData }) => void;
  updateDiaryEntry: (dayIndex: number, fields: Record<string, string | undefined>) => void;
  updateDiarySquad: (fields: Record<string, string | undefined | object>) => void;
  updateDiaryShiftTemplates: (fields: {
    shiftSchedule?: Partial<Record<ShiftScheduleKey, { time?: string; note?: string }>>;
    myActivities?: Partial<Record<MyActivityKey, { time?: string; note?: string }>>;
  }) => void;
  addFlagBadgeRequest: (badgeId: string, evidence?: { reflection?: string; impact?: string; link?: string }) => void;
  approveFlagBadgeRequest: (badgeId: string) => void;
  rejectFlagBadgeRequest: (badgeId: string) => void;
  setDiaryDay: (day: number) => void;
  receivePassport: () => void;
  becomeBro: () => void;
  selectWingMentor: (mentorId: string, wingName: string) => void;
  assignBlackBadge: () => void;
  isTestMode: boolean;
  setIsTestMode: (enabled: boolean) => void;
  markRankUpSeen: (levels: number) => void;
  saveSquadArchitectScenario: (name: string, traditions: string[]) => void;
  saveBadgePlan: (plan: IBadgePlan) => void;
  updateBadgePlanStatus: (badgeId: string, status: BadgePlanStatus) => void;
  updateBadgePlanChecklist: (badgeId: string, itemIndex: number, completed: boolean) => void;
  getBadgePlan: (badgeId: string) => IBadgePlan | undefined;
  updateVozhatifikatorChecklist: (itemId: string, completed: boolean) => void;
}

const STORAGE_KEY = 'rl_guide_progress_v1';
const SCHEMA_VERSION = 2;

const MAX_PATH_BADGES = 10;
const MAX_FAVORITES = 10;

export type PathFavToastState =
  | { type: 'path_added'; pathSlotsLeft: number }
  | { type: 'path_limit' }
  | { type: 'fav_added'; favSlotsLeft: number }
  | { type: 'fav_limit' }
  | { type: 'squad_added'; squadSlotsLeft: number }
  | { type: 'squad_limit' }
  | null;

const TEST_DEFAULT_ACHIEVED_LEVELS: BadgeLevelId[] = [
  '1.11',
  '1.16.1',
  '1.16.2',
  '2.4.1',
  '5.5.1',
  '9.8.1',
  '9.9.1',
  '9.10.1',
];

const initialProfile: IUserProfile = {
  id: 'local',
  nickname: 'Искатель',
  status: '',
  bio: '',
  createdAt: new Date().toISOString(),
  stats: { totalLevelsAchieved: 0, totalBadgesStarted: 0 }
};

const initialData: IUserData = {
  profile: initialProfile,
  progress: {},
  favorites: [],
  likedBadges: [],
  selectedSkins: {},
  customBadgeImages: {},
  generatedBadgeSkins: {},
  approvedBadgeSkins: {},
  badgeArtProposals: [],
  inspectorProgress: {
    currentDay: 1,
    completedTasks: {}
  },
  broProgress: {
    isBro: false,
    hasPassport: false,
    currentDay: 1,
    completedDeeds: {},
  },
  diaryProgress: {
    currentDay: 1,
    entries: {}
  },
  meta: { 
    schemaVersion: SCHEMA_VERSION, 
    lastSyncedAt: new Date().toISOString(),
    hasCompletedTutorial: false
  }
};

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

const computeStats = (progress: Record<BadgeLevelId, ILevelProgress>) => {
  const values = Object.values(progress);
  const totalLevelsAchieved = values.filter(p => p.status === 'achieved').length;
  const totalBadgesStarted = values.filter(p => p.status === 'in_progress' || p.status === 'achieved').length;
  return { totalLevelsAchieved, totalBadgesStarted };
};

const withRecomputedStats = (data: IUserData): IUserData => {
  const { totalLevelsAchieved, totalBadgesStarted } = computeStats(data.progress);
  return {
    ...data,
    profile: {
      ...data.profile,
      stats: {
        totalLevelsAchieved,
        totalBadgesStarted
      }
    }
  };
};

const applyTestDefaults = (data: IUserData, enabled: boolean): IUserData => {
  if (!enabled || TEST_DEFAULT_ACHIEVED_LEVELS.length === 0) {
    return withRecomputedStats(data);
  }

  const progress = { ...data.progress };
  const now = new Date().toISOString();
  let changed = false;

  for (const levelId of TEST_DEFAULT_ACHIEVED_LEVELS) {
    const existing = progress[levelId];
    if (existing?.status === 'achieved') continue;
    progress[levelId] = {
      ...existing,
      status: 'achieved',
      selectedAt: existing?.selectedAt ?? now,
      achievedAt: existing?.achievedAt ?? now,
    };
    changed = true;
  }

  if (!changed) return withRecomputedStats(data);

  return withRecomputedStats({
    ...data,
    progress,
    meta: { ...data.meta, lastSyncedAt: now }
  });
};

const getBaseId = (rawId: string): string => {
  const clean = String(rawId || '').trim();
  if (!clean) return '';
  const parts = clean.split('.').filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return clean;
};

const normalizeDiaryTemplateValue = (value: unknown): { time?: string; note?: string } | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as { time?: unknown; note?: unknown };
  const time = typeof record.time === 'string' && record.time.trim() ? record.time.trim() : undefined;
  const note = typeof record.note === 'string' && record.note.trim() ? record.note.trim() : undefined;
  if (!time && !note) return undefined;
  return { time, note };
};

const normalizeDiaryTemplateRecord = <T extends string>(
  source: unknown,
  allowedKeys: readonly T[]
): Partial<Record<T, { time?: string; note?: string }>> | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  const srcRecord = source as Record<string, unknown>;
  const normalized: Partial<Record<T, { time?: string; note?: string }>> = {};
  for (const key of allowedKeys) {
    const value = normalizeDiaryTemplateValue(srcRecord[key]);
    if (value) normalized[key] = value;
  }
  return Object.keys(normalized).length ? normalized : undefined;
};

const normalizeWingPlanGrid = (source: unknown): WingPlanGridData | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  const grid = source as { shiftLength?: unknown; days?: unknown };
  const shiftLength = Number(grid.shiftLength) === 9 ? 9 : 21;
  const srcDays = grid.days && typeof grid.days === 'object' ? (grid.days as Record<string, unknown>) : {};
  const days: WingPlanGridData['days'] = {};
  for (let day = 1; day <= shiftLength; day += 1) {
    const raw = srcDays[String(day)];
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as { morning?: unknown; quietHour?: unknown; day?: unknown; evening?: unknown; night?: unknown };
    const morning = typeof record.morning === 'string' && record.morning.trim() ? record.morning.trim() : undefined;
    const quietHour = typeof record.quietHour === 'string' && record.quietHour.trim() ? record.quietHour.trim() : undefined;
    const dayText = typeof record.day === 'string' && record.day.trim() ? record.day.trim() : undefined;
    const evening = typeof record.evening === 'string' && record.evening.trim() ? record.evening.trim() : undefined;
    const night = typeof record.night === 'string' && record.night.trim() ? record.night.trim() : undefined;
    if (morning || quietHour || dayText || evening || night) days[String(day)] = { morning, quietHour, day: dayText, evening, night };
  }
  return { shiftLength, days };
};

const normalizeUserData = (raw: any): IUserData => {
  const profile = {
    ...initialProfile,
    ...(raw?.profile || {}),
    stats: {
      ...initialProfile.stats,
      ...(raw?.profile?.stats || {}),
    },
  };

  const progress =
    raw?.progress && typeof raw.progress === 'object' ? (raw.progress as Record<BadgeLevelId, ILevelProgress>) : {};

  const favoritesRaw = Array.isArray(raw?.favorites)
    ? raw.favorites.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
    : [];
  const favoritesByBase = new Map<string, string>();
  for (const id of favoritesRaw) {
    const cleanId = String(id || '').trim();
    const baseId = getBaseId(cleanId);
    if (!baseId) continue;
    favoritesByBase.set(baseId, cleanId);
  }
  const favorites = Array.from(favoritesByBase.values());

  const likedBadges = Array.isArray(raw?.likedBadges) ? raw.likedBadges : [];
  const rawCustomBadgeImages = raw?.customBadgeImages && typeof raw.customBadgeImages === 'object'
    ? raw.customBadgeImages as Record<string, unknown>
    : {};
  const customBadgeImages: Record<string, string> = {};
  for (const [badgeId, value] of Object.entries(rawCustomBadgeImages)) {
    if (!isDataOrUrl(value)) continue;
    customBadgeImages[badgeId] = value;
  }

  const rawGeneratedBadgeSkins = raw?.generatedBadgeSkins && typeof raw.generatedBadgeSkins === 'object'
    ? raw.generatedBadgeSkins as Record<string, unknown>
    : {};
  const generatedBadgeSkins: Record<string, string[]> = {};
  for (const [badgeId, value] of Object.entries(rawGeneratedBadgeSkins)) {
    if (!Array.isArray(value)) continue;
    const validUrls = value.filter((item) => isDataOrUrl(item)).slice(0, MAX_BADGE_AI_SKINS) as string[];
    if (validUrls.length > 0) {
      generatedBadgeSkins[badgeId] = validUrls;
    }
  }

  const rawApprovedBadgeSkins = raw?.approvedBadgeSkins && typeof raw.approvedBadgeSkins === 'object'
    ? raw.approvedBadgeSkins as Record<string, unknown>
    : {};
  const approvedBadgeSkins: Record<string, string[]> = {};
  for (const [badgeId, value] of Object.entries(rawApprovedBadgeSkins)) {
    if (!Array.isArray(value)) continue;
    const validUrls = value.filter((item) => isDataOrUrl(item)).slice(0, MAX_BADGE_APPROVED_ARTS) as string[];
    if (validUrls.length > 0) {
      approvedBadgeSkins[badgeId] = validUrls;
    }
  }

  const rawBadgeArtProposals = Array.isArray(raw?.badgeArtProposals) ? raw.badgeArtProposals : [];
  const badgeArtProposals: IBadgeArtProposal[] = rawBadgeArtProposals
    .filter((proposal: any) => (
      proposal &&
      typeof proposal.id === 'string' &&
      typeof proposal.badgeBaseId === 'string' &&
      typeof proposal.badgeTitle === 'string' &&
      isDataOrUrl(proposal.imageUrl)
    ))
    .map((proposal: any) => {
      const statusRaw = String(proposal.status || '').trim().toLowerCase();
      const status: BadgeArtProposalStatus =
        statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
      return {
        id: String(proposal.id),
        badgeBaseId: getBaseId(String(proposal.badgeBaseId)),
        badgeTitle: String(proposal.badgeTitle || ''),
        categoryId: typeof proposal.categoryId === 'string' ? proposal.categoryId : undefined,
        categoryTitle: typeof proposal.categoryTitle === 'string' ? proposal.categoryTitle : undefined,
        imageUrl: String(proposal.imageUrl),
        status,
        proposedBy: typeof proposal.proposedBy === 'string' ? proposal.proposedBy : undefined,
        proposedAt: typeof proposal.proposedAt === 'string' ? proposal.proposedAt : new Date().toISOString(),
        resolvedAt: typeof proposal.resolvedAt === 'string' ? proposal.resolvedAt : undefined,
        resolvedByRole: typeof proposal.resolvedByRole === 'string' ? proposal.resolvedByRole : undefined,
      } satisfies IBadgeArtProposal;
    })
    .filter((proposal: IBadgeArtProposal) => Boolean(proposal.badgeBaseId))
    .slice(-200);

  const rawSelectedSkins = raw?.selectedSkins && typeof raw.selectedSkins === 'object'
    ? raw.selectedSkins as Record<string, unknown>
    : {};
  const selectedSkins: Record<string, BadgeSkinId | string> = {};
  for (const [badgeId, value] of Object.entries(rawSelectedSkins)) {
    if (typeof value !== 'string') continue;
    const skin = value.trim();
    if (!skin) continue;

    // Migrate legacy: selectedSkins[id] as data URL -> customBadgeImages[id], selectedSkins[id] = 'custom'
    if (isDataOrUrl(skin)) {
      customBadgeImages[badgeId] = skin;
      selectedSkins[badgeId] = 'custom';
      continue;
    }

    const isStatic = skin === 'auto' || skin === 'default' || skin === 'realism' || skin === 'custom';
    if (isStatic) {
      selectedSkins[badgeId] = skin;
      continue;
    }

    const aiSlot = parseAiSkinSlotIndex(skin);
    if (aiSlot !== null) {
      const skins = generatedBadgeSkins[badgeId] || [];
      if (skins[aiSlot]) {
        selectedSkins[badgeId] = skin;
      }
      continue;
    }

    const approvedSlot = parseApprovedArtSkinSlotIndex(skin);
    if (approvedSlot !== null) {
      const skins = approvedBadgeSkins[badgeId] || [];
      if (skins[approvedSlot]) {
        selectedSkins[badgeId] = skin;
      }
    }
  }
  const inspectorProgress = raw?.inspectorProgress || initialData.inspectorProgress;
  
  const normalizedWingPlanGridA = normalizeWingPlanGrid(raw?.broProgress?.wingPlanGridA);
  const normalizedWingPlanGridB = normalizeWingPlanGrid(raw?.broProgress?.wingPlanGridB);
  const broProgress = raw?.broProgress
    ? {
        ...(initialData.broProgress || {}),
        ...raw.broProgress,
        isBro: raw.broProgress.isBro ?? false,
        hasPassport: raw.broProgress.hasPassport ?? false,
        currentDay: raw.broProgress.currentDay ?? 1,
        completedDeeds: raw.broProgress.completedDeeds ?? {},
        wingPlanGridA: normalizedWingPlanGridA,
        wingPlanGridB: normalizedWingPlanGridB
      }
    : initialData.broProgress;

  const rawSquad = raw?.diaryProgress?.squad;
  const SHIFT_SCHEDULE_KEYS: ShiftScheduleKey[] = [
    'wakeUp',
    'exercise',
    'breakfast',
    'morningEvent',
    'lunch',
    'quietTime',
    'afternoonSnack',
    'dayEvent',
    'dinner',
    'eveningEvent',
    'orlyatskyCircle',
    'lightsOut'
  ];
  const MY_ACTIVITY_KEYS: MyActivityKey[] = ['morning', 'day', 'evening', 'additional'];
  const squad = typeof rawSquad === 'object' ? (() => {
    const reqs = Array.isArray(rawSquad.flagBadgeRequests)
      ? rawSquad.flagBadgeRequests
          .filter((r: any) => r && typeof r.badgeId === 'string' && ['pending', 'approved', 'rejected'].includes(r.status))
          .map((r: any) => ({
            badgeId: String(r.badgeId),
            status: r.status as 'pending' | 'approved' | 'rejected',
            requestedBy: typeof r.requestedBy === 'string' ? r.requestedBy : undefined,
            requestedAt: typeof r.requestedAt === 'string' ? r.requestedAt : new Date().toISOString(),
            evidence: r.evidence && typeof r.evidence === 'object' ? {
              reflection: typeof r.evidence.reflection === 'string' ? r.evidence.reflection : undefined,
              impact: typeof r.evidence.impact === 'string' ? r.evidence.impact : undefined,
              link: typeof r.evidence.link === 'string' ? r.evidence.link : undefined
            } : undefined,
            resolvedAt: typeof r.resolvedAt === 'string' ? r.resolvedAt : undefined
          }))
      : undefined;
    const approved = Array.isArray(rawSquad.flagBadgesApproved)
      ? rawSquad.flagBadgesApproved.filter((id: unknown) => typeof id === 'string' && /^10\.[123]$/.test(id))
      : undefined;
    return { ...rawSquad, flagBadgeRequests: reqs, flagBadgesApproved: approved };
  })() : undefined;

  const diaryProgress = raw?.diaryProgress && typeof raw.diaryProgress === 'object'
    ? {
        currentDay: Math.max(1, Number(raw.diaryProgress.currentDay) || 1),
        squad,
        shiftSchedule: normalizeDiaryTemplateRecord<ShiftScheduleKey>(raw.diaryProgress.shiftSchedule, SHIFT_SCHEDULE_KEYS),
        myActivities: normalizeDiaryTemplateRecord<MyActivityKey>(raw.diaryProgress.myActivities, MY_ACTIVITY_KEYS),
        entries: typeof raw.diaryProgress.entries === 'object' ? raw.diaryProgress.entries : {}
      }
    : initialData.diaryProgress!;

  const meta = {
    ...initialData.meta,
    ...(raw?.meta || {}),
    schemaVersion: Math.max(Number(raw?.meta?.schemaVersion || 0), SCHEMA_VERSION),
    hasCompletedTutorial: raw?.meta?.hasCompletedTutorial ?? false,
    squadArchitectScenario:
      raw?.meta?.squadArchitectScenario &&
      typeof raw.meta.squadArchitectScenario === 'object' &&
      typeof raw.meta.squadArchitectScenario.name === 'string' &&
      Array.isArray(raw.meta.squadArchitectScenario.traditions)
        ? {
            name: String(raw.meta.squadArchitectScenario.name),
            traditions: raw.meta.squadArchitectScenario.traditions.filter((t: unknown) => typeof t === 'string'),
            generatedAt: String(raw.meta.squadArchitectScenario.generatedAt || new Date().toISOString())
          }
        : undefined
  };

  const badgePlans = raw?.badgePlans && typeof raw.badgePlans === 'object' ? raw.badgePlans as Record<string, IBadgePlan> : {};

  const vozhatifikatorChecklist =
    raw?.vozhatifikatorChecklist && typeof raw.vozhatifikatorChecklist === 'object' && Array.isArray((raw.vozhatifikatorChecklist as { completedIds?: unknown[] }).completedIds)
      ? { completedIds: (raw.vozhatifikatorChecklist as { completedIds: unknown[] }).completedIds.filter((id: unknown) => typeof id === 'string') as string[] }
      : undefined;

  // We can't access isTestMode state here, we'll use local storage directly or just defaults
  const testModeActive = localStorage.getItem('rl_guide_test_mode') === 'true';
  return applyTestDefaults({
    profile,
    progress,
    favorites,
    likedBadges,
    selectedSkins,
    customBadgeImages,
    generatedBadgeSkins,
    approvedBadgeSkins,
    badgeArtProposals,
    inspectorProgress,
    broProgress,
    diaryProgress,
    meta,
    badgePlans,
    vozhatifikatorChecklist
  }, testModeActive);
};

function countPathBadges(progress: Record<string, ILevelProgress>): number {
  const baseIds = new Set<string>();
  for (const [id, p] of Object.entries(progress)) {
    if (p?.status === 'in_progress' || p?.status === 'achieved') {
      baseIds.add(getBaseId(id));
    }
  }
  return baseIds.size;
}

export const ProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTestMode, setIsTestMode] = useState(() => {
    const stored = localStorage.getItem('rl_guide_test_mode');
    return stored === 'true'; // Default false if not set
  });
  const [userData, setUserData] = useState<IUserData>(initialData);
  const [pathFavToast, setPathFavToast] = useState<PathFavToastState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDataRef = useRef<IUserData | null>(null);

  const applyTestDefaults = (data: IUserData, enabled: boolean): IUserData => {
    if (!enabled || TEST_DEFAULT_ACHIEVED_LEVELS.length === 0) {
      return withRecomputedStats(data);
    }

    const progress = { ...data.progress };
    const now = new Date().toISOString();
    let changed = false;

    for (const levelId of TEST_DEFAULT_ACHIEVED_LEVELS) {
      const existing = progress[levelId];
      if (existing?.status === 'achieved') continue;
      progress[levelId] = {
        ...existing,
        status: 'achieved',
        selectedAt: existing?.selectedAt ?? now,
        achievedAt: existing?.achievedAt ?? now,
      };
      changed = true;
    }

    if (!changed) return withRecomputedStats(data);

    return withRecomputedStats({
      ...data,
      progress,
      meta: { ...data.meta, lastSyncedAt: now }
    });
  };

  const handleSetTestMode = (enabled: boolean) => {
    setIsTestMode(enabled);
    localStorage.setItem('rl_guide_test_mode', String(enabled));
    if (enabled) {
      setUserData(prev => applyTestDefaults(prev, true));
    }
  };

  // Load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUserData(normalizeUserData(parsed));
      } catch (e) {
        console.error('Failed to parse user progress', e);
      }
    } else {
      setUserData(applyTestDefaults(initialData, isTestMode));
    }
    setIsLoading(false);
  }, []);

  // Save to LocalStorage on change (debounced to avoid blocking main thread during rapid updates)
  useEffect(() => {
    if (isLoading) return;
    pendingDataRef.current = userData;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const data = pendingDataRef.current;
      if (!data) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
          console.error('Слишком много данных (например, фото). Удалите некоторые фото или сделайте резервную копию и очистите прогресс.');
          alert('Не удалось сохранить: слишком много данных. Удалите несколько фото в отрядном уголке или сделайте резервную копию.');
        } else {
          console.error('Failed to save progress', e);
        }
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        const data = pendingDataRef.current;
        if (data) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch {
            /* ignore on unmount */
          }
        }
      }
    };
  }, [userData, isLoading]);

  const completeTutorial = () => {
    setUserData(prev => ({
      ...prev,
      meta: { ...prev.meta, hasCompletedTutorial: true, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const updateInspectorTask = (dayIndex: number, taskIndex: string, completed: boolean) => {
    setUserData(prev => {
      const current = prev.inspectorProgress || { currentDay: 1, completedTasks: {} };
      const dayKey = String(dayIndex);
      const dayTasks = current.completedTasks[dayKey] || [];
      
      let newDayTasks: string[];
      if (completed) {
        newDayTasks = Array.from(new Set([...dayTasks, taskIndex]));
      } else {
        newDayTasks = dayTasks.filter(t => t !== taskIndex);
      }

      return {
        ...prev,
        inspectorProgress: {
          ...current,
          completedTasks: {
            ...current.completedTasks,
            [dayKey]: newDayTasks
          }
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const setInspectorDay = (day: number) => {
    setUserData(prev => ({
      ...prev,
      inspectorProgress: {
        ...(prev.inspectorProgress || { currentDay: 1, completedTasks: {} }),
        currentDay: day
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const updateBroDeed = (dayIndex: number, deedId: string, completed: boolean) => {
    setUserData(prev => {
      const current = prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} };
      const dayKey = String(dayIndex);
      const dayDeeds = current.completedDeeds[dayKey] || [];
      
      let newDayDeeds: string[];
      if (completed) {
        newDayDeeds = Array.from(new Set([...dayDeeds, deedId]));
      } else {
        newDayDeeds = dayDeeds.filter(d => d !== deedId);
      }

      return {
        ...prev,
        broProgress: {
          ...current,
          completedDeeds: {
            ...current.completedDeeds,
            [dayKey]: newDayDeeds
          }
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const setBroDay = (day: number) => {
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        currentDay: day
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const setWingAvatar = (avatar: string) => {
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        wingAvatar: avatar || undefined
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const setWingName = (name: string) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        wingName: trimmed,
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const updateBroWingPlans = (fields: { wingPlanGridA?: WingPlanGridData; wingPlanGridB?: WingPlanGridData }) => {
    setUserData(prev => {
      const currentBro = prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} };
      const patch: { wingPlanGridA?: WingPlanGridData; wingPlanGridB?: WingPlanGridData } = {};
      if (fields.wingPlanGridA !== undefined) {
        patch.wingPlanGridA = normalizeWingPlanGrid(fields.wingPlanGridA);
      }
      if (fields.wingPlanGridB !== undefined) {
        patch.wingPlanGridB = normalizeWingPlanGrid(fields.wingPlanGridB);
      }
      return {
        ...prev,
        broProgress: {
          ...currentBro,
          ...patch
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const updateDiaryEntry = (dayIndex: number, fields: Record<string, string | undefined>) => {
    setUserData(prev => {
      const current = prev.diaryProgress || { currentDay: 1, entries: {} };
      const dayKey = String(dayIndex);
      const existing = current.entries[dayKey] || { updatedAt: new Date().toISOString() };
      const updatedAt = new Date().toISOString();
      return {
        ...prev,
        diaryProgress: {
          ...current,
          entries: {
            ...current.entries,
            [dayKey]: {
              ...existing,
              ...fields,
              updatedAt
            }
          }
        },
        meta: { ...prev.meta, lastSyncedAt: updatedAt }
      };
    });
  };

  const updateDiarySquad = (fields: Record<string, string | undefined | object>) => {
    setUserData(prev => {
      const current = prev.diaryProgress || { currentDay: 1, entries: {} };
      const squad = { ...(current.squad || {}), ...fields };
      return {
        ...prev,
        diaryProgress: { ...current, squad },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const updateDiaryShiftTemplates = (fields: {
    shiftSchedule?: Partial<Record<ShiftScheduleKey, { time?: string; note?: string }>>;
    myActivities?: Partial<Record<MyActivityKey, { time?: string; note?: string }>>;
  }) => {
    const applyTemplatePatch = <T extends string>(
      currentTemplate: Partial<Record<T, { time?: string; note?: string }>> | undefined,
      patch: Partial<Record<T, { time?: string; note?: string }>> | undefined
    ): Partial<Record<T, { time?: string; note?: string }>> | undefined => {
      if (!patch) return currentTemplate;
      const next: Partial<Record<T, { time?: string; note?: string }>> = { ...(currentTemplate || {}) };
      for (const [rawKey, rawValue] of Object.entries(patch as Record<string, { time?: string; note?: string } | undefined>)) {
        const key = rawKey as T;
        const value = rawValue && typeof rawValue === 'object' ? rawValue : undefined;
        const time = value && typeof value.time === 'string' && value.time.trim() ? value.time.trim() : undefined;
        const note = value && typeof value.note === 'string' && value.note.trim() ? value.note.trim() : undefined;
        if (time || note) next[key] = { time, note };
        else delete next[key];
      }
      return Object.keys(next).length ? next : undefined;
    };

    setUserData(prev => {
      const current = prev.diaryProgress || { currentDay: 1, entries: {} };
      const shiftSchedule = applyTemplatePatch<ShiftScheduleKey>(current.shiftSchedule, fields.shiftSchedule);
      const myActivities = applyTemplatePatch<MyActivityKey>(current.myActivities, fields.myActivities);
      return {
        ...prev,
        diaryProgress: {
          ...current,
          shiftSchedule,
          myActivities
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const FLAG_BADGE_IDS = ['10.1', '10.2', '10.3'];
  const addFlagBadgeRequest = (badgeId: string, evidence?: { reflection?: string; impact?: string; link?: string }) => {
    if (!FLAG_BADGE_IDS.includes(badgeId)) return;
    const now = new Date().toISOString();
    setUserData(prev => {
      const current = prev.diaryProgress || { currentDay: 1, entries: {} };
      const squad = current.squad || {};
      const requests = [...(squad.flagBadgeRequests || [])];
      const existingIdx = requests.findIndex(r => r.badgeId === badgeId);
      const newReq = {
        badgeId,
        status: 'pending' as const,
        requestedBy: prev.profile?.nickname,
        requestedAt: existingIdx >= 0 ? requests[existingIdx].requestedAt : now,
        evidence: evidence ?? (existingIdx >= 0 ? requests[existingIdx].evidence : undefined),
        resolvedAt: undefined
      };
      if (existingIdx >= 0) requests[existingIdx] = newReq;
      else requests.push(newReq);
      return {
        ...prev,
        diaryProgress: { ...current, squad: { ...squad, flagBadgeRequests: requests } },
        meta: { ...prev.meta, lastSyncedAt: now }
      };
    });
  };

  const approveFlagBadgeRequest = (badgeId: string) => {
    if (!FLAG_BADGE_IDS.includes(badgeId)) return;
    const now = new Date().toISOString();
    setUserData(prev => {
      const current = prev.diaryProgress || { currentDay: 1, entries: {} };
      const squad = current.squad || {};
      const requests = (squad.flagBadgeRequests || []).map(r =>
        r.badgeId === badgeId ? { ...r, status: 'approved' as const, resolvedAt: now } : r
      );
      const approved = Array.from(new Set([...(squad.flagBadgesApproved || []), badgeId]));
      return {
        ...prev,
        diaryProgress: {
          ...current,
          squad: { ...squad, flagBadgeRequests: requests, flagBadgesApproved: approved }
        },
        meta: { ...prev.meta, lastSyncedAt: now }
      };
    });
  };

  const rejectFlagBadgeRequest = (badgeId: string) => {
    if (!FLAG_BADGE_IDS.includes(badgeId)) return;
    const now = new Date().toISOString();
    setUserData(prev => {
      const current = prev.diaryProgress || { currentDay: 1, entries: {} };
      const squad = current.squad || {};
      const requests = (squad.flagBadgeRequests || []).map(r =>
        r.badgeId === badgeId ? { ...r, status: 'rejected' as const, resolvedAt: now } : r
      );
      return {
        ...prev,
        diaryProgress: { ...current, squad: { ...squad, flagBadgeRequests: requests } },
        meta: { ...prev.meta, lastSyncedAt: now }
      };
    });
  };

  const setDiaryDay = (day: number) => {
    setUserData(prev => ({
      ...prev,
      diaryProgress: {
        ...(prev.diaryProgress || { currentDay: 1, entries: {} }),
        currentDay: day
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const saveSquadArchitectScenario = (name: string, traditions: string[]) => {
    const now = new Date().toISOString();
    setUserData(prev => ({
      ...prev,
      meta: {
        ...prev.meta,
        squadArchitectScenario: { name, traditions, generatedAt: now },
        lastSyncedAt: now
      }
    }));
  };

  const saveBadgePlan = (plan: IBadgePlan) => {
    const now = new Date().toISOString();
    setUserData(prev => ({
      ...prev,
      badgePlans: {
        ...(prev.badgePlans || {}),
        [plan.badgeId]: { ...plan, createdAt: plan.createdAt || now }
      },
      meta: { ...prev.meta, lastSyncedAt: now }
    }));
  };

  const updateBadgePlanStatus = (badgeId: string, status: BadgePlanStatus) => {
    const now = new Date().toISOString();
    setUserData(prev => {
      const plans = prev.badgePlans || {};
      const plan = plans[badgeId];
      if (!plan) return prev;
      const updated: IBadgePlan = {
        ...plan,
        status,
        ...(status === 'pending_approval' ? { sentForApprovalAt: now } : {}),
        ...(status === 'approved' || status === 'in_progress' ? { approvedAt: plan.approvedAt || now } : {})
      };
      return {
        ...prev,
        badgePlans: { ...plans, [badgeId]: updated },
        meta: { ...prev.meta, lastSyncedAt: now }
      };
    });
  };

  const updateBadgePlanChecklist = (badgeId: string, itemIndex: number, completed: boolean) => {
    setUserData(prev => {
      const plans = prev.badgePlans || {};
      const plan = plans[badgeId];
      if (!plan) return prev;
      const idxStr = String(itemIndex);
      let completedItems = [...(plan.completedItems || [])];
      if (completed) {
        if (!completedItems.includes(idxStr)) completedItems = [...completedItems, idxStr];
      } else {
        completedItems = completedItems.filter(i => i !== idxStr);
      }
      const allDone = plan.checklistItems.length > 0 && completedItems.length >= plan.checklistItems.length;
      const newStatus: BadgePlanStatus = allDone ? 'completed' : (plan.status === 'approved' ? 'in_progress' : plan.status);
      return {
        ...prev,
        badgePlans: {
          ...plans,
          [badgeId]: { ...plan, completedItems, status: newStatus }
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const getBadgePlan = (badgeId: string): IBadgePlan | undefined => {
    return userData.badgePlans?.[badgeId];
  };

  const updateVozhatifikatorChecklist = (itemId: string, completed: boolean) => {
    setUserData(prev => {
      const current = prev.vozhatifikatorChecklist?.completedIds ?? [];
      let completedIds: string[];
      if (completed) {
        completedIds = current.includes(itemId) ? current : [...current, itemId];
      } else {
        completedIds = current.filter(id => id !== itemId);
      }
      return {
        ...prev,
        vozhatifikatorChecklist: { completedIds },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const receivePassport = () => {
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        hasPassport: true
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const becomeBro = () => {
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        isBro: true
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const selectWingMentor = (_mentorId: string, wingName: string) => {
    const trimmed = String(wingName || '').trim();
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        wingId: `W-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        ...(trimmed ? { wingName: trimmed } : {}),
        // isBro remains as is (false if called during initiation)
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const assignBlackBadge = () => {
    setUserData(prev => ({
      ...prev,
      broProgress: {
        ...(prev.broProgress || { isBro: false, hasPassport: false, currentDay: 1, completedDeeds: {} }),
        hasBlackBadge: true,
        isWingMentor: true
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const updateLevelEvidence = (levelId: BadgeLevelId, evidence: ILevelProgress['evidence']) => {
    if (!evidence || evidence.length === 0) return;
    setUserData(prev => {
      const newProgress = { ...prev.progress };
      const current = newProgress[levelId] || { status: 'locked' };
      const existing = current.evidence || [];
      const merged = [...existing, ...evidence];
      newProgress[levelId] = {
        ...current,
        evidence: merged,
      };
      return {
        ...prev,
        progress: newProgress,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() },
      };
    });
  };

  const updateLevelStatus = (levelId: BadgeLevelId, status: LevelStatus, reflection?: string) => {
    setUserData(prev => {
      const newProgress = { ...prev.progress };
      const current = newProgress[levelId] || { status: 'locked' };
      
      const updatedItem: ILevelProgress = {
        ...current,
        status,
        selectedAt: status === 'in_progress' ? new Date().toISOString() : current.selectedAt,
        achievedAt: status === 'achieved' ? new Date().toISOString() : current.achievedAt,
        reflection: reflection !== undefined ? reflection : current.reflection
      };

      newProgress[levelId] = updatedItem;

      // Update stats
      const levelsAchieved = Object.values(newProgress).filter(p => p.status === 'achieved').length;
      // Rough estimate of started badges (counting unique base IDs could be complex here without external mapping, 
      // but we can count active levels)
      const levelsStarted = Object.values(newProgress).filter(p => p.status === 'in_progress' || p.status === 'achieved').length;

      return {
        ...prev,
        progress: newProgress,
        profile: {
          ...prev.profile,
          stats: {
            totalLevelsAchieved: levelsAchieved,
            totalBadgesStarted: levelsStarted // Note: this is levels started, logical adjustment might be needed for Badge count
          }
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const applyApprovedLevel = (
    levelId: BadgeLevelId,
    evidence?: { reflection?: string; impact?: string; link?: string } | null
  ) => {
    const reflection = (evidence?.reflection || '').trim() || undefined;
    updateLevelStatus(levelId, 'achieved', reflection);

    const evidenceItems: ILevelProgress['evidence'] = [];
    if (reflection) evidenceItems.push({ type: 'text', value: reflection });
    if (evidence?.impact && evidence.impact.trim()) evidenceItems.push({ type: 'text', value: evidence.impact.trim() });
    if (evidence?.link && evidence.link.trim()) evidenceItems.push({ type: 'link', value: evidence.link.trim() });
    if (evidenceItems.length > 0) {
      updateLevelEvidence(levelId, evidenceItems);
    }
  };

  const updateBadgeSkin = (badgeBaseId: string, skinId: string) => {
    const requested = String(skinId || '').trim();
    setUserData(prev => {
      const aiSlot = parseAiSkinSlotIndex(requested);
      const hasAiSkin = aiSlot !== null && Boolean((prev.generatedBadgeSkins?.[badgeBaseId] || [])[aiSlot]);
      const approvedSlot = parseApprovedArtSkinSlotIndex(requested);
      const hasApprovedSkin = approvedSlot !== null && Boolean((prev.approvedBadgeSkins?.[badgeBaseId] || [])[approvedSlot]);
      const hasCustomSkin = Boolean(prev.customBadgeImages?.[badgeBaseId]);
      const allowedStatic = requested === 'auto' || requested === 'default' || requested === 'realism';

      let skin: BadgeSkinId | string = 'auto';
      if (allowedStatic) {
        skin = requested;
      } else if (requested === 'custom' && hasCustomSkin) {
        skin = requested;
      } else if (hasAiSkin) {
        skin = requested;
      } else if (hasApprovedSkin) {
        skin = requested;
      }

      if ((prev.selectedSkins || {})[badgeBaseId] === skin) {
        return prev;
      }

      return {
        ...prev,
        selectedSkins: {
          ...(prev.selectedSkins || {}),
          [badgeBaseId]: skin
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const addGeneratedBadgeSkin = (
    badgeBaseId: string,
    dataUrl: string
  ): { ok: true; skinId: string } | { ok: false; reason: 'limit' | 'invalid' } => {
    if (!badgeBaseId || !isDataOrUrl(dataUrl)) {
      return { ok: false, reason: 'invalid' };
    }

    let result: { ok: true; skinId: string } | { ok: false; reason: 'limit' | 'invalid' } = {
      ok: false,
      reason: 'invalid'
    };

    setUserData(prev => {
      const currentSkins = prev.generatedBadgeSkins?.[badgeBaseId] || [];
      const existingIndex = currentSkins.findIndex((url) => url === dataUrl);

      if (existingIndex >= 0) {
        const skinId = getAiSkinId(existingIndex);
        result = { ok: true, skinId };
        if ((prev.selectedSkins || {})[badgeBaseId] === skinId) {
          return prev;
        }
        return {
          ...prev,
          selectedSkins: {
            ...(prev.selectedSkins || {}),
            [badgeBaseId]: skinId
          },
          meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
        };
      }

      if (currentSkins.length >= MAX_BADGE_AI_SKINS) {
        result = { ok: false, reason: 'limit' };
        return prev;
      }

      const nextSkins = [...currentSkins, dataUrl];
      const slotIndex = nextSkins.length - 1;
      const skinId = getAiSkinId(slotIndex);
      result = { ok: true, skinId };

      return {
        ...prev,
        generatedBadgeSkins: {
          ...(prev.generatedBadgeSkins || {}),
          [badgeBaseId]: nextSkins
        },
        selectedSkins: {
          ...(prev.selectedSkins || {}),
          [badgeBaseId]: skinId
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });

    return result;
  };

  const removeGeneratedBadgeSkin = (badgeBaseId: string, slotIndex: number): boolean => {
    if (!badgeBaseId) return false;
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return false;

    let removed = false;

    setUserData(prev => {
      const currentSkins = prev.generatedBadgeSkins?.[badgeBaseId] || [];
      if (slotIndex >= currentSkins.length) return prev;

      removed = true;
      const nextSkins = currentSkins.filter((_, index) => index !== slotIndex);
      const nextGenerated = { ...(prev.generatedBadgeSkins || {}) };
      if (nextSkins.length > 0) {
        nextGenerated[badgeBaseId] = nextSkins;
      } else {
        delete nextGenerated[badgeBaseId];
      }

      const nextSelected = { ...(prev.selectedSkins || {}) };
      const selectedSkin = nextSelected[badgeBaseId];
      const selectedAiSlot = parseAiSkinSlotIndex(selectedSkin);
      if (selectedAiSlot !== null) {
        if (selectedAiSlot === slotIndex) {
          if (nextSkins.length > 0) {
            const fallbackSlot = Math.min(slotIndex, nextSkins.length - 1);
            nextSelected[badgeBaseId] = getAiSkinId(fallbackSlot);
          } else {
            nextSelected[badgeBaseId] = 'auto';
          }
        } else if (selectedAiSlot > slotIndex) {
          nextSelected[badgeBaseId] = getAiSkinId(selectedAiSlot - 1);
        }
      }

      return {
        ...prev,
        generatedBadgeSkins: nextGenerated,
        selectedSkins: nextSelected,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });

    return removed;
  };

  const submitBadgeArtProposal = (proposal: {
    badgeBaseId: string;
    badgeTitle: string;
    categoryId?: string;
    categoryTitle?: string;
    imageUrl: string;
  }): { ok: true; proposalId: string } | { ok: false; reason: 'invalid' | 'duplicate' } => {
    const badgeBaseId = getBaseId(proposal.badgeBaseId);
    const badgeTitle = String(proposal.badgeTitle || '').trim();
    const imageUrl = String(proposal.imageUrl || '').trim();
    if (!badgeBaseId || !badgeTitle || !isDataOrUrl(imageUrl)) {
      return { ok: false, reason: 'invalid' };
    }

    let result: { ok: true; proposalId: string } | { ok: false; reason: 'invalid' | 'duplicate' } = {
      ok: false,
      reason: 'invalid'
    };

    setUserData(prev => {
      const proposals = [...(prev.badgeArtProposals || [])];
      const duplicate = proposals.find((item) =>
        item.badgeBaseId === badgeBaseId &&
        item.imageUrl === imageUrl &&
        item.status === 'pending'
      );
      if (duplicate) {
        result = { ok: false, reason: 'duplicate' };
        return prev;
      }

      const now = new Date().toISOString();
      const proposalId = `badge-art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nextProposal: IBadgeArtProposal = {
        id: proposalId,
        badgeBaseId,
        badgeTitle,
        categoryId: proposal.categoryId ? String(proposal.categoryId) : undefined,
        categoryTitle: proposal.categoryTitle ? String(proposal.categoryTitle) : undefined,
        imageUrl,
        status: 'pending',
        proposedBy: prev.profile?.nickname || undefined,
        proposedAt: now
      };

      result = { ok: true, proposalId };
      return {
        ...prev,
        badgeArtProposals: [...proposals, nextProposal].slice(-200),
        meta: { ...prev.meta, lastSyncedAt: now }
      };
    });

    return result;
  };

  const approveBadgeArtProposal = (
    proposalId: string,
    moderatorRole?: string
  ): { ok: true; skinId: string } | { ok: false; reason: 'not_found' | 'limit' } => {
    if (!proposalId) return { ok: false, reason: 'not_found' };

    let result: { ok: true; skinId: string } | { ok: false; reason: 'not_found' | 'limit' } = {
      ok: false,
      reason: 'not_found'
    };

    setUserData(prev => {
      const proposals = [...(prev.badgeArtProposals || [])];
      const proposalIndex = proposals.findIndex((item) => item.id === proposalId);
      if (proposalIndex < 0) return prev;

      const proposal = proposals[proposalIndex];
      if (!proposal || !proposal.badgeBaseId || !isDataOrUrl(proposal.imageUrl)) return prev;
      if (proposal.status === 'approved') {
        const existingApproved = prev.approvedBadgeSkins?.[proposal.badgeBaseId] || [];
        const existingIndex = existingApproved.findIndex((url) => url === proposal.imageUrl);
        const resolvedIndex = existingIndex >= 0 ? existingIndex : 0;
        result = { ok: true, skinId: getApprovedArtSkinId(resolvedIndex) };
        return prev;
      }

      const currentApproved = prev.approvedBadgeSkins?.[proposal.badgeBaseId] || [];
      const existingIndex = currentApproved.findIndex((url) => url === proposal.imageUrl);
      let nextApproved = currentApproved;
      let approvedIndex = existingIndex;

      if (existingIndex < 0) {
        if (currentApproved.length >= MAX_BADGE_APPROVED_ARTS) {
          result = { ok: false, reason: 'limit' };
          return prev;
        }
        nextApproved = [...currentApproved, proposal.imageUrl];
        approvedIndex = nextApproved.length - 1;
      }

      const now = new Date().toISOString();
      const skinId = getApprovedArtSkinId(approvedIndex);
      const updatedProposal: IBadgeArtProposal = {
        ...proposal,
        status: 'approved',
        resolvedAt: now,
        resolvedByRole: moderatorRole || proposal.resolvedByRole
      };
      proposals[proposalIndex] = updatedProposal;

      const nextApprovedSkins = { ...(prev.approvedBadgeSkins || {}) };
      nextApprovedSkins[proposal.badgeBaseId] = nextApproved;

      result = { ok: true, skinId };
      return {
        ...prev,
        badgeArtProposals: proposals,
        approvedBadgeSkins: nextApprovedSkins,
        selectedSkins: {
          ...(prev.selectedSkins || {}),
          [proposal.badgeBaseId]: skinId
        },
        meta: { ...prev.meta, lastSyncedAt: now }
      };
    });

    return result;
  };

  const rejectBadgeArtProposal = (proposalId: string, moderatorRole?: string): boolean => {
    if (!proposalId) return false;
    let rejected = false;
    setUserData(prev => {
      const proposals = [...(prev.badgeArtProposals || [])];
      const proposalIndex = proposals.findIndex((item) => item.id === proposalId);
      if (proposalIndex < 0) return prev;
      const proposal = proposals[proposalIndex];
      if (!proposal) return prev;

      rejected = true;
      proposals[proposalIndex] = {
        ...proposal,
        status: 'rejected',
        resolvedAt: new Date().toISOString(),
        resolvedByRole: moderatorRole || proposal.resolvedByRole
      };

      return {
        ...prev,
        badgeArtProposals: proposals,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
    return rejected;
  };

  const removeApprovedBadgeSkin = (badgeBaseId: string, slotIndex: number): boolean => {
    if (!badgeBaseId) return false;
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return false;

    let removed = false;

    setUserData(prev => {
      const currentSkins = prev.approvedBadgeSkins?.[badgeBaseId] || [];
      if (slotIndex >= currentSkins.length) return prev;

      removed = true;
      const nextSkins = currentSkins.filter((_, index) => index !== slotIndex);
      const nextApproved = { ...(prev.approvedBadgeSkins || {}) };
      if (nextSkins.length > 0) {
        nextApproved[badgeBaseId] = nextSkins;
      } else {
        delete nextApproved[badgeBaseId];
      }

      const nextSelected = { ...(prev.selectedSkins || {}) };
      const selectedSkin = nextSelected[badgeBaseId];
      const selectedApprovedSlot = parseApprovedArtSkinSlotIndex(selectedSkin);
      if (selectedApprovedSlot !== null) {
        if (selectedApprovedSlot === slotIndex) {
          if (nextSkins.length > 0) {
            const fallbackSlot = Math.min(slotIndex, nextSkins.length - 1);
            nextSelected[badgeBaseId] = getApprovedArtSkinId(fallbackSlot);
          } else {
            nextSelected[badgeBaseId] = 'auto';
          }
        } else if (selectedApprovedSlot > slotIndex) {
          nextSelected[badgeBaseId] = getApprovedArtSkinId(selectedApprovedSlot - 1);
        }
      }

      return {
        ...prev,
        approvedBadgeSkins: nextApproved,
        selectedSkins: nextSelected,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });

    return removed;
  };

  const setCustomBadgeImage = (badgeBaseId: string, dataUrl: string | null) => {
    setUserData(prev => {
      const nextCustom = { ...(prev.customBadgeImages || {}) };
      const nextSkins = { ...(prev.selectedSkins || {}) };
      if (dataUrl) {
        nextCustom[badgeBaseId] = dataUrl;
        nextSkins[badgeBaseId] = 'custom';
      } else {
        delete nextCustom[badgeBaseId];
        if (nextSkins[badgeBaseId] === 'custom') {
          nextSkins[badgeBaseId] = 'auto';
        }
      }
      return {
        ...prev,
        customBadgeImages: nextCustom,
        selectedSkins: nextSkins,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const startRoute = (levelId: BadgeLevelId, callbacks?: { onAdded?: (slotsLeft: number) => void; onLimit?: () => void }) => {
    const existing = userData.progress[levelId];
    if (existing?.status === 'achieved' || existing?.status === 'in_progress') return;
    const currentCount = countPathBadges(userData.progress);
    if (currentCount >= MAX_PATH_BADGES) {
      setPathFavToast({ type: 'path_limit' });
      callbacks?.onLimit?.();
      return;
    }
    updateLevelStatus(levelId, 'in_progress');
    const pathSlotsLeft = MAX_PATH_BADGES - currentCount - 1;
    setPathFavToast({ type: 'path_added', pathSlotsLeft });
    callbacks?.onAdded?.(pathSlotsLeft);
  };

  const removeRoute = (badgeBaseId: string) => {
    setUserData(prev => {
      const newProgress = { ...prev.progress };
      let changed = false;

      for (const [key, value] of Object.entries(newProgress)) {
        if (key !== badgeBaseId && !key.startsWith(`${badgeBaseId}.`)) continue;
        if (value.status === 'in_progress' || value.status === 'available') {
          delete newProgress[key];
          changed = true;
        }
      }

      if (!changed) return prev;

      const levelsAchieved = Object.values(newProgress).filter(p => p.status === 'achieved').length;
      const levelsStarted = Object.values(newProgress).filter(p => p.status === 'in_progress' || p.status === 'achieved').length;

      return {
        ...prev,
        progress: newProgress,
        profile: {
          ...prev.profile,
          stats: {
            totalLevelsAchieved: levelsAchieved,
            totalBadgesStarted: levelsStarted,
          }
        },
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const toggleFavorite = (favoriteId: BadgeFavoriteId, callbacks?: { onAdded?: (slotsLeft: number) => void; onLimit?: () => void }) => {
    const cleanId = String(favoriteId || '').trim();
    if (!cleanId) return;
    const parts = cleanId.split('.').filter(Boolean);
    const baseId = getBaseId(cleanId);
    if (!baseId) return;
    const isBaseId = parts.length === 2;

    const prevFavorites = userData.favorites || [];
    const sameBase = (id: string) => getBaseId(id) === baseId;
    const hasAnyForBase = prevFavorites.some(sameBase);
    const isAdding = (isBaseId && !hasAnyForBase) || (!isBaseId && !prevFavorites.some(sameBase));
    const didAddToFavorites = isAdding || (!isBaseId && hasAnyForBase && !prevFavorites.includes(cleanId));
    if (isAdding && prevFavorites.length >= MAX_FAVORITES) {
      setPathFavToast({ type: 'fav_limit' });
      callbacks?.onLimit?.();
      return;
    }

    setUserData(prev => {
      const prevFav = prev.favorites || [];
      const sameBaseInner = (id: string) => getBaseId(id) === baseId;
      const hasAnyForBaseInner = prevFav.some(sameBaseInner);

      let favorites: string[];

      if (isBaseId) {
        favorites = hasAnyForBaseInner
          ? prevFav.filter((id) => !sameBaseInner(id))
          : [...prevFav, baseId];
      } else {
        const existsExact = prevFav.includes(cleanId);
        favorites = existsExact
          ? prevFav.filter((id) => id !== cleanId)
          : [...prevFav.filter((id) => !sameBaseInner(id)), cleanId];
      }

      const isSameLength = favorites.length === prevFav.length;
      const isSameOrder = isSameLength && favorites.every((id, idx) => id === prevFav[idx]);
      if (isSameOrder) return prev;

      return {
        ...prev,
        favorites,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });

    if (didAddToFavorites) {
      const favSlotsLeft = isAdding ? MAX_FAVORITES - prevFavorites.length - 1 : MAX_FAVORITES - prevFavorites.length;
      setPathFavToast({ type: 'fav_added', favSlotsLeft });
      callbacks?.onAdded?.(favSlotsLeft);
    }
  };

  const toggleLike = (badgeBaseId: string) => {
    setUserData(prev => {
      const current = prev.likedBadges || [];
      const isLiked = current.includes(badgeBaseId);
      const next = isLiked 
        ? current.filter(id => id !== badgeBaseId)
        : [...current, badgeBaseId];
      
      return {
        ...prev,
        likedBadges: next,
        meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
      };
    });
  };

  const setNickname = (nickname: string) => {
    const next = String(nickname || '').trim();
    setUserData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        nickname: next || initialProfile.nickname,
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const setAvatar = (avatar: string) => {
    const next = String(avatar || '').trim();
    setUserData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        avatar: next || undefined,
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const setProfileStatus = (status: string) => {
    const next = String(status || '').trim().slice(0, 80);
    setUserData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        status: next || undefined,
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const setProfileBio = (bio: string) => {
    const next = String(bio || '').trim().slice(0, 220);
    setUserData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        bio: next || undefined,
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const resetProfile = () => {
    setUserData(prev => ({
      ...prev,
      profile: {
        ...prev.profile,
        nickname: initialProfile.nickname,
        avatar: undefined,
        status: initialProfile.status,
        bio: initialProfile.bio,
      },
      meta: { ...prev.meta, lastSyncedAt: new Date().toISOString() }
    }));
  };

  const getLevelProgress = (levelId: BadgeLevelId) => {
    return userData.progress[levelId];
  };

  const getBadgeProgress = (badgeId: string) => {
    // This assumes levelId format "badgeId.levelIndex" e.g. "13.11.1"
    // Also supports single-level badges where levelId equals badgeId.
    const levels = Object.entries(userData.progress).filter(([key]) => key === badgeId || key.startsWith(`${badgeId}.`));
    const achieved = levels.filter(([_, p]) => p.status === 'achieved').length;
    const started = levels.filter(([_, p]) => p.status === 'in_progress').length;
    
    return { total: levels.length, achieved, started };
  };

  const exportData = (extras?: Record<string, unknown>) => {
    const payload = extras ? { ...userData, ...extras } : userData;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `rl_guide_progress_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importData = async (file: File): Promise<{ success: boolean; data?: Record<string, unknown> }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (parsed && parsed.progress != null && parsed.profile != null) {
            setUserData(normalizeUserData(parsed as any));
            resolve({ success: true, data: parsed });
          } else {
            alert('Неверный формат файла прогресса');
            resolve({ success: false });
          }
        } catch (err) {
          console.error(err);
          resolve({ success: false });
        }
      };
      reader.readAsText(file);
    });
  };

  const resetProgress = () => {
    if (confirm('Вы уверены? Весь прогресс будет удален безвозвратно.')) {
      setUserData(applyTestDefaults(initialData, isTestMode));
    }
  };

  const markRankUpSeen = (levels: number) => {
    setUserData(prev => ({
      ...prev,
      meta: { ...prev.meta, lastSeenRankLevel: levels, lastSyncedAt: new Date().toISOString() }
    }));
  };

  return (
    <ProgressContext.Provider value={{ 
      userData, 
      isLoading, 
      updateLevelStatus,
      applyApprovedLevel,
      updateLevelEvidence, 
      updateBadgeSkin,
      setCustomBadgeImage,
      addGeneratedBadgeSkin,
      removeGeneratedBadgeSkin,
      submitBadgeArtProposal,
      approveBadgeArtProposal,
      rejectBadgeArtProposal,
      removeApprovedBadgeSkin,
      startRoute,
      removeRoute,
      toggleFavorite,
      pathFavToast,
      setPathFavToast,
      toggleLike,
      setNickname,
      setAvatar,
      setProfileStatus,
      setProfileBio,
      resetProfile,
      getLevelProgress, 
      getBadgeProgress,
      exportData,
      importData,
      resetProgress,
      completeTutorial,
      updateInspectorTask,
      setInspectorDay,
    updateBroDeed,
    setBroDay,
    setWingAvatar,
    setWingName,
    updateBroWingPlans,
    updateDiaryEntry,
    updateDiarySquad,
    updateDiaryShiftTemplates,
    addFlagBadgeRequest,
    approveFlagBadgeRequest,
    rejectFlagBadgeRequest,
      setDiaryDay,
      receivePassport,
      becomeBro,
      selectWingMentor,
      assignBlackBadge,
      isTestMode,
      setIsTestMode: handleSetTestMode,
      markRankUpSeen,
      saveSquadArchitectScenario,
      saveBadgePlan,
      updateBadgePlanStatus,
      updateBadgePlanChecklist,
      getBadgePlan,
      updateVozhatifikatorChecklist
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useUserProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useUserProgress must be used within a ProgressProvider');
  }
  return context;
};

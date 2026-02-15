export type BadgeLevelId = string; // "13.11.1"
export type BadgeBaseId = string;  // "13.11"
export type BadgeFavoriteId = BadgeBaseId | BadgeLevelId;
export type CategoryId = string;   // "category-13"
export type BadgeSkinId = 'auto' | 'default' | 'realism' | 'custom' | `ai:${1 | 2 | 3}` | `approved:${1 | 2 | 3}`;

export type BadgeArtProposalStatus = 'pending' | 'approved' | 'rejected';

export interface IBadgeArtProposal {
  id: string;
  badgeBaseId: BadgeBaseId;
  badgeTitle: string;
  categoryId?: string;
  categoryTitle?: string;
  imageUrl: string;
  status: BadgeArtProposalStatus;
  proposedBy?: string;
  proposedAt: string;
  resolvedAt?: string;
  resolvedByRole?: string;
}

export type LevelStatus = 'locked' | 'available' | 'in_progress' | 'achieved';

export interface ILevelProgress {
  status: LevelStatus;
  selectedAt?: string; // ISO Date
  achievedAt?: string; // ISO Date
  reflection?: string; // User note (mandatory for achievement)
  evidence?: {
    type: 'link' | 'text' | 'image';
    value: string;
  }[];
}

export interface IUserProfile {
  id: string; // 'local' for MVP
  nickname: string;
  avatar?: string;
  status?: string;
  bio?: string;
  createdAt: string;
  stats: {
    totalLevelsAchieved: number;
    totalBadgesStarted: number;
  };
}

/** План получения значка (персонализированный проект) */
export type BadgePlanStatus = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed';

export interface IBadgePlan {
  badgeId: string;
  status: BadgePlanStatus;
  context: {
    currentDay: number;
    shiftLength?: 21 | 9;
    squadProgramGrid?: string;   // Программа отряда по план-сетке
    squadPlan3d?: string;        // План вожатых на 3 дня
    squadProgram3d?: string;     // legacy alias
    campProgram3d?: string;      // Программа лагеря на 3 дня
    priority?: string;
  };
  planText: string;
  myPlanDraft?: string;   // Текст участника «как я вижу свой путь»
  checklistItems: string[];
  completedItems: string[]; // индексы или ID выполненных пунктов
  createdAt: string;
  sentForApprovalAt?: string;
  approvedAt?: string;
}

export type ShiftScheduleKey =
  | 'wakeUp'
  | 'exercise'
  | 'breakfast'
  | 'morningEvent'
  | 'lunch'
  | 'quietTime'
  | 'afternoonSnack'
  | 'dayEvent'
  | 'dinner'
  | 'eveningEvent'
  | 'orlyatskyCircle'
  | 'lightsOut';

export type MyActivityKey = 'morning' | 'day' | 'evening' | 'additional';
export type WingPlanGridData = {
  shiftLength: 9 | 21;
  days: Record<string, { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }>;
};

export interface IUserData {
  profile: IUserProfile;
  progress: Record<BadgeLevelId, ILevelProgress>; // The main progress map
  favorites: BadgeFavoriteId[];
  likedBadges?: string[]; // Array of BadgeBaseId
  selectedSkins?: Record<BadgeBaseId, BadgeSkinId | string>; // static skins + ai:1..ai:3, custom art lives in customBadgeImages
  customBadgeImages?: Record<BadgeBaseId, string>; // data URL for "Мой арт" per badge base
  generatedBadgeSkins?: Record<BadgeBaseId, string[]>; // generated AI skins per badge, max 3
  approvedBadgeSkins?: Record<BadgeBaseId, string[]>; // approved user arts per badge base, max 3
  badgeArtProposals?: IBadgeArtProposal[]; // uploaded arts pending moderation
  inspectorProgress?: {
    currentDay: number;
    completedTasks: Record<string, string[]>; // "dayIndex" -> ["taskIndex1", "taskIndex2"]
  };
  broProgress?: {
    isBro: boolean;
    hasPassport: boolean;
    currentDay: number;
    completedDeeds: Record<string, string[]>;
    isWingMentor?: boolean; // For "Black Bro" status
    wingId?: string; // ID of the wing user belongs to or mentors
    wingName?: string; // Название Крыла
    wingAvatar?: string; // data URL — аватар Крыла
    wingPlanGridA?: WingPlanGridData; // План Крыла: сетка 1
    wingPlanGridB?: WingPlanGridData; // План Крыла: сетка 2
    hasBlackBadge?: boolean;
  };
  diaryProgress?: {
    currentDay: number; // 1..N, virtual "day of shift"
    squad?: {
      name?: string;
      motto?: string;
      chants?: string;
      greeting?: string;
      memes?: string;
      photoCorner?: string;   // Фото отрядного уголка
      photoFlag?: string;     // Флаг отряда
      photoSquad?: string;    // Общее отрядное фото
      photoWithCounselors?: string; // Фото с вожатыми
      planGridA?: {
        shiftLength: 9 | 21;
        days: Record<string, { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }>;
      };
      planGridB?: {
        shiftLength: 9 | 21;
        days: Record<string, { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }>;
      };
      flagBadgeRequests?: Array<{
        badgeId: string;
        status: 'pending' | 'approved' | 'rejected';
        requestedBy?: string;
        requestedAt: string;
        evidence?: { reflection?: string; impact?: string; link?: string };
        resolvedAt?: string;
      }>;
      flagBadgesApproved?: string[];
    };
    shiftSchedule?: Partial<Record<ShiftScheduleKey, { time?: string; note?: string }>>;
    myActivities?: Partial<Record<MyActivityKey, { time?: string; note?: string }>>;
    entries: Record<string, {
      mainMoments?: string;
      friends?: string;
      conclusions?: string;
      morningText?: string;
      morningEmoji?: string;
      dayText?: string;
      dayEmoji?: string;
      eveningText?: string;
      eveningEmoji?: string;
      memorableText?: string;  // Чем запомнился день
      memorableEmoji?: string;
      schedule?: string;      // Беспорядок дня
      updatedAt: string; // ISO
    }>;
  };
  meta: {
    schemaVersion: number; // 2
    lastSyncedAt: string;
    hasCompletedTutorial?: boolean;
    lastSeenRankLevel?: number; // levels at which user last dismissed Rank Up overlay
    squadArchitectScenario?: {
      name: string;
      traditions: string[];
      generatedAt: string; // ISO
    };
  };
  /** Планы получения значков (персонализированные проекты) */
  badgePlans?: Record<string, IBadgePlan>;
  /** Чек-лист «Путеводные огни» (Вожатификатор): отмеченные пункты по id */
  vozhatifikatorChecklist?: { completedIds: string[] };
}

/** Payload for "parent report" — only achieved progress + minimal profile, for viewing by parent (file or ?parent_view= link). */
export interface ParentReportPayload {
  progress: Record<string, ILevelProgress>;
  profile?: { nickname?: string; totalLevelsAchieved?: number };
  exportedAt: string; // ISO date
}

/** Build parent report payload from userData (only achieved levels). */
export function buildParentReportPayload(userData: IUserData | null): ParentReportPayload | null {
  if (!userData?.progress) return null;
  const achieved: Record<string, ILevelProgress> = {};
  for (const [levelId, p] of Object.entries(userData.progress)) {
    if (p?.status === 'achieved') achieved[levelId] = p;
  }
  return {
    progress: achieved,
    profile: userData.profile ? { nickname: userData.profile.nickname, totalLevelsAchieved: userData.profile.stats?.totalLevelsAchieved } : undefined,
    exportedAt: new Date().toISOString(),
  };
}

// Helper to determine rank based on levels
export const getRank = (levels: number): string => {
  if (levels < 6) return 'Участник 🎒';
  if (levels < 16) return 'Организатор 📋';
  if (levels < 31) return 'Мастер ⚡';
  if (levels < 51) return 'Легенда 🌟';
  return 'Создатель Пути 🌌';
};

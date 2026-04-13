/**
 * Отряд вожатых (counselor squad) — создаётся руководителем смены/организатором.
 * MVP: локальное хранилище, без бэкенда.
 */

export interface CounselorSquadCreated {
  id: string;
  name: string;
  createdAt: string;
  /** Код приглашения: base64(JSON.stringify({ id, name })) */
  inviteCode: string;
}

export interface CounselorSquadJoined {
  squadId: string;
  squadName: string;
}

export interface CounselorSquadPlanGridData {
  shiftLength: 9 | 21;
  days: Record<
    string,
    { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }
  >;
}

export interface CounselorFlagBadgeRequest {
  badgeId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  requestedBy?: string;
  evidence?: { reflection?: string; impact?: string; link?: string };
  resolvedAt?: string;
}

export interface CounselorSquadCardData {
  name?: string;
  motto?: string;
  chants?: string;
  greeting?: string;
  memes?: string;
  photoCorner?: string;
  photoFlag?: string;
  photoSquad?: string;
  photoWithCounselors?: string;
  planGridA?: CounselorSquadPlanGridData;
  planGridB?: CounselorSquadPlanGridData;
  flagBadgeRequests?: CounselorFlagBadgeRequest[];
  flagBadgesApproved?: string[];
}

export interface CounselorSquadContextType {
  /** Созданный мной отряд (для shift_leader / developer) */
  myCreatedSquad: CounselorSquadCreated | null;
  /** Отряд, в который я вошёл по коду (для counselor и др.) */
  myJoinedSquad: CounselorSquadJoined | null;
  /** ID активного отряда (созданного или присоединённого) */
  activeSquadId: string | null;
  /** Название активного отряда */
  activeSquadName: string | null;
  /** Карточка активного отряда (данные вкладок) */
  activeSquadCard: CounselorSquadCardData | null;
  createSquad: (name: string) => void;
  deleteSquad: () => void;
  getInviteCode: () => string;
  getInviteLink: () => string;
  joinByCode: (code: string) => boolean;
  leaveSquad: () => void;
  updateActiveSquadCard: (fields: Partial<CounselorSquadCardData>) => void;
  approveActiveFlagBadgeRequest: (badgeId: string) => void;
  addOrUpdateActiveFlagBadgeRequest: (req: CounselorFlagBadgeRequest) => void;
}

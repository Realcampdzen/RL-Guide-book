export interface TeamMember {
  id: string;
  nickname: string;
  avatar?: string;
  rank: string;
}

export type TeamPlanGridData = {
  shiftLength: 9 | 21;
  days: Record<string, { morning?: string; quietHour?: string; day?: string; evening?: string; night?: string }>;
};

export type TeamScope = 'camp' | 'shift' | 'squad';

export interface TeamData {
  id: string;
  name: string;
  motto: string;
  logo: string; // Emoji or image URL
  flagImage?: string; // data URL or URL — флаг Движка
  gerbImage?: string; // data URL or URL — герб/визуал Движка (ИИ или загрузка)
  leaderId: string;
  members: TeamMember[];
  createdAt: string;
  achievements: string[]; // Badge IDs
  goals: string[]; // Badge IDs (1-3 goals)
  scope?: TeamScope;
  shiftId?: string;
  squadId?: string;
  planGridA?: TeamPlanGridData;
  planGridB?: TeamPlanGridData;
}

export interface TeamContextType {
  myTeam: TeamData | null;
  isLoading: boolean;
  loadError: string | null;
  createTeam: (data: Omit<TeamData, 'id' | 'createdAt' | 'members' | 'achievements'>) => Promise<void>;
  updateTeam: (patch: Partial<TeamData>) => void;
  joinTeam: (teamId: string, options?: { nickname?: string; avatar?: string }) => Promise<boolean>;
  leaveTeam: () => Promise<void>;
  deleteTeam: () => Promise<void>;
  syncTeam: () => Promise<void>;
  generateInviteUrl: () => string;
}

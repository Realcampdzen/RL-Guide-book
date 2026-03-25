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

export interface Initiative {
  id: string;
  teamId: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  votes: Record<string, boolean>;
  status: 'voting' | 'approved' | 'sent_to_council' | 'rejected';
  totalMembers: number;
  sentAt?: string;
  sentBy?: string;
}

export type EngineProjectStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'rejected';

export interface EngineProject {
  id: string;
  teamId: string;
  title: string;
  description: string;
  plan: string;
  targetBadgeId?: string;    // e.g. "8.1", "8.2" — badge from Category 8
  status: EngineProjectStatus;
  // Deliverables
  photos: string[];
  reflection: string;
  scenario: string;
  // Meta
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
}

export interface TeamContextType {
  // Multi-team state
  myTeams: TeamData[];
  activeTeam: TeamData | null;
  activeTeamId: string | null;
  setActiveTeam: (teamId: string) => void;
  // Legacy compat alias
  myTeam: TeamData | null;
  isLoading: boolean;
  loadError: string | null;
  createTeam: (data: Omit<TeamData, 'id' | 'createdAt' | 'members' | 'achievements'>) => Promise<TeamData | undefined>;
  updateTeam: (patch: Partial<TeamData>, teamId?: string) => void;
  joinTeam: (teamId: string, options?: { nickname?: string; avatar?: string }) => Promise<boolean>;
  leaveTeam: (teamId?: string) => Promise<void>;
  deleteTeam: (teamId?: string) => Promise<void>;
  syncTeam: () => Promise<void>;
  generateInviteUrl: (teamId?: string) => string;
}


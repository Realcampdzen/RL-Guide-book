import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TeamData, TeamContextType } from '../types/teams';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from './AuthContext';
import { fireOn401 } from '../utils/authStorage';
import { getRank } from '../types/userProgress';

function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  return useLocal ? '' : ((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '');
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const TEAMS_STORAGE_KEY = 'rl_my_teams_v2';
const ACTIVE_TEAM_KEY = 'rl_active_team_id';

const isDataUrl = (s: string | undefined): boolean => !!s && s.startsWith('data:');

/** Build a storage-safe copy of the team: strip data URLs to avoid QuotaExceededError. */
function slimTeamForStorage(team: TeamData): TeamData {
  return {
    ...team,
    logo: isDataUrl(team.logo) ? '' : team.logo,
    flagImage: team.flagImage && isDataUrl(team.flagImage) ? undefined : team.flagImage,
    gerbImage: team.gerbImage && isDataUrl(team.gerbImage) ? undefined : team.gerbImage,
    members: team.members.map(m => ({
      ...m,
      avatar: isDataUrl(m.avatar) ? undefined : m.avatar
    }))
  };
}

function persistTeamsCache(teams: TeamData[]) {
  try {
    const slim = teams.map(slimTeamForStorage);
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(slim));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error('Слишком много данных в Движках.', e);
    }
  }
}

function loadTeamsFromStorage(): TeamData[] {
  try {
    const stored = localStorage.getItem(TEAMS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
    // Legacy migration: try old single-team key
    const legacy = localStorage.getItem('rl_my_team_v1');
    if (legacy) {
      try {
        const team = JSON.parse(legacy);
        if (team && team.id) return [team];
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return [];
}

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userData } = useUserProgress();
  const { accessToken, deviceId } = useAuth();
  const [myTeams, setMyTeams] = useState<TeamData[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(() => {
    try { return localStorage.getItem(ACTIVE_TEAM_KEY) || null; } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activeTeam = myTeams.find(t => t.id === activeTeamId) || myTeams[0] || null;
  // Legacy compat alias
  const myTeam = activeTeam;

  const setActiveTeam = useCallback((teamId: string) => {
    setActiveTeamId(teamId);
    try { localStorage.setItem(ACTIVE_TEAM_KEY, teamId); } catch { /* ignore */ }
  }, []);

  // Build auth headers — always include X-Device-Id so sandbox mode works too
  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'X-Device-Id': deviceId };
    if (accessToken) h['Authorization'] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken, deviceId]);

  // Load: always attempt server fetch, fallback to localStorage on network error
  useEffect(() => {
    setLoadError(null);
    setIsLoading(true);
    fetch(`${getApiBase()}/api/teams/mine`, { headers: authHeaders() })
      .then(res => {
        if (res.status === 401) { if (accessToken) fireOn401(); return Promise.reject(new Error('auth')); }
        if (res.ok) return res.json();
        setLoadError('Не удалось загрузить Движки. Попробуйте позже.');
        return Promise.reject(new Error('server'));
      })
      .then((data: TeamData[]) => {
        if (Array.isArray(data)) {
          setLoadError(null);
          setMyTeams(data);
          persistTeamsCache(data);
        }
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.message === 'auth') return;
        if (!(e instanceof Error && e.message === 'server')) {
          // Network error — fall back to localStorage
          setLoadError(null);
          setMyTeams(loadTeamsFromStorage());
        }
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, deviceId]);

  // Persist on change
  useEffect(() => {
    try {
      persistTeamsCache(myTeams);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.error('Слишком много данных в Движках.');
      } else {
        throw e;
      }
    }
  }, [myTeams]);

  const syncTeam = useCallback(async () => {
    setLoadError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/teams/mine`, { headers: authHeaders() });
      if (res.status === 401) { if (accessToken) fireOn401(); return; }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLoadError(null);
          setMyTeams(data);
          persistTeamsCache(data);
        }
      } else {
        setLoadError('Не удалось загрузить Движки. Попробуйте позже.');
      }
    } catch {
      setLoadError('Ошибка сети. Проверьте подключение и нажмите «Повторить».');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, authHeaders]);

  const createTeam = async (data: Omit<TeamData, 'id' | 'createdAt' | 'members' | 'achievements'>): Promise<TeamData | undefined> => {
    const profile = userData?.profile;
    const memberNickname = profile?.nickname ?? 'Искатель';
    const memberAvatar = profile?.avatar;
    const totalLevels = profile?.stats?.totalLevelsAchieved ?? 0;
    const rank = getRank(totalLevels);

    if (myTeams.length >= 3) {
      throw new Error('max_teams');
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name: data.name,
          motto: data.motto,
          logo: data.logo,
          goals: data.goals ?? [],
          scope: data.scope ?? 'camp',
          shiftId: data.shiftId,
          squadId: data.squadId,
          nickname: memberNickname,
          avatar: memberAvatar ?? '',
          rank
        })
      });
      if (res.status === 401) { if (accessToken) fireOn401(); return undefined; }
      if (res.status === 409) {
        const err = await res.json().catch(() => ({}));
        const code = (err?.code || err?.error || '').toLowerCase();
        throw new Error(code.includes('max_teams') ? 'max_teams' : 'Conflict');
      }
      if (!res.ok) throw new Error(res.statusText);
      const team = await res.json();
      setMyTeams(prev => [...prev, team]);
      setActiveTeam(team.id);
      return team as TeamData;
    } finally {
      setIsLoading(false);
    }
  };

  const joinTeam = async (teamId: string, options?: { nickname?: string; avatar?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/teams/${encodeURIComponent(teamId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          nickname: options?.nickname ?? userData?.profile?.nickname ?? 'Искатель',
          avatar: options?.avatar ?? userData?.profile?.avatar ?? ''
        })
      });
      if (res.status === 401) { if (accessToken) fireOn401(); return false; }
      if (res.status === 404) return false;
      if (res.status === 409) {
        throw new Error('max_teams');
      }
      if (!res.ok) throw new Error('server_or_network');
      const team = await res.json();
      setMyTeams(prev => {
        const exists = prev.find(t => t.id === team.id);
        return exists ? prev.map(t => t.id === team.id ? team : t) : [...prev, team];
      });
      setActiveTeam(team.id);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeam = (patch: Partial<TeamData>, teamId?: string) => {
    const targetId = teamId || activeTeamId || myTeams[0]?.id;
    if (!targetId) return;

    setMyTeams(prev => prev.map(t => t.id === targetId ? { ...t, ...patch } : t));

    const body: Record<string, unknown> = {};
    const allowed = ['name', 'motto', 'logo', 'goals', 'achievements', 'flagImage', 'gerbImage', 'planGridA', 'planGridB'];
    allowed.forEach(k => { if (k in patch && patch[k as keyof TeamData] !== undefined) body[k] = patch[k as keyof TeamData]; });
    if (Object.keys(body).length === 0) return;
    fetch(`${getApiBase()}/api/teams/${encodeURIComponent(targetId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (res.status === 401) { if (accessToken) fireOn401(); return null; }
        return res.ok ? res.json() : null;
      })
      .then(updated => {
        if (updated) {
          setMyTeams(prev => prev.map(t => t.id === targetId ? updated : t));
        }
      })
      .catch(() => {});
  };

  const leaveTeam = async (teamId?: string) => {
    const targetId = teamId || activeTeamId || myTeams[0]?.id;
    if (!targetId) return;

    try {
      const res = await fetch(`${getApiBase()}/api/teams/${encodeURIComponent(targetId)}/leave`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.status === 401 && accessToken) { fireOn401(); return; }
    } catch {
      // still clear locally
    }
    setMyTeams(prev => {
      const remaining = prev.filter(t => t.id !== targetId);
      if (activeTeamId === targetId) {
        const next = remaining[0]?.id || null;
        setActiveTeamId(next);
        if (next) { try { localStorage.setItem(ACTIVE_TEAM_KEY, next); } catch { /* */ } }
        else { try { localStorage.removeItem(ACTIVE_TEAM_KEY); } catch { /* */ } }
      }
      return remaining;
    });
  };

  const deleteTeam = async (teamId?: string) => {
    const targetId = teamId || activeTeamId || myTeams[0]?.id;
    if (!targetId) return;
    const team = myTeams.find(t => t.id === targetId);
    if (!team) return;

    try {
      const res = await fetch(`${getApiBase()}/api/teams/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.status === 401 && accessToken) { fireOn401(); return; }
    } catch {
      // still clear locally
    }
    setMyTeams(prev => {
      const remaining = prev.filter(t => t.id !== targetId);
      if (activeTeamId === targetId) {
        const next = remaining[0]?.id || null;
        setActiveTeamId(next);
        if (next) { try { localStorage.setItem(ACTIVE_TEAM_KEY, next); } catch { /* */ } }
        else { try { localStorage.removeItem(ACTIVE_TEAM_KEY); } catch { /* */ } }
      }
      return remaining;
    });
  };

  const generateInviteUrl = useCallback((teamId?: string) => {
    const targetId = teamId || activeTeamId;
    const team = targetId ? myTeams.find(t => t.id === targetId) : myTeams[0];
    if (!team) return window.location.origin + window.location.pathname;

    const sharedData = {
      id: team.id,
      name: team.name,
      motto: team.motto,
      logo: team.logo,
      goals: team.goals
    };

    const base64 = btoa(JSON.stringify(sharedData));
    const url = new URL(window.location.href);
    url.searchParams.set('engine', base64);
    return url.toString();
  }, [myTeams, activeTeamId]);

  return (
    <TeamContext.Provider value={{
      myTeams, activeTeam, activeTeamId, setActiveTeam,
      myTeam, isLoading, loadError,
      createTeam, updateTeam, joinTeam, leaveTeam, deleteTeam,
      syncTeam, generateInviteUrl
    }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

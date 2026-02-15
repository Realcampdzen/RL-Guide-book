import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TeamData, TeamContextType } from '../types/teams';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAuth } from './AuthContext';
import { fireOn401 } from '../utils/authStorage';
import { getRank } from '../types/userProgress';

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const TEAM_STORAGE_KEY = 'rl_my_team_v1';

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

function persistTeamCache(team: TeamData | null) {
  try {
    if (team) {
      const slim = slimTeamForStorage(team);
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(slim));
    } else {
      localStorage.removeItem(TEAM_STORAGE_KEY);
    }
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      console.error('Слишком много данных в Движке.', e);
    }
  }
}

export const TeamProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userData } = useUserProgress();
  const { accessToken, deviceId } = useAuth();
  const [myTeam, setMyTeam] = useState<TeamData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load: with token -> GET /api/teams/mine; without token -> localStorage only
  useEffect(() => {
    if (accessToken) {
      setLoadError(null);
      setIsLoading(true);
      fetch('/api/teams/mine', { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(res => {
          if (res.status === 401) { fireOn401(); return Promise.reject(new Error('auth')); }
          if (res.ok) return res.json();
          if (res.status === 404) return null;
          setLoadError('Не удалось загрузить Движок. Попробуйте позже.');
          return Promise.reject(new Error('server'));
        })
        .then((data: TeamData | null) => {
          if (data !== undefined) {
            setLoadError(null);
            setMyTeam(data);
            persistTeamCache(data);
          }
        })
        .catch((e: unknown) => {
          if (e instanceof Error && e.message === 'auth') return;
          if (!(e instanceof Error && e.message === 'server')) {
            setLoadError('Ошибка сети. Проверьте подключение и нажмите «Повторить».');
          }
        })
        .finally(() => setIsLoading(false));
    } else {
      setLoadError(null);
      const stored = localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) {
        try {
          setMyTeam(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse team data', e);
        }
      }
    }
  }, [accessToken]);

  // Save to LocalStorage on change (slim payload: no data URLs to avoid QuotaExceededError)
  useEffect(() => {
    try {
      if (myTeam) {
        const slim = slimTeamForStorage(myTeam);
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(slim));
      } else {
        localStorage.removeItem(TEAM_STORAGE_KEY);
      }
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        console.error('Слишком много данных в Движке. Удалите фото флага/логотипа или освободите место (резервная копия и очистка прогресса).');
        alert('Не удалось сохранить Движок: недостаточно места в браузере. Удалите фото флага или логотипа Движка, либо сделайте резервную копию и очистите прогресс в Личном кабинете.');
      } else {
        throw e;
      }
    }
  }, [myTeam]);

  const syncTeam = useCallback(async () => {
    if (accessToken) {
      setLoadError(null);
      setIsLoading(true);
      try {
        const res = await fetch('/api/teams/mine', { headers: { Authorization: `Bearer ${accessToken}` } });
        if (res.status === 401) { fireOn401(); return; }
        if (res.ok) {
          const data = await res.json();
          setLoadError(null);
          setMyTeam(data);
          persistTeamCache(data);
        } else if (res.status === 404) {
          setLoadError(null);
          setMyTeam(null);
          persistTeamCache(null);
        } else {
          setLoadError('Не удалось загрузить Движок. Попробуйте позже.');
        }
      } catch {
        setLoadError('Ошибка сети. Проверьте подключение и нажмите «Повторить».');
      } finally {
        setIsLoading(false);
      }
    }
    const params = new URLSearchParams(window.location.search);
    const engineData = params.get('engine');
    if (engineData) {
      try {
        const decoded = JSON.parse(atob(engineData));
        if (decoded && decoded.name && decoded.id) {
          console.log('Detected engine invitation:', decoded);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [accessToken]);

  const createTeam = async (data: Omit<TeamData, 'id' | 'createdAt' | 'members' | 'achievements'>) => {
    const profile = userData?.profile;
    const memberId = profile?.id ?? 'local';
    const memberNickname = profile?.nickname ?? 'Искатель';
    const memberAvatar = profile?.avatar;
    const totalLevels = profile?.stats?.totalLevelsAchieved ?? 0;
    const rank = getRank(totalLevels);

    if (accessToken) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            name: data.name,
            motto: data.motto,
            logo: data.logo,
            goals: data.goals ?? [],
            nickname: memberNickname,
            avatar: memberAvatar ?? '',
            rank
          })
        });
        if (res.status === 401) { fireOn401(); return; }
        if (res.status === 409) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error === 'Already in a team' ? 'already_in_team' : 'Conflict');
        }
        if (!res.ok) throw new Error(res.statusText);
        const team = await res.json();
        setMyTeam(team);
        persistTeamCache(team);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    const teamId = `T-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const newTeam: TeamData = {
      ...data,
      id: teamId,
      createdAt: new Date().toISOString(),
      achievements: [],
      members: [{ id: memberId, nickname: memberNickname, avatar: memberAvatar, rank }]
    };
    setMyTeam(newTeam);
    setIsLoading(false);
  };

  const joinTeam = async (teamId: string, options?: { nickname?: string; avatar?: string }) => {
    if (accessToken) {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(teamId)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            nickname: options?.nickname ?? userData?.profile?.nickname ?? 'Искатель',
            avatar: options?.avatar ?? userData?.profile?.avatar ?? ''
          })
        });
        if (res.status === 401) { fireOn401(); return false; }
        if (res.status === 404) {
          return false;
        }
        if (res.status === 409) {
          throw new Error('already_in_another_team');
        }
        if (!res.ok) {
          throw new Error('server_or_network');
        }
        const team = await res.json();
        setMyTeam(team);
        persistTeamCache(team);
        return true;
      } finally {
        setIsLoading(false);
      }
    }
    console.log('Join team requested for:', teamId);
    return true;
  };

  const updateTeam = (patch: Partial<TeamData>) => {
    setMyTeam(prev => (prev ? { ...prev, ...patch } : null));
    if (accessToken && myTeam) {
      const body: Record<string, unknown> = {};
      const allowed = ['name', 'motto', 'logo', 'goals', 'achievements', 'flagImage', 'gerbImage', 'planGridA', 'planGridB'];
      allowed.forEach(k => { if (k in patch && patch[k as keyof TeamData] !== undefined) body[k] = patch[k as keyof TeamData]; });
      if (Object.keys(body).length === 0) return;
      fetch(`/api/teams/${encodeURIComponent(myTeam.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body)
      })
        .then(res => {
          if (res.status === 401) { fireOn401(); return null; }
          return res.ok ? res.json() : null;
        })
        .then(updated => { if (updated) setMyTeam(updated); persistTeamCache(updated || null); })
        .catch(() => {});
    }
  };

  const leaveTeam = async () => {
    if (accessToken && myTeam) {
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(myTeam.id)}/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` } 
        });
        if (res.status === 401) { fireOn401(); return; }
      } catch {
        // still clear locally
      }
      setMyTeam(null);
      persistTeamCache(null);
      return;
    }
    setMyTeam(null);
  };

  const deleteTeam = async () => {
    if (accessToken && myTeam && myTeam.leaderId === deviceId) {
      try {
        const res = await fetch(`/api/teams/${encodeURIComponent(myTeam.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (res.status === 401) { fireOn401(); return; }
      } catch {
        // still clear locally
      }
      setMyTeam(null);
      persistTeamCache(null);
      return;
    }
    setMyTeam(null);
  };

  const generateInviteUrl = useCallback(() => {
    if (!myTeam) return window.location.origin + window.location.pathname;
    
    // We encode basic team info (ID, Name, Motto, Logo, Goals) into Base64
    const sharedData = {
      id: myTeam.id,
      name: myTeam.name,
      motto: myTeam.motto,
      logo: myTeam.logo,
      goals: myTeam.goals
    };
    
    const base64 = btoa(JSON.stringify(sharedData));
    const url = new URL(window.location.href);
    url.searchParams.set('engine', base64);
    return url.toString();
  }, [myTeam]);

  return (
    <TeamContext.Provider value={{ myTeam, isLoading, loadError, createTeam, updateTeam, joinTeam, leaveTeam, deleteTeam, syncTeam, generateInviteUrl }}>
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

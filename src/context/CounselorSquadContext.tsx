import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type {
  CounselorSquadCreated,
  CounselorSquadJoined,
  CounselorSquadContextType,
  CounselorSquadCardData,
  CounselorFlagBadgeRequest
} from '../types/counselorSquad';

const CounselorSquadContext = createContext<CounselorSquadContextType | undefined>(undefined);

const CREATED_STORAGE_KEY = 'rl_counselor_squad_created_v1';
const JOINED_STORAGE_KEY = 'rl_counselor_squad_joined_v1';
const CARDS_STORAGE_KEY = 'rl_counselor_squad_cards_v1';

function makeInviteCode(id: string, name: string): string {
  return typeof btoa !== 'undefined' ? btoa(JSON.stringify({ id, name })) : '';
}

function parseInviteCode(code: string): { id: string; name: string } | null {
  try {
    const decoded = JSON.parse(typeof atob !== 'undefined' ? atob(code.trim()) : '{}');
    return decoded && typeof decoded.id === 'string' && typeof decoded.name === 'string'
      ? { id: decoded.id, name: decoded.name }
      : null;
  } catch {
    return null;
  }
}

export const CounselorSquadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [myCreatedSquad, setMyCreatedSquad] = useState<CounselorSquadCreated | null>(null);
  const [myJoinedSquad, setMyJoinedSquad] = useState<CounselorSquadJoined | null>(null);
  const [cards, setCards] = useState<Record<string, CounselorSquadCardData>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CREATED_STORAGE_KEY);
      if (raw) setMyCreatedSquad(JSON.parse(raw));
      const rawJoined = localStorage.getItem(JOINED_STORAGE_KEY);
      if (rawJoined) setMyJoinedSquad(JSON.parse(rawJoined));
      const rawCards = localStorage.getItem(CARDS_STORAGE_KEY);
      if (rawCards) setCards(JSON.parse(rawCards));
    } catch (e) {
      console.error('Failed to load counselor squad', e);
    }
  }, []);

  // При открытии ссылки-приглашения (?counselor_squad=CODE) — вступить в отряд и убрать параметр из URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('counselor_squad');
    if (!code) return;
    const parsed = parseInviteCode(code);
    if (parsed) {
      setMyJoinedSquad({ squadId: parsed.id, squadName: parsed.name });
      const url = new URL(window.location.href);
      url.searchParams.delete('counselor_squad');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (myCreatedSquad) {
        localStorage.setItem(CREATED_STORAGE_KEY, JSON.stringify(myCreatedSquad));
      } else {
        localStorage.removeItem(CREATED_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save counselor squad', e);
    }
  }, [myCreatedSquad]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (myJoinedSquad) {
        localStorage.setItem(JOINED_STORAGE_KEY, JSON.stringify(myJoinedSquad));
      } else {
        localStorage.removeItem(JOINED_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save joined squad', e);
    }
  }, [myJoinedSquad]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      console.error('Failed to save counselor squad cards', e);
    }
  }, [cards]);

  const activeSquadId = myCreatedSquad?.id ?? myJoinedSquad?.squadId ?? null;
  const activeSquadName = myCreatedSquad?.name ?? myJoinedSquad?.squadName ?? null;
  const activeSquadCard = useMemo(() => (activeSquadId ? (cards[activeSquadId] ?? null) : null), [activeSquadId, cards]);

  const createSquad = useCallback((name: string) => {
    const id = `S-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const inviteCode = makeInviteCode(id, name.trim());
    setMyCreatedSquad({
      id,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      inviteCode
    });
    setCards((prev) => ({ ...prev, [id]: { name: name.trim() } }));
  }, []);

  const deleteSquad = useCallback(() => {
    const squadId = myCreatedSquad?.id;
    setMyCreatedSquad(null);
    if (squadId) {
      setCards((prev) => {
        const next = { ...prev };
        delete next[squadId];
        return next;
      });
      if (myJoinedSquad?.squadId === squadId) {
        setMyJoinedSquad(null);
      }
    }
  }, [myCreatedSquad?.id, myJoinedSquad?.squadId]);

  const getInviteCode = useCallback(() => {
    return myCreatedSquad?.inviteCode ?? '';
  }, [myCreatedSquad]);

  const getInviteLink = useCallback(() => {
    const code = myCreatedSquad?.inviteCode;
    if (!code) return window.location.origin + window.location.pathname;
    const url = new URL(window.location.href);
    url.searchParams.set('counselor_squad', code);
    return url.toString();
  }, [myCreatedSquad]);

  const joinByCode = useCallback((code: string): boolean => {
    const parsed = parseInviteCode(code);
    if (!parsed) return false;
    setMyJoinedSquad({ squadId: parsed.id, squadName: parsed.name });
    return true;
  }, []);

  const leaveSquad = useCallback(() => {
    setMyJoinedSquad(null);
  }, []);

  const updateActiveSquadCard = useCallback((fields: Partial<CounselorSquadCardData>) => {
    if (!activeSquadId) return;
    setCards((prev) => {
      const current = prev[activeSquadId] ?? {};
      return { ...prev, [activeSquadId]: { ...current, ...fields } };
    });
  }, [activeSquadId]);

  const approveActiveFlagBadgeRequest = useCallback((badgeId: string) => {
    if (!activeSquadId) return;
    setCards((prev) => {
      const current = prev[activeSquadId] ?? {};
      const requests = (current.flagBadgeRequests ?? []).map((r) =>
        r.badgeId === badgeId ? { ...r, status: 'approved' as const, resolvedAt: new Date().toISOString() } : r
      );
      const approved = [...(current.flagBadgesApproved ?? []), badgeId].filter((id, i, arr) => arr.indexOf(id) === i);
      return { ...prev, [activeSquadId]: { ...current, flagBadgeRequests: requests, flagBadgesApproved: approved } };
    });
  }, [activeSquadId]);

  const addOrUpdateActiveFlagBadgeRequest = useCallback((req: CounselorFlagBadgeRequest) => {
    if (!activeSquadId) return;
    setCards((prev) => {
      const current = prev[activeSquadId] ?? {};
      const requests = current.flagBadgeRequests ?? [];
      const existing = requests.findIndex((r) => r.badgeId === req.badgeId);
      const nextRequests = existing >= 0
        ? requests.map((r, i) => (i === existing ? req : r))
        : [...requests, req];
      return { ...prev, [activeSquadId]: { ...current, flagBadgeRequests: nextRequests } };
    });
  }, [activeSquadId]);

  const value: CounselorSquadContextType = {
    myCreatedSquad,
    myJoinedSquad,
    activeSquadId,
    activeSquadName,
    activeSquadCard,
    createSquad,
    deleteSquad,
    getInviteCode,
    getInviteLink,
    joinByCode,
    leaveSquad,
    updateActiveSquadCard,
    approveActiveFlagBadgeRequest,
    addOrUpdateActiveFlagBadgeRequest
  };

  return (
    <CounselorSquadContext.Provider value={value}>
      {children}
    </CounselorSquadContext.Provider>
  );
};

export const useCounselorSquad = (): CounselorSquadContextType => {
  const ctx = useContext(CounselorSquadContext);
  if (ctx === undefined) {
    throw new Error('useCounselorSquad must be used within CounselorSquadProvider');
  }
  return ctx;
};

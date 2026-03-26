import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BadgeIcon from './BadgeIcon';
import { useTeam } from '../context/TeamContext';
import { useUserProgress } from '../hooks/useUserProgress';
import {
  createInitiative,
  fetchInitiatives,
  updateInitiativeStatus,
  deleteInitiative,
  voteInitiative,
  fetchProtocols,
  createProtocol,
  fetchMembers,
  addMember,
  removeMember,
  getInitiativeComments,
  postInitiativeComment,
} from '../utils/councilApi';
import { submitEngineJoinRequest } from '../utils/adminApi';
import type { CouncilProtocol, CouncilMember, InitiativeComment } from '../utils/councilApi';

const COUNCIL_ACCENT = '#FFD700';
const COUNCIL_ACCENT_LIGHT = 'rgba(255, 215, 0, 0.2)';
const COUNCIL_GRADIENT = 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(184, 134, 11, 0.12) 100%)';

const mapLegacyInitiativeStatus = (raw?: string): InitiativeStatus => {
  const s = (raw || '').trim().toLowerCase();
  if (s === 'new' || s === 'reviewing' || s === 'accepted' || s === 'rejected' || s === 'done') return s;
  if (s === 'idea' || s === 'draft') return 'new';
  if (s === 'discussion' || s === 'in_review' || s === 'under_review') return 'reviewing';
  if (s === 'approved' || s === 'accepted_v1') return 'accepted';
  if (s === 'declined' || s === 'denied') return 'rejected';
  if (s === 'implemented' || s === 'completed') return 'done';
  return 'new';
};



export type CouncilTabId = 'council' | 'engines' | 'camp-management' | 'badge' | 'management';

type TeamListItem = {
  id: string;
  name: string;
  motto?: string;
  members?: Array<{ id?: string }>;
};

type InitiativeStatus = 'new' | 'reviewing' | 'accepted' | 'rejected' | 'done';
type InitiativeItem = {
  id: string;
  title: string;
  createdAt?: string;
  sentAt?: string;
  status?: string;
  readStatus?: InitiativeStatus;
  description?: string;
  votesUp?: number;
  voters?: string[];
  createdByNickname?: string;
  authorNickname?: string;
  authorRole?: string;
  authorWing?: string;
  sourceType?: string;
  teamName?: string;
  teamId?: string;
  sourceInitiativeId?: string;
};

const SERVER_STATUSES = ['idea', 'discussed', 'approved', 'in_progress', 'done'] as const;
const SERVER_STATUS_LABELS: Record<string, string> = {
  idea: 'Идея', proposed: 'Предложена', discussed: 'Обсуждается',
  approved: 'Принята', in_progress: 'В работе', done: 'Выполнена',
};

const KANBAN_COLUMN_COLORS: Record<string, string> = {
  idea: '#FFD700', proposed: '#FF9F43', discussed: '#4EA8DE',
  approved: '#2ECC71', in_progress: '#9B59B6', done: '#636e72',
};


interface CouncilDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: CouncilTabId;
  onTabChange?: (tab: CouncilTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
  onScrollToTeam?: () => void;
  onOpenTeamPanel?: () => void;
  onSuggestInitiative?: () => void;
  /** JWT access token for auth'd API calls */
  accessToken?: string | null;
  /** Whether current user can moderate (staff role) */
  canModerate?: boolean;
}

export const CouncilDashboard: React.FC<CouncilDashboardProps> = ({
  variant = 'accordion',
  activeTab = 'council',
  onTabChange,
  onNavigateToBadge,
  onScrollToTeam,
  onOpenTeamPanel,
  onSuggestInitiative,
  accessToken,
  canModerate = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { myTeam, myTeams, loadError, syncTeam } = useTeam();
  const { userData } = useUserProgress();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState<InitiativeItem[]>([]);
  const [initiativesLoading, setInitiativesLoading] = useState(false);

  const [voteBusy, setVoteBusy] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  // Create initiative modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Initiative detail modal + chat
  const [detailItem, setDetailItem] = useState<InitiativeItem | null>(null);
  const [detailComments, setDetailComments] = useState<InitiativeComment[]>([]);
  const [detailCommentsLoading, setDetailCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);

  // Dashboard: protocols + members
  const [protocols, setProtocols] = useState<CouncilProtocol[]>([]);
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  // Protocol create
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [protoTitle, setProtoTitle] = useState('');
  const [protoDate, setProtoDate] = useState('');
  const [protoSummary, setProtoSummary] = useState('');
  const [protoDecisions, setProtoDecisions] = useState('');
  const [protoParticipants, setProtoParticipants] = useState('');
  const [protoBusy, setProtoBusy] = useState(false);
  // Member add
  const [memberBusy, setMemberBusy] = useState(false);
  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [joinEngineBusyId, setJoinEngineBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

  // Load dashboard data (stats from initiatives + protocols + members)
  useEffect(() => {
    if (variant !== 'cabin' || activeTab !== 'council') return;
    let cancelled = false;
    setDashLoading(true);
    const tok = accessToken || '';
    const load = async () => {
      try {
        const [initData, protoData, membData] = await Promise.allSettled([
          tok ? fetchInitiatives(tok) : fetch('/api/council/initiatives').then(r => r.json()).then(d => d.initiatives || []),
          fetchProtocols(tok),
          fetchMembers(tok),
        ]);
        if (cancelled) return;
        if (initData.status === 'fulfilled') setInitiatives(initData.value as any[]);
        if (protoData.status === 'fulfilled') setProtocols(protoData.value as CouncilProtocol[]);
        if (membData.status === 'fulfilled') setMembers(membData.value as CouncilMember[]);
      } catch { /* silent */ }
      finally { if (!cancelled) setDashLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [variant, activeTab, accessToken]);

  useEffect(() => {
    if (variant !== 'cabin' || activeTab !== 'engines') return;
    let cancelled = false;
    setTeamsLoading(true);
    setTeamsError(null);
    fetch('/api/teams')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const asMap = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {};
        const list = Object.entries(asMap)
          .map(([id, raw]) => {
            const doc = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
            const membersRaw = Array.isArray(doc.members) ? doc.members : [];
            return {
              id: String(doc.id || id),
              name: String(doc.name || id),
              motto: typeof doc.motto === 'string' ? doc.motto : '',
              members: membersRaw.filter((m) => m && typeof m === 'object') as Array<{ id?: string }>
            } as TeamListItem;
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' }));
        setTeams(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setTeams([]);
          setTeamsError(e instanceof Error ? e.message : 'Ошибка загрузки Движков');
        }
      })
      .finally(() => {
        if (!cancelled) setTeamsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [variant, activeTab]);

  const loadInitiatives = useCallback(async () => {
    setInitiativesLoading(true);
    try {
      const items = await fetchInitiatives(accessToken || '');
      const mapped: InitiativeItem[] = items.map((x) => ({
        id: x.id,
        title: x.title,
        createdAt: x.createdAt,
        sentAt: x.sentAt,
        status: x.status,
        readStatus: mapLegacyInitiativeStatus(x.status),
        description: x.description,
        votesUp: x.votesUp ?? 0,
        voters: x.voters ?? [],
        createdByNickname: x.createdByNickname,
        authorNickname: x.authorNickname,
        authorRole: (x as any).authorRole,
        authorWing: (x as any).authorWing,
        sourceType: (x as any).sourceType,
        teamName: x.teamName,
        teamId: x.teamId ?? undefined,
        sourceInitiativeId: x.sourceInitiativeId,
      }));
      setInitiatives(mapped);
    } catch {
      setInitiatives([]);
    } finally {
      setInitiativesLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (variant !== 'cabin' || (activeTab !== 'camp-management' && activeTab !== 'management')) return;
    void loadInitiatives();
  }, [variant, activeTab, loadInitiatives]);

  const displayNickname = useMemo(() => {
    return (userData?.profile?.nickname || 'Искатель').trim() || 'Искатель';
  }, [userData?.profile?.nickname]);

  const openTeamPanel = () => {
    if (onOpenTeamPanel) {
      onOpenTeamPanel();
      return;
    }
    onScrollToTeam?.();
  };

  const isInCouncil = useMemo(() => {
    const nick = (userData?.profile?.nickname || '').trim();
    return nick ? members.some(m => m.nickname === nick) : false;
  }, [userData?.profile?.nickname, members]);

  const buildJoinRequestUrl = (team: TeamListItem) => {
    const now = new Date().toLocaleString('ru-RU');
    const lines = [
      'Заявка на вступление в Движок',
      `Движок: ${team.name}`,
      `ID Движка: ${team.id}`,
      `Участник: ${displayNickname}`,
      `Дата: ${now}`,
      'Прошу передать организатору Движка для подтверждения.'
    ];
    return `https://t.me/Stivanovv?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handleRequestJoinEngine = useCallback(async (team: TeamListItem) => {
    if (!accessToken || joinEngineBusyId) return;
    setJoinEngineBusyId(team.id);
    try {
      const result = await submitEngineJoinRequest({
        engineId: team.id,
        nickname: displayNickname,
      }, accessToken);
      if (result.status === 'already_pending') {
        showToast('Заявка уже отправлена. Ожидайте подтверждения.');
      } else {
        showToast('Заявка отправлена! Ожидайте одобрения.');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка отправки заявки');
    } finally {
      setJoinEngineBusyId(null);
    }
  }, [accessToken, displayNickname, joinEngineBusyId]);

  // --- Dashboard helpers ---
  const initStats = useMemo(() => {
    const total = initiatives.length;
    const byStatus: Record<string, number> = {};
    let totalVotes = 0;
    const authors = new Set<string>();
    for (const item of initiatives) {
      const st = mapLegacyInitiativeStatus((item as any).status || (item as any).readStatus || '');
      byStatus[st] = (byStatus[st] || 0) + 1;
      totalVotes += (item as any).votesUp || 0;
      const nick = (item as any).createdByNickname || (item as any).authorNickname;
      if (nick) authors.add(nick);
    }
    return { total, byStatus, totalVotes, activeAuthors: authors.size };
  }, [initiatives]);

  const handleCreateProtocol = async () => {
    if (!protoTitle.trim()) return;
    setProtoBusy(true);
    try {
      const p = await createProtocol(accessToken || '', {
        title: protoTitle.trim(),
        date: protoDate || undefined,
        summary: protoSummary.trim() || undefined,
        decisions: protoDecisions.split('\n').map(s => s.trim()).filter(Boolean),
        participants: protoParticipants.split(',').map(s => s.trim()).filter(Boolean),
      });
      setProtocols(prev => [p, ...prev]);
      setShowProtocolModal(false);
      setProtoTitle(''); setProtoDate(''); setProtoSummary(''); setProtoDecisions(''); setProtoParticipants('');
    } catch { /* silent */ }
    finally { setProtoBusy(false); }
  };

  const handleJoinCouncil = async () => {
    if (!myTeam) {
      showToast('Сначала вступите в Движок, чтобы войти в Совет');
      return;
    }
    const nick = (userData?.profile?.nickname || 'Искатель').trim() || 'Искатель';
    // Prevent duplicate join on frontend side
    if (members.some(m => m.nickname === nick)) {
      showToast('Вы уже состоите в Совете Лагеря');
      return;
    }
    if (!accessToken) {
      showToast('Для вступления необходимо войти в систему');
      return;
    }
    setMemberBusy(true);
    try {
      const m = await addMember(accessToken, { nickname: nick, role: 'member' });
      setMembers(prev => [m, ...prev]);
      showToast('Вы вступили в Совет Лагеря!');
    } catch (err) {
      console.error('Join council error:', err);
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      showToast(`Не удалось вступить: ${msg}`);
    } finally {
      setMemberBusy(false);
    }
  };

  const handleLeaveCouncil = async () => {
    const nick = (userData?.profile?.nickname || '').trim();
    const myMember = members.find(m => m.nickname === nick);
    if (!myMember) return;
    try {
      await removeMember(accessToken || '', myMember.id);
      setMembers(prev => prev.filter(m => m.id !== myMember.id));
      showToast('Вы покинули Совет Лагеря');
    } catch (err) {
      console.error('Leave council error:', err);
      showToast('Не удалось покинуть Совет');
    }
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await removeMember(accessToken || '', id);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch { /* silent */ }
  };

  const MEMBER_ROLE_LABELS: Record<string, string> = { chair: 'Председатель', secretary: 'Секретарь', member: 'Участник' };
  const MEMBER_ROLE_COLORS: Record<string, string> = { chair: '#FFD700', secretary: '#5de4ff', member: 'rgba(255,255,255,0.7)' };

  const statCardStyle: React.CSSProperties = {
    padding: '14px 16px', borderRadius: 14,
    background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
  };
  const statNumberStyle: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: COUNCIL_ACCENT, lineHeight: 1 };
  const statLabelStyle: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 14, fontWeight: 700, color: '#e8f0ff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
  };

  const councilMainSection = (
    <div className={variant === 'cabin' ? 'council-cabin-section fade-in' : 'fade-in'} style={{ display: 'grid', gap: 16, padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          padding: '10px 24px', borderRadius: 12,
          background: 'rgba(255,215,0,0.92)',
          color: '#1a1a2e', fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>{toast}</div>
      )}
      {/* Statistics cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>{dashLoading ? '—' : initStats.total}</div>
          <div style={statLabelStyle}>Инициатив</div>
        </div>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>{dashLoading ? '—' : initStats.totalVotes}</div>
          <div style={statLabelStyle}>Голосов</div>
        </div>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>{dashLoading ? '—' : (initStats.byStatus['accepted'] || 0) + (initStats.byStatus['done'] || 0)}</div>
          <div style={statLabelStyle}>Принято / Выполнено</div>
        </div>
        <div style={statCardStyle}>
          <div style={statNumberStyle}>{dashLoading ? '—' : members.length || initStats.activeAuthors}</div>
          <div style={statLabelStyle}>{members.length > 0 ? 'Участников' : 'Авторов'}</div>
        </div>
      </div>

      {/* Protocols section */}
      <div>
        {protocols.length === 0 ? (
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            <div style={sectionHeaderStyle}>
              <span>Протоколы заседаний</span>
              {canModerate && (
                <button type="button" onClick={() => setShowProtocolModal(true)}
                  style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)', color: COUNCIL_ACCENT, cursor: 'pointer' }}>
                  + Добавить
                </button>
              )}
            </div>
            Протоколов пока нет.{canModerate ? ' Нажмите «+ Добавить» для создания.' : ''}
          </div>
        ) : (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={sectionHeaderStyle}>
              <span>Протоколы заседаний</span>
              {canModerate && (
                <button type="button" onClick={() => setShowProtocolModal(true)}
                  style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)', color: COUNCIL_ACCENT, cursor: 'pointer' }}>
                  + Добавить
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {protocols.map(p => (
                <div key={p.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' }}
                  onClick={() => setExpandedProtocol(expandedProtocol === p.id ? null : p.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0ff' }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{p.date}</div>
                  </div>
                  {expandedProtocol === p.id && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                      {p.summary && <p style={{ margin: '0 0 8px' }}>{p.summary}</p>}
                      {p.decisions && p.decisions.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, color: COUNCIL_ACCENT, marginBottom: 4 }}>Решения:</div>
                          <ul style={{ margin: 0, paddingLeft: 16 }}>{p.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul>
                        </div>
                      )}
                      {p.participants && p.participants.length > 0 && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Присутствовали: {p.participants.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Members section */}
      <div>
        {!myTeam && members.length === 0 ? (
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            <div style={sectionHeaderStyle}>
              <span>Участники Совета</span>
            </div>
            Чтобы вступить в Совет, нужно сначала состоять в Движке.
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            <div style={sectionHeaderStyle}>
              <span>Участники Совета</span>
            </div>
            Участников пока нет.
          </div>
        ) : (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={sectionHeaderStyle}>
              <span>Участники Совета</span>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
            {members.map(m => {
              const nick = (userData?.profile?.nickname || '').trim();
              const isMe = m.nickname === nick;
              return (
                <div key={m.id} style={{ padding: '10px 14px', borderRadius: 10, background: isMe ? 'rgba(46,204,113,0.06)' : 'rgba(15, 10, 42, 0.12)', border: isMe ? '1px solid rgba(46,204,113,0.15)' : '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,215,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: MEMBER_ROLE_COLORS[m.role] || '#fff', flexShrink: 0 }}>
                    {m.role === 'chair' ? 'П' : m.role === 'secretary' ? 'С' : 'У'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f0ff' }}>{m.nickname}{isMe ? ' (вы)' : ''}</div>
                    <div style={{ fontSize: 11, color: MEMBER_ROLE_COLORS[m.role] || 'rgba(255,255,255,0.5)' }}>{MEMBER_ROLE_LABELS[m.role] || m.role}</div>
                  </div>
                  {canModerate && !isMe && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); void handleRemoveMember(m.id); }}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }} title="Удалить">✕</button>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        )}

        {/* Big join/leave button */}
        {(() => {
          const nick = (userData?.profile?.nickname || '').trim();
          const isInCouncil = members.some(m => m.nickname === nick);
          if (isInCouncil) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button type="button" onClick={() => void handleLeaveCouncil()}
                  style={{
                    padding: '10px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                    background: 'rgba(231,76,60,0.25)', border: '1px solid rgba(231,76,60,0.4)',
                    color: '#fff', cursor: 'pointer',
                  }}>
                  Покинуть Совет
                </button>
              </div>
            );
          }
          if (myTeam) {
            return (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button type="button" disabled={memberBusy} onClick={() => void handleJoinCouncil()}
                  style={{
                    padding: '12px 32px', borderRadius: 14, fontSize: 15, fontWeight: 700,
                    background: 'rgba(46,204,113,0.3)', border: '2px solid rgba(46,204,113,0.5)',
                    color: '#fff', cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(46,204,113,0.2)',
                    transition: 'all 0.2s',
                  }}>
                  {memberBusy ? 'Вступаем…' : 'Вступить в Совет Лагеря'}
                </button>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Protocol create modal */}
      {showProtocolModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowProtocolModal(false)}>
          <div className="cab-card" style={{ maxWidth: 420, width: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 16px', color: COUNCIL_ACCENT, fontSize: 18 }}>Новый протокол</h4>
            <input type="text" placeholder="Название (напр. Заседание #3)" maxLength={200} value={protoTitle} onChange={e => setProtoTitle(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
            <input type="date" value={protoDate} onChange={e => setProtoDate(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
            <textarea placeholder="Краткое содержание" maxLength={5000} value={protoSummary} onChange={e => setProtoSummary(e.target.value)}
              style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, resize: 'vertical', boxSizing: 'border-box' }} />
            <textarea placeholder="Решения (одно на строку)" value={protoDecisions} onChange={e => setProtoDecisions(e.target.value)}
              style={{ width: '100%', minHeight: 50, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, resize: 'vertical', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Участники (через запятую)" value={protoParticipants} onChange={e => setProtoParticipants(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" disabled={protoBusy || !protoTitle.trim()} onClick={() => void handleCreateProtocol()}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)', color: COUNCIL_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {protoBusy ? 'Создаём…' : 'Создать'}
              </button>
              <button type="button" onClick={() => setShowProtocolModal(false)}
                style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );

  const enginesSection = (
    <div className="council-cabin-section fade-in" style={{ display: 'grid', gap: 14, padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {loadError && (
        <div className="profile-error profile-error--not-found">
          Проверь подключение к интернету.
          <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => syncTeam()}>
            Повторить
          </button>
        </div>
      )}
      {teamsLoading ? (
        <p className="profile-loading">Загрузка Движков…</p>
      ) : teamsError ? (
        <div className="profile-error profile-error--not-found">Не удалось загрузить список Движков: {teamsError}</div>
      ) : teams.length === 0 ? (
        <p className="profile-empty-state__text">Пока нет Движков.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {teams.map((team) => {
            const isMine = myTeams.some(t => t.id === team.id);
            const isActive = Boolean(myTeam && myTeam.id === team.id);
            const membersCount = team.members?.length || 0;
            return (
              <article key={team.id} style={{
                display: 'grid', gap: 10, padding: 14, borderRadius: 14,
                background: 'rgba(15, 10, 42, 0.35)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: isMine ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isMine ? '0 0 12px rgba(139, 0, 255, 0.15)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 15 }}>{team.name}</h4>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                    {isActive && <span style={{
                      display: 'inline-flex', alignItems: 'center', borderRadius: 9999, padding: '2px 8px',
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
                      color: '#fff', background: 'rgba(46, 204, 113, 0.4)',
                    }}>Активен</span>}
                    {isMine ? <span style={{
                      display: 'inline-flex', alignItems: 'center', borderRadius: 9999, padding: '2px 8px',
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em',
                      color: '#fff', background: 'rgba(139, 0, 255, 0.4)',
                    }}>Мой Движок</span> : null}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.82 }}>
                  {team.motto || 'Без девиза'}
                </p>
                <div style={{ fontSize: 12, opacity: 0.72 }}>Участников: {membersCount}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isMine ? (
                    <button type="button" className="btn-secondary" onClick={openTeamPanel} style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                      К моему Движку
                    </button>
                  ) : accessToken ? (
                    <button type="button" className="btn-secondary"
                      disabled={joinEngineBusyId === team.id}
                      onClick={() => void handleRequestJoinEngine(team)}
                      style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', opacity: joinEngineBusyId === team.id ? 0.5 : 1 }}>
                      {joinEngineBusyId === team.id ? 'Отправляем...' : 'Подать заявку'}
                    </button>
                  ) : (
                    <a href={buildJoinRequestUrl(team)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff', textDecoration: 'none' }}>
                      Подать заявку
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );


  const handleVote = useCallback(async (id: string, direction: 'up' | 'down' = 'up') => {
    if (voteBusy) return;
    setVoteBusy(id);
    try {
      const res = await voteInitiative(accessToken || '', id, direction);
      setInitiatives(prev => prev.map(item =>
        item.id === id ? { ...item, votesUp: res.initiative.votesUp, votesDown: res.initiative.votesDown ?? 0, voters: res.initiative.voters, downVoters: res.initiative.downVoters ?? [] } : item
      ));
    } catch { /* silent */ }
    finally { setVoteBusy(null); }
  }, [accessToken, voteBusy]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    if (statusBusy) return;
    setStatusBusy(id);
    try {
      await updateInitiativeStatus(accessToken || '', id, { status: newStatus });
      setInitiatives(prev => prev.map(item =>
        item.id === id ? { ...item, status: newStatus, readStatus: mapLegacyInitiativeStatus(newStatus) } : item
      ));
    } catch { /* silent */ }
    finally { setStatusBusy(null); }
  }, [accessToken, statusBusy]);

  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!window.confirm(`Удалить инициативу «${title}»?`)) return;
    try {
      await deleteInitiative(accessToken || '', id);
      setInitiatives(prev => prev.filter(i => i.id !== id));
    } catch { /* silent */ }
  }, [accessToken]);

  const handleCreate = useCallback(async () => {
    if (!createTitle.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      await createInitiative(accessToken || '', { title: createTitle.trim(), description: createDesc.trim() || undefined });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDesc('');
      void loadInitiatives();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Не удалось создать инициативу.');
    } finally {
      setCreateBusy(false);
    }
  }, [accessToken, createTitle, createDesc, loadInitiatives]);

  // ── Initiative Detail Modal ──────────────────────────────────────
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);

  const openDetailModal = useCallback(async (item: InitiativeItem) => {
    setDetailItem(item);
    setDetailComments([]);
    setCommentText('');
    setDetailCommentsLoading(true);
    try {
      const res = await getInitiativeComments(accessToken || '', item.id);
      setDetailComments(res.comments || []);
    } catch { /* silent */ }
    finally { setDetailCommentsLoading(false); }
  }, [accessToken]);

  const handleSendComment = useCallback(async () => {
    if (!detailItem || !commentText.trim() || commentBusy) return;
    setCommentBusy(true);
    try {
      const res = await postInitiativeComment(accessToken || '', detailItem.id, commentText.trim());
      setDetailComments(res.comments || []);
      setCommentText('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { /* silent */ }
    finally { setCommentBusy(false); }
  }, [accessToken, detailItem, commentText, commentBusy]);

  const closeDetailModal = useCallback(() => {
    setDetailItem(null);
    setDetailComments([]);
    setCommentText('');
  }, []);

  const initiativeDetailModal = detailItem && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }} onClick={closeDetailModal}>
      <div style={{
        background: 'rgba(10, 12, 30, 0.95)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 18, padding: 0, maxWidth: 520, width: '95%', maxHeight: '85vh',
        border: '1px solid rgba(255,215,0,0.2)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{detailItem.title}</h3>
              {detailItem.teamName && (
                <span style={{ fontSize: 11, opacity: 0.6, background: 'rgba(255,215,0,0.1)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(255,215,0,0.2)', display: 'inline-block', marginTop: 6 }}>{detailItem.teamName}</span>
              )}
            </div>
            <button type="button" onClick={closeDetailModal} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
              color: '#fff', cursor: 'pointer', padding: '4px 10px', fontSize: 14,
            }}>✕</button>
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 11, opacity: 0.6 }}>
            {(detailItem.authorNickname || detailItem.createdByNickname) && (
              <span>{detailItem.authorNickname || detailItem.createdByNickname}{detailItem.authorRole ? ` · ${detailItem.authorRole}` : ''}{detailItem.authorWing ? ` · ${detailItem.authorWing}` : ''}</span>
            )}
            {detailItem.sourceType === 'brodela' && (
              <span style={{ padding: '1px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontWeight: 600, border: '1px solid rgba(124,58,237,0.3)' }}>Бродела</span>
            )}
            {detailItem.sourceType === 'ode' && (
              <span style={{ padding: '1px 8px', borderRadius: 10, background: 'rgba(234,179,8,0.15)', color: '#fbbf24', fontWeight: 600, border: '1px solid rgba(234,179,8,0.3)' }}>ОДэ</span>
            )}
            <span style={{
              padding: '1px 8px', borderRadius: 10,
              background: `${KANBAN_COLUMN_COLORS[detailItem.status || 'idea'] || '#FFD700'}22`,
              color: KANBAN_COLUMN_COLORS[detailItem.status || 'idea'] || '#FFD700',
              fontWeight: 600, border: `1px solid ${KANBAN_COLUMN_COLORS[detailItem.status || 'idea'] || '#FFD700'}44`,
            }}>
              {SERVER_STATUS_LABELS[detailItem.status || 'idea'] || detailItem.status}
            </span>
            {detailItem.createdAt && <span>{new Date(detailItem.createdAt).toLocaleDateString('ru-RU')}</span>}
            <span>За {detailItem.votesUp ?? 0} · Против {(detailItem as any).votesDown ?? 0}</span>
          </div>

          {/* Description */}
          {detailItem.description && (
            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85, lineHeight: 1.5 }}>
              {detailItem.description}
            </div>
          )}
        </div>

        {/* Chat section */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, marginBottom: 4 }}>Обсуждение</div>
          {detailCommentsLoading ? (
            <div style={{ fontSize: 12, opacity: 0.5, textAlign: 'center', padding: 20 }}>Загрузка…</div>
          ) : detailComments.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.4, textAlign: 'center', padding: 20 }}>Пока нет комментариев. Начните обсуждение!</div>
          ) : (
            detailComments.map(c => (
              <div key={c.id} style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 10,
                padding: '8px 12px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: COUNCIL_ACCENT }}>{c.nickname}</span>
                  <span style={{ fontSize: 10, opacity: 0.4 }}>{c.createdAt ? new Date(c.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>{c.text}</div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input — only for council members */}
        {isInCouncil ? (
          <div style={{ padding: '10px 20px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Написать комментарий…"
              maxLength={2000}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendComment(); } }}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
            <button
              type="button"
              disabled={commentBusy || !commentText.trim()}
              onClick={() => void handleSendComment()}
              className="cab-btn-glass"
              style={{
                background: COUNCIL_ACCENT_LIGHT, border: `1px solid ${COUNCIL_ACCENT}`,
                color: COUNCIL_ACCENT, fontSize: 13, fontWeight: 700,
                opacity: commentText.trim() ? 1 : 0.5,
              }}
            >
              {commentBusy ? '…' : 'Отправить'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            Вступите в Совет, чтобы комментировать
          </div>
        )}
      </div>
    </div>
  );

  const campManagementSection = (
    <div className="council-cabin-section fade-in" style={{ display: 'grid', gap: 12, padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {myTeam ? (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="cab-btn-glass"
              style={{
                background: COUNCIL_ACCENT_LIGHT,
                border: `1px solid ${COUNCIL_ACCENT}`,
                color: COUNCIL_ACCENT,
              }}
            >
              Предложить
            </button>
          ) : onSuggestInitiative ? (
            <button
              type="button"
              onClick={onSuggestInitiative}
              className="cab-btn-glass"
              style={{
                background: COUNCIL_ACCENT_LIGHT,
                border: `1px solid ${COUNCIL_ACCENT}`,
                color: COUNCIL_ACCENT,
              }}
            >
              Предложить
            </button>
          ) : (
            <span style={{ fontSize: 11, opacity: 0.5 }}>Вступите в Движок, чтобы предлагать</span>
          )}
        </div>
        <button type="button" className="cab-btn-glass" style={{ padding: '6px 12px', fontSize: 11 }} disabled={initiativesLoading} onClick={() => void loadInitiatives()}>
          {initiativesLoading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {initiativesLoading ? (
        <p className="profile-loading">Загрузка инициатив…</p>
      ) : initiatives.length === 0 ? (
        <p className="profile-empty-state__text">Инициатив пока нет. Предложи идею — она появится на доске.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SERVER_STATUSES.length}, minmax(150px, 1fr))`,
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
        }}>
          {SERVER_STATUSES.map((status) => {
            const colColor = KANBAN_COLUMN_COLORS[status] || '#888';
            const columnItems = initiatives.filter(i => { const s = i.status || 'idea'; return (s === 'proposed' || s === 'new' ? 'idea' : s) === status; });
            return (
              <div key={status} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 12,
                border: `1px solid rgba(255,255,255,0.06)`,
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Column header */}
                <div style={{
                  padding: '7px 10px',
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colColor }}>
                    {SERVER_STATUS_LABELS[status]}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: `${colColor}18`,
                    color: colColor,
                    padding: '1px 5px',
                    borderRadius: 6,
                    minWidth: 16,
                    textAlign: 'center',
                  }}>
                    {columnItems.length}
                  </span>
                </div>

                {/* Read-only cards */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignContent: 'start' }}>
                  {columnItems.map(item => {
                    const authorName = item.authorNickname || item.createdByNickname || '';
                    return (
                      <div key={item.id} onClick={() => void openDetailModal(item)} style={{
                        padding: '12px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                         onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', lineHeight: 1.4, letterSpacing: '0.01em' }}>{item.title}</div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 11, opacity: 0.6, letterSpacing: '0.02em' }}>
                          {item.teamName && <span>{item.teamName}</span>}
                          {item.sourceType === 'brodela' && <span style={{ color: '#c4b5fd' }}>Бродела</span>}
                        </div>

                        {authorName && <div style={{ fontSize: 11, opacity: 0.45, letterSpacing: '0.02em' }}>
                          {authorName}{item.authorRole ? ` · ${item.authorRole}` : ''}{item.authorWing ? ` · ${item.authorWing}` : ''}
                        </div>}

                        {item.description && <div style={{ fontSize: 11, opacity: 0.4, lineHeight: 1.4 }}>{item.description.length > 50 ? item.description.slice(0, 50) + '…' : item.description}</div>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          {isInCouncil ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <button
                                type="button"
                                disabled={voteBusy === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleVote(item.id, 'up'); }}
                                className="cab-btn-glass"
                                style={{ padding: '0px 6px', height: 24, fontSize: 11, color: '#2ecc71', minWidth: 'unset', fontWeight: 500 }}
                                title="За"
                              >За: {item.votesUp ?? 0}</button>
                              <button
                                type="button"
                                disabled={voteBusy === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleVote(item.id, 'down'); }}
                                className="cab-btn-glass"
                                style={{ padding: '0px 6px', height: 24, fontSize: 11, color: '#e74c3c', minWidth: 'unset', fontWeight: 500 }}
                                title="Против"
                              >Против: {(item as any).votesDown ?? 0}</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, opacity: 0.5 }}>
                              <span>За: {item.votesUp ?? 0}</span>
                              <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.2)' }} />
                              <span>Против: {(item as any).votesDown ?? 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create initiative modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <div className="cab-card" style={{ maxWidth: 400, width: '90%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 16px', color: COUNCIL_ACCENT, fontSize: 18 }}>Новая инициатива</h4>
            <input
              type="text"
              placeholder="Название инициативы"
              maxLength={200}
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              className="cab-input"
              style={{ width: '100%', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <textarea
              placeholder="Описание (необязательно)"
              maxLength={2000}
              value={createDesc}
              onChange={e => setCreateDesc(e.target.value)}
              className="cab-input"
              style={{ width: '100%', minHeight: 80, marginBottom: 12, resize: 'vertical', boxSizing: 'border-box' }}
            />
            {onSuggestInitiative && (
              <button type="button" className="cab-btn-glass" style={{ marginBottom: 16, width: '100%' }} onClick={() => { onSuggestInitiative(); }}>
                Сгенерировать идею
              </button>
            )}
            {createError && <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 12 }}>{createError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="cab-btn-accent"
                disabled={createBusy || !createTitle.trim()}
                onClick={() => void handleCreate()}
                style={{ flex: 1 }}
              >
                {createBusy ? 'Создаём…' : 'Создать'}
              </button>
              <button type="button" className="cab-btn-glass" onClick={() => setShowCreateModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const managementSection = (
    <div className="council-cabin-section fade-in" style={{ display: 'grid', gap: 12, padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>Канбан инициатив</h4>
        <button type="button" className="cab-btn-glass" style={{ padding: '6px 12px', fontSize: 11 }} disabled={initiativesLoading} onClick={() => void loadInitiatives()}>
          {initiativesLoading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {initiativesLoading ? (
        <p className="profile-loading">Загрузка инициатив…</p>
      ) : initiatives.length === 0 ? (
        <p className="profile-empty-state__text">Инициатив пока нет. Они появятся здесь после отправки из Движков.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${SERVER_STATUSES.length}, minmax(160px, 1fr))`,
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
        }}>
          {SERVER_STATUSES.map((status, colIdx) => {
            const colColor = KANBAN_COLUMN_COLORS[status] || '#888';
            const columnItems = initiatives.filter(i => { const s = i.status || 'idea'; return (s === 'proposed' || s === 'new' ? 'idea' : s) === status; });
            return (
              <div key={status} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 12,
                border: `1px solid rgba(255,255,255,0.06)`,
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Column header */}
                <div style={{
                  padding: '8px 10px',
                  borderBottom: `1px solid rgba(255,255,255,0.06)`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colColor }}>
                    {SERVER_STATUS_LABELS[status]}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: `${colColor}22`,
                    color: colColor,
                    padding: '2px 6px',
                    borderRadius: 8,
                    minWidth: 18,
                    textAlign: 'center',
                  }}>
                    {columnItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignContent: 'start' }}>
                  {columnItems.map(item => {
                    const prevStatus = colIdx > 0 ? SERVER_STATUSES[colIdx - 1] : null;
                    const nextStatus = colIdx < SERVER_STATUSES.length - 1 ? SERVER_STATUSES[colIdx + 1] : null;
                    const authorName = item.authorNickname || item.createdByNickname || '';
                    return (
                      <div key={item.id} onClick={() => void openDetailModal(item)} style={{
                        padding: '12px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                      }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                         onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', lineHeight: 1.4, flex: 1, letterSpacing: '0.01em' }}>{item.title}</div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); void handleDelete(item.id, item.title); }}
                            className="cab-btn-glass"
                            style={{
                              width: 24, height: 24, padding: 0, minWidth: 'unset', color: 'rgba(255,255,255,0.4)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, border: 'none', background: 'transparent'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#e74c3c'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                            title="Удалить инициативу"
                          >×</button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 11, opacity: 0.6, letterSpacing: '0.02em' }}>
                          {item.teamName && <span>{item.teamName}</span>}
                          {item.sourceType === 'brodela' && <span style={{ color: '#c4b5fd' }}>Бродела</span>}
                        </div>

                        {authorName && <div style={{ fontSize: 11, opacity: 0.45, letterSpacing: '0.02em' }}>
                          {authorName}{item.authorRole ? ` · ${item.authorRole}` : ''}{item.authorWing ? ` · ${item.authorWing}` : ''}
                        </div>}

                        {item.description && <div style={{ fontSize: 11, opacity: 0.4, lineHeight: 1.4 }}>{item.description.length > 60 ? item.description.slice(0, 60) + '…' : item.description}</div>}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11, opacity: 0.6 }}>
                            <span>За: {item.votesUp ?? 0}</span>
                            <span style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.2)' }} />
                            <span>Против: {(item as any).votesDown ?? 0}</span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: 6 }}>
                            {prevStatus && (
                              <button
                                type="button"
                                disabled={statusBusy === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleStatusChange(item.id, prevStatus); }}
                                className="cab-btn-glass"
                                style={{
                                  width: 28, height: 28, padding: 0, minWidth: 'unset',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 14, color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                title={`← ${SERVER_STATUS_LABELS[prevStatus]}`}
                              >←</button>
                            )}
                            {nextStatus && (
                              <button
                                type="button"
                                disabled={statusBusy === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleStatusChange(item.id, nextStatus); }}
                                className="cab-btn-glass"
                                style={{
                                  width: 28, height: 28, padding: 0, minWidth: 'unset', color: colColor,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 14, fontWeight: 500, borderColor: `${colColor}44`,
                                }}
                                title={`→ ${SERVER_STATUS_LABELS[nextStatus]}`}
                              >→</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const badgeSection = (
    <div className="council-cabin-section fade-in" style={{ display: 'grid', gap: 16, padding: '16px 18px', borderRadius: 14, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Badge card — compact with constrained image */}
      <button
        type="button"
        className="council-cabin-badge-card"
        onClick={() => onNavigateToBadge?.('8.6')}
        aria-label="Открыть значок 8.6 Совет Реального Лагеря"
        style={{
          display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: 14,
          width: '100%', borderRadius: 14, padding: 14, textAlign: 'left' as const, cursor: 'pointer',
          background: 'linear-gradient(165deg, rgba(75,56,14,0.55), rgba(31,24,12,0.72))',
          border: '1px solid rgba(255,215,0,0.3)', color: 'rgba(255,247,227,0.95)',
        }}
      >
        <div className="council-cabin-badge-card__icon" style={{ width: 120, height: 120, borderRadius: 16, overflow: 'hidden', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
          <BadgeIcon badgeId="8.6" badgeTitle="Совет Реального Лагеря" categoryId="8" emoji="" size="large" />
        </div>
        <div className="council-cabin-badge-card__text">
          <div style={{ fontWeight: 700, fontSize: 15 }}>8.6 — Совет Реального Лагеря</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>Нажми, чтобы открыть страницу значка</div>
        </div>
      </button>

      {/* Badge info — what the badge is about */}
      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COUNCIL_ACCENT, marginBottom: 8 }}>Как получить значок</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
          <li>Принять осознанное решение вступить в Совет Лагеря</li>
          <li>Участвовать в заседаниях и обсуждениях</li>
          <li>Помочь организовать заседание Совета</li>
          <li>Предложить и реализовать инициативу</li>
          <li>Получить отклики от участников и вожатых</li>
        </ul>
      </div>

      {/* Artifacts needed */}
      <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(15, 10, 42, 0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: COUNCIL_ACCENT, marginBottom: 8 }}>Артефакты для подтверждения</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {['Протоколы заседаний / дорожные карты', '10–15 откликов участников и 3–5 вожатых', 'Видео / фото участия в инициативах'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              <span style={{ color: COUNCIL_ACCENT, fontSize: 10 }}>✦</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === 'cabin') {
    const section = activeTab === 'council'
      ? councilMainSection
      : activeTab === 'engines'
        ? enginesSection
        : activeTab === 'camp-management'
          ? campManagementSection
          : activeTab === 'management'
            ? managementSection
            : badgeSection;

    return (
      <div className="council-cabin-content" style={{ display: 'grid', gap: 16 }}>
        <div key={activeTab}>{section}</div>
        {initiativeDetailModal}
      </div>
    );
  }

  return (
    <div
      className="council-dashboard"
      style={{
        background: COUNCIL_GRADIENT,
        borderRadius: '24px',
        padding: '20px',
        border: `1px solid ${COUNCIL_ACCENT_LIGHT}`,
        marginBottom: '24px',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: COUNCIL_ACCENT,
          filter: 'blur(50px)',
          opacity: 0.1,
          pointerEvents: 'none'
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExpanded ? '20px' : '0' }}>
        <div onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer', flex: 1 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: COUNCIL_ACCENT,
              letterSpacing: '0.1em',
              marginBottom: '4px'
            }}
          >
            Механика ЛК
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Совет Лагеря
          </h3>
          {!isExpanded && (
            <p style={{ margin: '8px 0 0', fontSize: '13px', opacity: 0.75, lineHeight: 1.4 }}>
              Высший орган соуправления. Объединяет Движки, Бро и вожатых.
            </p>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: COUNCIL_ACCENT,
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 4px',
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.3s ease'
          }}
        >
          ▾
        </button>
      </div>

      {isExpanded && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: 1.6 }}>
            Совет Реального Лагеря — площадка для инициатив, развития культуры лагеря и принятия коллективных решений.
            Участники предлагают идеи, обсуждают их и воплощают в жизнь.
          </p>

          {councilMainSection}

          <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: COUNCIL_ACCENT, marginBottom: '8px' }}>
              Связь с Движками
            </div>
            {loadError && (
              <div className="profile-error profile-error--not-found" style={{ marginBottom: 12 }}>
                Проверь подключение к интернету.
                <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => syncTeam()}>Повторить</button>
              </div>
            )}
            <p style={{ margin: '0 0 12px', fontSize: '13px', opacity: 0.9, lineHeight: 1.5 }}>
              {myTeam
                ? <>Совет объединяет Движки. Твой Движок «<strong>{myTeam.name}</strong>» — выноси идеи от имени Движка, участвуй в обсуждениях.</>
                : 'Совет — следующий уровень после Движка. Создай или вступи в Движок — первый шаг к участию в Совете.'}
            </p>
            {onScrollToTeam && (
              <button
                type="button"
                onClick={onScrollToTeam}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: COUNCIL_ACCENT,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {myTeam ? 'К своему Движку ↑' : 'К блоку Движка ↑'}
              </button>
            )}
          </div>

          {onSuggestInitiative && (
            <button
              type="button"
              onClick={onSuggestInitiative}
              style={{
                padding: '12px 20px',
                background: COUNCIL_ACCENT_LIGHT,
                border: `1px solid ${COUNCIL_ACCENT}`,
                color: COUNCIL_ACCENT,
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                alignSelf: 'flex-start'
              }}
            >
              Предложить инициативу в совет лагеря
            </button>
          )}

          {onNavigateToBadge && (
            <button
              onClick={() => onNavigateToBadge('8.6')}
              className="cab-btn-glass"
              style={{
                alignSelf: 'flex-start'
              }}
            >
              Требования значка 8.6 — Совет Реального Лагеря
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BadgeIcon from './BadgeIcon';
import { useTeam } from '../context/TeamContext';
import { useUserProgress } from '../hooks/useUserProgress';
import {
  createInitiative,
  fetchInitiatives,
  updateInitiativeStatus,
  voteInitiative,
} from '../utils/councilApi';

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

const initiativeStatusLabel = (status: InitiativeStatus): string => ({
  new: 'Новая',
  reviewing: 'На рассмотрении',
  accepted: 'Принята',
  rejected: 'Отклонена',
  done: 'Выполнена',
}[status]);

export type CouncilTabId = 'council' | 'engines' | 'camp-management' | 'badge';

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
  status?: string;
  readStatus?: InitiativeStatus;
  description?: string;
  votesUp?: number;
  voters?: string[];
  createdByNickname?: string;
};

const SERVER_STATUSES = ['idea', 'proposed', 'discussed', 'approved', 'in_progress', 'done'] as const;
const SERVER_STATUS_LABELS: Record<string, string> = {
  idea: 'Идея', proposed: 'Предложена', discussed: 'Обсуждается',
  approved: 'Принята', in_progress: 'В работе', done: 'Выполнена',
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
  const { myTeam, loadError, syncTeam } = useTeam();
  const { userData } = useUserProgress();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState<InitiativeItem[]>([]);
  const [initiativesLoading, setInitiativesLoading] = useState(false);
  const [initiativeFilter, setInitiativeFilter] = useState<'all' | InitiativeStatus>('all');
  const [voteBusy, setVoteBusy] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  // Create initiative modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (variant === 'cabin' && onTabChange) onTabChange(activeTab);
  }, [variant, activeTab, onTabChange]);

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
      if (accessToken) {
        const items = await fetchInitiatives(accessToken);
        const mapped: InitiativeItem[] = items.map((x) => ({
          id: x.id,
          title: x.title,
          createdAt: x.createdAt,
          status: x.status,
          readStatus: mapLegacyInitiativeStatus(x.status),
          description: x.description,
          votesUp: x.votesUp ?? 0,
          voters: x.voters ?? [],
          createdByNickname: x.createdByNickname,
        }));
        setInitiatives(mapped);
      } else {
        // Fallback: unauthenticated fetch
        const res = await fetch('/api/council/initiatives');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data?.initiatives) ? data.initiatives : [];
        const mapped: InitiativeItem[] = items
          .filter((x: any) => x && typeof x === 'object' && x.id && x.title)
          .map((x: any) => ({
            id: String(x.id),
            title: String(x.title),
            createdAt: String(x.createdAt || x.created_at || ''),
            status: typeof x.status === 'string' ? x.status : undefined,
            readStatus: mapLegacyInitiativeStatus(String(x.readStatus || x.status || 'new')),
          }));
        setInitiatives(mapped);
      }
    } catch {
      setInitiatives([]);
    } finally {
      setInitiativesLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (variant !== 'cabin' || activeTab !== 'camp-management') return;
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

  const councilMainSection = (
    <div className={variant === 'cabin' ? 'council-cabin-section' : undefined} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: COUNCIL_ACCENT, marginBottom: '12px' }}>
        Обзор инициатив и протоколов
      </div>
      <div style={{ fontSize: '12px', opacity: 0.85, lineHeight: 1.5, marginBottom: '12px' }}>
        Цикл работы Совета: <strong>Идеи</strong> → <strong>Обсуждение</strong> → <strong>Решения</strong> → <strong>Задачи</strong> → <strong>Артефакты</strong>.
      </div>
      <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
        Типичные инициативы:
      </div>
      <ul style={{ margin: '0 0 12px 16px', padding: 0, fontSize: '12px', opacity: 0.8, lineHeight: 1.6 }}>
        <li>Новая игра, проект или мероприятие</li>
        <li>Улучшение инфраструктуры, распорядка или традиций лагеря</li>
        <li>Идеи от Движков и образовательные процессы</li>
      </ul>
      <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
        Реальные инициативы и протоколы ведутся в лагере. Участвуй в заседаниях — выноси идеи, помогай организовывать.
      </p>
    </div>
  );

  const enginesSection = (
    <div className="council-cabin-section" style={{ display: 'grid', gap: 14 }}>
      {loadError && (
        <div className="profile-error profile-error--not-found">
          Проверь подключение к интернету.
          <button type="button" className="btn-secondary" style={{ marginTop: 8 }} onClick={() => syncTeam()}>
            Повторить
          </button>
        </div>
      )}
      {myTeam && (
        <div style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${COUNCIL_ACCENT_LIGHT}`, background: 'rgba(255, 215, 0, 0.08)' }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Твой Движок: <strong>{myTeam.name}</strong>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={openTeamPanel}
            style={{ marginTop: 8, borderColor: 'rgba(255,215,0,0.45)', color: COUNCIL_ACCENT }}
          >
            К моему Движку
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
        <div className="council-cabin-engines-grid">
          {teams.map((team) => {
            const isMine = Boolean(myTeam && myTeam.id === team.id);
            const membersCount = team.members?.length || 0;
            return (
              <article key={team.id} className={`council-cabin-engine-card${isMine ? ' council-cabin-engine-card--mine' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 15 }}>{team.name}</h4>
                  {isMine ? <span className="council-cabin-engine-badge">Мой Движок</span> : null}
                </div>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.82 }}>
                  {team.motto || 'Без девиза'}
                </p>
                <div style={{ fontSize: 12, opacity: 0.72 }}>Участников: {membersCount}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isMine ? (
                    <button type="button" className="btn-secondary" onClick={openTeamPanel} style={{ borderColor: 'rgba(255,215,0,0.45)', color: COUNCIL_ACCENT }}>
                      К моему Движку
                    </button>
                  ) : (
                    <a href={buildJoinRequestUrl(team)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ borderColor: 'rgba(255,215,0,0.45)', color: COUNCIL_ACCENT, textDecoration: 'none' }}>
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

  const filteredInitiatives = useMemo(() => {
    if (initiativeFilter === 'all') return initiatives;
    return initiatives.filter((x) => x.readStatus === initiativeFilter);
  }, [initiativeFilter, initiatives]);

  const handleVote = useCallback(async (id: string) => {
    if (!accessToken || voteBusy) return;
    setVoteBusy(id);
    try {
      const res = await voteInitiative(accessToken, id);
      setInitiatives(prev => prev.map(item =>
        item.id === id ? { ...item, votesUp: res.initiative.votesUp, voters: res.initiative.voters } : item
      ));
    } catch { /* silent */ }
    finally { setVoteBusy(null); }
  }, [accessToken, voteBusy]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    if (!accessToken || statusBusy) return;
    setStatusBusy(id);
    try {
      await updateInitiativeStatus(accessToken, id, { status: newStatus });
      setInitiatives(prev => prev.map(item =>
        item.id === id ? { ...item, status: newStatus, readStatus: mapLegacyInitiativeStatus(newStatus) } : item
      ));
    } catch { /* silent */ }
    finally { setStatusBusy(null); }
  }, [accessToken, statusBusy]);

  const handleCreate = useCallback(async () => {
    if (!accessToken || !createTitle.trim()) return;
    setCreateBusy(true);
    setCreateError(null);
    try {
      await createInitiative(accessToken, { title: createTitle.trim(), description: createDesc.trim() || undefined });
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

  const campManagementSection = (
    <div className="council-cabin-section" style={{ display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.9, lineHeight: 1.55 }}>
        Управление Лагерем: предлагай инициативы для развития культуры лагеря и совместных решений.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {accessToken ? (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 20px',
              background: COUNCIL_ACCENT_LIGHT,
              border: `1px solid ${COUNCIL_ACCENT}`,
              color: COUNCIL_ACCENT,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            💡 Предложить инициативу
          </button>
        ) : onSuggestInitiative ? (
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
            }}
          >
            💡 Предложить инициативу
          </button>
        ) : (
          <p className="profile-empty-state__text">Войдите, чтобы предложить инициативу.</p>
        )}
        <button type="button" className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }} disabled={initiativesLoading} onClick={() => void loadInitiatives()}>
          {initiativesLoading ? 'Загрузка…' : '🔄 Обновить'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, opacity: 0.8 }}>Фильтр:</span>
        {(['all', 'new', 'reviewing', 'accepted', 'rejected', 'done'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: 12, opacity: initiativeFilter === k ? 1 : 0.8 }}
            onClick={() => setInitiativeFilter(k)}
          >
            {k === 'all' ? 'Все' : initiativeStatusLabel(k)}
          </button>
        ))}
      </div>

      {initiativesLoading ? (
        <p className="profile-loading">Загрузка инициатив…</p>
      ) : filteredInitiatives.length === 0 ? (
        <p className="profile-empty-state__text">Инициативы не найдены.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredInitiatives.map((item) => {
            const st = item.readStatus || mapLegacyInitiativeStatus(item.status);
            return (
              <article key={item.id} className="council-initiative-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{item.title}</strong>
                    {item.createdByNickname && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>— {item.createdByNickname}</span>}
                  </div>
                  <span className={`m3-status-chip council-status-chip tone-${st}`}>{initiativeStatusLabel(st)}</span>
                </div>
                {item.description && (
                  <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4, maxHeight: 40, overflow: 'hidden', lineHeight: 1.4 }}>
                    {item.description.length > 120 ? item.description.slice(0, 120) + '…' : item.description}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 11, opacity: 0.72 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString('ru-RU') : '—'}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {accessToken && (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={voteBusy === item.id}
                        onClick={() => void handleVote(item.id)}
                        style={{ padding: '4px 10px', fontSize: 12, minWidth: 48 }}
                        title="Голосовать"
                      >
                        👍 {item.votesUp ?? 0}
                      </button>
                    )}
                    {canModerate && (
                      <select
                        value={item.status || 'idea'}
                        disabled={statusBusy === item.id}
                        onChange={(e) => void handleStatusChange(item.id, e.target.value)}
                        style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'inherit', cursor: 'pointer' }}
                      >
                        {SERVER_STATUSES.map(s => <option key={s} value={s}>{SERVER_STATUS_LABELS[s] || s}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create initiative modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: 16, padding: 20, maxWidth: 400, width: '90%', border: '1px solid rgba(255,215,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 12px', color: COUNCIL_ACCENT }}>💡 Новая инициатива</h4>
            <input
              type="text"
              placeholder="Название инициативы"
              maxLength={200}
              value={createTitle}
              onChange={e => setCreateTitle(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
            />
            <textarea
              placeholder="Описание (необязательно)"
              maxLength={2000}
              value={createDesc}
              onChange={e => setCreateDesc(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 13, marginBottom: 8, resize: 'vertical', boxSizing: 'border-box' }}
            />
            {onSuggestInitiative && (
              <button type="button" className="btn-secondary" style={{ marginBottom: 8, padding: '8px 14px', fontSize: 12, width: '100%' }} onClick={() => { onSuggestInitiative(); }}>
                🤖 Сгенерировать идею ИИ
              </button>
            )}
            {createError && <div style={{ fontSize: 12, color: '#ff6b6b', marginBottom: 8 }}>{createError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary-gold"
                disabled={createBusy || !createTitle.trim()}
                onClick={() => void handleCreate()}
                style={{ flex: 1, padding: '10px 16px' }}
              >
                {createBusy ? 'Создаём…' : 'Создать'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)} style={{ padding: '10px 16px' }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const badgeSection = (
    <div className="council-cabin-section" style={{ display: 'grid', gap: 12 }}>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onNavigateToBadge?.('8.6')}
        style={{ alignSelf: 'flex-start' }}
      >
        Значок 8.6 — Совет Реального Лагеря
      </button>
      <button
        type="button"
        className="council-cabin-badge-card"
        onClick={() => onNavigateToBadge?.('8.6')}
        aria-label="Открыть значок 8.6 Совет Реального Лагеря"
      >
        <div className="council-cabin-badge-card__icon">
          <BadgeIcon badgeId="8.6" badgeTitle="Совет Реального Лагеря" categoryId="8" emoji="👑" size="responsive" />
        </div>
        <div className="council-cabin-badge-card__text">
          <div style={{ fontWeight: 700 }}>Совет Реального Лагеря</div>
          <div style={{ fontSize: 12, opacity: 0.76 }}>Открыть страницу значка</div>
        </div>
      </button>
    </div>
  );

  if (variant === 'cabin') {
    const section = activeTab === 'council'
      ? councilMainSection
      : activeTab === 'engines'
        ? enginesSection
        : activeTab === 'camp-management'
          ? campManagementSection
          : badgeSection;

    return (
      <div className="fade-in council-cabin-content" style={{ display: 'grid', gap: 16 }}>
        <div className="council-cabin-section" style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: COUNCIL_ACCENT, letterSpacing: '0.1em' }}>
            Механика ЛК
          </div>
          <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>👑 Совет Лагеря</h3>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
            Совет Реального Лагеря — площадка для инициатив, развития культуры лагеря и принятия коллективных решений. Участники предлагают идеи, обсуждают их и воплощают в жизнь.
          </p>
        </div>
        {section}
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
            👑 Совет Лагеря
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
              💡 Предложить инициативу в совет лагеря
            </button>
          )}

          {onNavigateToBadge && (
            <button
              onClick={() => onNavigateToBadge('8.6')}
              className="btn-primary-gold"
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
              Требования значка 8.6 — Совет Реального Лагеря
            </button>
          )}
        </div>
      )}
    </div>
  );
};

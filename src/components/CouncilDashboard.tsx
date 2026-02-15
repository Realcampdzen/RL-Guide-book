import React, { useEffect, useMemo, useState } from 'react';
import BadgeIcon from './BadgeIcon';
import { useTeam } from '../context/TeamContext';
import { useUserProgress } from '../hooks/useUserProgress';

const COUNCIL_ACCENT = '#FFD700';
const COUNCIL_ACCENT_LIGHT = 'rgba(255, 215, 0, 0.2)';
const COUNCIL_GRADIENT = 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(184, 134, 11, 0.12) 100%)';

export type CouncilTabId = 'council' | 'engines' | 'camp-management' | 'badge';

type TeamListItem = {
  id: string;
  name: string;
  motto?: string;
  members?: Array<{ id?: string }>;
};

interface CouncilDashboardProps {
  variant?: 'accordion' | 'cabin';
  activeTab?: CouncilTabId;
  onTabChange?: (tab: CouncilTabId) => void;
  onNavigateToBadge?: (badgeId: string) => void;
  /** Скролл к блоку Движка */
  onScrollToTeam?: () => void;
  /** Открыть панель "Движок" в кабине */
  onOpenTeamPanel?: () => void;
  /** Открыть модалку «Предложить инициативу в совет лагеря» (генерация как у плана по значку) */
  onSuggestInitiative?: () => void;
}

export const CouncilDashboard: React.FC<CouncilDashboardProps> = ({
  variant = 'accordion',
  activeTab = 'council',
  onTabChange,
  onNavigateToBadge,
  onScrollToTeam,
  onOpenTeamPanel,
  onSuggestInitiative
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { myTeam, loadError, syncTeam } = useTeam();
  const { userData } = useUserProgress();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

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

  const campManagementSection = (
    <div className="council-cabin-section" style={{ display: 'grid', gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14, opacity: 0.9, lineHeight: 1.55 }}>
        Управление Лагерем: предлагай инициативы для развития культуры лагеря и совместных решений.
      </p>
      {onSuggestInitiative ? (
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
      ) : (
        <p className="profile-empty-state__text">Функция предложения инициативы недоступна.</p>
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

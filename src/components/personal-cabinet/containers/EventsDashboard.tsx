import type React from 'react';
import { useEffect, useState } from 'react';
import { type BadgeRequestItem, loadMyBadgeRequests } from '../../../utils/badgeApprovalApi';

export interface EventsDashboardProps {
  eventsTab: string;
  effectiveToken: string | null;
  devHeaders: Record<string, string>;
  hasAuth: boolean;
  userData: any;
}

export const EventsDashboard: React.FC<EventsDashboardProps> = ({
  eventsTab,
  effectiveToken,
  devHeaders,
  hasAuth,
  userData,
}) => {
  const [myRequests, setMyRequests] = useState<BadgeRequestItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Auto-load when Events section opens
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!hasAuth || !effectiveToken) return;
      setEventsLoading(true);
      try {
        const my = await loadMyBadgeRequests(effectiveToken, devHeaders);
        if (mounted) setMyRequests(my);
      } catch (e) {
        console.error(e);
      }
      if (mounted) setEventsLoading(false);
    };

    if (myRequests.length === 0 && !eventsLoading) {
      void load();
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAuth, effectiveToken]); // Run once mostly, or when auth changes

  return (
    <div
      className="fade-in cab-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        borderRadius: 20,
        padding: '28px 32px',
      }}
    >
      {eventsTab === 'requests' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: 18,
                fontWeight: 700,
                color: '#e8f0ff',
                letterSpacing: '-0.01em',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Мои заявки
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Отслеживай статус проверки полученных значков.
            </p>
          </div>

          {/* Refresh button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={async () => {
                if (!hasAuth || !effectiveToken) return;
                setEventsLoading(true);
                try {
                  const my = await loadMyBadgeRequests(effectiveToken, devHeaders);
                  setMyRequests(my);
                } catch (e) {
                  console.error(e);
                }
                setEventsLoading(false);
              }}
              disabled={eventsLoading}
              className="cab-btn-accent-sm"
            >
              {eventsLoading ? 'Загрузка…' : '🔄 Обновить'}
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
              {myRequests.length > 0 ? `${myRequests.length} заявок` : ''}
            </span>
          </div>

          {/* Loading state */}
          {eventsLoading && myRequests.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
              }}
            >
              Загрузка заявок…
            </div>
          )}

          {/* Empty state */}
          {!eventsLoading && myRequests.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                borderRadius: 14,
                background: 'rgba(8, 20, 40, 0.15)',
                border: '1px solid rgba(93, 228, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, color: '#e8f0ff', fontWeight: 600 }}>Нет заявок</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                Отправь заявку на подтверждение значка — она появится здесь
              </div>
            </div>
          )}

          {/* Request cards */}
          {myRequests.slice(0, 30).map((r) => {
            const statusColor =
              r.status === 'pending' ? '#F59E0B' : r.status === 'approved' ? '#22C55E' : '#EF4444';
            const statusBg =
              r.status === 'pending'
                ? 'rgba(245,158,11,0.12)'
                : r.status === 'approved'
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(239,68,68,0.12)';
            const statusText =
              r.status === 'pending'
                ? '⏳ Ожидает проверки'
                : r.status === 'approved'
                  ? '✅ Одобрено'
                  : '❌ Отклонено';
            const ev = r.evidence || ({} as Record<string, unknown>);
            const hasDetails = !!(
              ev.reflection ||
              ev.impact ||
              ev.link ||
              (ev.photos && Array.isArray(ev.photos) && ev.photos.length > 0)
            );

            return (
              <details
                key={r.id}
                style={{
                  borderRadius: 12,
                  background: 'rgba(8, 20, 40, 0.2)',
                  border: `1px solid ${statusColor}22`,
                  overflow: 'hidden',
                }}
              >
                <summary
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: statusColor,
                      boxShadow: `0 0 6px ${statusColor}66`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f0ff' }}>
                      {r.badgeTitle || r.levelId}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: statusBg,
                          color: statusColor,
                        }}
                      >
                        {statusText}
                      </span>
                      {r.createdAt && (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                          {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Expand arrow */}
                  {hasDetails && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>▼</span>
                  )}
                </summary>

                {/* Expanded details */}
                <div
                  style={{
                    padding: '0 16px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 2,
                    paddingTop: 12,
                  }}
                >
                  {/* Resolution note (rejection/approval reason) */}
                  {r.resolutionNote && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background:
                          r.status === 'rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                        border: `1px solid ${r.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom: 4,
                          color: r.status === 'rejected' ? '#f87171' : '#4ade80',
                        }}
                      >
                        {r.status === 'rejected' ? 'Причина отклонения' : 'Комментарий вожатого'}
                      </div>
                      <div style={{ fontSize: 13, color: '#e8f0ff', lineHeight: 1.5 }}>
                        {r.resolutionNote}
                      </div>
                    </div>
                  )}

                  {/* Evidence: what participant submitted */}
                  {typeof ev.reflection === 'string' && ev.reflection.trim() && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: 2,
                        }}
                      >
                        Чему научился(лась)
                      </div>
                      <div
                        style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}
                      >
                        {ev.reflection}
                      </div>
                    </div>
                  )}
                  {typeof ev.impact === 'string' && ev.impact.trim() && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: 2,
                        }}
                      >
                        Реальный вклад
                      </div>
                      <div
                        style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}
                      >
                        {ev.impact}
                      </div>
                    </div>
                  )}
                  {typeof ev.link === 'string' && ev.link.trim() && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: 2,
                        }}
                      >
                        Ссылка
                      </div>
                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: '#5de4ff', wordBreak: 'break-all' }}
                      >
                        {ev.link}
                      </a>
                    </div>
                  )}
                  {Array.isArray(ev.photos) && ev.photos.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginBottom: 4,
                        }}
                      >
                        Фото ({(ev.photos as string[]).length})
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(ev.photos as string[]).map((url: string, i: number) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Фото ${i + 1}`}
                            style={{
                              maxWidth: 120,
                              maxHeight: 120,
                              borderRadius: 8,
                              objectFit: 'cover',
                              border: '1px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                            }}
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {!hasDetails && !r.resolutionNote && (
                    <div
                      style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}
                    >
                      Детали не приложены
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {eventsTab === 'announcements' && (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            borderRadius: 14,
            background: 'rgba(8, 20, 40, 0.15)',
            border: '1px solid rgba(93, 228, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📢</div>
          <div style={{ fontSize: 14, color: '#e8f0ff', fontWeight: 600 }}>Объявления</div>
          <div
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}
          >
            Здесь будут появляться объявления от вожатых и педагогов
          </div>
        </div>
      )}

      {eventsTab === 'tasks' &&
        (() => {
          const tasks = (userData as any)?.educatorTasks || [];
          return (
            <div
              style={{
                padding: 20,
                borderRadius: 14,
                background: 'rgba(8, 20, 40, 0.15)',
                border: '1px solid rgba(93, 228, 255, 0.12)',
              }}
            >
              <h3 style={{ color: '#FFD700', marginTop: 0, fontSize: 16 }}>📝 Задания педагога</h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                Задания от педагогов, кружков и курсов.
              </p>
              {tasks.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Пока нет заданий.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {tasks.map((t: any) => (
                    <div
                      key={t.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#e8f0ff' }}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                          {t.description.slice(0, 80)}
                          {t.description.length > 80 ? '…' : ''}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                        {t.status === 'draft'
                          ? '⬜ Черновик'
                          : t.status === 'assigned'
                            ? '📤 Назначено'
                            : '✅ Завершено'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
};

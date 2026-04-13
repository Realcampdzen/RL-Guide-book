import type React from 'react';
import BadgeIcon from '../../BadgeIcon';
import { ShiftsAndSquadsDashboard } from '../../ShiftsAndSquadsDashboard';

const CAROUSEL_STATIC_MAX = 5;

interface ProgressionHubContainerProps {
  userData: any;
  badgeLookupMap: Map<
    string,
    { title: string; emoji: string; category_id: string; level?: string }
  >;
  homeTab: 'active' | 'favorites' | 'collection' | 'journal' | 'squads';
  pathCarouselSteps: number;
  setPathCarouselSteps: React.Dispatch<React.SetStateAction<number>>;
  favCarouselSteps: number;
  setFavCarouselSteps: React.Dispatch<React.SetStateAction<number>>;
  removeRoute: (id: string) => void;
  toggleFavorite: (id: string) => void;
  navigateToBadge: (id: string) => void;
  isMobile: boolean;
  loadSquadInfo: () => Promise<void>;
  setActiveSection: (val: any) => void;
  setShowRoleModal: (val: boolean) => void;
  accessToken: string;
}

const CabIcons = {
  Star: ({ filled }: { filled?: boolean }) => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? '#FFD700' : 'none'}
      stroke={filled ? '#FFD700' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 12.27 17 17.14 18.18 21.02 12 17.77 5.82 21.02 7 17.14 2 12.27 8.91 8.26 12 2" />
    </svg>
  ),
  Trash: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Send: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  ArrowRight: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
};

const svgIcons: Record<string, React.ReactNode> = {
  compass: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon
        points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"
        fill="currentColor"
        opacity=".3"
      />
    </svg>
  ),
  star: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  medal: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="14" r="6" />
      <path d="M8.21 3.32L7 8h10l-1.21-4.68A2 2 0 0 0 13.85 2h-3.7a2 2 0 0 0-1.94 1.32z" />
      <line x1="12" y1="11" x2="12" y2="17" />
    </svg>
  ),
  book: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
};

export const ProgressionHubContainer: React.FC<ProgressionHubContainerProps> = ({
  userData,
  badgeLookupMap,
  homeTab,
  pathCarouselSteps,
  setPathCarouselSteps,
  favCarouselSteps,
  setFavCarouselSteps,
  removeRoute,
  toggleFavorite,
  navigateToBadge,
  isMobile,
  loadSquadInfo,
  setActiveSection,
  setShowRoleModal,
  accessToken,
}) => {
  const progress = userData?.progress || {};
  const favorites: string[] = (userData as any)?.favorites || [];

  const pathItems = Object.entries(progress)
    .filter(([, p]: [string, any]) => p.status === 'in_progress')
    .map(([levelId]) => {
      const parts = levelId.split('.');
      return {
        baseId: parts.length >= 3 ? `${parts[0]}.${parts[1]}` : levelId,
        levelId,
        categoryId: parts[0] || '1',
      };
    });
  const seenP = new Set<string>();
  const uniquePath = pathItems.filter((p) => {
    if (seenP.has(p.baseId)) return false;
    seenP.add(p.baseId);
    return true;
  });

  const favoriteItems = favorites.map((id) => {
    const parts = id.split('.');
    return {
      baseId: parts.length >= 3 ? `${parts[0]}.${parts[1]}` : id,
      levelId: id,
      categoryId: parts[0] || '1',
    };
  });
  const seenF = new Set<string>();
  const uniqueFav = favoriteItems.filter((p) => {
    if (seenF.has(p.baseId)) return false;
    seenF.add(p.baseId);
    return true;
  });

  const renderPathCard = (
    { baseId, levelId, categoryId }: { baseId: string; levelId: string; categoryId: string },
    isPath: boolean
  ) => {
    const isFav = favorites.some((f) => f === baseId || f.startsWith(baseId + '.'));
    const badgeMeta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
    const badgeTitle = badgeMeta?.title || '';
    const badgeEmoji = badgeMeta?.emoji || '';
    return (
      <div className="path-card path-card--vertical">
        <div className="path-card__avatar-wrap">
          <div className="path-card__avatar" onClick={() => navigateToBadge(baseId)}>
            <BadgeIcon
              badgeId={baseId}
              badgeTitle={badgeTitle}
              categoryId={categoryId}
              emoji={badgeEmoji}
              size="responsive"
              levelId={levelId !== baseId ? levelId : undefined}
              levelTitle={badgeMeta?.level}
            />
          </div>
        </div>
        <div className="path-card__actions">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const fn = (window as any).__openBadgePlan__;
              if (typeof fn === 'function') {
                fn({
                  id: levelId,
                  title: badgeTitle,
                  level: badgeMeta?.level,
                  criteria: (badgeMeta as any)?.criteria || (badgeMeta as any)?.howToBecome,
                  nameExplanation: (badgeMeta as any)?.nameExplanation,
                  skillTips: (badgeMeta as any)?.skillTips,
                  confirmation: (badgeMeta as any)?.confirmation,
                });
              } else {
                navigateToBadge(baseId);
              }
            }}
            className="btn-pill btn-pill--secondary"
          >
            Составить план
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const fn = (window as any).__openBadgeProof__;
              if (typeof fn === 'function') {
                fn({ id: levelId, title: badgeTitle });
              } else {
                navigateToBadge(baseId);
              }
            }}
            className="btn-pill btn-pill--primary"
          >
            Подтвердить <CabIcons.Send />
          </button>
        </div>
        <div className="path-card__footer">
          {isPath ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Удалить?')) removeRoute(baseId);
              }}
              className="btn-action-round trash"
              aria-label="Удалить из пути"
            >
              <CabIcons.Trash />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(baseId);
              }}
              className="btn-action-round trash"
              aria-label="Убрать из избранного"
            >
              <CabIcons.Trash />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(baseId);
            }}
            className={`path-card__star ${isFav ? 'fav' : ''}`}
            aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
          >
            <CabIcons.Star filled={isFav} />
          </button>
          <button
            type="button"
            className="btn-action-round btn-go-badge"
            onClick={(e) => {
              e.stopPropagation();
              navigateToBadge(baseId);
            }}
            title="Перейти к значку"
            aria-label="Перейти к значку"
          >
            <CabIcons.ArrowRight />
          </button>
        </div>
      </div>
    );
  };

  const renderCarousel = (
    items: typeof uniquePath,
    isPath: boolean,
    rotationSteps: number,
    setRotationSteps: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (items.length <= CAROUSEL_STATIC_MAX) {
      return (
        <div className="cabinet-carousel">
          <div className="path-carousel path-carousel--static">
            <div className="path-carousel__static-track">
              {items.map((item, idx) => (
                <div
                  key={`static-${idx}-${item.baseId}`}
                  className="path-carousel__item path-carousel__item--static"
                >
                  {renderPathCard(item, isPath)}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    const n = items.length;
    const stepDeg = `${360 / Math.max(1, n)}deg`;
    const radius = `${(180 + 20) / (2 * Math.sin(Math.PI / Math.max(1, n)))}px`;
    const touchStartX = { current: 0 };
    const navBtn = (dir: 'prev' | 'next') => (
      <button
        type="button"
        className={`path-carousel__btn path-carousel__btn--${dir}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRotationSteps((s) => (dir === 'prev' ? s - 1 : s + 1));
        }}
        aria-label={dir === 'prev' ? 'Вращать влево' : 'Вращать вправо'}
      >
        {dir === 'prev' ? <CabIcons.ArrowLeft /> : <CabIcons.ArrowRight />}
      </button>
    );
    return (
      <div className="cabinet-carousel">
        <div className="path-carousel path-carousel--cylinder">
          {!isMobile && navBtn('prev')}
          <div
            className="path-carousel__viewport path-carousel__viewport--cylinder"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 40) {
                if (dx < 0) setRotationSteps((s) => s - 1);
                else setRotationSteps((s) => s + 1);
              }
            }}
          >
            <div
              className="path-carousel__track path-carousel__track--cylinder"
              style={{
                ['--path-rotation-steps' as string]: rotationSteps,
                ['--step-deg' as string]: stepDeg,
                ['--radius' as string]: radius,
              }}
            >
              {items.map((item, idx) => (
                <div
                  key={`cyl-${idx}-${item.baseId}`}
                  className="path-carousel__item path-carousel__item--cylinder"
                  style={{ ['--slot-offset' as string]: idx }}
                >
                  {renderPathCard(item, isPath)}
                </div>
              ))}
            </div>
          </div>
          {!isMobile && navBtn('next')}
        </div>
        {isMobile && (
          <div className="path-carousel__nav-row">
            {navBtn('prev')}
            {navBtn('next')}
          </div>
        )}
      </div>
    );
  };

  const emptyState = (iconKey: string, title: string, desc: string) => (
    <div className="cab-empty-state fade-in">
      <div className="cab-empty-state__icon">{svgIcons[iconKey] || svgIcons.star}</div>
      <div className="cab-empty-state__title">{title}</div>
      <div className="cab-empty-state__desc">{desc}</div>
    </div>
  );

  return (
    <div>
      {/* В пути */}
      {homeTab === 'active' && (
        <div key="home-active">
          {uniquePath.length > 0 ? (
            <div
              className="fade-in"
              style={{
                borderRadius: 16,
                padding: 20,
                background: 'rgba(15, 10, 42, 0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {renderCarousel(uniquePath, true, pathCarouselSteps, setPathCarouselSteps)}
            </div>
          ) : (
            emptyState(
              'compass',
              'Здесь будут значки, которые ты взял в путь',
              'Открой любой значок в каталоге и нажми «В путь» — или добавь в избранное, чтобы быстро возвращаться к ним.'
            )
          )}
        </div>
      )}
      {/* Избранное */}
      {homeTab === 'favorites' && (
        <div key="home-favorites">
          {uniqueFav.length > 0 ? (
            <div
              className="fade-in"
              style={{
                borderRadius: 16,
                padding: 20,
                background: 'rgba(15, 10, 42, 0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {renderCarousel(uniqueFav, false, favCarouselSteps, setFavCarouselSteps)}
            </div>
          ) : (
            emptyState(
              'star',
              'Нет избранных значков',
              'Отмечай значки звёздочкой, чтобы они появились здесь.'
            )
          )}
        </div>
      )}
      {/* Коллекция */}
      {homeTab === 'collection' && (
        <div
          key="home-collection"
          style={{
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {(() => {
            const achievedItems = Object.entries(progress)
              .filter(([, p]: [string, any]) => p.status === 'achieved')
              .map(([levelId, p]: [string, any]) => {
                const parts = levelId.split('.');
                const baseId = parts.length >= 3 ? `${parts[0]}.${parts[1]}` : levelId;
                const meta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
                return {
                  baseId,
                  levelId,
                  categoryId: parts[0] || '1',
                  title: meta?.title || baseId,
                  emoji: meta?.emoji || '',
                  achievedAt: p?.achievedAt || '',
                };
              });
            const seen = new Set<string>();
            const unique = achievedItems.filter((a) => {
              if (seen.has(a.baseId)) return false;
              seen.add(a.baseId);
              return true;
            });

            return unique.length > 0 ? (
              <>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
                  Собрано {unique.length}{' '}
                  {unique.length === 1 ? 'значок' : unique.length < 5 ? 'значка' : 'значков'}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 12,
                  }}
                >
                  {unique.map((a) => (
                    <div
                      key={a.baseId}
                      className="fade-in"
                      onClick={() => navigateToBadge(a.baseId)}
                      style={{
                        padding: 16,
                        borderRadius: 14,
                        background: 'rgba(15, 10, 42, 0.12)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                      }}
                    >
                      <div style={{ width: 64, height: 64, margin: '0 auto 8px' }}>
                        <BadgeIcon
                          badgeId={a.baseId}
                          badgeTitle={a.title}
                          categoryId={a.categoryId}
                          emoji={a.emoji}
                          size="responsive"
                        />
                      </div>
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: '#e8f0ff', lineHeight: 1.3 }}
                      >
                        {a.title}
                      </div>
                      {a.achievedAt && (
                        <div
                          style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}
                        >
                          {new Date(a.achievedAt).toLocaleDateString('ru-RU')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              emptyState('medal', 'Коллекция пуста', 'Завершай значки, чтобы они появлялись здесь.')
            );
          })()}
        </div>
      )}
      {/* Журнал */}
      {homeTab === 'journal' &&
        (() => {
          const progressEntries = Object.entries(progress);
          const badgeProgress = new Map<
            string,
            {
              baseId: string;
              title: string;
              categoryId: string;
              emoji: string;
              levels: { id: string; status: string }[];
            }
          >();
          progressEntries.forEach(([levelId, p]: [string, any]) => {
            const parts = levelId.split('.');
            const baseId = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : levelId;
            const meta = badgeLookupMap.get(levelId) || badgeLookupMap.get(baseId);
            if (!badgeProgress.has(baseId)) {
              badgeProgress.set(baseId, {
                baseId,
                title: meta?.title || baseId,
                categoryId: parts[0] || '1',
                emoji: meta?.emoji || '',
                levels: [],
              });
            }
            badgeProgress.get(baseId)!.levels.push({ id: levelId, status: p.status || 'locked' });
          });
          const cards = Array.from(badgeProgress.values());

          return (
            <div
              key="home-journal"
              style={{
                display: 'flex',
                gap: 20,
                maxWidth: 1100,
                margin: '0 auto',
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 280,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#c97730',
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                >
                  Значки в пути
                </div>
                {cards.length > 0 ? (
                  cards.map((card) => {
                    const achieved = card.levels.filter((l) => l.status === 'achieved').length;
                    const total = Math.max(card.levels.length, 3);
                    const pct = Math.round((achieved / total) * 100);
                    return (
                      <div
                        key={card.baseId}
                        className="fade-in"
                        onClick={() => navigateToBadge(card.baseId)}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          background: 'rgba(15, 10, 42, 0.12)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{ width: 42, height: 42, flexShrink: 0 }}>
                          <BadgeIcon
                            badgeId={card.baseId}
                            badgeTitle={card.title}
                            categoryId={card.categoryId}
                            emoji={card.emoji}
                            size="responsive"
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#e8f0ff',
                              marginBottom: 5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {card.title}
                          </div>
                          <div
                            style={{
                              height: 5,
                              borderRadius: 3,
                              background: 'rgba(255,255,255,0.08)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                borderRadius: 3,
                                width: `${pct}%`,
                                background:
                                  pct >= 100
                                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                    : 'linear-gradient(90deg, #5de4ff, #8b5cf6)',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                          <div
                            style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}
                          >
                            {achieved}/{total} уровней · {pct}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="fade-in"
                    style={{
                      padding: 24,
                      borderRadius: 14,
                      background: 'rgba(15, 10, 42, 0.12)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: 12,
                    }}
                  >
                    Добавьте значок «В путь» из каталога
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      {/* Смены и отряды */}
      {homeTab === 'squads' && (
        <div
          key="home-squads"
          style={{
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
          }}
        >
          <ShiftsAndSquadsDashboard
            onRequestJoinSquad={async (squad) => {
              const hn = window.location.hostname;
              const base =
                import.meta.env.DEV || hn === 'localhost' || hn === '127.0.0.1'
                  ? ''
                  : (
                      (import.meta.env.VITE_API_URL ||
                        import.meta.env.VITE_BACKEND_URL ||
                        '') as string
                    ).replace(/\/$/, '');
              const h: Record<string, string> = { 'Content-Type': 'application/json' };
              if (accessToken) h.Authorization = `Bearer ${accessToken}`;
              else {
                try {
                  const pin = localStorage.getItem('rl-dev-pin');
                  if (pin) h['X-Dev-Pin'] = pin;
                } catch {}
              }
              const res = await fetch(`${base}/api/squads/${squad.id}/join-requests`, {
                method: 'POST',
                headers: h,
                body: JSON.stringify({ nickname: userData?.profile?.nickname || '' }),
              });
              const data = await res.json().catch(() => ({}));
              if (data.status === 'already_member') {
                alert('Вы уже в этом отряде!');
              } else if (data.status === 'duplicate') {
                alert('Заявка уже отправлена, ожидайте ответа.');
              } else if (res.ok) {
                alert('Заявка на вступление отправлена!');
              } else {
                alert(`Ошибка: ${data.error || res.status}`);
              }
            }}
            onRequestLogin={() => setShowRoleModal(true)}
            onNavigateToSquadCorner={() => setActiveSection('squad-corner')}
            onSquadCreated={async () => {
              await loadSquadInfo();
              setActiveSection('squad-corner');
            }}
          />
        </div>
      )}
    </div>
  );
};

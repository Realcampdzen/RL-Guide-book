import type React from 'react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArtInboxTab } from '../../../components/ArtInboxTab';
import { CommunityRankingPanel } from '../../../components/CommunityRankingPanel';
import { ImageSourceBlock } from '../../../components/ImageSourceBlock';
import { requestImageGenerate } from '../../../utils/imageGenerateApi';
import { createWorkshopProposal, type WorkshopProposal } from '../../../utils/workshopProposalsApi';

export type WorkshopTabId = 'constructor' | 'arts' | 'my' | 'community';

interface WorkshopContainerProps {
  accessToken: string | null | undefined;
  hasWorkshopAccess: boolean;
  showHint: (hint: { title: string; content: string }) => void;
  openUnlockByCode: () => void;
  onNavigateToBadge: (id: string) => void;
  setPathFavToast: (opts: any) => void;
  communityBadges: any[] | null | undefined;
  customBadges: any[] | null | undefined;
  publishBadgeToCommunity: ((badge: any) => Promise<any>) | undefined;
  removeCustomBadge: ((id: string) => void) | undefined;
  canModerateApprovals: boolean;
  workshopProposals: WorkshopProposal[];
  setWorkshopProposals: React.Dispatch<React.SetStateAction<WorkshopProposal[]>>;
}

const workshopTabItems = [
  { id: 'constructor' as const, label: 'МЕЙКЕР', icon: '🛠️' },
  { id: 'arts' as const, label: 'АРТЫ', icon: '🎨' },
  { id: 'community' as const, label: 'ТРЕНДЫ', icon: '🔥' },
  { id: 'my' as const, label: 'ПОДМЕНЮ', icon: '👤' },
] satisfies Array<{ id: WorkshopTabId; label: string; icon: string }>;

export const WorkshopContainer: React.FC<WorkshopContainerProps> = ({
  accessToken,
  hasWorkshopAccess,
  showHint,
  openUnlockByCode,
  onNavigateToBadge,
  setPathFavToast,
  communityBadges,
  customBadges,
  publishBadgeToCommunity,
  removeCustomBadge,
  canModerateApprovals,
  workshopProposals,
  setWorkshopProposals,
}) => {
  const [workshopActiveTab, setWorkshopActiveTab] = useState<WorkshopTabId>('constructor');
  const [workshopProposalType, setWorkshopProposalType] = useState<
    'badge' | 'category' | 'version'
  >('badge');
  const [workshopForm, setWorkshopForm] = useState({
    title: '',
    description: '',
    level1: '',
    level2: '',
    image: null as string | null,
  });
  const [workshopProposalsBusy, setWorkshopProposalsBusy] = useState(false);

  useEffect(() => {
    const handleOpenTab = (e: CustomEvent<{ panel: string; tab: string }>) => {
      if (e.detail?.panel === 'workshop' && e.detail?.tab) {
        setWorkshopActiveTab(e.detail.tab as WorkshopTabId);
      }
    };
    window.addEventListener('profile:openTab', handleOpenTab as EventListener);
    return () => window.removeEventListener('profile:openTab', handleOpenTab as EventListener);
  }, []);

  const handleWorkshopSubmit = async () => {
    if (!workshopForm.title.trim() || !accessToken) return;
    setWorkshopProposalsBusy(true);
    try {
      const created = await createWorkshopProposal(accessToken, {
        type:
          workshopProposalType === 'badge'
            ? 'badge'
            : workshopProposalType === 'version'
              ? 'version'
              : 'category',
        title: workshopForm.title.trim(),
        description: workshopForm.description.trim(),
        image: workshopForm.image || undefined,
      });
      setWorkshopProposals((prev) => [created, ...prev]);
      setWorkshopForm({ title: '', description: '', level1: '', level2: '', image: null });
      showHint({
        title: 'Предложение отправлено',
        content: `Значок «${created.title}» отправлен на проверку вожатому.`,
      });
    } catch (e: any) {
      showHint({ title: 'Ошибка', content: e?.message || 'Не удалось отправить предложение.' });
    } finally {
      setWorkshopProposalsBusy(false);
    }
  };

  const renderWorkshopTabsNav = (
    className = 'profile-tabs-nav profile-tabs-nav--docked profile-tabs-nav--workshop'
  ) => (
    <div className={className} role="tablist" aria-label="Разделы Мастерской">
      {workshopTabItems.map((t) => (
        <button
          key={t.id}
          id={`workshop-tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={workshopActiveTab === t.id}
          aria-controls="workshop-tabpanel"
          data-label={t.label}
          className={workshopActiveTab === t.id ? 'active' : ''}
          onClick={() => setWorkshopActiveTab(t.id)}
        >
          <span className="profile-tabs-nav__icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="profile-tabs-nav__label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  const proposalTypes = [
    {
      id: 'badge' as const,
      label: '🏅 Новый значок',
      desc: 'Предложи оригинальный значок в категорию',
    },
    {
      id: 'category' as const,
      label: '📁 Новая категория',
      desc: 'Предложи новую категорию значков',
    },
    {
      id: 'version' as const,
      label: '🔄 Версия значка',
      desc: 'Предложи альт. версию существующего значка',
    },
  ];
  const proposalType = workshopProposalType;
  const setProposalType = setWorkshopProposalType;

  const renderContent = () => (
    <div
      className="workshop-view fade-in"
      role="tabpanel"
      id="workshop-tabpanel"
      aria-labelledby={`workshop-tab-${workshopActiveTab}`}
    >
      {workshopActiveTab === 'constructor' && (
        <section id="workshop-section-constructor" className="workshop-view__section">
          {hasWorkshopAccess ? (
            <div className="workshop-form workshop-form--card">
              <h3 style={{ color: '#FFD700', marginTop: 0 }}>🛠️ Конструктор</h3>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: -4, marginBottom: 14 }}>
                Предложи значок, категорию или версию. Всё пройдёт проверку вожатым.
              </p>

              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {proposalTypes.map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    className={proposalType === pt.id ? 'btn-primary-gold' : 'btn-secondary'}
                    style={{ padding: '8px 14px', fontSize: 12, flex: 1, minWidth: 100 }}
                    onClick={() => setProposalType(pt.id)}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, opacity: 0.6, margin: '-8px 0 14px' }}>
                {proposalTypes.find((p) => p.id === proposalType)?.desc}
              </p>

              {proposalType === 'badge' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={workshopForm.title}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, title: e.target.value })}
                    placeholder="Название значка"
                    className="w-input"
                  />
                  <textarea
                    value={workshopForm.description}
                    onChange={(e) =>
                      setWorkshopForm({ ...workshopForm, description: e.target.value })
                    }
                    placeholder="Описание и критерии..."
                    className="w-input"
                    style={{ minHeight: 80 }}
                  />
                  <div style={{ marginBottom: 4 }}>
                    <ImageSourceBlock
                      context="workshop_badge"
                      value={workshopForm.image}
                      onChange={(url) => setWorkshopForm((prev) => ({ ...prev, image: url }))}
                      aspect="free"
                      onGenerate={async (opts) =>
                        requestImageGenerate(
                          { mode: 'generate', context: 'workshop', prompt: opts.prompt ?? '' },
                          accessToken ?? null
                        )
                      }
                      onProcess={async (imageBase64, opts) =>
                        requestImageGenerate(
                          {
                            mode: 'process',
                            context: 'workshop',
                            imageBase64,
                            prompt: opts?.prompt ?? '',
                          },
                          accessToken ?? null
                        )
                      }
                      onUnlockRequest={openUnlockByCode}
                    />
                    {workshopForm.image && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginTop: 6, fontSize: 11 }}
                        onClick={() => setWorkshopForm((prev) => ({ ...prev, image: null }))}
                      >
                        Удалить изображение
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleWorkshopSubmit}
                    disabled={!workshopForm.title.trim() || workshopProposalsBusy}
                    className="btn-primary-gold"
                    style={{ width: '100%' }}
                  >
                    📤 {workshopProposalsBusy ? 'Отправляем...' : 'Отправить на проверку'}
                  </button>
                </div>
              )}

              {proposalType === 'category' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={workshopForm.title}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, title: e.target.value })}
                    placeholder="Название категории"
                    className="w-input"
                  />
                  <textarea
                    value={workshopForm.description}
                    onChange={(e) =>
                      setWorkshopForm({ ...workshopForm, description: e.target.value })
                    }
                    placeholder="Описание категории..."
                    className="w-input"
                    style={{ minHeight: 60 }}
                  />
                  <input
                    value={workshopForm.level1 || ''}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, level1: e.target.value })}
                    placeholder="Эмодзи категории (например 🌊)"
                    className="w-input"
                  />
                  <button
                    onClick={async () => {
                      if (!workshopForm.title.trim() || !accessToken) return;
                      setWorkshopProposalsBusy(true);
                      try {
                        const created = await createWorkshopProposal(accessToken, {
                          type: 'category',
                          title: workshopForm.title.trim(),
                          description: workshopForm.description.trim(),
                          emoji: (workshopForm.level1 || '📁').trim(),
                        });
                        setWorkshopProposals((prev) => [created, ...prev]);
                        setWorkshopForm({
                          title: '',
                          description: '',
                          level1: '',
                          level2: '',
                          image: null,
                        });
                        showHint({
                          title: 'Предложение отправлено',
                          content: `Категория «${created.title}» отправлена на проверку.`,
                        });
                      } catch (e: any) {
                        showHint({
                          title: 'Ошибка',
                          content: e?.message || 'Не удалось отправить.',
                        });
                      } finally {
                        setWorkshopProposalsBusy(false);
                      }
                    }}
                    disabled={!workshopForm.title.trim() || workshopProposalsBusy}
                    className="btn-primary-gold"
                    style={{ width: '100%' }}
                  >
                    📤 {workshopProposalsBusy ? 'Предлагаем...' : 'Предложить категорию'}
                  </button>
                </div>
              )}

              {proposalType === 'version' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={workshopForm.level1 || ''}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, level1: e.target.value })}
                    placeholder="ID значка (например 1.1)"
                    className="w-input"
                  />
                  <input
                    value={workshopForm.title}
                    onChange={(e) => setWorkshopForm({ ...workshopForm, title: e.target.value })}
                    placeholder="Название версии"
                    className="w-input"
                  />
                  <textarea
                    value={workshopForm.description}
                    onChange={(e) =>
                      setWorkshopForm({ ...workshopForm, description: e.target.value })
                    }
                    placeholder="Чем отличается от оригинала, критерии..."
                    className="w-input"
                    style={{ minHeight: 80 }}
                  />
                  <div style={{ marginBottom: 4 }}>
                    <ImageSourceBlock
                      context="workshop_badge"
                      value={workshopForm.image}
                      onChange={(url) => setWorkshopForm((prev) => ({ ...prev, image: url }))}
                      aspect="free"
                      onGenerate={async (opts) =>
                        requestImageGenerate(
                          { mode: 'generate', context: 'workshop', prompt: opts.prompt ?? '' },
                          accessToken ?? null
                        )
                      }
                      onProcess={async (imageBase64, opts) =>
                        requestImageGenerate(
                          {
                            mode: 'process',
                            context: 'workshop',
                            imageBase64,
                            prompt: opts?.prompt ?? '',
                          },
                          accessToken ?? null
                        )
                      }
                      onUnlockRequest={openUnlockByCode}
                    />
                    {workshopForm.image && (
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginTop: 6, fontSize: 11 }}
                        onClick={() => setWorkshopForm((prev) => ({ ...prev, image: null }))}
                      >
                        Удалить изображение
                      </button>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (
                        !workshopForm.title.trim() ||
                        !workshopForm.level1?.trim() ||
                        !accessToken
                      )
                        return;
                      setWorkshopProposalsBusy(true);
                      try {
                        const created = await createWorkshopProposal(accessToken, {
                          type: 'version',
                          badgeId: workshopForm.level1!.trim(),
                          title: workshopForm.title.trim(),
                          description: workshopForm.description.trim(),
                          image: workshopForm.image || undefined,
                        });
                        setWorkshopProposals((prev) => [created, ...prev]);
                        setWorkshopForm({
                          title: '',
                          description: '',
                          level1: '',
                          level2: '',
                          image: null,
                        });
                        showHint({
                          title: 'Предложение отправлено',
                          content: `Версия «${created.title}» для значка ${created.badgeId} отправлена на проверку.`,
                        });
                      } catch (e: any) {
                        showHint({
                          title: 'Ошибка',
                          content: e?.message || 'Не удалось отправить.',
                        });
                      } finally {
                        setWorkshopProposalsBusy(false);
                      }
                    }}
                    disabled={
                      !workshopForm.title.trim() ||
                      !workshopForm.level1?.trim() ||
                      workshopProposalsBusy
                    }
                    className="btn-primary-gold"
                    style={{ width: '100%' }}
                  >
                    📤 {workshopProposalsBusy ? 'Предлагаем...' : 'Предложить версию'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="workshop-locked workshop-locked--card">
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
              <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, opacity: 0.9 }}>
                Мастерская откроется, когда ты выберешь в путь значок{' '}
                <strong>1.16.1 «Путеводитель»</strong> или достигнешь его.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToBadge('1.16.1')}
                className="btn-primary-gold"
                style={{ padding: '14px 24px' }}
              >
                Перейти к значку 1.16.1
              </button>
            </div>
          )}
        </section>
      )}

      {workshopActiveTab === 'community' && (
        <section id="workshop-section-community-ranking" className="workshop-view__section">
          <CommunityRankingPanel
            communityBadges={communityBadges ?? []}
            customBadges={customBadges ?? []}
            onNavigateToBadge={onNavigateToBadge}
          />
        </section>
      )}

      {workshopActiveTab === 'arts' && (
        <section id="workshop-section-arts" className="workshop-view__section">
          {hasWorkshopAccess ? (
            <div className="workshop-form workshop-form--card">
              <h3 style={{ color: '#FFD700', marginTop: 0 }}>🎨 Арты и скины</h3>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: -4, marginBottom: 12 }}>
                Сгенерируй арт для значка с помощью ИИ или загрузи свой.
              </p>
              <ImageSourceBlock
                context="workshop_badge"
                value={workshopForm.image}
                onChange={(url) => setWorkshopForm((prev) => ({ ...prev, image: url }))}
                aspect="free"
                onGenerate={async (opts) =>
                  requestImageGenerate(
                    { mode: 'generate', context: 'workshop', prompt: opts.prompt ?? '' },
                    accessToken ?? null
                  )
                }
                onProcess={async (imageBase64, opts) =>
                  requestImageGenerate(
                    {
                      mode: 'process',
                      context: 'workshop',
                      imageBase64,
                      prompt: opts?.prompt ?? '',
                    },
                    accessToken ?? null
                  )
                }
                onUnlockRequest={openUnlockByCode}
              />
              {workshopForm.image && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: 11 }}
                    onClick={() => setWorkshopForm((prev) => ({ ...prev, image: null }))}
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    className="btn-primary-gold"
                    style={{ fontSize: 12 }}
                    disabled={workshopProposalsBusy}
                    onClick={async () => {
                      if (!workshopForm.image || !accessToken) return;
                      setWorkshopProposalsBusy(true);
                      try {
                        const created = await createWorkshopProposal(accessToken, {
                          type: 'art',
                          title: 'Арт значка',
                          image: workshopForm.image,
                        });
                        setWorkshopProposals((prev) => [created, ...prev]);
                        setWorkshopForm((prev) => ({ ...prev, image: null }));
                        showHint({
                          title: 'Арт отправлен',
                          content: 'Арт сохранён и отправлен на проверку.',
                        });
                      } catch (e: any) {
                        showHint({
                          title: 'Ошибка',
                          content: e?.message || 'Не удалось отправить арт.',
                        });
                      } finally {
                        setWorkshopProposalsBusy(false);
                      }
                    }}
                  >
                    📤 {workshopProposalsBusy ? 'Отправляем...' : 'Отправить арт'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="workshop-locked workshop-locked--card">
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
              <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, opacity: 0.9 }}>
                Мастерская откроется, когда ты выберешь в путь значок{' '}
                <strong>1.16.1 «Путеводитель»</strong> или достигнешь его.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToBadge('1.16.1')}
                className="btn-primary-gold"
                style={{ padding: '14px 24px' }}
              >
                Перейти к значку 1.16.1
              </button>
            </div>
          )}
          {canModerateApprovals && accessToken && (
            <div style={{ marginTop: 16 }}>
              <ArtInboxTab accessToken={accessToken} />
            </div>
          )}
        </section>
      )}

      {workshopActiveTab === 'my' && (
        <section id="workshop-section-my" className="workshop-view__section">
          {hasWorkshopAccess ? (
            <div className="workshop-my-proposals workshop-my-proposals--card">
              <h3 style={{ color: 'rgba(255,255,255,0.9)', marginTop: 0, fontSize: '16px' }}>
                Мои проекты
              </h3>
              {(() => {
                const combined = [
                  ...workshopProposals.map((p) => ({ ...p, source: 'proposal' as const })),
                  ...(customBadges || []).map((b: any) => ({
                    ...b,
                    source: 'badge' as const,
                    type: 'badge',
                    status: 'active',
                  })),
                ];
                if (combined.length === 0)
                  return (
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>
                      Пока нет проектов. Создай первый в Конструкторе.
                    </p>
                  );
                return (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {combined.map((item) => (
                      <li
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '12px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {item.type === 'category'
                              ? '📁'
                              : item.type === 'version'
                                ? '🔄'
                                : item.emoji || '🏅'}{' '}
                            {item.title}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>
                            {item.type === 'category'
                              ? 'Категория'
                              : item.type === 'version'
                                ? 'Версия значка'
                                : 'Значок'}
                            {' · '}
                            {item.status === 'pending'
                              ? '⏳ На проверке'
                              : item.status === 'approved'
                                ? '✅ Одобрено'
                                : item.status === 'rejected'
                                  ? '❌ Отклонено'
                                  : '📋 Активно'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {item.source === 'badge' && publishBadgeToCommunity && (
                            <button
                              type="button"
                              onClick={async () => {
                                if ((communityBadges?.length ?? 0) >= 10) {
                                  setPathFavToast({ type: 'squad_limit' });
                                  return;
                                }
                                const res = await publishBadgeToCommunity(item as any);
                                if (res.ok)
                                  showHint({
                                    title: 'Отправлено',
                                    content: 'Предложение отправлено в сообщество.',
                                  });
                                else
                                  showHint({
                                    title: 'Ошибка',
                                    content: res.error || 'Не удалось отправить.',
                                  });
                              }}
                              className="btn-secondary"
                              style={{ fontSize: 11 }}
                            >
                              В сообщество
                            </button>
                          )}
                          {item.source === 'badge' && removeCustomBadge && (
                            <button
                              type="button"
                              onClick={() => {
                                removeCustomBadge(item.id);
                                showHint({ title: 'Удалено', content: 'Предложение удалено.' });
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          ) : (
            <div className="workshop-locked workshop-locked--card">
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
              <p style={{ margin: '0 0 20px', fontSize: '15px', lineHeight: 1.5, opacity: 0.9 }}>
                Мастерская откроется, когда ты выберешь в путь значок{' '}
                <strong>1.16.1 «Путеводитель»</strong> или достигнешь его.
              </p>
              <button
                type="button"
                onClick={() => onNavigateToBadge('1.16.1')}
                className="btn-primary-gold"
                style={{ padding: '14px 24px' }}
              >
                Перейти к значку 1.16.1
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );

  const dockedContainer = document.getElementById('profile-dock-container');

  return (
    <>
      {renderContent()}
      {dockedContainer && createPortal(renderWorkshopTabsNav(), dockedContainer)}
    </>
  );
};

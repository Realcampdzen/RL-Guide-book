import React, { useState, useEffect, useMemo } from 'react';
import { CampProgramByDays } from '../../../components/CampProgramByDays';
import { PARENT_READONLY_BADGE_TEXT, PARENT_READONLY_TOOLTIP, canRunParentChildMutation } from '../../../utils/parentReadonly';

interface ParentsContainerProps {
  role: string | null;
  onNavigateToRegistrationForm?: () => void;
  setShowChildBadges: (v: boolean) => void;
  childProgressFromFile: any | null;
  parentSnapshotCode: string;
  isParentChildReadonlyView: boolean;
  onOpenParentCodeModal: () => void;
  onOpenRouteForm: () => void;
}

export const ParentsContainer: React.FC<ParentsContainerProps> = ({
  role,
  onNavigateToRegistrationForm,
  setShowChildBadges,
  childProgressFromFile,
  parentSnapshotCode,
  isParentChildReadonlyView,
  onOpenParentCodeModal,
  onOpenRouteForm,
}) => {
  const [parentSectionMode, setParentSectionMode] = useState<'home' | 'child'>('home');
  const [campFacts, setCampFacts] = useState<{ address?: { campName?: string; base?: string; address?: string; route?: string }; contacts?: { phone?: string; email?: string; vk?: string; site?: string; telegram?: string; organizer?: string }; currentSeason?: { name?: string; dates?: string; price?: string; theme?: string }; documents?: string[] } | null>(null);
  const [campFactsLoading, setCampFactsLoading] = useState(false);
  const [campFactsError, setCampFactsError] = useState<string | null>(null);

  const [parentInsights, setParentInsights] = useState<{ overallProgress?: { percent?: number; stage?: string }; weeklyTrend?: { direction?: 'up' | 'flat' | 'down'; note?: string }; dynamicSignals?: { windowDays?: number; currentWindowAchievements?: number; previousWindowAchievements?: number }; whyThisSuggestion?: string; basedOn?: { trend?: string; strongestAreas?: string[]; weakestAreas?: string[]; activityWindow?: string }; strengthsTop3?: Array<{ title?: string }>; nextSteps?: Array<{ hint?: string }> } | null>(null);
  const [parentInsightsLoading, setParentInsightsLoading] = useState(false);

  // Fetch Camp Facts
  useEffect(() => {
    if (role !== 'parent') return;
    const base = (import.meta.env.BASE_URL || '').replace(/\/*$/, '');
    const url = `${base}${base ? '/' : ''}ai-data/camp-facts.json`;
    let cancelled = false;
    setCampFactsLoading(true);
    setCampFactsError(null);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setCampFacts(json);
      })
      .catch((e) => {
        if (!cancelled) setCampFactsError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setCampFactsLoading(false);
      });
    return () => { cancelled = true; };
  }, [role]);

  // Sync mode with readonly
  useEffect(() => {
    if (isParentChildReadonlyView) setParentSectionMode('child');
  }, [isParentChildReadonlyView]);

  // Fallback Insights
  const fallbackParentInsights = useMemo(() => {
    if (!childProgressFromFile) return null;
    const entries = Object.values(childProgressFromFile || {});
    const total = entries.length;
    const achieved = entries.filter((p: any) => p?.status === 'achieved').length;
    const percent = total > 0 ? Math.round((achieved / total) * 100) : 0;
    return {
      overallProgress: { percent, stage: percent >= 80 ? 'high' : percent >= 40 ? 'steady' : 'start' },
      weeklyTrend: { direction: 'flat', note: 'История прогресса только формируется — начните с одного посильного шага на этой неделе.' },
      whyThisSuggestion: 'Рекомендация помогает поддерживать спокойный и устойчивый темп развития.',
      basedOn: { trend: 'flat', strongestAreas: [], weakestAreas: [], activityWindow: 'последние 7 дней и предыдущие 7 дней' },
      strengthsTop3: [
        { title: percent >= 60 ? 'Ребёнок уверенно завершает начатые шаги' : 'Ребёнок включён в лагерный процесс' },
        { title: 'Есть стабильный интерес к значкам и заданиям' },
        { title: 'Прогресс можно усиливать регулярной поддержкой дома' },
      ],
      nextSteps: [
        { hint: 'Обсудите один ближайший значок и мягко поддержите завершение следующего шага.' },
        { hint: 'Хвалите конкретные усилия ребёнка — это ускоряет движение по маршруту.' },
      ]
    };
  }, [childProgressFromFile]);

  // Fetch Parent Insights
  useEffect(() => {
    if (role !== 'parent' || !parentSnapshotCode) return;
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const useLocalApi = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
    const apiUrl = useLocalApi ? '/api/parent-insights' : `${((import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '')).replace(/\/$/, '')}/api/parent-insights`;
    let cancelled = false;
    setParentInsightsLoading(true);
    fetch(`${apiUrl}?code=${encodeURIComponent(parentSnapshotCode)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setParentInsights((data && typeof data === 'object') ? data : null);
      })
      .catch(() => {
        if (!cancelled) setParentInsights(null);
      })
      .finally(() => {
        if (!cancelled) setParentInsightsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, parentSnapshotCode]);

  if (role !== 'parent') return null;

  return (
    <div id="parents-section" className="profile-view-parents-section" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Для родителей</h2>
      <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.75 }}>Режим ребёнка в этом разделе всегда read-only.</p>
      
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setParentSectionMode('home')}
          style={{ opacity: parentSectionMode === 'home' ? 1 : 0.75 }}
        >
          Кабинет родителя
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setParentSectionMode('child')}
          style={{ opacity: parentSectionMode === 'child' ? 1 : 0.75 }}
        >
          Прогресс ребёнка · read-only
        </button>
      </div>

      {parentSectionMode === 'home' && campFactsLoading && (
        <p className="parents-section-block__text" style={{ margin: 0 }}>Данные загружаются…</p>
      )}
      
      {parentSectionMode === 'home' && campFactsError && (
        <p style={{ fontSize: 13, margin: 0, color: '#f59e0b' }}>Проверьте подключение. {campFactsError}</p>
      )}

      {parentSectionMode === 'home' && !campFactsLoading && !campFactsError && campFacts && (
        <>
          <div className="parents-section-block">
            <h3 className="parents-section-block__heading">Смена</h3>
            {(campFacts.currentSeason?.name || campFacts.currentSeason?.theme) && (
              <div>
                {campFacts.currentSeason?.name && <p className="parents-section-block__text" style={{ margin: 0, fontWeight: 600 }}>{campFacts.currentSeason.name}</p>}
                {campFacts.currentSeason?.theme && <p style={{ fontSize: 12, margin: '4px 0 0' }}>{campFacts.currentSeason.theme}</p>}
              </div>
            )}
            {campFacts.currentSeason?.dates && (
              <div>
                <span className="parents-section-block__label">Даты смен</span>
                <p className="parents-section-block__text">{campFacts.currentSeason.dates}</p>
              </div>
            )}
            {campFacts.currentSeason?.price && (
              <div>
                <span className="parents-section-block__label">Стоимость</span>
                <p className="parents-section-block__text">{campFacts.currentSeason.price}</p>
              </div>
            )}
          </div>
          
          <div className="parents-section-block">
            <h3 className="parents-section-block__heading">Документы</h3>
            {campFacts.documents && campFacts.documents.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.9 }}>
                {campFacts.documents.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            ) : (
              <p className="parents-section-block__text">Уточняйте у организаторов.</p>
            )}
          </div>
          
          {campFacts.address && (campFacts.address.campName || campFacts.address.base || campFacts.address.address || campFacts.address.route) && (
            <div className="parents-section-block">
              <h3 className="parents-section-block__heading">Адрес и как добраться</h3>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                {(campFacts.address.campName || campFacts.address.base) && (
                  <p style={{ margin: 0 }}>{[campFacts.address.campName, campFacts.address.base].filter(Boolean).join(', ')}</p>
                )}
                {campFacts.address.address && <p style={{ margin: '4px 0 0' }}>{campFacts.address.address}</p>}
                {campFacts.address.route && <p style={{ margin: '4px 0 0' }}>Как добраться: {campFacts.address.route}</p>}
              </div>
            </div>
          )}
          
          {campFacts.contacts && (
            <div className="parents-section-block">
              <h3 className="parents-section-block__heading">Контакты</h3>
              <div className="parents-section__contacts">
                {campFacts.contacts.phone && (
                  <a href={`tel:${campFacts.contacts.phone.replace(/\s/g, '')}`}>{campFacts.contacts.phone}</a>
                )}
                {campFacts.contacts.email && (
                  <a href={`mailto:${campFacts.contacts.email}`}>{campFacts.contacts.email}</a>
                )}
                {campFacts.contacts.telegram && (
                  <a href={campFacts.contacts.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
                )}
                {campFacts.contacts.site && (
                  <a href={campFacts.contacts.site} target="_blank" rel="noopener noreferrer">Сайт</a>
                )}
                {campFacts.contacts.vk && (
                  <a href={campFacts.contacts.vk} target="_blank" rel="noopener noreferrer">ВКонтакте</a>
                )}
                {campFacts.contacts.organizer && (
                  <a href={campFacts.contacts.organizer} target="_blank" rel="noopener noreferrer">Организатор (Telegram)</a>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {parentSectionMode === 'home' && !campFactsLoading && !campFactsError && !campFacts && (
        <p className="parents-section-block__text" style={{ margin: 0 }}>По вопросам документов и бронирования — контакты в разделе «О лагере».</p>
      )}

      {parentSectionMode === 'home' && typeof onNavigateToRegistrationForm === 'function' && (
        <button type="button" onClick={onNavigateToRegistrationForm} className="btn-primary-gold" style={{ alignSelf: 'flex-start', padding: '12px 24px' }}>
          Забронировать путевку
        </button>
      )}

      {parentSectionMode === 'home' && <h3 className="parents-section__program-title">Программа смены</h3>}
      {parentSectionMode === 'home' && <CampProgramByDays />}
      
      {parentSectionMode === 'child' && (
        <>
          <div className="parents-section-block" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 className="parents-section-block__heading" style={{ margin: 0 }}>Витрина прогресса ребёнка</h3>
            <p className="parents-section-block__text" style={{ margin: 0 }}>Здесь только безопасный read-only просмотр. Изменять прогресс ребёнка нельзя.</p>
            <button type="button" onClick={() => setShowChildBadges(true)} className="parents-section__btn-child" style={{ alignSelf: 'flex-start' }}>
              Открыть прогресс ребёнка (read-only)
            </button>
          </div>
          <div className="parents-section-block" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 className="parents-section-block__heading" style={{ margin: 0 }}>Рекомендации для поддержки ребёнка</h3>
            {parentInsightsLoading && <p className="parents-section-block__text" style={{ margin: 0 }}>Собираем понятную сводку прогресса и ближайших шагов…</p>}
            {!parentInsightsLoading && (
              <>
                <p className="parents-section-block__text" style={{ margin: 0 }}>
                  Общий прогресс: <strong>{(parentInsights?.overallProgress?.percent ?? fallbackParentInsights?.overallProgress?.percent ?? 0)}%</strong>
                </p>
                <p className="parents-section-block__text" style={{ margin: 0 }}>
                  Тренд недели: <strong>{(parentInsights?.weeklyTrend?.direction ?? fallbackParentInsights?.weeklyTrend?.direction ?? 'flat') === 'up' ? 'рост' : (parentInsights?.weeklyTrend?.direction ?? fallbackParentInsights?.weeklyTrend?.direction ?? 'flat') === 'down' ? 'снижение' : 'стабильно'}</strong>
                  {' — '}
                  {(parentInsights?.weeklyTrend?.note ?? fallbackParentInsights?.weeklyTrend?.note ?? 'Темп ровный, поддерживайте регулярный ритм.')}
                </p>
                <div>
                  <div className="parents-section-block__label">Что уже хорошо</div>
                  <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                    {(parentInsights?.strengthsTop3 || fallbackParentInsights?.strengthsTop3 || [{ title: 'Когда будет доступна витрина ребёнка, здесь появятся сильные стороны и достижения.' }]).slice(0, 3).map((s, idx) => (
                      <li key={`pi-s-${idx}`} className="parents-section-block__text" style={{ margin: 0 }}>{s?.title}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="parents-section-block__label">Ближайшие шаги</div>
                  <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                    {(parentInsights?.nextSteps || fallbackParentInsights?.nextSteps || [{ hint: 'Откройте витрину ребёнка, чтобы помочь ему с прогрессом.' }]).slice(0, 2).map((s, idx) => (
                      <li key={`pi-n-${idx}`} className="parents-section-block__text" style={{ margin: 0 }}>{s?.hint}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {isParentChildReadonlyView && (
        <div style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, letterSpacing: 0.2, padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.32)', background: 'rgba(26,33,53,0.55)' }}>
          {PARENT_READONLY_BADGE_TEXT}
        </div>
      )}

      <div className="parents-section__actions">
        <button type="button" onClick={() => setShowChildBadges(true)} className="parents-section__btn-child">
          Значки моего ребёнка
        </button>
        {parentSectionMode === 'home' && (
          <button
            type="button"
            onClick={() => {
              if (!canRunParentChildMutation({ role, hasChildProgressSnapshot: isParentChildReadonlyView })) return;
              onOpenRouteForm();
            }}
            className="parents-section__btn-route"
            disabled={!canRunParentChildMutation({ role, hasChildProgressSnapshot: isParentChildReadonlyView })}
            title={isParentChildReadonlyView ? PARENT_READONLY_TOOLTIP : undefined}
          >
            Предложить маршрут развития для ребёнка
          </button>
        )}
        <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>Предложить идею для лагеря — в блоке «Совет Лагеря» ниже.</p>
      </div>

      {parentSectionMode === 'home' && (
        <button
          type="button"
          onClick={onOpenParentCodeModal}
          className="parents-section__btn-action"
          style={{
            alignSelf: 'flex-start',
            marginTop: 12,
            padding: '8px 16px',
            fontSize: 13,
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            background: 'transparent',
            color: 'white',
            cursor: 'pointer'
          }}
          title={isParentChildReadonlyView ? PARENT_READONLY_TOOLTIP : undefined}
        >
          Привязать код прогресса ребёнка
        </button>
      )}
    </div>
  );
};

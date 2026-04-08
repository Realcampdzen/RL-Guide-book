import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useUserProgress } from '../../../hooks/useUserProgress';
import { useHintOverlay } from '../../../context/HintOverlayContext';
import { fetchBadgePlan, structureUserPlan, checkPlanApiAvailable } from '../../../utils/aiService';
import { submitBadgePlan } from '../../../utils/badgePlanApi';
import type { IBadgePlan } from '../../../types/userProgress';

// Local icon for Trash since it's inline in ProfileView
const TrashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;

export interface PlanFormBadge {
  id: string;
  title: string;
  level?: string;
  criteria?: string;
  nameExplanation?: string;
  skillTips?: string;
  confirmation?: string;
}

export const PlannerModal: React.FC = () => {
  const { accessToken } = useAuth();
  const { userData, saveBadgePlan, updateBadgePlanStatus } = useUserProgress();
  const { showHint } = useHintOverlay();

  const [planFormBadge, setPlanFormBadge] = useState<PlanFormBadge | null>(null);
  
  const [planForm, setPlanForm] = useState({
    currentDay: 1,
    shiftLength: 21 as 21 | 9,
    squadProgramGrid: '',
    squadPlan3d: '',
    campProgram3d: '',
    priority: 'both',
    myPlanDraft: ''
  });
  
  const [planStep, setPlanStep] = useState<'context' | 'structured' | 'result'>('context');
  const [planChecklistItems, setPlanChecklistItems] = useState<string[]>([]);
  const [planBusy, setPlanBusy] = useState(false);
  const [planResult, setPlanResult] = useState<{ planText: string; checklistItems: string[] } | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planApiAvailable, setPlanApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    (window as any).__openBadgePlan__ = (badgeInfo: PlanFormBadge) => {
      setPlanFormBadge(badgeInfo);
      setPlanForm({
        currentDay: Math.min(21, Math.max(1, userData?.diaryProgress?.currentDay ?? 1)),
        shiftLength: 21,
        squadProgramGrid: '',
        squadPlan3d: '',
        campProgram3d: '',
        priority: 'both',
        myPlanDraft: ''
      });
      setPlanResult(null);
      setPlanError(null);
      setPlanStep('context');
      setPlanChecklistItems([]);
    };
    return () => {
      delete (window as any).__openBadgePlan__;
    };
  }, [userData?.diaryProgress?.currentDay]);

  useEffect(() => {
    if (!planFormBadge) {
      setPlanApiAvailable(null);
      return;
    }
    setPlanApiAvailable(null);
    checkPlanApiAvailable().then(setPlanApiAvailable);
  }, [planFormBadge]);

  if (!planFormBadge) return null;

  const handleClose = () => {
    setPlanFormBadge(null);
    setPlanResult(null);
    setPlanError(null);
    setPlanStep('context');
    setPlanChecklistItems([]);
  };

  return createPortal(
    <div className="profile-view" style={{ position: 'fixed', inset: 0, zIndex: 15000, pointerEvents: 'none', cursor: 'auto' }}>
      <div className="proof-modal-overlay" style={{ pointerEvents: 'auto' }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="proof-modal proof-modal--mobile-sheet fade-in" role="dialog" aria-modal="true" aria-labelledby="profile-modal-plan-title" onClick={e => e.stopPropagation()}>
        <h3 id="profile-modal-plan-title" style={{ marginTop: 0, marginBottom: 8 }}>План получения: {planFormBadge.title}</h3>
        {planApiAvailable === false && !planResult && (
          <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,100,100,0.15)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.4)', fontSize: 12 }}>
            Для работы ИИ нужен запущенный backend. Запусти: <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4 }}>npm run start:backend</code>
          </div>
        )}
        {planError && (
          <div style={{ padding: 12, marginBottom: 12, background: 'rgba(255,100,100,0.15)', borderRadius: 8, border: '1px solid rgba(255,100,100,0.4)', fontSize: 12 }}>
            {planError}
            <button type="button" onClick={() => setPlanError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline', fontSize: 11 }}>Скрыть</button>
          </div>
        )}
        {planResult && planStep !== 'context' ? (
          <>
            <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{planResult.planText}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>{planResult.checklistItems.map((item, i) => <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>• {item}</li>)}</ul>
            {(!planForm.squadProgramGrid?.trim() && !planForm.campProgram3d?.trim()) && (
              <p style={{ fontSize: 11, opacity: 0.8, marginBottom: 12, padding: 8, background: 'rgba(255,215,0,0.08)', borderRadius: 8, border: '1px solid rgba(255,215,0,0.2)' }}>Программа отряда и лагеря не указаны — использовалась типовая программа. Для точной привязки шагов к мероприятиям нажми «Изменить контекст» и заполни программу.</p>
            )}
            <button onClick={() => setPlanStep('context')} className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} title="Добавить или изменить программу отряда/лагеря, день смены">Изменить контекст</button>
            <button onClick={async () => {
              setPlanBusy(true);
              try {
                const res = await fetchBadgePlan({
                  badgeId: planFormBadge.id,
                  badgeTitle: planFormBadge.title,
                  badgeLevel: planFormBadge.level,
                  badgeCriteria: planFormBadge.criteria,
                  badgeNameExplanation: planFormBadge.nameExplanation,
                  badgeSkillTips: planFormBadge.skillTips,
                  badgeConfirmation: planFormBadge.confirmation,
                  currentDay: planForm.currentDay,
                  shiftLength: planForm.shiftLength,
                  squadProgramGrid: planForm.squadProgramGrid || undefined,
                  squadPlan3d: planForm.squadPlan3d || undefined,
                  campProgram3d: planForm.campProgram3d || undefined,
                  priority: planForm.priority,
                  existingChecklist: planResult.checklistItems
                });
                if (res) { setPlanResult(res); setPlanStep('result'); }
                else showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Убедись, что backend запущен: npm run start:backend' });
              } catch (e) {
                console.error('fetchBadgePlan (Дополнить):', e);
                showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Запусти backend: npm run start:backend' });
              } finally { setPlanBusy(false); }
            }} disabled={planBusy} className="btn-secondary" style={{ width: '100%', marginBottom: 8 }} title="Доработать план с учётом программы отряда, дня смены и мероприятий">{planBusy ? 'Дополняем…' : 'Дополнить с учётом программы'}</button>
            <button onClick={async () => {
              if (accessToken) {
                setPlanBusy(true);
                try {
                  await submitBadgePlan(accessToken, {
                    badgeId: planFormBadge.id,
                    planText: planResult.planText,
                    checklist: planResult.checklistItems.map(s => ({ text: s, done: false })),
                    submit: true,
                  });
                  const localPlan: IBadgePlan = {
                    badgeId: planFormBadge.id,
                    status: 'pending_approval',
                    context: { currentDay: planForm.currentDay, shiftLength: planForm.shiftLength, squadProgramGrid: planForm.squadProgramGrid || undefined, squadPlan3d: planForm.squadPlan3d || undefined, campProgram3d: planForm.campProgram3d || undefined, priority: planForm.priority },
                    planText: planResult.planText,
                    checklistItems: planResult.checklistItems,
                    completedItems: [],
                    createdAt: new Date().toISOString(),
                    sentForApprovalAt: new Date().toISOString(),
                    myPlanDraft: planForm.myPlanDraft?.trim() || undefined
                  };
                  saveBadgePlan(localPlan);
                  showHint({ title: 'План отправлен!', content: 'План отправлен вожатому на проверку. Статус отобразится в карточке.' });
                } catch (e) {
                  console.error('submitBadgePlan:', e);
                  showHint({ title: 'Ошибка отправки', content: e instanceof Error ? e.message : 'Не удалось отправить план. Проверьте подключение.' });
                } finally {
                  setPlanBusy(false);
                }
              } else {
                const localPlan: IBadgePlan = {
                  badgeId: planFormBadge.id,
                  status: 'pending_approval',
                  context: { currentDay: planForm.currentDay, shiftLength: planForm.shiftLength, squadProgramGrid: planForm.squadProgramGrid || undefined, squadPlan3d: planForm.squadPlan3d || undefined, campProgram3d: planForm.campProgram3d || undefined, priority: planForm.priority },
                  planText: planResult.planText,
                  checklistItems: planResult.checklistItems,
                  completedItems: [],
                  createdAt: new Date().toISOString(),
                  myPlanDraft: planForm.myPlanDraft?.trim() || undefined
                };
                saveBadgePlan(localPlan);
                const text = `📋 План получения значка «${planFormBadge.title}»\n\n${planResult.planText}\n\nШаги:\n${planResult.checklistItems.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
                window.open(`https://t.me/Stivanovv?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
                showHint({ title: 'Отправлено', content: 'План открыт в Telegram. После подтверждения вожатым нажми «Вожатый утвердил».' });
              }
            }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginBottom: 8 }}>{planBusy ? 'Отправляем…' : 'Отправить план вожатому'}</button>
            <button onClick={() => {
              const plan: IBadgePlan = {
                badgeId: planFormBadge.id,
                status: 'approved',
                context: { currentDay: planForm.currentDay, shiftLength: planForm.shiftLength, squadProgramGrid: planForm.squadProgramGrid || undefined, squadPlan3d: planForm.squadPlan3d || undefined, campProgram3d: planForm.campProgram3d || undefined, priority: planForm.priority },
                planText: planResult.planText,
                checklistItems: planResult.checklistItems,
                completedItems: [],
                createdAt: new Date().toISOString(),
                approvedAt: new Date().toISOString(),
                myPlanDraft: planForm.myPlanDraft?.trim() || undefined
              };
              saveBadgePlan(plan);
              updateBadgePlanStatus(planFormBadge.id, 'approved');
              showHint({ title: 'Готово', content: 'План утверждён. Отмечай выполнение шагов в карточке.' });
              handleClose();
            }} className="btn-secondary" style={{ width: '100%' }}>Вожатый утвердил</button>
          </>
        ) : planStep === 'context' && planResult ? (
          <>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 12, lineHeight: 1.5 }}>Измени программу, день смены — и нажми «Дополнить», чтобы пересобрать план с учётом контекста.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Длина смены</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 21} onChange={() => setPlanForm({ ...planForm, shiftLength: 21, currentDay: Math.min(21, planForm.currentDay) })} /> 21 день</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 9} onChange={() => setPlanForm({ ...planForm, shiftLength: 9, currentDay: Math.min(9, planForm.currentDay) })} /> 9 дней</label>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>День смены (1–{planForm.shiftLength})</label>
                <input type="number" min={1} max={planForm.shiftLength} value={planForm.currentDay} onChange={e => setPlanForm({ ...planForm, currentDay: Math.min(planForm.shiftLength, Math.max(1, parseInt(e.target.value, 10) || 1)) })} className="w-input" style={{ width: '80px', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа отряда по план-сетке</label>
                <textarea placeholder="План-сетка отряда на ближайшие дни…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadProgramGrid} onChange={e => setPlanForm({ ...planForm, squadProgramGrid: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>План вожатых на 3 дня</label>
                <textarea placeholder="План вожатых на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadPlan3d} onChange={e => setPlanForm({ ...planForm, squadPlan3d: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа лагеря на 3 дня</label>
                <textarea placeholder="Общая план-сетка лагеря на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.campProgram3d} onChange={e => setPlanForm({ ...planForm, campProgram3d: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Что важнее</label>
                <select value={planForm.priority} onChange={e => setPlanForm({ ...planForm, priority: e.target.value })} className="w-input" style={{ width: '100%', padding: 10 }}>
                  <option value="squad">Программа отряда</option>
                  <option value="camp">Программа лагеря</option>
                  <option value="both">Оба равны</option>
                </select>
              </div>
            </div>
            <button onClick={async () => {
              setPlanBusy(true);
              try {
                const res = await fetchBadgePlan({
                  badgeId: planFormBadge.id,
                  badgeTitle: planFormBadge.title,
                  badgeLevel: planFormBadge.level,
                  badgeCriteria: planFormBadge.criteria,
                  badgeNameExplanation: planFormBadge.nameExplanation,
                  badgeSkillTips: planFormBadge.skillTips,
                  badgeConfirmation: planFormBadge.confirmation,
                  currentDay: planForm.currentDay,
                  shiftLength: planForm.shiftLength,
                  squadProgramGrid: planForm.squadProgramGrid || undefined,
                  squadPlan3d: planForm.squadPlan3d || undefined,
                  campProgram3d: planForm.campProgram3d || undefined,
                  priority: planForm.priority,
                  existingChecklist: planResult!.checklistItems
                });
                if (res) { setPlanResult(res); setPlanStep('result'); }
                else showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Убедись, что backend запущен: npm run start:backend' });
              } catch (e) {
                console.error('fetchBadgePlan (Дополнить из контекста):', e);
                showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Запусти backend: npm run start:backend' });
              } finally { setPlanBusy(false); }
            }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginBottom: 8 }}>{planBusy ? 'Дополняем…' : 'Дополнить с учётом программы'}</button>
            <button onClick={() => setPlanStep('result')} className="btn-secondary" style={{ width: '100%' }}>Вернуться к плану</button>
          </>
        ) : planStep === 'structured' ? (
          <>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 12, lineHeight: 1.5 }}>Редактируй шаги, добавляй свои, или дополни план с учётом программы смены.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {planChecklistItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input type="text" className="w-input" value={item} onChange={e => setPlanChecklistItems(prev => { const n = [...prev]; n[i] = e.target.value; return n; })} placeholder={`Шаг ${i + 1}`} style={{ flex: 1, padding: 8 }} />
                  <button type="button" onClick={() => setPlanChecklistItems(prev => prev.filter((_, j) => j !== i))} className="btn-action-round trash" style={{ flexShrink: 0 }} title="Удалить"><TrashIcon /></button>
                </div>
              ))}
              <button type="button" onClick={() => setPlanChecklistItems(prev => [...prev, ''])} className="btn-secondary" style={{ alignSelf: 'flex-start', fontSize: 12 }}>+ Добавить шаг</button>
            </div>
            <button onClick={async () => {
              setPlanBusy(true);
              try {
                const res = await fetchBadgePlan({
                  badgeId: planFormBadge.id,
                  badgeTitle: planFormBadge.title,
                  badgeLevel: planFormBadge.level,
                  badgeCriteria: planFormBadge.criteria,
                  badgeNameExplanation: planFormBadge.nameExplanation,
                  badgeSkillTips: planFormBadge.skillTips,
                  badgeConfirmation: planFormBadge.confirmation,
                  currentDay: planForm.currentDay,
                  shiftLength: planForm.shiftLength,
                  squadProgramGrid: planForm.squadProgramGrid || undefined,
                  squadPlan3d: planForm.squadPlan3d || undefined,
                  campProgram3d: planForm.campProgram3d || undefined,
                  priority: planForm.priority,
                  userPlanDraft: planForm.myPlanDraft?.trim() || undefined,
                  existingChecklist: planChecklistItems.filter(s => s.trim()).length > 0 ? planChecklistItems.filter(s => s.trim()) : undefined
                });
                if (res) { setPlanResult(res); setPlanStep('result'); }
                else showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Убедись, что backend запущен: npm run start:backend' });
              } catch (e) {
                console.error('fetchBadgePlan (Дополнить):', e);
                showHint({ title: 'Ошибка API', content: 'Не удалось дополнить план. Запусти backend: npm run start:backend' });
              } finally { setPlanBusy(false); }
            }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginBottom: 8 }}>{planBusy ? 'Дополняем…' : 'Дополнить с учётом программы'}</button>
            <button onClick={() => {
              const items = planChecklistItems.filter(s => s.trim());
              if (items.length === 0) { showHint({ title: 'Добавь шаги', content: 'Добавь хотя бы один шаг в чек-лист.' }); return; }
              setPlanResult({
                planText: `Мой план:\n\n${items.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
                checklistItems: items
              });
              setPlanStep('result');
            }} className="btn-secondary" style={{ width: '100%' }}>Отправить без дополнения</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 16, lineHeight: 1.5 }}>Заполни контекст и напиши свои мысли — ИИ поможет структурировать и дополнить план.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Длина смены</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 21} onChange={() => setPlanForm({ ...planForm, shiftLength: 21, currentDay: Math.min(21, planForm.currentDay) })} /> 21 день</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={planForm.shiftLength === 9} onChange={() => setPlanForm({ ...planForm, shiftLength: 9, currentDay: Math.min(9, planForm.currentDay) })} /> 9 дней</label>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>День смены (1–{planForm.shiftLength})</label>
                <input type="number" min={1} max={planForm.shiftLength} value={planForm.currentDay} onChange={e => setPlanForm({ ...planForm, currentDay: Math.min(planForm.shiftLength, Math.max(1, parseInt(e.target.value, 10) || 1)) })} className="w-input" style={{ width: '80px', padding: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа отряда по план-сетке</label>
                <textarea placeholder="План-сетка отряда на ближайшие дни…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadProgramGrid} onChange={e => setPlanForm({ ...planForm, squadProgramGrid: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>План вожатых на 3 дня</label>
                <textarea placeholder="План вожатых на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.squadPlan3d} onChange={e => setPlanForm({ ...planForm, squadPlan3d: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Программа лагеря на 3 дня</label>
                <textarea placeholder="Общая план-сетка лагеря на ближайшие 3 дня…" className="w-input" rows={2} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.campProgram3d} onChange={e => setPlanForm({ ...planForm, campProgram3d: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Что важнее</label>
                <select value={planForm.priority} onChange={e => setPlanForm({ ...planForm, priority: e.target.value })} className="w-input" style={{ width: '100%', padding: 10 }}>
                  <option value="squad">Программа отряда</option>
                  <option value="camp">Программа лагеря</option>
                  <option value="both">Оба равны</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9, marginBottom: 4 }}>Мой план</label>
                <textarea placeholder="Как ты видишь свой путь к этому значку? Запиши мысли, идеи, первые шаги…" className="w-input" rows={3} style={{ width: '100%', padding: 10, resize: 'vertical' }} value={planForm.myPlanDraft} onChange={e => setPlanForm({ ...planForm, myPlanDraft: e.target.value })} />
              </div>
            </div>
            {planForm.myPlanDraft?.trim() ? (
              <button onClick={async () => {
                setPlanBusy(true);
                try {
                  const res = await structureUserPlan({ badgeId: planFormBadge.id, badgeTitle: planFormBadge.title, myPlanDraft: planForm.myPlanDraft.trim() });
                  if (res && res.checklistItems.length > 0) {
                    setPlanChecklistItems(res.checklistItems);
                    setPlanStep('structured');
                  } else showHint({ title: 'Ошибка API', content: 'Не удалось структурировать план. Проверь, что backend запущен: npm run start:backend' });
                } catch (e) {
                  console.error('structureUserPlan:', e);
                  showHint({ title: 'Ошибка API', content: 'Не удалось структурировать план. Запусти backend: npm run start:backend' });
                } finally { setPlanBusy(false); }
              }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginTop: 16, marginBottom: 8 }}>{planBusy ? 'Структурируем…' : 'Структурировать'}</button>
            ) : (
              <button onClick={async () => {
                setPlanBusy(true);
                setPlanError(null);
                try {
                  const res = await fetchBadgePlan({
                    badgeId: planFormBadge.id,
                    badgeTitle: planFormBadge.title,
                    badgeLevel: planFormBadge.level,
                    badgeCriteria: planFormBadge.criteria,
                    badgeNameExplanation: planFormBadge.nameExplanation,
                    badgeSkillTips: planFormBadge.skillTips,
                    badgeConfirmation: planFormBadge.confirmation,
                    currentDay: planForm.currentDay,
                    shiftLength: planForm.shiftLength,
                    squadProgramGrid: planForm.squadProgramGrid || undefined,
                    squadPlan3d: planForm.squadPlan3d || undefined,
                    campProgram3d: planForm.campProgram3d || undefined,
                    priority: planForm.priority
                  });
                  if (res) {
                    setPlanResult(res);
                    setPlanStep('result');
                    setPlanError(null);
                  } else {
                    setPlanError('Не удалось сгенерировать план. Убедись, что backend запущен: npm run start:backend');
                    showHint({ title: 'Ошибка API', content: 'Не удалось сгенерировать план. Убедись, что backend запущен: npm run start:backend' });
                  }
                } catch (e) {
                  console.error('fetchBadgePlan (Сгенерировать):', e);
                  setPlanError('Не удалось сгенерировать план. Backend не отвечает или произошла ошибка сети. Запусти: npm run start:backend');
                  showHint({ title: 'Ошибка API', content: 'Не удалось сгенерировать план. Запусти backend: npm run start:backend' });
                } finally { setPlanBusy(false); }
              }} disabled={planBusy} className="btn-primary-gold" style={{ width: '100%', marginTop: 16 }} title={planApiAvailable === false ? 'Backend не запущен — при клике покажем подсказку' : ''}>{planBusy ? 'Генерируем…' : 'Сгенерировать план'}</button>
            )}
          </>
        )}
        <button onClick={handleClose} style={{ width: '100%', background: 'none', border: 'none', color: 'white', marginTop: 12, cursor: 'pointer', opacity: 0.5, fontSize: 13 }}>Закрыть</button>
        </div>
      </div>
    </div>
  , document.body);
};

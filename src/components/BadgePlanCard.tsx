import React, { useState } from 'react';
import BadgeIcon from './BadgeIcon';
import type { IBadgePlan } from '../types/userProgress';

interface BadgePlanCardProps {
  plan: IBadgePlan;
  badgeTitle: string;
  onNavigateToBadge: (badgeId: string) => void;
  onCheckItem: (badgeId: string, itemIndex: number, completed: boolean) => void;
}

export const BadgePlanCard: React.FC<BadgePlanCardProps> = ({ plan, badgeTitle, onNavigateToBadge, onCheckItem }) => {
  const [showDraft, setShowDraft] = useState(false);
  const total = plan.checklistItems?.length || 0;
  const completed = plan.completedItems?.length || 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasDraft = plan.myPlanDraft?.trim();
  return (
    <div style={{ padding: '16px', background: 'rgba(56, 239, 125, 0.08)', borderRadius: '16px', border: '1px solid rgba(56, 239, 125, 0.25)', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }} onClick={() => onNavigateToBadge(plan.badgeId)}>
        <BadgeIcon badgeId={plan.badgeId} badgeTitle="" categoryId={plan.badgeId.split('.')[0] || '1'} emoji="🏆" size="small" />
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>План получения: {badgeTitle}</div><div style={{ fontSize: '11px', opacity: 0.6 }}>{completed}/{total}</div></div>
      </div>
      {hasDraft && (
        <div style={{ marginBottom: 12 }}>
          <button type="button" onClick={(e) => { e.stopPropagation(); setShowDraft(!showDraft); }} style={{ fontSize: 11, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>{showDraft ? 'Скрыть мой черновик' : 'Показать мой черновик'}</button>
          {showDraft && <div style={{ fontSize: 12, opacity: 0.85, whiteSpace: 'pre-wrap', marginTop: 6, padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>{plan.myPlanDraft}</div>}
        </div>
      )}
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '12px' }}><div style={{ width: percent + '%', height: '100%', background: '#38ef7d' }} /></div>
      <ul style={{ listStyle: 'none', padding: 0 }}>{(plan.checklistItems || []).map((item, idx) => { const isDone = (plan.completedItems || []).includes(String(idx)); return <li key={idx} style={{ display: 'flex', gap: '10px', padding: '6px 0' }}><button type="button" onClick={() => onCheckItem(plan.badgeId, idx, !isDone)} style={{ width: 20, height: 20, borderRadius: 4, border: isDone ? '2px solid #38ef7d' : '2px solid rgba(255,255,255,0.3)', background: isDone ? '#38ef7d' : 'transparent', cursor: 'pointer' }}>{isDone ? '\u2713' : ''}</button><span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{item}</span></li>; })}</ul>
    </div>
  );
};

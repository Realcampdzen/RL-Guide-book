import { useState, useEffect } from 'react';

export interface PlanFormBadge {
  id: string;
  title: string;
  level?: string;
  criteria?: string;
  nameExplanation?: string;
  skillTips?: string;
  confirmation?: string;
}

export function usePlannerState(initialDay: number) {
  const [planFormBadge, setPlanFormBadge] = useState<PlanFormBadge | null>(null);
  
  const [planForm, setPlanForm] = useState({
    currentDay: initialDay,
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
      setPlanForm(prev => ({ ...prev, currentDay: Math.min(21, Math.max(1, initialDay)) }));
      setPlanResult(null);
      setPlanError(null);
      setPlanStep('context');
      setPlanChecklistItems([]);
    };
    return () => {
      delete (window as any).__openBadgePlan__;
    };
  }, [initialDay]);

  const resetPlanner = () => {
    setPlanFormBadge(null);
    setPlanResult(null);
    setPlanError(null);
    setPlanStep('context');
    setPlanChecklistItems([]);
  };

  return {
    planFormBadge,
    setPlanFormBadge,
    planForm,
    setPlanForm,
    planStep,
    setPlanStep,
    planChecklistItems,
    setPlanChecklistItems,
    planBusy,
    setPlanBusy,
    planResult,
    setPlanResult,
    planError,
    setPlanError,
    planApiAvailable,
    setPlanApiAvailable,
    resetPlanner
  };
}

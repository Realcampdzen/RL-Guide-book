import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SmartHint } from '../components/SmartHint';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

export interface HintStep {
  title: string;
  content: string;
  targetSelector?: string;
  beforeAction?: () => void | Promise<void>;
  delayBeforeMeasure?: number;
}

interface HintOverlayContextType {
  showHint: (step: HintStep) => void;
  startTutorial: (steps: HintStep[], options?: { onComplete?: () => void; onStepChange?: (stepIdx: number) => void }) => void;
  hideHint: () => void;
  isHintActive: boolean;
}

const HintOverlayContext = createContext<HintOverlayContextType | undefined>(undefined);

export const useHintOverlay = () => {
  const context = useContext(HintOverlayContext);
  if (!context) {
    throw new Error('useHintOverlay must be used within a HintOverlayProvider');
  }
  return context;
};

export const HintOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSteps, setCurrentSteps] = useState<HintStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [onCompleteCallback, setOnCompleteCallback] = useState<(() => void) | undefined>(undefined);
  const [onStepChangeCallback, setOnStepChangeCallback] = useState<((stepIdx: number) => void) | undefined>(undefined);

  const performStepChange = useCallback(async (idx: number, steps: HintStep[]) => {
    const step = steps[idx];
    if (!step) return;
    
    setIsTransitioning(true);
    setCurrentStepIdx(idx);

    if (step.beforeAction) {
      try {
        await step.beforeAction();
      } catch (e) {
        console.error('HintStep beforeAction failed:', e);
      }
    }

    if (step.delayBeforeMeasure || step.beforeAction) {
      setTimeout(() => {
        setIsTransitioning(false);
        if (onStepChangeCallback) onStepChangeCallback(idx);
      }, step.delayBeforeMeasure ?? 300);
    } else {
      setIsTransitioning(false);
      if (onStepChangeCallback) onStepChangeCallback(idx);
    }
  }, [onStepChangeCallback]);

  const showHint = useCallback((step: HintStep) => {
    setCurrentSteps([step]);
    setIsOpen(true);
    setOnCompleteCallback(undefined);
    setOnStepChangeCallback(undefined);
    void performStepChange(0, [step]);
  }, [performStepChange]);

  const startTutorial = useCallback((steps: HintStep[], options?: { onComplete?: () => void; onStepChange?: (stepIdx: number) => void }) => {
    if (!steps || steps.length === 0) return;
    setCurrentSteps(steps);
    setIsOpen(true);
    setOnCompleteCallback(options?.onComplete ? () => options.onComplete!() : undefined);
    setOnStepChangeCallback(options?.onStepChange ? (idx: number) => options.onStepChange!(idx) : undefined);
    void performStepChange(0, steps);
  }, [performStepChange]);

  const hideHint = useCallback(() => {
    setIsOpen(false);
    setCurrentStepIdx(-1);
    setCurrentSteps([]);
    setIsTransitioning(false);
    if (onCompleteCallback) {
      onCompleteCallback();
      setOnCompleteCallback(undefined);
    }
    setOnStepChangeCallback(undefined);
  }, [onCompleteCallback]);

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    const nextIdx = currentStepIdx + 1;
    if (nextIdx < currentSteps.length) {
      void performStepChange(nextIdx, currentSteps);
    } else {
      hideHint();
    }
  }, [currentStepIdx, currentSteps, hideHint, isTransitioning, performStepChange]);

  const handlePrev = useCallback(() => {
    if (isTransitioning) return;
    const prevIdx = currentStepIdx - 1;
    if (prevIdx >= 0) {
      void performStepChange(prevIdx, currentSteps);
    }
  }, [currentStepIdx, currentSteps, isTransitioning, performStepChange]);

  // Prevent scroll when hint is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => {
        unlockScroll();
      };
    }
  }, [isOpen]);

  const activeStep = currentStepIdx >= 0 ? currentSteps[currentStepIdx] : null;

  return (
    <HintOverlayContext.Provider value={{ showHint, startTutorial, hideHint, isHintActive: isOpen }}>
      {children}
      {activeStep && !isTransitioning && (
        <SmartHint
          isOpen={isOpen}
          onClose={hideHint}
          title={activeStep.title}
          content={activeStep.content}
          targetSelector={activeStep.targetSelector}
          step={currentStepIdx + 1}
          totalSteps={currentSteps.length > 1 ? currentSteps.length : undefined}
          onNext={currentSteps.length > 1 || currentStepIdx < currentSteps.length - 1 ? handleNext : undefined}
          onPrev={currentStepIdx > 0 ? handlePrev : undefined}
        />
      )}
    </HintOverlayContext.Provider>
  );
};

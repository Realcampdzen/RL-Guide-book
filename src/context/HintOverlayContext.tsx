import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SmartHint } from '../components/SmartHint';
import { lockScroll, unlockScroll } from '../utils/scrollLock';

export interface HintStep {
  title: string;
  content: string;
  targetSelector?: string;
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
  const [onCompleteCallback, setOnCompleteCallback] = useState<(() => void) | undefined>(undefined);
  const [onStepChangeCallback, setOnStepChangeCallback] = useState<((stepIdx: number) => void) | undefined>(undefined);

  const showHint = useCallback((step: HintStep) => {
    setCurrentSteps([step]);
    setCurrentStepIdx(0);
    setIsOpen(true);
    setOnCompleteCallback(undefined);
    setOnStepChangeCallback(undefined);
  }, []);

  const startTutorial = useCallback((steps: HintStep[], options?: { onComplete?: () => void; onStepChange?: (stepIdx: number) => void }) => {
    setCurrentSteps(steps);
    setCurrentStepIdx(0);
    setIsOpen(true);
    setOnCompleteCallback(options?.onComplete ? () => options.onComplete!() : undefined);
    setOnStepChangeCallback(options?.onStepChange ? (idx: number) => options.onStepChange!(idx) : undefined);
    if (options?.onStepChange) {
      options.onStepChange(0);
    }
  }, []);

  const hideHint = useCallback(() => {
    setIsOpen(false);
    setCurrentStepIdx(-1);
    setCurrentSteps([]);
    if (onCompleteCallback) {
      onCompleteCallback();
      setOnCompleteCallback(undefined);
    }
    setOnStepChangeCallback(undefined);
  }, [onCompleteCallback]);

  const handleNext = useCallback(() => {
    const nextIdx = currentStepIdx + 1;
    if (nextIdx < currentSteps.length) {
      setCurrentStepIdx(nextIdx);
      if (onStepChangeCallback) {
        onStepChangeCallback(nextIdx);
      }
    } else {
      hideHint();
    }
  }, [currentStepIdx, currentSteps.length, hideHint, onStepChangeCallback]);

  const handlePrev = useCallback(() => {
    const prevIdx = currentStepIdx - 1;
    if (prevIdx >= 0) {
      setCurrentStepIdx(prevIdx);
      if (onStepChangeCallback) {
        onStepChangeCallback(prevIdx);
      }
    }
  }, [currentStepIdx, onStepChangeCallback]);

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
      {activeStep && (
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

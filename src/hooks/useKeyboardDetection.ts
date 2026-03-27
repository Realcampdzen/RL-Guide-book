import { useEffect } from 'react';

/**
 * Хук для отслеживания открытия виртуальной клавиатуры на мобильных устройствах.
 * Вешает класс `keyboard-open` на `document.body` когда происходит фокус
 * в полях ввода (input, textarea). Это позволяет скрывать панели и
 * отключать дорогостоящие анимации/позиционирования (например, bottom nav).
 */
export function useKeyboardDetection() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Check if device is potentially a touch device
    const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    
    // We only care about keyboard jumping on touch devices
    if (!isTouch) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') &&
        // Ignore inputs that typically don't trigger the keyboard (checkbox, radio, button etc.)
        !['checkbox', 'radio', 'button', 'submit', 'color', 'file'].includes((target as HTMLInputElement).type)
      ) {
        document.body.classList.add('keyboard-open');
      }
    };

    const handleFocusOut = () => {
      // Small delay prevents flickering if focus moves quickly between two inputs
      setTimeout(() => {
        const activeElem = document.activeElement as HTMLElement;
        if (
          !activeElem ||
          (activeElem.tagName !== 'INPUT' && activeElem.tagName !== 'TEXTAREA')
        ) {
          document.body.classList.remove('keyboard-open');
        }
      }, 50);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.body.classList.remove('keyboard-open');
    };
  }, []);
}

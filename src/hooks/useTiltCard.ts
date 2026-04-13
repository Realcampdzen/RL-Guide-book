import { type RefObject, useEffect } from 'react';
import { rafThrottle } from '../utils/rafThrottle';

export const useTiltCard = (cardRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    if (!cardRef.current) return;

    // Отключаем tilt эффект на touch устройствах для производительности
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const card = cardRef.current;

    const handleMouseMove = rafThrottle((e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    const handleMouseLeave = () => {
      card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
    };

    card.addEventListener('mousemove', handleMouseMove, {
      passive: true,
    } as AddEventListenerOptions);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove as unknown as EventListener);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cardRef]);
};

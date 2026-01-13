import { useEffect, RefObject } from 'react';

export const useTiltCard = (cardRef: RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!cardRef.current) return;
    
    // Отключаем tilt эффект на touch устройствах для производительности
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const card = cardRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/96284863-607a-4bc5-9cb2-27956a8c59cf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTiltCard.ts:9',message:'mousemove event in tilt card',data:{clientX:e.clientX,clientY:e.clientY,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'}})}).catch(()=>{});
      // #endregion
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cardRef]);
};


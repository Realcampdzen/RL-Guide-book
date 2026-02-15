import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface SmartHintProps {
  targetSelector?: string;
  title: string;
  content: string;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  step?: number;
  totalSteps?: number;
  isFirst?: boolean;
  isLast?: boolean;
  isOpen?: boolean;
}

export const SmartHint: React.FC<SmartHintProps> = ({
  targetSelector,
  title,
  content,
  onClose,
  onNext,
  onPrev,
  step = 1,
  totalSteps,
  isFirst: _isFirst,
  isLast
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const requestRef = useRef<number>(0);

  const selector = targetSelector || 'body';
  const updateRect = () => {
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
    requestRef.current = requestAnimationFrame(updateRect);
  };

  useEffect(() => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Ждем завершения скролла перед показом
      const timer = setTimeout(() => setIsVisible(true), 500);
      updateRect();
      return () => {
        cancelAnimationFrame(requestRef.current);
        clearTimeout(timer);
      };
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [selector]);

  const maskId = useMemo(() => `hint-mask-${Math.random().toString(36).substr(2, 9)}`, []);

  if (!targetRect) return null;

  const { left, top, width, height } = targetRect;
  const padding = 8;
  const r = 16; // скругление

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 10000,
      pointerEvents: 'none',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.5s ease'
    }}>
      {/* SVG Overlay with smooth mask */}
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <rect 
              x={left - padding} 
              y={top - padding} 
              width={width + padding * 2} 
              height={height + padding * 2} 
              rx={r} 
              ry={r} 
              fill="black" 
            />
          </mask>
          
          <radialGradient id="pulse-grad">
            <stop offset="70%" stopColor="rgba(139, 0, 255, 0)" />
            <stop offset="100%" stopColor="rgba(139, 0, 255, 0.4)" />
          </radialGradient>
        </defs>
        
        {/* Dimmed background */}
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(0, 0, 0, 0.75)" 
          mask={`url(#${maskId})`}
          style={{ pointerEvents: 'auto' }}
          onClick={onClose}
        />

        {/* Pulsing highlight ring */}
        <rect
          x={left - padding - 4}
          y={top - padding - 4}
          width={width + padding * 2 + 8}
          height={height + padding * 2 + 8}
          rx={r + 4}
          ry={r + 4}
          fill="none"
          stroke="rgba(139, 0, 255, 0.8)"
          strokeWidth="2"
        >
          <animate 
            attributeName="stroke-width" 
            values="2;6;2" 
            dur="2s" 
            repeatCount="indefinite" 
          />
          <animate 
            attributeName="opacity" 
            values="0.8;0.2;0.8" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </rect>
      </svg>

      {/* Content Card */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: top + height + 40 > window.innerHeight - 200 ? top - 200 : top + height + 24,
        transform: 'translateX(-50%)',
        width: 'calc(100% - 40px)',
        maxWidth: '320px',
        background: 'rgba(25, 25, 45, 0.95)',
        backdropFilter: 'blur(15px)',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid rgba(139, 0, 255, 0.3)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139, 0, 255, 0.2)',
        pointerEvents: 'auto',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#B088FF', fontSize: '18px', fontWeight: 800 }}>{title}</h3>
        <p style={{ margin: '0 0 24px 0', color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: '1.6' }}>{content}</p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {onPrev && (step == null || step > 1) && (
            <button
              onClick={onPrev}
              style={{
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Назад
            </button>
          )}
          {onNext && !(isLast ?? (totalSteps != null && step >= totalSteps)) ? (
            <button 
              onClick={onNext}
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #8B00FF, #4D00B4)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Далее
            </button>
          ) : (
            <button 
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Понятно
            </button>
          )}
        </div>

        {/* Progress dots */}
        {totalSteps != null && totalSteps > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '16px' }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: i + 1 === step ? 'rgba(139, 0, 255, 0.9)' : 'rgba(139, 0, 255, 0.3)',
              }} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>,
    document.body
  );
};
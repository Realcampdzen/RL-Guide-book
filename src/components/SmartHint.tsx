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

  const selector = targetSelector; // Now it can be undefined
  const updateRect = () => {
    if (!selector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(selector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
    requestRef.current = requestAnimationFrame(updateRect);
  };

  useEffect(() => {
    if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    const timer = setTimeout(() => setIsVisible(true), 150);
    updateRect();
    return () => {
      cancelAnimationFrame(requestRef.current);
      clearTimeout(timer);
    };
  }, [selector]);

  const maskId = useMemo(() => `hint-mask-${Math.random().toString(36).substr(2, 9)}`, []);

  const padding = 8;
  const r = 16; 

  // Calculate modal positioning
  // If targetRect exists, place it above or below the target hole.
  // If targetRect is null, place it center screen.
  let modalTop: string | undefined = '50%';
  let modalBottom: string | undefined = undefined;
  let modalTransform = 'translate(-50%, -50%)';
  if (targetRect) {
    const { top, height } = targetRect;
    // Assume max modal height is ~300px. If placing below risks cutting it off:
    if (top + height + 320 > window.innerHeight) {
        modalTop = undefined;
        // Anchor the bottom of the modal just above the target
        modalBottom = `${window.innerHeight - top + 24}px`;
    } else {
        // Fits below safely
        modalTop = `${top + height + 24}px`;
        modalBottom = undefined;
    }
    modalTransform = 'translateX(-50%)';
  }

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
      transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* SVG Overlay with smooth mask */}
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect 
                x={targetRect.left - padding} 
                y={targetRect.top - padding} 
                width={targetRect.width + padding * 2} 
                height={targetRect.height + padding * 2} 
                rx={r} 
                ry={r} 
                fill="black" 
              />
            )}
          </mask>
        </defs>
        
        {/* Dimmed background */}
        <rect 
          width="100%" 
          height="100%" 
          fill="rgba(5, 5, 12, 0.85)" 
          mask={`url(#${maskId})`}
          style={{ pointerEvents: 'auto' }}
          onClick={onClose}
        />

        {/* Pulsing highlight ring */}
        {targetRect && (
          <rect
            x={targetRect.left - padding - 4}
            y={targetRect.top - padding - 4}
            width={targetRect.width + padding * 2 + 8}
            height={targetRect.height + padding * 2 + 8}
            rx={r + 4}
            ry={r + 4}
            fill="none"
            stroke="rgba(147, 51, 234, 0.8)"
            strokeWidth="3"
          >
            <animate 
              attributeName="opacity" 
              values="0.9;0.3;0.9" 
              dur="2.5s" 
              repeatCount="indefinite" 
            />
          </rect>
        )}
      </svg>

      {/* Content Card (PS5 Style Glassmorphism) */}
      <div style={{
        position: 'absolute',
        left: '50%',
        top: modalTop,
        bottom: modalBottom,
        transform: modalTransform,
        width: 'calc(100% - 40px)',
        maxWidth: targetRect ? '340px' : '420px',
        background: 'rgba(15, 15, 30, 0.7)',
        backdropFilter: 'blur(30px) saturate(150%)',
        WebkitBackdropFilter: 'blur(30px) saturate(150%)',
        padding: '28px',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6), 0 0 60px rgba(147, 51, 234, 0.3), inset 0 0 20px rgba(147, 51, 234, 0.1)',
        pointerEvents: 'auto',
        animation: targetRect ? 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        color: '#fff',
        textAlign: targetRect ? 'left' : 'center'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '22px', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{title}</h3>
        <p style={{ margin: '0 0 28px 0', color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.6' }}>{content}</p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: targetRect ? 'flex-start' : 'center' }}>
          {onPrev && (step == null || step > 1) && (
            <button
              onClick={onPrev}
              style={{
                flex: targetRect ? '0 0 auto' : 1,
                padding: '14px 20px',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              Назад
            </button>
          )}
          {onNext && !(isLast ?? (totalSteps != null && step >= totalSteps)) ? (
            <button 
              onClick={onNext}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                color: 'white',
                border: '1px solid #c084fc',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(147, 51, 234, 0.4)',
                transition: 'transform 0.1s, filter 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Далее
            </button>
          ) : (
            <button 
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                color: 'white',
                border: '1px solid #c084fc',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(147, 51, 234, 0.4)',
                transition: 'transform 0.1s, filter 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              Поехали!
            </button>
          )}
        </div>

        {/* Progress dots */}
        {totalSteps != null && totalSteps > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i + 1 === step ? '#c084fc' : 'rgba(255,255,255,0.2)',
                boxShadow: i + 1 === step ? '0 0 10px #c084fc' : 'none',
                transition: 'background 0.3s'
              }} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px) scale(0.97); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
};
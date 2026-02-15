import React from 'react';

interface FeatureGateProps {
  allowed: boolean;
  reason: string;
  ctaLabel?: string;
  onCta?: () => void;
  mode?: 'overlay' | 'replace';
  className?: string;
  children: React.ReactNode;
}

const lockShellStyle: React.CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(255, 193, 7, 0.35)',
  background: 'linear-gradient(180deg, rgba(22, 22, 36, 0.92), rgba(12, 12, 20, 0.92))',
  color: 'rgba(255,255,255,0.95)',
  padding: 14
};

export const FeatureGate: React.FC<FeatureGateProps> = ({
  allowed,
  reason,
  ctaLabel,
  onCta,
  mode = 'overlay',
  className,
  children
}) => {
  if (allowed) {
    return <>{children}</>;
  }

  const lockContent = (
    <div style={lockShellStyle} role="note" aria-live="polite">
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Раздел доступен после разблокировки</div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>{reason}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          className="btn-primary-gold"
          onClick={onCta}
          style={{ marginTop: 10, padding: '8px 14px', fontSize: 12 }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );

  if (mode === 'replace') {
    return <div className={className}>{lockContent}</div>;
  }

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div aria-hidden style={{ opacity: 0.72, filter: 'grayscale(0.18)', pointerEvents: 'none' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 14,
          background: 'linear-gradient(180deg, rgba(9, 9, 15, 0.62), rgba(9, 9, 15, 0.82))',
          borderRadius: 14
        }}
      >
        <div style={{ width: 'min(560px, 100%)' }}>{lockContent}</div>
      </div>
    </div>
  );
};

export default FeatureGate;

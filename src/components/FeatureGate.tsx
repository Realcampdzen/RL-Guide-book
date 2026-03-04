import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/authRole';
import { ROLE_LABELS } from '../types/authRole';

interface FeatureGateProps {
  /**
   * Explicit override: if set, bypasses role-based logic.
   * When omitted (undefined), the gate auto-computes from `requiredRoles`.
   */
  allowed?: boolean;
  /** Roles that can pass the gate. Ignored if `allowed` is explicitly set. */
  requiredRoles?: UserRole[];
  /** Custom reason text shown when locked. */
  reason?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Called when the CTA should open the login modal (not-authenticated flow). */
  onLogin?: () => void;
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
  requiredRoles,
  reason,
  ctaLabel,
  onCta,
  onLogin,
  mode = 'overlay',
  className,
  children
}) => {
  const { role, accessToken } = useAuth();

  // --- Resolve `isAllowed` ---
  let isAllowed: boolean;

  if (allowed !== undefined) {
    // Explicit override — preserve backward-compatibility.
    isAllowed = allowed;
  } else if (requiredRoles && requiredRoles.length > 0) {
    isAllowed = requiredRoles.includes(role);
  } else {
    // No props provided — default open.
    isAllowed = true;
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  // --- Build lock reason & CTA ---
  const isAuthenticated = Boolean(accessToken);

  let effectiveReason = reason || '';
  let effectiveCtaLabel = ctaLabel || '';
  let effectiveOnCta = onCta;

  if (!reason && requiredRoles && requiredRoles.length > 0) {
    if (!isAuthenticated) {
      effectiveReason = 'Войдите, чтобы получить доступ к этому разделу';
      effectiveCtaLabel = ctaLabel || 'Войти';
      effectiveOnCta = onLogin || onCta;
    } else {
      const roleNames = requiredRoles
        .map((r) => ROLE_LABELS[r] || r)
        .join(', ');
      effectiveReason = `Доступно для: ${roleNames}`;
    }
  }

  const lockContent = (
    <div style={lockShellStyle} role="note" aria-live="polite">
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Раздел доступен после разблокировки</div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>{effectiveReason}</p>
      {effectiveCtaLabel && effectiveOnCta && (
        <button
          type="button"
          className="btn-primary-gold"
          onClick={effectiveOnCta}
          style={{ marginTop: 10, padding: '8px 14px', fontSize: 12 }}
        >
          {effectiveCtaLabel}
        </button>
      )}
    </div>
  );

  if (mode === 'replace') {
    return <div className={className}>{lockContent}</div>;
  }

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div aria-hidden style={{ opacity: 0.45, filter: 'grayscale(0.18)', pointerEvents: 'none', maxHeight: 180, overflow: 'hidden' }}>
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '24px 14px 14px',
          background: 'linear-gradient(180deg, rgba(9, 9, 15, 0.82), rgba(9, 9, 15, 0.62))',
          borderRadius: 14
        }}
      >
        <div style={{ width: 'min(560px, 100%)' }}>{lockContent}</div>
      </div>
    </div>
  );
};

export default FeatureGate;

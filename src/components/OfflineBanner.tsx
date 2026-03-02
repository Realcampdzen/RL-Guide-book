import React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OfflineBannerProps {
    visible: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible }) => {
    if (!visible) return null;

    return (
        <div style={{
            padding: '8px 14px', borderRadius: 8,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: '#f59e0b',
        }}>
            <span style={{ fontSize: 14 }}>📡</span>
            <span>Офлайн — данные могут быть устаревшими</span>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnlineStatus(): boolean {
    const [online, setOnline] = React.useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

    React.useEffect(() => {
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    return online;
}

export default OfflineBanner;

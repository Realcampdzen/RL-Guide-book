import { Component, type ErrorInfo, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PanelErrorBoundaryProps {
    children: ReactNode;
    panelName?: string;
}

interface PanelErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
    constructor(props: PanelErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(`[PanelErrorBoundary] ${this.props.panelName ?? 'unknown'}:`, error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 16, borderRadius: 12, background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center',
                }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>⚠️</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>
                        Произошла ошибка
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>
                        {this.props.panelName && <span>В компоненте «{this.props.panelName}». </span>}
                        Попробуйте обновить страницу.
                    </div>
                    {this.state.error && (
                        <div style={{ fontSize: 9, opacity: 0.4, fontFamily: 'monospace', marginBottom: 8, wordBreak: 'break-all' }}>
                            {this.state.error.message}
                        </div>
                    )}
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={this.handleRetry}
                        style={{ padding: '6px 16px', fontSize: 11 }}
                    >
                        🔄 Повторить
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default PanelErrorBoundary;

import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: (args: { error: Error; reset: () => void }) => React.ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep console error for debugging; no network calls here.
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, errorInfo);

    // Auto-reload on Vite dynamic import chunk failure (e.g. after a new deployment)
    const msg = error.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('dynamically imported module') ||
      error.name === 'ChunkLoadError'
    ) {
      // Prevent infinite reload loops if the chunk is genuinely missing forever
      if (!sessionStorage.getItem('chunk-reload-attempted')) {
        sessionStorage.setItem('chunk-reload-attempted', 'true');
        window.location.reload();
      }
    }
  }

  reset = () => {
    sessionStorage.removeItem('chunk-reload-attempted');
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback({ error, reset: this.reset });
    }

    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Произошла ошибка</div>
        <div style={{ opacity: 0.85, marginBottom: 12 }}>
          Попробуйте обновить страницу или вернуться назад.
        </div>
        <button type="button" onClick={this.reset} style={{ padding: '10px 12px', borderRadius: 10 }}>
          Попробовать снова
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;


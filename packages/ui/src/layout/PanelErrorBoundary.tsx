import React from 'react';

interface Props {
  panelId: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that isolates panel crashes.
 * A single panel crashing won't take down the entire terminal.
 */
export class PanelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[Panel ${this.props.panelId}] Crash:`, error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: '#0a0a0e',
          color: '#888',
          fontSize: 12,
          gap: 8,
          padding: 16,
        }}>
          <span style={{ color: '#ef5350', fontWeight: 700 }}>Panel Error</span>
          <span style={{ color: '#555', fontSize: 11, textAlign: 'center', maxWidth: 200 }}>
            {this.state.error?.message ?? 'Unknown error'}
          </span>
          <button
            onClick={this.handleRetry}
            style={{
              marginTop: 4,
              padding: '4px 12px',
              background: '#1a1a22',
              border: '1px solid #333',
              color: '#ccc',
              cursor: 'pointer',
              borderRadius: 2,
              fontSize: 11,
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

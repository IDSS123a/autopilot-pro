import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-background text-foreground">
          <div className="bg-card border border-destructive/20 rounded-xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} className="text-destructive" />
            </div>
            <h2 className="text-xl font-heading font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-6">
              The application encountered an unexpected error. This might be due to a connectivity issue or an AI service interruption.
            </p>
            {this.state.error && (
              <div className="bg-background p-3 rounded text-xs font-mono text-destructive mb-6 text-left overflow-auto max-h-32 border border-border">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleRetry}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-glow text-primary-foreground font-medium py-2.5 px-4 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-cream p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="w-20 h-20 mx-auto bg-coral/10 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-coral" />
            </div>
            
            {/* Error Message */}
            <div className="space-y-3">
              <h1 className="text-2xl font-display font-bold text-deepSage">
                Something went wrong
              </h1>
              <p className="text-textSecondaryLight">
                We're sorry, but something unexpected happened. This has been logged and we'll look into it.
              </p>
            </div>

            {/* Error Details (in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="cosmic-card p-4 text-left">
                <h3 className="font-semibold text-coral mb-2">Error Details:</h3>
                <pre className="text-xs text-textSecondaryLight overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full cosmic-button flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              
              <Link
                to="/"
                className="w-full ghost-button flex items-center justify-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </Link>
            </div>

            {/* Support Info */}
            <div className="cosmic-card p-4 bg-sage/10 border-sage/20">
              <p className="text-sm text-sage">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

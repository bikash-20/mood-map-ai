// Top-level error boundary — keeps the app from going white-screen on crashes
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="glass-card p-6 text-center max-w-md mx-auto mt-12">
          <h2 className="text-xl font-bold text-primaryText mb-2">Something went wrong</h2>
          <p className="text-secondaryText text-sm mb-4">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            className="px-4 py-2 bg-accentPositive text-primaryText rounded-lg shadow-md"
            onClick={this.reset}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="max-w-2xl mx-auto p-8 bg-white border border-red-200 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h1>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Error:</h2>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                  {this.state.error && this.state.error.toString()}
                </pre>
              </div>
              {this.state.errorInfo && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Component Stack:</h2>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

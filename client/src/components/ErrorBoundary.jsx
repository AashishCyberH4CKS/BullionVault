import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">Display Recovery Triggered</h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-6 font-light">
              An unexpected display discrepancy occurred while rendering data metrics. All portfolio and transaction data remain safe and intact.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="luxury-button py-2.5 px-4 text-xs flex items-center justify-center space-x-2 shadow-luxury cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="luxury-button-secondary py-2.5 px-4 text-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Home size={14} />
                <span>Return to Home</span>
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

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CanvasErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-xl m-4 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
            {this.props.fallbackMessage || 'Canvas Viewer Encountered an Issue'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading this question image or drawing canvas.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-dark-800 hover:bg-slate-300 dark:hover:bg-dark-750 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload App</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CanvasErrorBoundary;

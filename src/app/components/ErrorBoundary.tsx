import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              Hoppá! Valami hiba történt
            </h1>
            <p className="text-stone-600 mb-6">
              Ne aggódj, az adataid biztonságban vannak. Frissítsd az oldalt, hogy újra próbáld.
            </p>
            {this.state.error && (
              <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200 text-left">
                <p className="text-xs font-mono text-stone-700 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-all font-medium"
            >
              Oldal újratöltése
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

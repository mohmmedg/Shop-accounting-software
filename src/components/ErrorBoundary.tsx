import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 font-sans" dir="rtl" id="error-boundary-container">
          <div className="max-w-md w-full bg-white shadow-xl rounded-2xl border border-gray-100 p-8 text-center" id="error-boundary-card">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6" id="error-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3" id="error-title">
              عذراً، حدث خطأ غير متوقع
            </h1>
            
            <p className="text-gray-600 mb-6 text-sm leading-relaxed" id="error-description">
              واجه نظام نقاط البيع مشكلة تقنية مفاجئة أثناء معالجة الصفحة. لقد تم تسجيل تفاصيل الخطأ للتحقيق والحل.
            </p>

            {this.state.error && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-left font-mono text-xs text-red-600 overflow-x-auto max-h-32 mb-6" id="error-stack-trace">
                <span className="font-bold text-gray-700 block mb-1">تفاصيل الخطأ:</span>
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition duration-150 ease-in-out shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              id="error-reload-button"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

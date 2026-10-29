import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 4000, onUndo = null }) => {
    const id = Date.now() + Math.random().toString();
    const newToast = { id, type, message, onUndo };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((message, options) => addToast({ type: 'success', message, ...options }), [addToast]);
  const showError = useCallback((message, options) => addToast({ type: 'error', message, ...options }), [addToast]);
  const showInfo = useCallback((message, options) => addToast({ type: 'info', message, ...options }), [addToast]);
  const showWarning = useCallback((message, options) => addToast({ type: 'warning', message, ...options }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-lg text-sm transition-all duration-200 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-success-bg border-success-border text-success-text'
                : toast.type === 'error'
                ? 'bg-danger-bg border-danger-border text-danger-text'
                : toast.type === 'warning'
                ? 'bg-warning-bg border-warning-border text-warning-text'
                : 'bg-surface border-border text-content-primary'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-danger shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-warning shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-info shrink-0" />}
              <span className="font-medium leading-relaxed">{toast.message}</span>
            </div>

            <div className="flex items-center gap-2 ml-3">
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo();
                    removeToast(toast.id);
                  }}
                  className="text-xs font-bold underline uppercase tracking-wide hover:opacity-80"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`
                pointer-events-auto
                mb-3 p-4 rounded-2xl shadow-lg border flex items-start space-x-3
                ${toast.type === 'error' ? 'bg-coral/10 border-coral/20 text-coral' : ''}
                ${toast.type === 'success' ? 'bg-teal/10 border-teal/20 text-teal' : ''}
                ${toast.type === 'warning' ? 'bg-gold/10 border-gold/20 text-gold' : ''}
                ${toast.type === 'info' ? 'bg-sage/10 border-sage/20 text-sage' : ''}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 text-sm font-medium leading-tight">
                {toast.message}
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
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

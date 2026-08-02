import { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/ui/Icon';

const ToastContext = createContext(null);

const TOAST_ICONS = { success: 'checkCircle', error: 'closeCircle', info: 'info' };

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* aria-live : les lecteurs d'écran annoncent le retour sans voler le focus */}
      <div className="toast-container" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type}`}
            onClick={() => removeToast(t.id)}
          >
            <Icon name={TOAST_ICONS[t.type] || 'info'} size={18} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

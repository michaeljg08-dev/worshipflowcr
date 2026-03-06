import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const add = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const toast = {
        success: (msg) => add(msg, 'success'),
        error: (msg) => add(msg, 'error'),
        info: (msg) => add(msg, 'info'),
    };

    const icons = { success: <CheckCircle size={16} color="var(--success)" />, error: <XCircle size={16} color="var(--danger)" />, info: <Info size={16} color="var(--primary)" /> };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        {icons[t.type]}
                        <span style={{ flex: 1 }}>{t.message}</span>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(t.id)} style={{ padding: 2 }}><X size={14} /></button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);

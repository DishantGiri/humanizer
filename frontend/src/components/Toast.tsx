'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

type ToastListener = (toast: Toast) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string, duration = 4500) => {
    const t: Toast = { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'success', message, duration };
    listeners.forEach((l) => l(t));
    return t.id;
  },
  danger: (message: string, duration = 4500) => {
    const t: Toast = { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'error', message, duration };
    listeners.forEach((l) => l(t));
    return t.id;
  },
  error: (message: string, duration = 4500) => {
    const t: Toast = { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'error', message, duration };
    listeners.forEach((l) => l(t));
    return t.id;
  },
  warning: (message: string, duration = 4500) => {
    const t: Toast = { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'warning', message, duration };
    listeners.forEach((l) => l(t));
    return t.id;
  },
  info: (message: string, duration = 4500) => {
    const t: Toast = { id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'info', message, duration };
    listeners.forEach((l) => l(t));
    return t.id;
  },
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const dur = toast.duration || 4500;

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), dur - 350);
    const removeTimer = setTimeout(() => onDismiss(toast.id), dur);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast, onDismiss, dur]);

  const configs = {
    success: {
      bg: 'rgba(13, 17, 23, 0.92)',
      border: 'rgba(52, 211, 153, 0.28)',
      iconBg: 'rgba(52, 211, 153, 0.12)',
      accent: '#34d399',
      glow: 'rgba(52, 211, 153, 0.15)',
      icon: <CheckCircle2 size={18} />,
      label: 'Success',
    },
    error: {
      bg: 'rgba(18, 14, 18, 0.92)',
      border: 'rgba(248, 113, 113, 0.28)',
      iconBg: 'rgba(248, 113, 113, 0.12)',
      accent: '#f87171',
      glow: 'rgba(248, 113, 113, 0.15)',
      icon: <AlertCircle size={18} />,
      label: 'Error',
    },
    warning: {
      bg: 'rgba(19, 16, 11, 0.92)',
      border: 'rgba(251, 191, 36, 0.28)',
      iconBg: 'rgba(251, 191, 36, 0.12)',
      accent: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.15)',
      icon: <AlertTriangle size={18} />,
      label: 'Warning',
    },
    info: {
      bg: 'rgba(11, 17, 24, 0.92)',
      border: 'rgba(56, 189, 248, 0.28)',
      iconBg: 'rgba(56, 189, 248, 0.12)',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.15)',
      icon: <Info size={18} />,
      label: 'Notice',
    },
  };

  const c = configs[toast.type];

  return (
    <div
      className={`humyn-toast ${exiting ? 'humyn-toast--exit' : 'humyn-toast--enter'}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 18px',
        background: c.bg,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${c.border}`,
        borderRadius: '16px',
        color: '#f8fafc',
        fontSize: '0.88rem',
        boxShadow: `0 16px 40px -10px rgba(0,0,0,0.65), 0 0 20px ${c.glow}`,
        pointerEvents: 'auto',
        maxWidth: '440px',
        width: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Status Icon Badge */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: c.iconBg,
          border: `1px solid ${c.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.accent,
          flexShrink: 0,
        }}
      >
        {c.icon}
      </div>

      {/* Toast Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {toast.title || c.label}
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f1f5f9', lineHeight: 1.4, wordBreak: 'break-word' }}>
          {toast.message}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          width: '28px',
          height: '28px',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94a3b8';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>

      {/* Progress countdown bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          background: c.accent,
          width: '100%',
          transformOrigin: 'left',
          animation: `toast-progress ${dur}ms linear forwards`,
          opacity: 0.8,
        }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  }, []);

  useEffect(() => {
    const handleToast = (newToast: Toast) => {
      setToasts((prev) => [...prev, newToast]);
    };
    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container — fixed top-right */}
      <div
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
          maxWidth: '440px',
          width: 'calc(100vw - 48px)',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

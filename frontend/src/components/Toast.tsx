'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle, ArrowRight } from 'lucide-react';

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
      bg: 'rgba(15, 23, 42, 0.94)',
      border: 'rgba(52, 211, 153, 0.35)',
      iconBg: 'rgba(52, 211, 153, 0.14)',
      accent: '#10b981',
      glow: 'rgba(52, 211, 153, 0.2)',
      icon: <CheckCircle2 size={18} />,
      label: 'Success',
    },
    error: {
      bg: 'rgba(15, 23, 42, 0.95)',
      border: 'rgba(244, 63, 94, 0.35)',
      iconBg: 'rgba(244, 63, 94, 0.14)',
      accent: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.2)',
      icon: <AlertCircle size={18} />,
      label: toast.message.toLowerCase().includes('word') || toast.message.toLowerCase().includes('plan') ? 'Plan Limit Reached' : 'Notice',
    },
    warning: {
      bg: 'rgba(15, 23, 42, 0.94)',
      border: 'rgba(245, 158, 11, 0.35)',
      iconBg: 'rgba(245, 158, 11, 0.14)',
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.2)',
      icon: <AlertTriangle size={18} />,
      label: 'Warning',
    },
    info: {
      bg: 'rgba(15, 23, 42, 0.94)',
      border: 'rgba(56, 189, 248, 0.35)',
      iconBg: 'rgba(56, 189, 248, 0.14)',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.2)',
      icon: <Info size={18} />,
      label: 'Notification',
    },
  };

  const c = configs[toast.type];
  const isLimitMsg = toast.message.toLowerCase().includes('upgrade') || toast.message.toLowerCase().includes('word');

  return (
    <div
      className={`humyn-toast ${exiting ? 'humyn-toast--exit' : 'humyn-toast--enter'}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '16px 20px',
        background: c.bg,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: `1px solid ${c.border}`,
        borderRadius: '16px',
        color: '#f8fafc',
        fontSize: '0.88rem',
        boxShadow: `0 20px 50px -12px rgba(0,0,0,0.75), 0 0 25px ${c.glow}`,
        pointerEvents: 'auto',
        maxWidth: '460px',
        width: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Sleek top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`,
        }}
      />

      {/* Status Icon Badge */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: c.iconBg,
          border: `1px solid ${c.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: c.accent,
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        {c.icon}
      </div>

      {/* Toast Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: c.accent, letterSpacing: '0.02em' }}>
          {toast.title || c.label}
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 400, color: '#e2e8f0', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {toast.message}
        </div>

        {isLimitMsg && (
          <button
            type="button"
            onClick={() => {
              window.location.href = '/dashboard?tab=plans';
            }}
            style={{
              marginTop: '6px',
              alignSelf: 'flex-start',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            Upgrade Plan <ArrowRight size={13} />
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={() => {
          setExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          width: '26px',
          height: '26px',
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
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94a3b8';
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
        }}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
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

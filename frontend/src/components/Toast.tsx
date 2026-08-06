'use client';

import React from 'react';
import { toast as shadcnToast } from '@/hooks/use-toast';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  duration?: number;
}

function formatToastMessage(msg: any): string {
  if (!msg) return 'An unexpected error occurred.';
  if (typeof msg === 'string') return msg;
  if (msg instanceof Error) return msg.message;
  if (typeof msg === 'object') {
    if (msg.message && typeof msg.message === 'string') return msg.message;
    if (msg.detail) {
      if (typeof msg.detail === 'string') return msg.detail;
      if (Array.isArray(msg.detail)) {
        const msgs = msg.detail.map((m: any) => (typeof m === 'object' && m.msg ? m.msg : JSON.stringify(m)));
        return msgs.join('. ');
      }
    }
    return JSON.stringify(msg);
  }
  return String(msg);
}

export const toast = {
  success: (message: any, _duration = 4500) => {
    return shadcnToast({
      title: 'Success',
      description: formatToastMessage(message),
    });
  },
  danger: (message: any, _duration = 4500) => {
    return shadcnToast({
      title: 'Error',
      description: formatToastMessage(message),
      variant: 'destructive',
    });
  },
  error: (message: any, _duration = 4500) => {
    return shadcnToast({
      title: 'Error',
      description: formatToastMessage(message),
      variant: 'destructive',
    });
  },
  warning: (message: any, _duration = 4500) => {
    return shadcnToast({
      title: 'Warning',
      description: formatToastMessage(message),
    });
  },
  info: (message: any, _duration = 4500) => {
    return shadcnToast({
      title: 'Notification',
      description: formatToastMessage(message),
    });
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  return {
    showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
      if (type === 'error') {
        shadcnToast({ title: 'Error', description: message, variant: 'destructive' });
      } else {
        shadcnToast({ title: type.toUpperCase(), description: message });
      }
    },
  };
}

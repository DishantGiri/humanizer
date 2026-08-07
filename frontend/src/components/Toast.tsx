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
  if (typeof msg === 'string') {
    if (msg === '[object Object]' || msg.includes('[object Object]')) {
      return 'Please enter correct email format';
    }
    return msg;
  }
  if (msg instanceof Error) {
    const errorMsg = msg.message;
    if (errorMsg === '[object Object]' || errorMsg.includes('[object Object]')) {
      return 'Please enter correct email format';
    }
    return errorMsg;
  }
  if (typeof msg === 'object') {
    if (msg.message && typeof msg.message === 'string' && msg.message !== '[object Object]') {
      return msg.message;
    }
    if (msg.detail) {
      if (typeof msg.detail === 'string' && msg.detail !== '[object Object]') return msg.detail;
      if (Array.isArray(msg.detail)) {
        const msgs = msg.detail.map((m: any) => {
          if (typeof m === 'string') return m;
          if (typeof m === 'object' && m) {
            if (m.msg) return m.msg;
            return JSON.stringify(m);
          }
          return String(m);
        });
        const res = msgs.join('. ');
        if (res && res !== '[object Object]') return res;
      }
    }
    try {
      const json = JSON.stringify(msg);
      if (json && json !== '{}' && json !== '[object Object]') return json;
    } catch {}
  }
  const str = String(msg);
  return str === '[object Object]' ? 'Please enter correct email format' : str;
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

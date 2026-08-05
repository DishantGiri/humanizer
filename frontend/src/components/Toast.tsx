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

export const toast = {
  success: (message: string, _duration = 4500) => {
    return shadcnToast({
      title: 'Success',
      description: message,
    });
  },
  danger: (message: string, _duration = 4500) => {
    return shadcnToast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  },
  error: (message: string, _duration = 4500) => {
    return shadcnToast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  },
  warning: (message: string, _duration = 4500) => {
    return shadcnToast({
      title: 'Warning',
      description: message,
    });
  },
  info: (message: string, _duration = 4500) => {
    return shadcnToast({
      title: 'Notification',
      description: message,
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

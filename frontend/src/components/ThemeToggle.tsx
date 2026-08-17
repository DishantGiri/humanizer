'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  size?: 'sm' | 'md';
  className?: string;
}

const THEME_OPTIONS: Array<{
  value: Theme;
  label: string;
  icon: typeof Monitor;
}> = [
  {
    value: 'system',
    label: 'System preference',
    icon: Monitor,
  },
  {
    value: 'light',
    label: 'Light mode',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark mode',
    icon: Moon,
  },
];

export default function ThemeToggle({ size = 'md', className = '' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div
      role="radiogroup"
      aria-label="Select color theme"
      className={`theme-segmented-toggle theme-segmented-toggle--${size} ${className}`}
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = mounted ? theme === option.value : option.value === 'system';

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            title={option.label}
            className={`theme-segmented-toggle__btn ${
              isSelected ? 'theme-segmented-toggle__btn--active' : ''
            }`}
            onClick={(e) => setTheme(option.value, e)}
          >
            {isSelected && (
              <motion.div
                layoutId="theme-pill-active-indicator"
                className="theme-segmented-toggle__indicator"
                transition={{
                  type: 'spring',
                  stiffness: 450,
                  damping: 32,
                }}
              />
            )}
            <span className="theme-segmented-toggle__icon-wrap">
              <Icon size={iconSize} strokeWidth={2} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

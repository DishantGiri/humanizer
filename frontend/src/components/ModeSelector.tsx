'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  GraduationCap,
  Briefcase,
  Coffee,
  BarChart3,
  Smile,
  Sparkles,
  Crown,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { MODES, type RewriteMode, type ModeIcon } from '@/lib/api';

const ICON_MAP: Record<ModeIcon, React.ElementType> = {
  speech: MessageCircle,
  graduation: GraduationCap,
  briefcase: Briefcase,
  coffee: Coffee,
  chart: BarChart3,
  smile: Smile,
  sparkles: Sparkles,
  crown: Crown,
  zap: Zap,
};

interface ModeSelectorProps {
  value: RewriteMode;
  onChange: (mode: RewriteMode) => void;
}

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = MODES.find((m) => m.value === value) || MODES[0];
  const SelectedIcon = ICON_MAP[selected.icon];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="custom-select" ref={ref}>
      <button
        id="mode-selector"
        type="button"
        className={`custom-select__trigger ${open ? 'custom-select__trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <SelectedIcon size={16} />
          {selected.label}
        </span>
        <ChevronDown
          size={14}
          className={`custom-select__arrow ${open ? 'custom-select__arrow--open' : ''}`}
        />
      </button>

      {open && (
        <div className="custom-select__dropdown" role="listbox">
          {MODES.map((mode) => {
            const Icon = ICON_MAP[mode.icon];
            return (
              <button
                key={mode.value}
                type="button"
                className={`custom-select__option ${
                  mode.value === value ? 'custom-select__option--active' : ''
                }`}
                role="option"
                aria-selected={mode.value === value}
                onClick={() => {
                  onChange(mode.value);
                  setOpen(false);
                }}
              >
                <span className="custom-select__option-icon">
                  <Icon size={16} />
                </span>
                <span>
                  {mode.label}
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-tertiary)',
                      fontWeight: 400,
                    }}
                  >
                    {mode.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

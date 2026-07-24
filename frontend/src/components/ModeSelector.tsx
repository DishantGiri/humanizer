'use client';

import React from 'react';
import { type RewriteMode } from '@/lib/api';

interface ModeSelectorProps {
  value: RewriteMode;
  onChange: (mode: RewriteMode) => void;
}

const UI_MODES: { value: RewriteMode; label: string }[] = [
  { value: 'native', label: 'Standard' },
  { value: 'professional', label: 'Fluency' },
  { value: 'casual', label: 'Natural' },
  { value: 'academic', label: 'Academic' },
  { value: 'friendly', label: 'Creative' },
];

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-tabs">
      {UI_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          className={`mode-tab-btn ${value === m.value ? 'mode-tab-btn--active' : ''}`}
          onClick={() => onChange(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

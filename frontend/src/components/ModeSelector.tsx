'use client';

import React from 'react';
import { type RewriteMode } from '@/lib/api';

interface ModeSelectorProps {
  value: RewriteMode;
  onChange: (mode: RewriteMode) => void;
}

const UI_MODES: { value: RewriteMode; label: string; aliases: string[] }[] = [
  { value: 'standard', label: 'Standard', aliases: ['standard', 'native'] },
  { value: 'fluency', label: 'Fluency', aliases: ['fluency', 'professional'] },
  { value: 'natural', label: 'Natural', aliases: ['natural', 'casual'] },
  { value: 'academic', label: 'Academic', aliases: ['academic'] },
  { value: 'creative', label: 'Creative', aliases: ['creative', 'friendly'] },
];

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const currentVal = (value || 'standard').toLowerCase();

  return (
    <div className="mode-tabs">
      {UI_MODES.map((m) => {
        const isActive = m.value === currentVal || m.aliases.includes(currentVal);
        return (
          <button
            key={m.value}
            type="button"
            className={`mode-tab-btn ${isActive ? 'mode-tab-btn--active' : ''}`}
            onClick={() => onChange(m.value)}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

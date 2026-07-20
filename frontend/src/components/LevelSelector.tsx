'use client';

import React from 'react';
import { LEVELS, type RewriteLevel } from '@/lib/api';

interface LevelSelectorProps {
  value: RewriteLevel;
  onChange: (level: RewriteLevel) => void;
}

export default function LevelSelector({ value, onChange }: LevelSelectorProps) {
  return (
    <div className="level-selector" role="radiogroup" aria-label="Rewrite level">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          id={`level-${level.value}`}
          className={`level-selector__btn ${
            level.value === value ? 'level-selector__btn--active' : ''
          }`}
          role="radio"
          aria-checked={level.value === value}
          title={level.description}
          onClick={() => onChange(level.value)}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

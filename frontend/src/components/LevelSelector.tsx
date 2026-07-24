'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { LEVELS, type RewriteLevel } from '@/lib/api';

interface LevelSelectorProps {
  value: RewriteLevel;
  onChange: (level: RewriteLevel) => void;
}

export default function LevelSelector({ value, onChange }: LevelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = LEVELS.find((l) => l.value === value) || LEVELS[1];

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
    <div className="level-select-container" ref={ref}>
      <button
        type="button"
        className="level-select-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="level-select-trigger__label">Level:</span>
        <span className="level-select-trigger__value">{selected.label}</span>
        <ChevronDown size={14} className={`level-select-trigger__chevron ${open ? 'level-select-trigger__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="level-select-dropdown">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              className={`level-select-option ${level.value === value ? 'level-select-option--active' : ''}`}
              onClick={() => {
                onChange(level.value);
                setOpen(false);
              }}
            >
              <div className="level-select-option__label">{level.label}</div>
              <div className="level-select-option__desc">{level.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

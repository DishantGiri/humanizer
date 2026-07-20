'use client';

import React, { useState } from 'react';
import { ArrowLeftRight, X, Plus, Minus } from 'lucide-react';
import type { DiffWord } from '@/lib/api';

interface DiffViewProps {
  wordDiff: DiffWord[];
  original: string;
  rewritten: string;
}

export default function DiffView({ wordDiff, original, rewritten }: DiffViewProps) {
  const [showDiff, setShowDiff] = useState(false);

  if (!wordDiff.length && !original) return null;

  return (
    <div className="diff-section">
      <div className="diff-toggle">
        <button
          type="button"
          id="toggle-diff-view"
          className={`diff-toggle__btn ${showDiff ? 'diff-toggle__btn--active' : ''}`}
          onClick={() => setShowDiff(!showDiff)}
        >
          {showDiff ? <X size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> : <ArrowLeftRight size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}
          {showDiff ? 'Hide Changes' : 'Show Changes'}
        </button>
      </div>

      {showDiff && (
        <div className="glass-card diff-container">
          <div className="diff-text">
            {wordDiff.map((item, i) => {
              if (item.type === 'equal') {
                return <span key={i}>{item.value} </span>;
              }
              if (item.type === 'insert') {
                return (
                  <span key={i} className="diff-word--insert">
                    {item.value}
                  </span>
                );
              }
              if (item.type === 'delete') {
                return (
                  <span key={i} className="diff-word--delete">
                    {item.value}
                  </span>
                );
              }
              return <span key={i}>{item.value} </span>;
            })}
          </div>

          <div
            style={{
              marginTop: 'var(--space-md)',
              display: 'flex',
              gap: 'var(--space-lg)',
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              alignItems: 'center',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Plus size={12} color="var(--accent-emerald)" />
              <span className="diff-word--insert" style={{ marginRight: 4 }}>
                added
              </span>
              Inserted words
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Minus size={12} color="var(--accent-red)" />
              <span className="diff-word--delete" style={{ marginRight: 4 }}>
                removed
              </span>
              Deleted words
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

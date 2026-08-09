'use client';

import React, { useState } from 'react';
import { Columns, GitCommit, X, Plus, Minus, Copy, Check, ArrowLeftRight } from 'lucide-react';
import type { DiffWord } from '@/lib/api';

interface DiffViewProps {
  wordDiff: DiffWord[];
  original: string;
  rewritten: string;
}

export default function DiffView({ wordDiff, original, rewritten }: DiffViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>('side-by-side');
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedRewritten, setCopiedRewritten] = useState(false);

  if (!wordDiff.length && !original && !rewritten) return null;

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(original);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
  };

  const handleCopyRewritten = () => {
    navigator.clipboard.writeText(rewritten);
    setCopiedRewritten(true);
    setTimeout(() => setCopiedRewritten(false), 2000);
  };

  // Group consecutive diff tokens into coherent phrase blocks for clear inline reading
  const groupedDiff: Array<{ type: 'equal' | 'insert' | 'delete'; text: string }> = [];
  let currentGroup: { type: 'equal' | 'insert' | 'delete'; words: string[] } | null = null;

  for (const item of wordDiff) {
    if (!currentGroup) {
      currentGroup = { type: item.type, words: [item.value] };
    } else if (currentGroup.type === item.type) {
      currentGroup.words.push(item.value);
    } else {
      groupedDiff.push({ type: currentGroup.type, text: currentGroup.words.join(' ') });
      currentGroup = { type: item.type, words: [item.value] };
    }
  }
  if (currentGroup) {
    groupedDiff.push({ type: currentGroup.type, text: currentGroup.words.join(' ') });
  }

  const origWordCount = original ? original.trim().split(/\s+/).filter(Boolean).length : 0;
  const rewWordCount = rewritten ? rewritten.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="diff-section">
      <div className="diff-toggle-bar">
        <button
          type="button"
          id="toggle-diff-view"
          className={`diff-toggle__btn ${isOpen ? 'diff-toggle__btn--active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={14} /> : <ArrowLeftRight size={14} />}
          <span>{isOpen ? 'Hide Detailed Diff' : 'Show Detailed Diff'}</span>
        </button>

        {isOpen && (
          <div className="diff-mode-switcher">
            <button
              type="button"
              className={`diff-mode-btn ${viewMode === 'side-by-side' ? 'diff-mode-btn--active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              <Columns size={13} />
              <span>Side-by-Side (Recommended)</span>
            </button>
            <button
              type="button"
              className={`diff-mode-btn ${viewMode === 'inline' ? 'diff-mode-btn--active' : ''}`}
              onClick={() => setViewMode('inline')}
            >
              <GitCommit size={13} />
              <span>Inline Diff</span>
            </button>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="diff-container glass-card">
          {viewMode === 'side-by-side' ? (
            /* ── Side-by-Side Comparison View ── */
            <div className="diff-side-by-side">
              {/* Original Column */}
              <div className="diff-column diff-column--original">
                <div className="diff-column__header">
                  <div className="diff-column__title-group">
                    <span className="diff-badge diff-badge--original">Original Text</span>
                    <span className="diff-chip">{origWordCount} words</span>
                  </div>
                  <button
                    type="button"
                    className="diff-copy-btn"
                    onClick={handleCopyOriginal}
                    title="Copy Original Text"
                  >
                    {copiedOriginal ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedOriginal ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="diff-column__body">
                  {original.split('\n\n').map((para, idx) => (
                    <p key={idx} className="diff-paragraph">{para}</p>
                  ))}
                </div>
              </div>

              {/* Humanized Column */}
              <div className="diff-column diff-column--rewritten">
                <div className="diff-column__header">
                  <div className="diff-column__title-group">
                    <span className="diff-badge diff-badge--rewritten">Humanized Text</span>
                    <span className="diff-chip">{rewWordCount} words</span>
                  </div>
                  <button
                    type="button"
                    className="diff-copy-btn"
                    onClick={handleCopyRewritten}
                    title="Copy Humanized Text"
                  >
                    {copiedRewritten ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copiedRewritten ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="diff-column__body">
                  {rewritten.split('\n\n').map((para, idx) => (
                    <p key={idx} className="diff-paragraph">{para}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Inline Phrase-Level Diff View ── */
            <div className="diff-inline-view">
              <div className="diff-text">
                {groupedDiff.map((group, i) => {
                  if (group.type === 'equal') {
                    return <span key={i}>{group.text} </span>;
                  }
                  if (group.type === 'insert') {
                    return (
                      <span key={i} className="diff-word--insert">
                        {group.text}
                      </span>
                    );
                  }
                  if (group.type === 'delete') {
                    return (
                      <span key={i} className="diff-word--delete">
                        {group.text}
                      </span>
                    );
                  }
                  return <span key={i}>{group.text} </span>;
                })}
              </div>

              <div className="diff-legend">
                <span className="diff-legend__item">
                  <Plus size={12} color="var(--accent-emerald)" />
                  <span className="diff-word--insert" style={{ marginRight: 4 }}>added</span>
                  Inserted / transformed words
                </span>
                <span className="diff-legend__item">
                  <Minus size={12} color="var(--accent-red)" />
                  <span className="diff-word--delete" style={{ marginRight: 4 }}>removed</span>
                  Deleted original words
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

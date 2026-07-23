'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  X,
  AlertTriangle,
  CircleDot,
} from 'lucide-react';
import TextInput from '@/components/TextInput';
import ModeSelector from '@/components/ModeSelector';
import LevelSelector from '@/components/LevelSelector';
import StatsPanel from '@/components/StatsPanel';
import DiffView from '@/components/DiffView';
import ExportMenu from '@/components/ExportMenu';
import {
  rewriteText,
  type RewriteMode,
  type RewriteLevel,
  type RewriteResponse,
} from '@/lib/api';

export default function Home() {
  // ── State ──────────────────────────────────────────────────────────────

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<RewriteMode>('native');
  const [level, setLevel] = useState<RewriteLevel>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RewriteResponse | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to rewrite.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await rewriteText({ text: inputText, mode, level });
      setOutputText(response.rewritten);
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setOutputText('');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setResult(null);
    setError(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <Sparkles className="header__icon" strokeWidth={1.5} />
          <h1 className="header__title">AI Humanizer</h1>
        </div>
        <p className="header__subtitle">
          Transform your text into natural, human-sounding writing
        </p>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="error-banner" role="alert">
          <AlertTriangle size={18} className="error-banner__icon" />
          <p className="error-banner__text">{error}</p>
          <button
            type="button"
            className="error-banner__dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="glass-card controls-bar">
        <div className="controls-bar__group">
          <span className="controls-bar__label">Mode</span>
          <ModeSelector value={mode} onChange={setMode} />
        </div>

        <div className="controls-bar__group">
          <span className="controls-bar__label">Level</span>
          <LevelSelector value={level} onChange={setLevel} />
        </div>

        <button
          id="rewrite-button"
          type="button"
          className="rewrite-btn"
          onClick={handleRewrite}
          disabled={loading || !inputText.trim()}
        >
          {loading ? (
            <Loader2 size={18} className="rewrite-btn__spinner" />
          ) : (
            <>
              <span className="rewrite-btn__shimmer" />
              <Sparkles size={16} />
            </>
          )}
          {loading
            ? level === 3 ? 'Deep rewriting...' : 'Rewriting...'
            : 'Humanize'}
        </button>
        {loading && level === 3 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginLeft: 8, whiteSpace: 'nowrap' }}>
            Extreme mode — may take 15–30s
          </span>
        )}
      </div>

      {/* Main Grid: Input / Output */}
      <div className="main-grid">
        {/* Input Panel */}
        <div className="glass-card text-panel">
          <div className="text-panel__header">
            <span className="text-panel__label">
              <CircleDot size={10} color="var(--accent-blue)" style={{ filter: 'drop-shadow(0 0 4px var(--accent-blue-glow))' }} />
              Input
            </span>
            {inputText && (
              <button
                type="button"
                className="output-actions__btn"
                onClick={handleClear}
                style={{ fontSize: '0.75rem' }}
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
          <TextInput
            value={inputText}
            onChange={setInputText}
            placeholder="Paste or type your text here..."
          />
        </div>

        {/* Output Panel */}
        <div className="glass-card text-panel">
          <div className="text-panel__header">
            <span className="text-panel__label">
              <CircleDot size={10} color="var(--accent-emerald)" style={{ filter: 'drop-shadow(0 0 4px var(--accent-emerald-glow))' }} />
              Output
            </span>
            {outputText && (
              <div className="output-actions">
                <ExportMenu text={outputText} disabled={!outputText} />
              </div>
            )}
          </div>
          <TextInput
            value={loading ? '' : outputText}
            onChange={() => {}}
            placeholder={loading ? 'Rewriting your text...' : 'Your humanized text will appear here...'}
            readOnly
            isOutput
          />
          {loading && (
            <div style={{ padding: '0 var(--space-md)' }}>
              <div className="skeleton skeleton--text" style={{ width: '90%' }} />
              <div className="skeleton skeleton--text" style={{ width: '75%' }} />
              <div className="skeleton skeleton--text" style={{ width: '85%' }} />
              <div className="skeleton skeleton--text" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      </div>

      {/* Diff View */}
      {result && (
        <DiffView
          wordDiff={result.word_diff}
          original={inputText}
          rewritten={outputText}
        />
      )}

      {/* Stats */}
      {result && (
        <StatsPanel
          originalStats={result.original_stats}
          rewrittenStats={result.rewritten_stats}
          changes={result.changes}
          readingTime={result.reading_time}
          meaningPreserved={result.meaning_preserved}
          meaningReason={result.meaning_reason}
        />
      )}

      {/* Footer */}
      <footer className="footer">
        <p>
          Powered by{' '}
          <a href="https://groq.com" target="_blank" rel="noopener noreferrer">
            Groq
          </a>{' '}
          · Built with{' '}
          <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer">
            Next.js
          </a>{' '}
          &{' '}
          <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer">
            FastAPI
          </a>
        </p>
      </footer>
    </div>
  );
}

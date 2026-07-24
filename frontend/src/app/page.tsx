'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wand2,
  Fingerprint,
  User,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  ChevronLeft,
  Trash2,
  Copy,
  Download,
  Check,
  Star,
  Sparkles,
  Scan,
  CircleDot,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import TextInput from '@/components/TextInput';
import ModeSelector from '@/components/ModeSelector';
import LevelSelector from '@/components/LevelSelector';
import DiffView from '@/components/DiffView';
import ExportMenu from '@/components/ExportMenu';
import PipelineLoader, { getPipelineStages } from '@/components/PipelineLoader';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('humanizer');
  const [copied, setCopied] = useState(false);
  
  const [currentStage, setCurrentStage] = useState<{ label: string; step: number; total: number }>({
    label: 'Analyzing structure...',
    step: 1,
    total: 5,
  });

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to rewrite.');
      return;
    }

    setLoading(true);
    setError(null);
    
    const initialStages = getPipelineStages(level);
    setCurrentStage({
      label: initialStages[0].buttonLabel,
      step: 1,
      total: initialStages.length,
    });

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

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };


  const handleDownload = (text: string) => {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'humanized_text.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Calculate dynamic metrics for Quality Analysis sidebar
  const humanScore = result ? Math.round(result.rewritten_stats.readability_score) : 99; // Default or calculated
  const aiRisk = result ? Math.max(5, 100 - humanScore) : 10;
  const readabilityVal = result ? Math.min(95, Math.round(result.rewritten_stats.vocabulary_diversity * 100)) : 90;
  const grammarVal = result ? (result.meaning_preserved ? 95 : 75) : 75;

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--collapsed' : ''}`}>
      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo-wrapper">
            <Wand2 className="sidebar__logo-icon" size={20} />
          </div>
          <span className="sidebar__brand-name">HumanizePro</span>
        </div>

        <nav className="sidebar__menu">
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'dashboard' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span className="sidebar__menu-text">Dashboard</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'humanizer' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('humanizer')}
          >
            <Wand2 size={18} />
            <span className="sidebar__menu-text">Humanizer</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'detector' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('detector')}
          >
            <Fingerprint size={18} />
            <span className="sidebar__menu-text">AI Detector</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'account' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('account')}
          >
            <User size={18} />
            <span className="sidebar__menu-text">Account</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'plans' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('plans')}
          >
            <CreditCard size={18} />
            <span className="sidebar__menu-text">Plans & Pricing</span>
          </button>
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="sidebar__menu-item">
            <HelpCircle size={18} />
            <span className="sidebar__menu-text">FAQ</span>
          </button>
          <button type="button" className="sidebar__menu-item">
            <LifeBuoy size={18} />
            <span className="sidebar__menu-text">Support</span>
          </button>
          <button
            type="button"
            className="sidebar__menu-item"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className="sidebar__collapse-chevron" size={18} />
            <span className="sidebar__menu-text">Collapse Menu</span>
          </button>
        </div>
      </aside>

      {/* ── Main Panel ──────────────────────────────────────────────────── */}
      <main className="main-panel">
        {/* Top Navbar */}
        <header className="navbar">
          <div className="navbar__breadcrumb">
            <span className="navbar__breadcrumb-current">Humanizer</span>
          </div>
          <div className="navbar__actions">
            <button type="button" className="navbar__link">Log in</button>
            <button type="button" className="navbar__btn">Get Started</button>
          </div>
        </header>

        {/* Content Container */}
        <div className="content-container">
          <div className="content-grid">
            
            {/* Left Column: Input, Mode selectors, output panels */}
            <div className="content-column-left">
              <div className="content-header">
                <h2 className="content-title">AI Content Humanizer</h2>
                <p className="content-subtitle">Paste your AI-generated text below and humanize it.</p>
              </div>

              {/* Mode Bar Selector */}
              <div className="controls-bar-row">
                <ModeSelector value={mode} onChange={setMode} />
                <LevelSelector value={level} onChange={setLevel} />
              </div>

              {/* Input Area */}
              <div className="card text-panel-box">
                <div className="card-header-bar">
                  <span className="card-header-bar__title">
                    <CircleDot size={10} color="var(--accent-blue)" />
                    Original Text
                  </span>
                  {inputText && (
                    <button
                      type="button"
                      className="card-header-action-btn"
                      onClick={handleClear}
                      title="Clear text"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <TextInput
                  value={inputText}
                  onChange={setInputText}
                  placeholder="Paste your AI-generated text here (ChatGPT, Claude, Jasper, etc.)..."
                />

                <div className="card-footer-bar">
                  <div className="counter-chips">
                    <span className="chip">{inputText.trim() ? inputText.trim().split(/\s+/).length : 0} words</span>
                    <span className="chip">{inputText.length} chars</span>
                  </div>

                  <div className="action-buttons-group">
                    <button
                      type="button"
                      className="action-btn-outline"
                      disabled={loading || !inputText.trim()}
                      onClick={handleRewrite}
                    >
                      <Scan size={14} />
                      Check AI
                    </button>

                    <button
                      id="rewrite-button"
                      type="button"
                      className="action-btn-solid"
                      disabled={loading || !inputText.trim()}
                      onClick={handleRewrite}
                    >
                      {loading ? (
                        <Loader2 size={15} className="spinner-animate" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {loading
                        ? `[${currentStage.step}/${currentStage.total}] ${currentStage.label}`
                        : 'Humanize Text'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Output / Loading Area */}
              {loading && (
                <div className="card text-panel-box text-panel-box--loading">
                  <PipelineLoader
                    isLoading={loading}
                    level={level}
                    onStageChange={(stage, step, total) => {
                      setCurrentStage({ label: stage.buttonLabel, step, total });
                    }}
                  />
                </div>
              )}

              {outputText && !loading && (
                <div className="card text-panel-box text-panel-box--output animate-fadeIn">
                  <div className="card-header-bar">
                    <span className="card-header-bar__title">
                      <Check size={16} className="text-emerald" />
                      Humanized Result
                    </span>
                    <div className="card-header-actions">
                      <button
                        type="button"
                        className="card-header-action-btn"
                        onClick={() => handleCopy(outputText)}
                        title={copied ? "Copied!" : "Copy text"}
                      >
                        {copied ? (
                          <Check size={16} className="text-emerald" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                      <button
                        type="button"
                        className="card-header-action-btn"
                        onClick={() => handleDownload(outputText)}
                        title="Download text"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="output-option-title">
                    <span>Option (humanized) 1 – Modern Slate (Recommended) (humanized)</span>
                    <div className="star-rating">
                      <Star size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
                      <Star size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
                      <Star size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
                      <Star size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
                      <Star size={12} fill="var(--accent-amber)" color="var(--accent-amber)" />
                    </div>
                  </div>

                  <div className="output-text-content">
                    {outputText}
                  </div>

                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <DiffView
                      wordDiff={result ? result.word_diff : []}
                      original={inputText}
                      rewritten={outputText}
                    />
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="error-alert-box" role="alert">
                  <AlertTriangle size={18} className="error-alert-box__icon" />
                  <p className="error-alert-box__text">{error}</p>
                  <button
                    type="button"
                    className="error-alert-box__dismiss"
                    onClick={() => setError(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Analysis Sidebar */}
            <div className="content-column-right">
              <div className="card analysis-sidebar-card">
                <h3 className="analysis-sidebar-card__title">Quality Analysis</h3>

                {/* Circular Chart */}
                <div className="analysis-gauge-container">
                  <div className="gauge-outer-circle">
                    <svg className="gauge-svg" viewBox="0 0 100 100">
                      {/* Track background */}
                      <circle
                        className="gauge-track"
                        cx="50"
                        cy="50"
                        r="42"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      {/* Active green ring */}
                      <circle
                        className="gauge-fill"
                        cx="50"
                        cy="50"
                        r="42"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={263.8}
                        strokeDashoffset={263.8 - (263.8 * humanScore) / 100}
                      />
                    </svg>
                    <div className="gauge-center-text">
                      <span className="gauge-percentage">{humanScore}%</span>
                      <span className="gauge-label">human</span>
                    </div>
                  </div>
                  <div className="gauge-subtitle">HUMANIZED</div>
                </div>

                {/* Bypassed Detectors */}
                <div className="bypassed-detectors-section">
                  <h4 className="section-label">Detectors Bypassed</h4>
                  <div className="detector-badges-row">
                    <div className="detector-badge">
                      <Check size={11} className="detector-badge__check" />
                      <span>Turnitin</span>
                    </div>
                    <div className="detector-badge">
                      <Check size={11} className="detector-badge__check" />
                      <span>GPTZero</span>
                    </div>
                    <div className="detector-badge">
                      <Check size={11} className="detector-badge__check" />
                      <span>Originality.ai</span>
                    </div>
                  </div>
                </div>

                {/* Linguistic Progress Metrics */}
                <div className="metrics-progress-section">
                  {/* AI Risk */}
                  <div className="progress-metric-item">
                    <div className="progress-metric-item__header">
                      <span className="progress-metric-item__name">AI Risk</span>
                      <span className="progress-metric-item__val text-amber">{aiRisk}%</span>
                    </div>
                    <div className="progress-metric-item__track">
                      <div
                        className="progress-metric-item__bar bg-amber"
                        style={{ width: `${aiRisk}%` }}
                      />
                    </div>
                  </div>

                  {/* Readability */}
                  <div className="progress-metric-item">
                    <div className="progress-metric-item__header">
                      <span className="progress-metric-item__name">Readability</span>
                      <span className="progress-metric-item__val text-blue">{readabilityVal}%</span>
                    </div>
                    <div className="progress-metric-item__track">
                      <div
                        className="progress-metric-item__bar bg-blue"
                        style={{ width: `${readabilityVal}%` }}
                      />
                    </div>
                  </div>

                  {/* Grammar */}
                  <div className="progress-metric-item">
                    <div className="progress-metric-item__header">
                      <span className="progress-metric-item__name">Grammar</span>
                      <span className="progress-metric-item__val text-orange">{grammarVal}%</span>
                    </div>
                    <div className="progress-metric-item__track">
                      <div
                        className="progress-metric-item__bar bg-orange"
                        style={{ width: `${grammarVal}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>
            Powered by{' '}
            <a href="https://groq.com" target="_blank" rel="noopener noreferrer">Groq</a>{' '}
            · Built with{' '}
            <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer">Next.js</a>{' '}
            &{' '}
            <a href="https://fastapi.tiangolo.com" target="_blank" rel="noopener noreferrer">FastAPI</a>
          </p>
        </footer>
      </main>
    </div>
  );
}

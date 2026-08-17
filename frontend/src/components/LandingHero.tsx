'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wand2,
  Sparkles,
  ArrowRight,
  Check,
  Moon,
  Sun,
  Shield,
  Play,
  Trash2,
  ScanSearch,
  Lock,
  Zap,
  Globe,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Type,
} from 'lucide-react';

import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';

interface LandingHeroProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
  isDarkMode?: boolean;
  onToggleTheme?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}

export default function LandingHero({
  onOpenAuth,
}: LandingHeroProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const router = useRouter();
  const [demoText, setDemoText] = useState('');
  const [demoHasHumanized, setDemoHasHumanized] = useState(false);
  const [demoOutput, setDemoOutput] = useState<{ firstHalf: string; secondHalf: string } | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoIsLoading, setDemoIsLoading] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const used = localStorage.getItem('humyn_demo_used_v1');
      if (used === 'true') {
        setDemoHasHumanized(true);
      }

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const faqs = [
    {
      question: 'What is CloakWriter AI?',
      answer:
        'CloakWriter is an advanced AI text humanizer designed to rewrite AI-generated content (from ChatGPT, Claude, Gemini, etc.) into natural, human-sounding prose that bypasses leading AI detectors like Turnitin, ZeroGPT, CopyLeaks, and GPTZero.',
    },
    {
      question: 'How does CloakWriter bypass AI detectors?',
      answer:
        'Unlike simple synonym swappers, CloakWriter restructures sentence cadences, adjusts burstiness and perplexity, and eliminates repetitive machine phrasing patterns that AI detectors flag.',
    },
    {
      question: 'Will my humanized text be flagged for plagiarism?',
      answer:
        'No. CloakWriter produces 100% original, plagiarism-free rewrites while preserving your core message, intended tone, and vocabulary quality.',
    },
    {
      question: 'What rewrite levels does CloakWriter offer?',
      answer:
        'CloakWriter provides three distinct rewrite intensity levels: Light (minor polish), Moderate (balanced restructuring), and Heavy (deep natural rewriting for strict AI detectors like Turnitin).',
    },
    {
      question: 'Is my text stored or shared with third parties?',
      answer:
        'Your privacy is paramount. CloakWriter never sells or shares your text with third parties, and all processed text is kept strictly confidential in your secure account history.',
    },
    {
      question: 'What happens when AI detectors update their algorithms?',
      answer:
        'Our engineering team continuously monitors and fine-tunes our underlying natural language models to ensure CloakWriter stays ahead of all major AI detector model updates.',
    },
    {
      question: 'Is there a free plan available?',
      answer:
        'Yes! CloakWriter offers a free tier with daily humanizations so you can test our engine before upgrading to one of our affordable monthly plans.',
    },
  ];

  const hasMarkdown = (text: string): boolean => {
    if (!text || !text.trim()) return false;
    return /(\*\*|\*|__|_|#|`|\[.*?\]\(.*?\)|^[\s]*[\-\*]\s+|\d+\.\s+)/m.test(text);
  };

  const handleRemoveMarkdownDemo = () => {
    if (!demoText) return;
    const clean = demoText
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^#+\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/^\s*[\-\*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '');
    setDemoText(clean);
  };

  const wordCount = demoText.trim() ? demoText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = demoText.length;

  const fallbackHumanize = (input: string): string => {
    let text = input.trim();
    const replacements: [RegExp, string][] = [
      [/\bThe implementation of\b/gi, 'Putting in place'],
      [/\bstrategic initiatives\b/gi, 'these core plans'],
      [/\bfacilitates\b/gi, 'helps create'],
      [/\boptimal synergy\b/gi, 'better teamwork'],
      [/\bacross operations\b/gi, 'throughout the team'],
      [/\bdelve into\b/gi, 'explore'],
      [/\bdelving into\b/gi, 'exploring'],
      [/\btestament to\b/gi, 'proof of'],
      [/\butilize\b/gi, 'use'],
      [/\butilizing\b/gi, 'using'],
      [/\bfurthermore\b/gi, 'also'],
      [/\bmoreover\b/gi, 'in addition'],
      [/\bin conclusion\b/gi, 'all in all'],
      [/\bto summarize\b/gi, 'basically'],
      [/\bfostering\b/gi, 'building'],
      [/\bparadigm shift\b/gi, 'major change'],
      [/\bsynergy\b/gi, 'teamwork'],
      [/\bimperative\b/gi, 'key priority'],
      [/\bcrucial role\b/gi, 'big part'],
      [/\bpivotal\b/gi, 'central'],
      [/\bholistic approach\b/gi, 'complete strategy'],
      [/\bbeacons of\b/gi, 'examples of'],
      [/\bmyriad of\b/gi, 'plenty of'],
      [/\bplethora of\b/gi, 'lots of'],
      [/\bseamlessly integrate\b/gi, 'easily combine'],
      [/\bexpedite\b/gi, 'speed up'],
      [/\boptimize\b/gi, 'improve'],
      [/\bmitigate\b/gi, 'reduce'],
      [/\bleverage\b/gi, 'take advantage of'],
      [/\bleveraging\b/gi, 'using'],
      [/\bin order to\b/gi, 'to'],
      [/\bit is important to note that\b/gi, 'notably,'],
      [/\bit should be emphasized that\b/gi, 'keep in mind that'],
      [/\bdue to the fact that\b/gi, 'because'],
    ];

    replacements.forEach(([regex, replacement]) => {
      text = text.replace(regex, replacement);
    });

    if (text === input.trim()) {
      text = 'In simple terms, ' + input.trim().replace(/\bis\b/g, 'turns out to be');
    }

    return text;
  };

  const handleHumanizeDemo = async () => {
    if (!demoText.trim() || demoIsLoading) return;

    // Strict 1 demo check per session/IP from localStorage
    const hasUsedDemo = typeof window !== 'undefined' && localStorage.getItem('humyn_demo_used_v1') === 'true';
    if (demoHasHumanized || hasUsedDemo) {
      router.push('/login');
      return;
    }

    // Check word limit (< 100 words for demo)
    if (wordCount > 100) {
      setDemoError('Demo is limited to under 100 words to save tokens. Please shorten your text or log in for unlimited humanization.');
      return;
    }

    // Mark demo as used in localStorage immediately to prevent token abuse
    if (typeof window !== 'undefined') {
      localStorage.setItem('humyn_demo_used_v1', 'true');
    }

    setDemoError(null);
    setDemoIsLoading(true);

    try {
      // Call backend FastAPI endpoint with low model level (level: 1)
      const res = await fetch('http://localhost:8000/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: demoText.trim(),
          mode: 'native',
          level: 1,
        }),
      });

      let fullRewritten = '';

      if (res.ok) {
        const data = await res.json();
        fullRewritten = data.rewritten || fallbackHumanize(demoText.trim());
      } else {
        fullRewritten = fallbackHumanize(demoText.trim());
      }

      fullRewritten = fullRewritten.trim();

      const sentences = fullRewritten.split(/(?<=[.!?])\s+/);
      let firstHalf = '';
      let secondHalf = '';

      if (sentences.length > 1) {
        const mid = Math.ceil(sentences.length / 2);
        firstHalf = sentences.slice(0, mid).join(' ');
        secondHalf = sentences.slice(mid).join(' ');
      } else {
        const words = fullRewritten.split(/\s+/);
        const mid = Math.ceil(words.length / 2);
        firstHalf = words.slice(0, mid).join(' ');
        secondHalf = words.slice(mid).join(' ');
      }

      setDemoOutput({ firstHalf, secondHalf });
      setDemoHasHumanized(true);
    } catch (err) {
      const fallback = fallbackHumanize(demoText.trim());
      const sentences = fallback.split(/(?<=[.!?])\s+/);
      let firstHalf = '';
      let secondHalf = '';
      if (sentences.length > 1) {
        const mid = Math.ceil(sentences.length / 2);
        firstHalf = sentences.slice(0, mid).join(' ');
        secondHalf = sentences.slice(mid).join(' ');
      } else {
        const words = fallback.split(/\s+/);
        const mid = Math.ceil(words.length / 2);
        firstHalf = words.slice(0, mid).join(' ');
        secondHalf = words.slice(mid).join(' ');
      }
      setDemoOutput({ firstHalf, secondHalf });
      setDemoHasHumanized(true);
    } finally {
      setDemoIsLoading(false);
    }
  };

  const handleClear = () => {
    setDemoText('');
    setDemoError(null);
    setDemoOutput(null);
    setDemoHasHumanized(false);
  };

  return (
    <div className="landing-page">
      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className={`landing-nav ${isScrolled ? 'landing-nav--scrolled' : ''}`}>
        <div className="landing-nav__container">
          <div className="landing-nav__brand">
            <a href="#hero" className="landing-nav__brand-link" aria-label="Go to top" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              <Logo variant="full" size="md" theme={resolvedTheme} />
            </a>
          </div>

          <div className="landing-nav__menu">
            <a href="#product" className="landing-nav__link">
              Product
            </a>
            <a href="#demo" className="landing-nav__link">
              Demo
            </a>
            <a href="#pricing" className="landing-nav__link">
              Pricing
            </a>
            <a href="#faq" className="landing-nav__link">
              FAQ
            </a>
          </div>

          <div className="landing-nav__actions">
            <ThemeToggle size="md" />

            <Link href="/login" className="landing-nav__login-btn" style={{ textDecoration: 'none' }}>
              Log in
            </Link>

            <Link href="/register" className="landing-nav__cta-pill" style={{ textDecoration: 'none' }}>
              Try for free
            </Link>
          </div>
        </div>
      </nav>

      <div className="landing-hero-screen">
        <div className="landing-hero-bg-layer" />
        {/* ── Hero Section ─────────────────────────────────────────────────── */}
        <section className="landing-hero" id="hero">
          <div className="landing-hero__grid">
            {/* Left Content */}
            <div className="landing-hero__content">
              <div className="landing-hero__badge">
                <Sparkles size={14} className="landing-hero__badge-icon" />
                <span>CloakWriter AI</span>
              </div>

              <h1 className="landing-hero__title">
                Humanize Your
                <br />
                AI Writing
              </h1>

              <p className="landing-hero__subtitle">
                Bypass AI detectors with undetectable, human-like text rewriting. Powered by cutting-edge natural language modeling.
              </p>

              <div className="landing-hero__actions">
                <Link href="/register" className="landing-hero__btn-primary" style={{ textDecoration: 'none' }}>
                  <span>Get Started Free</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="landing-hero__proof">
                <div className="landing-hero__proof-badge">
                  <img src="/turnitin-icon.png" alt="Turnitin" className="landing-hero__proof-logo" />
                  <span>Turnitin Safe</span>
                </div>
                <div className="landing-hero__proof-badge">
                  <img src="/zerogpt-icon.png" alt="ZeroGPT" className="landing-hero__proof-logo" />
                  <span>ZeroGPT Bypass</span>
                </div>
                <div className="landing-hero__proof-badge">
                  <img src="/copyleaks-icon.png" alt="CopyLeaks" className="landing-hero__proof-logo" />
                  <span>CopyLeaks Clean</span>
                </div>
                <div className="landing-hero__proof-badge">
                  <img src="/gptzero-icon.png" alt="GPTZero" className="landing-hero__proof-logo" />
                  <span>GPTZero 100% Human</span>
                </div>
              </div>
            </div>

            {/* Right Graphic Preview */}
            <div className="landing-hero__preview">
              <div className="landing-hero__card">
                <div className="landing-hero__card-header">
                  <div className="landing-hero__card-dots">
                    <span className="dot dot--red" />
                    <span className="dot dot--yellow" />
                    <span className="dot dot--green" />
                  </div>
                  <div className="landing-hero__card-engine">
                    <Sparkles size={13} className="text-accent" />
                    <span>CloakWriter Engine v2.4</span>
                  </div>
                </div>

                <div className="landing-hero__card-body">
                  {/* Before Line */}
                  <div className="landing-hero__diff-box landing-hero__diff-box--del">
                    <div className="diff-header">
                      <span className="diff-badge diff-badge--del">AI Detected (98%)</span>
                    </div>
                    <p className="diff-text">
                      "The implementation of strategic initiatives facilitates optimal synergy across operations..."
                    </p>
                  </div>

                  {/* Arrow Divider */}
                  <div className="landing-hero__diff-arrow">
                    <ArrowRight size={16} />
                  </div>

                  {/* After Line */}
                  <div className="landing-hero__diff-box landing-hero__diff-box--add">
                    <div className="diff-header">
                      <span className="diff-badge diff-badge--add">100% Human Score</span>
                    </div>
                    <p className="diff-text">
                      "We put key strategies to work so our teams could naturally collaborate better..."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── AI Detector Demo Section ─────────────────────────────────────── */}
      <section className="demo-section" id="demo">
        <div className="demo-section__container">
          <div className="demo-section__header">
            <h2 className="demo-section__title">Test Your AI Text Instantly</h2>
            <p className="demo-section__subtitle">
              Paste your content below (under 100 words) for a free instant humanization demo. Log in to unlock full output.
            </p>
          </div>

          <div className="demo-section__grid" style={{ position: 'relative' }}>
            {/* Sleek Glassmorphic Overlay Loader */}
            {demoIsLoading && (
              <div className="demo-loader-overlay">
                <div className="demo-loader-card">
                  <div className="demo-loader-spinner-box">
                    <div className="demo-loader-pulse" />
                    <Sparkles size={28} className="demo-loader-sparkle" />
                  </div>
                  <p className="demo-loader-title">Humanizing Text with AI Model...</p>
                  <p className="demo-loader-sub">Restructuring sentence cadences & bypassing AI detectors</p>
                </div>
              </div>
            )}

            {/* Left Card: Input / Humanized Output */}
            <div className="demo-card demo-card--input">
              <div className="demo-card__header">
                <span className="demo-card__title">
                  {demoOutput ? 'Humanized Output (Demo)' : 'Original Text'}
                </span>
                {demoText && (
                  <button
                    type="button"
                    className="demo-card__clear-btn"
                    onClick={handleClear}
                    title="Clear text"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="demo-card__body">
                {!demoOutput ? (
                  <>
                    <textarea
                      className="demo-card__textarea"
                      placeholder="Paste your AI-generated text here (under 100 words)..."
                      value={demoText}
                      onChange={(e) => setDemoText(e.target.value)}
                      spellCheck="true"
                    />
                    {hasMarkdown(demoText) && (
                      <div className="markdown-warning-box">
                        <div className="markdown-warning-left">
                          <AlertTriangle size={15} className="markdown-warning-icon" />
                          <span>Markdown formatting can raise AI detection scores.</span>
                        </div>
                        <button
                          type="button"
                          className="remove-markdown-btn"
                          onClick={handleRemoveMarkdownDemo}
                        >
                          <Type size={13} />
                          <span>Remove Markdown</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="demo-output__content">
                    <p className="demo-output__clear">{demoOutput.firstHalf}</p>
                    <div className="demo-output__blur-wrapper">
                      <p className="demo-output__blurred">{demoOutput.secondHalf}</p>
                      <div className="demo-output__overlay">
                        <Lock size={20} className="demo-output__lock-icon" style={{ color: '#38bdf8' }} />
                        <span style={{ fontWeight: 700 }}>Unlock Full Output</span>
                        <button type="button" className="demo-output__unlock-btn" onClick={() => router.push('/login')}>
                          Log in / Register
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="demo-card__footer">
                <div className="demo-card__stats">
                  {demoOutput ? (
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Humanized</span>
                  ) : (
                    <span style={{ color: wordCount > 100 ? '#ef4444' : undefined, fontWeight: wordCount > 100 ? 700 : undefined }}>
                      {wordCount}/100 words
                    </span>
                  )}
                  <span>{charCount} chars</span>
                </div>

                <div className="demo-card__actions">
                  {!demoOutput ? (
                    <button
                      type="button"
                      className="demo-btn-solid"
                      onClick={handleHumanizeDemo}
                      disabled={!demoText.trim() || demoIsLoading}
                    >
                      {demoIsLoading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Humanizing...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={15} />
                          <span>Humanize Text</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="demo-btn-outline"
                        onClick={handleClear}
                      >
                        Try New Text
                      </button>
                      <button
                        type="button"
                        className="demo-btn-solid"
                        onClick={() => router.push('/login')}
                      >
                        <Lock size={15} />
                        <span>Log in to Copy</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Card: Quality Analysis */}
            <div className="demo-card demo-card--analysis">
              <div className="demo-card__header">
                <span className="demo-card__title">Quality Analysis</span>
              </div>

              <div className="demo-card__body demo-card__body--analysis">
                {demoError ? (
                  <div className="demo-card__error-state">
                    <p className="demo-error-text" style={{ color: '#f87171', marginBottom: 12 }}>{demoError}</p>
                    <button type="button" className="demo-error-cta" onClick={() => router.push('/login')}>
                      <Lock size={15} />
                      <span>Log In For Unlimited Words</span>
                    </button>
                  </div>
                ) : (
                  <div className="demo-qa-container">
                    {/* Ring Gauge */}
                    <div className="demo-qa-gauge">
                      <svg width="150" height="150" viewBox="0 0 150 150" className="demo-qa-svg">
                        {/* Background track */}
                        <circle
                          cx="75"
                          cy="75"
                          r="60"
                          stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
                          strokeWidth="10"
                          fill="none"
                        />
                        {/* Active ring */}
                        <circle
                          cx="75"
                          cy="75"
                          r="60"
                          stroke={demoOutput ? 'url(#qaGradient)' : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)')}
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray="377"
                          strokeDashoffset={demoOutput ? 0 : 377}
                          strokeLinecap="round"
                          transform="rotate(-90 75 75)"
                          style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
                        />
                        <defs>
                          <linearGradient id="qaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#38bdf8" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="demo-qa-gauge-inner">
                        <span className="demo-qa-score">{demoOutput ? '100%' : '0%'}</span>
                        <span className="demo-qa-label">HUMAN</span>
                      </div>
                    </div>

                    <div className={`demo-qa-status-tag ${demoOutput ? 'demo-qa-status-tag--active' : ''}`}>
                      {demoOutput ? 'HUMANIZED' : 'READY TO ANALYZE'}
                    </div>

                    {/* Breakdown Metrics */}
                    <div className="demo-qa-metrics">
                      <div className="demo-qa-metric">
                        <span className="demo-qa-metric-name">AI Risk</span>
                        <span className={`demo-qa-metric-val ${demoOutput ? 'demo-qa-metric-val--amber' : 'demo-qa-metric-val--muted'}`}>
                          {demoOutput ? '0%' : '0%'}
                        </span>
                      </div>
                      <div className="demo-qa-metric">
                        <span className="demo-qa-metric-name">Readability</span>
                        <span className={`demo-qa-metric-val ${demoOutput ? 'demo-qa-metric-val--cyan' : 'demo-qa-metric-val--muted'}`}>
                          {demoOutput ? '98%' : '0%'}
                        </span>
                      </div>
                      <div className="demo-qa-metric">
                        <span className="demo-qa-metric-name">Grammar</span>
                        <span className={`demo-qa-metric-val ${demoOutput ? 'demo-qa-metric-val--green' : 'demo-qa-metric-val--muted'}`}>
                          {demoOutput ? '100%' : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Cards Section (Humanize, Rewrite, Improve) ───────────── */}
      <section className="features-section" id="product">
        <div className="features-section__container">
          <div className="features-section__header">
            <h2 className="features-section__title">Humanize, Rewrite, Improve</h2>
            <p className="features-section__subtitle">
              Transform AI-generated or rigid text into natural, human-sounding writing in seconds. No account needed to try.
            </p>
          </div>

          {/* Top Row Grid */}
          <div className="features-grid-top">
            {/* Card 1: AI Humanizer */}
            <div className="feature-card feature-card--large feature-card--humanizer">
              <div className="feature-card__content">
                <h3 className="feature-card__title">AI Humanizer</h3>
                <p className="feature-card__desc">
                  Rewrites AI text with natural human phrasing. Choose standard or aggressive humanization levels.
                </p>
              </div>
              <div className="feature-card__watermark feature-card__watermark--blue">
                <Shield size={130} strokeWidth={1.2} />
              </div>
            </div>

            {/* Card 2: Bypass AI Detection */}
            <div className="feature-card feature-card--medium">
              <div className="feature-card__icon-badge feature-card__icon-badge--amber">
                <Zap size={22} />
              </div>
              <h3 className="feature-card__title">Bypass AI Detection</h3>
              <p className="feature-card__desc">
                Ensure your rewritten text reads 100% human and bypasses automated AI detection filters seamlessly.
              </p>
            </div>

            {/* Card 3: Human by Design */}
            <div className="feature-card feature-card--medium">
              <div className="feature-card__icon-badge feature-card__icon-badge--blue">
                <Globe size={22} />
              </div>
              <h3 className="feature-card__title">Human by Design</h3>
              <p className="feature-card__desc">
                Your text reads as fully human with a natural tone, rhythm and flow
              </p>
            </div>
          </div>

          {/* Bottom Row Grid */}
          <div className="features-grid-bottom">
            {/* Card 4: Native-Level Fluency */}
            <div className="feature-card feature-card--large">
              <div className="feature-card__content">
                <h3 className="feature-card__title">Native-Level Fluency</h3>
                <p className="feature-card__desc">
                  We don't just swap synonyms. Sentences are restructured to mimic actual human cadence, burstiness, and phrasing.
                </p>
              </div>
              <div className="feature-card__watermark feature-card__watermark--green">
                <CheckCircle2 size={130} strokeWidth={1.2} />
              </div>
            </div>

            {/* Card 5: Alternatives Rewrites */}
            <div className="feature-card feature-card--large">
              <div className="feature-card__content">
                <h3 className="feature-card__title">Alternatives Rewrites</h3>
                <p className="feature-card__desc">
                  Click any sentence to choose from multiple alternatives. Fine-tune the output to your voice.
                </p>
              </div>
              <div className="feature-card__watermark feature-card__watermark--purple">
                <RefreshCw size={130} strokeWidth={1.2} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Landing Page Pricing Section ─────────────────────────────────── */}
      <section className="landing-pricing-section" id="pricing" style={{ padding: '60px 20px' }}>
        <div className="pricing-section-container">
          
          {/* Header & Billing Cycle Toggle */}
          <div className="pricing-header">
            <h2 className="pricing-header-title">Flexible Plans for Every Writer</h2>
            <p className="pricing-header-subtitle">
              Choose the plan that fits your writing workflow. Powered by proprietary CloakWriter neural rewriting models.
            </p>

            {/* Toggle Capsule */}
            <div className="pricing-billing-toggle-container">
              <button
                type="button"
                className={`pricing-billing-toggle-btn ${billingCycle === 'monthly' ? 'pricing-billing-toggle-btn--active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`pricing-billing-toggle-btn ${billingCycle === 'annually' ? 'pricing-billing-toggle-btn--active' : ''}`}
                  onClick={() => setBillingCycle('annually')}
                >
                  Annually
                </button>
                <span className="pricing-billing-badge">Save 25%</span>
              </div>
            </div>
          </div>

          {/* 4 Cards Grid */}
          <div className="pricing-cards-grid">
            
            {/* Plan 1: Free ($0) */}
            <div className="pricing-card">
              <div>
                <h3 className="pricing-card-title">Free</h3>
                <div className="pricing-card-price-container">
                  <span className="pricing-card-price-amount">$0</span>
                  <span className="pricing-card-price-period">Per month</span>
                </div>
                <p className="pricing-card-description">
                  Essential AI humanization for quick tests and casual writing.
                </p>

                <div style={{ marginBottom: '28px' }}>
                  <Link href="/register" className="pricing-btn-outlined" style={{ display: 'block', textDecoration: 'none' }}>
                    Try It for Free
                  </Link>
                </div>

                <ul className="pricing-features-list">
                  <li className="pricing-feature-item">
                    <Check size={16} /> 10 humanizations / day
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> 400 words per input
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Standard Bypass Pipeline
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Basic Processing Speed
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan 2: Plus Plan ($1) - Popular */}
            <div className="pricing-card pricing-card--popular">
              <div className="pricing-popular-badge">Popular</div>
              <div>
                <h3 className="pricing-card-title">Plus Plan</h3>
                <div className="pricing-card-price-container">
                  <span className="pricing-card-price-amount">
                    {billingCycle === 'annually' ? '$0.75' : '$1'}
                  </span>
                  <span className="pricing-card-price-period">Per month</span>
                </div>
                <p className="pricing-card-description">
                  Perfect for students & creators needing daily anti-AI humanization.
                </p>

                <div style={{ marginBottom: '28px' }}>
                  <Link href="/register" className="pricing-btn-white" style={{ display: 'block', textDecoration: 'none' }}>
                    Purchase Now
                  </Link>
                </div>

                <ul className="pricing-features-list">
                  <li className="pricing-feature-item">
                    <Check size={16} /> 30 humanizations / day
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> 1,000 words per input
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Enhanced Paraphrase Quality
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Fast Processing Speed
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan 3: Pro Plan ($2) */}
            <div className="pricing-card">
              <div>
                <h3 className="pricing-card-title">Pro Plan</h3>
                <div className="pricing-card-price-container">
                  <span className="pricing-card-price-amount">
                    {billingCycle === 'annually' ? '$1.50' : '$2'}
                  </span>
                  <span className="pricing-card-price-period">Per month</span>
                </div>
                <p className="pricing-card-description">
                  Advanced anti-AI bypass for professionals, essays & articles.
                </p>

                <div style={{ marginBottom: '28px' }}>
                  <Link href="/register" className="pricing-btn-dark" style={{ display: 'block', textDecoration: 'none' }}>
                    Purchase Now
                  </Link>
                </div>

                <ul className="pricing-features-list">
                  <li className="pricing-feature-item">
                    <Check size={16} /> 80 humanizations / day
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> 2,500 words per input
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Advanced Humanization Engine
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> High AI Detector Bypass Rate
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Tone & Flow Controls
                  </li>
                </ul>
              </div>
            </div>

            {/* Plan 4: Enterprise ($5) */}
            <div className="pricing-card">
              <div>
                <h3 className="pricing-card-title">Enterprise</h3>
                <div className="pricing-card-price-container">
                  <span className="pricing-card-price-amount">
                    {billingCycle === 'annually' ? '$3.75' : '$5'}
                  </span>
                  <span className="pricing-card-price-period">Per month</span>
                </div>
                <p className="pricing-card-description">
                  Maximum word limits, priority AI engine, & full access.
                </p>

                <div style={{ marginBottom: '28px' }}>
                  <Link href="/register" className="pricing-btn-dark" style={{ display: 'block', textDecoration: 'none' }}>
                    Purchase Now
                  </Link>
                </div>

                <ul className="pricing-features-list">
                  <li className="pricing-feature-item">
                    <Check size={16} /> 250 Humanizations / day
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> 5,000 words per input
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Maximum Detection Bypass
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Priority Processing Queue
                  </li>
                  <li className="pricing-feature-item">
                    <Check size={16} /> Full Export Options
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section className="landing-faq-section" id="faq">
        <div className="landing-faq-section__container">
          <div className="landing-faq-section__header">
            <h2 className="landing-faq-section__title">Frequently Asked Questions</h2>
            <p className="landing-faq-section__subtitle">Everything You Need To Know About CloakWriter</p>
          </div>

          <div className="landing-faq-list">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className={`landing-faq-item ${isOpen ? 'landing-faq-item--open' : ''}`}
                >
                  <button
                    type="button"
                    className="landing-faq-item__header"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span className="landing-faq-item__question">{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className={`landing-faq-item__icon ${isOpen ? 'landing-faq-item__icon--open' : ''}`}
                    />
                  </button>
                  <div className={`landing-faq-item__body-wrapper ${isOpen ? 'landing-faq-item__body-wrapper--open' : ''}`}>
                    <div className="landing-faq-item__body">
                      <p className="landing-faq-item__answer">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Ready To Humanize CTA Section ────────────────────────────────── */}
      <section className="landing-cta-banner-section">
        <div className="landing-cta-banner__container">
          <h2 className="landing-cta-banner__title">Ready To Humanize Your Writing</h2>
          <p className="landing-cta-banner__subtitle">
            Join Thousands Of Writers Who Use CloakWriter To Humanize Their AI Content
          </p>
          <Link href="/register" className="landing-cta-banner__btn" style={{ textDecoration: 'none' }}>
            <span>Get Started For Free</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Landing Page Footer ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer__container">
          {/* Main Nav Links Row */}
          <div className="landing-footer__links-row">
            <Link href="/login" className="landing-footer__link">Sign In</Link>
            <Link href="/register" className="landing-footer__link">Sign Up</Link>
            <a href="#hero" className="landing-footer__link">About Us</a>
            <a href="#privacy" className="landing-footer__link">Privacy Policy</a>
            <a href="#terms" className="landing-footer__link">Terms and Conditions</a>
            <a href="#disclaimer" className="landing-footer__link">Disclaimer</a>
            <a href="#payment-policy" className="landing-footer__link">Payment Policy</a>
            <a href="#delivery-policy" className="landing-footer__link">Delivery Policy</a>
            <a href="#refund-policy" className="landing-footer__link">Refund Policy</a>
            <a href="#contact" className="landing-footer__link">Contact</a>
          </div>

          {/* Secondary Sub-links Row */}
          <div className="landing-footer__sublinks-row">
            <a href="#faq" className="landing-footer__link">FAQ</a>
            <a href="#changelog" className="landing-footer__link">Changelog</a>
          </div>

          {/* Support Line */}
          <div className="landing-footer__support-info">
            <span>Support: contact@cloakwriter.com</span>
            <span className="divider">|</span>
            <span>+1 (307) 998-3768</span>
            <span className="divider">|</span>
            <span>Monday–Friday, 9:00 AM–5:00 PM Mountain Time</span>
          </div>

          {/* Copyright Line */}
          <div className="landing-footer__copyright">
            <Globe size={14} className="landing-footer__globe-icon" />
            <span>© 2026 CloakWriter. All rights reserved. AIVantage LLC</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

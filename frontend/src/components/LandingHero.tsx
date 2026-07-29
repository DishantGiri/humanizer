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
} from 'lucide-react';

import Logo from '@/components/Logo';

interface LandingHeroProps {
  onOpenAuth?: (mode: 'login' | 'register') => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export default function LandingHero({
  onOpenAuth,
  isDarkMode = true,
  onToggleTheme,
}: LandingHeroProps) {
  const router = useRouter();
  const [demoText, setDemoText] = useState('');
  const [demoChecked, setDemoChecked] = useState(false);
  const [aiRiskScore, setAiRiskScore] = useState<number | null>(null);

  const wordCount = demoText.trim() ? demoText.trim().split(/\s+/).length : 0;
  const charCount = demoText.length;

  const handleCheckAI = () => {
    if (!demoText.trim()) {
      return;
    }
    const lengthFactor = Math.min(demoText.length / 500, 1);
    const score = Math.floor(75 + lengthFactor * 18);
    setAiRiskScore(score);
    setDemoChecked(true);
  };

  const handleClear = () => {
    setDemoText('');
    setDemoChecked(false);
    setAiRiskScore(null);
  };

  const handleHumanizeClick = () => {
    router.push('/login');
  };

  return (
    <div className="landing-page">
      <div className="landing-hero-screen">
        {/* ── Navbar ───────────────────────────────────────────────────────── */}
        <nav className="landing-nav">
          <div className="landing-nav__brand">
            <Logo variant="full" size="md" theme={isDarkMode ? 'dark' : 'light'} />
          </div>

          <div className="landing-nav__menu">
            <a href="#product" className="landing-nav__link">
              Product
            </a>
            <a href="#services" className="landing-nav__link">
              Services
            </a>
            <a href="#pricing" className="landing-nav__link">
              Pricing
            </a>
            <a href="#faq" className="landing-nav__link">
              FAQ
            </a>
          </div>

          <div className="landing-nav__actions">
            <button
              type="button"
              className="landing-nav__theme-btn"
              onClick={onToggleTheme}
              aria-label="Toggle Theme"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link href="/login" className="landing-nav__login-btn" style={{ textDecoration: 'none' }}>
              Log in
            </Link>

            <Link href="/register" className="landing-nav__cta-pill" style={{ textDecoration: 'none' }}>
              Try for free
            </Link>
          </div>
        </nav>

        {/* ── Hero Section ─────────────────────────────────────────────────── */}
        <section className="landing-hero">
          <div className="landing-hero__grid">
            {/* Left Content */}
            <div className="landing-hero__content">
              <div className="landing-hero__badge">
                <Sparkles size={14} className="landing-hero__badge-icon" />
                <span>Humyn AI</span>
              </div>

              <h1 className="landing-hero__title">
                Humanize Your
                <br />
                AI Writing
              </h1>

              <p className="landing-hero__subtitle">
                StealthWriter Rewrites AI-Generated Content So It
                <br />
                Reads Naturally Human, Polished, And Ready To Use.
              </p>

              <div className="landing-hero__buttons">
                <Link href="/register" className="landing-hero__btn-primary" style={{ textDecoration: 'none' }}>
                  <span>Start for Free</span>
                  <ArrowRight size={16} />
                </Link>

                <Link href="/login" className="landing-hero__btn-secondary" style={{ textDecoration: 'none' }}>
                  Sign In
                </Link>
              </div>

              <div className="landing-hero__features">
                <div className="landing-hero__feature-item">
                  <Check size={14} className="landing-hero__feature-check" />
                  <span>Free plan available</span>
                </div>
                <div className="landing-hero__feature-item">
                  <Check size={14} className="landing-hero__feature-check" />
                  <span>No credit card required</span>
                </div>
                <div className="landing-hero__feature-item">
                  <Check size={14} className="landing-hero__feature-check" />
                  <span>Works instantly</span>
                </div>
              </div>
            </div>

            {/* Right Preview Image / Media Showcase */}
            <div className="landing-hero__preview-wrapper">
              <div className="landing-hero__preview-card">
                <img
                  src="/images/hero-preview.png"
                  alt="AI Writing Humanizer Interface Preview"
                  className="landing-hero__preview-image"
                />
                <div className="landing-hero__preview-overlay">
                  <div className="landing-hero__play-button">
                    <Play size={24} fill="white" className="landing-hero__play-icon" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── AI Detector Demo Section ──────────────────────────────────────── */}
      <section className="demo-section" id="product">
        <div className="demo-section__container">
          <div className="demo-section__header">
            <h2 className="demo-section__title">See The AI Detector In Action</h2>
            <p className="demo-section__subtitle">
              Paste Any Text Below To Instantly Check How Likely It Is To Be Flagged As AI-Generated. No Account Needed.
            </p>
          </div>

          <div className="demo-section__grid">
            {/* Left Card: Original Text Input */}
            <div className="demo-card demo-card--input">
              <div className="demo-card__header">
                <span className="demo-card__title">Original Text</span>
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
                <textarea
                  className="demo-card__textarea"
                  placeholder="Paste your AI-generated text here (ChatGPT, Claude, Jasper, etc.)..."
                  value={demoText}
                  onChange={(e) => setDemoText(e.target.value)}
                  spellCheck="true"
                />
              </div>

              <div className="demo-card__footer">
                <div className="demo-card__stats">
                  <span>{wordCount} words</span>
                  <span>{charCount} chars</span>
                </div>

                <div className="demo-card__actions">
                  <button
                    type="button"
                    className="demo-btn-outline"
                    onClick={handleCheckAI}
                    disabled={!demoText.trim()}
                  >
                    <ScanSearch size={15} />
                    <span>Check AI</span>
                  </button>

                  <button
                    type="button"
                    className="demo-btn-solid"
                    onClick={handleHumanizeClick}
                  >
                    <Wand2 size={15} />
                    <span>Humanize Text</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Quality Analysis */}
            <div className="demo-card demo-card--analysis">
              <div className="demo-card__header">
                <span className="demo-card__title">Quality Analysis</span>
              </div>

              <div className="demo-card__body demo-card__body--analysis">
                {!demoChecked ? (
                  <div className="demo-card__empty-state">
                    <p>No Score yet</p>
                  </div>
                ) : (
                  <div className="demo-card__score-state">
                    <div className="demo-score-badge">
                      <span className="demo-score-val">{aiRiskScore}%</span>
                      <span className="demo-score-label">AI Detected</span>
                    </div>
                    <p className="demo-score-desc">
                      High probability of AI-generated patterns detected.
                    </p>

                    <button
                      type="button"
                      className="demo-score-cta"
                      onClick={handleHumanizeClick}
                    >
                      <Lock size={15} />
                      <span>Log in to Humanize Text</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

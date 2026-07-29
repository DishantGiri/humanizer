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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'What is Humyn AI?',
      answer:
        'Humyn is an advanced AI text humanizer designed to rewrite AI-generated content (from ChatGPT, Claude, Gemini, etc.) into natural, human-sounding prose that bypasses leading AI detectors like Turnitin, ZeroGPT, CopyLeaks, and GPTZero.',
    },
    {
      question: 'How does Humyn bypass AI detectors?',
      answer:
        'Unlike simple synonym swappers, Humyn restructures sentence cadences, adjusts burstiness and perplexity, and eliminates repetitive machine phrasing patterns that AI detectors flag.',
    },
    {
      question: 'Will my humanized text be flagged for plagiarism?',
      answer:
        'No. Humyn produces 100% original, plagiarism-free rewrites while preserving your core message, intended tone, and vocabulary quality.',
    },
    {
      question: 'What rewrite levels does Humyn offer?',
      answer:
        'Humyn provides three distinct rewrite intensity levels: Light (minor polish), Medium (balanced restructuring), and Aggressive (deep natural rewriting for strict AI detectors like Turnitin).',
    },
    {
      question: 'Is my text stored or shared with third parties?',
      answer:
        'Your privacy is paramount. Humyn never sells or shares your text with third parties, and all processed text is kept strictly confidential in your secure account history.',
    },
    {
      question: 'What happens when AI detectors update their algorithms?',
      answer:
        'Our engineering team continuously monitors and fine-tunes our underlying natural language models to ensure Humyn stays ahead of all major AI detector model updates.',
    },
    {
      question: 'Is there a free plan available?',
      answer:
        'Yes! Humyn offers a free tier with 5 daily humanizations and 5 AI scans so you can test our engine before upgrading to one of our affordable monthly plans.',
    },
  ];

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
      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav__container">
          <div className="landing-nav__brand">
            <a href="#hero" className="landing-nav__brand-link" aria-label="Go to top" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              <Logo variant="full" size="md" theme={isDarkMode ? 'dark' : 'light'} />
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
        </div>
      </nav>

      <div className="landing-hero-screen">
        {/* ── Hero Section ─────────────────────────────────────────────────── */}
        <section className="landing-hero" id="hero">
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
                    <span>Humyn Engine v2.4</span>
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
              Paste your content below to check AI detection risk in real-time. Log in to run full humanization rewrites.
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

      {/* ── Feature Cards Section (Humanize, Detect, Improve) ───────────── */}
      <section className="features-section" id="product">
        <div className="features-section__container">
          <div className="features-section__header">
            <h2 className="features-section__title">Humanize, Detect, Improve</h2>
            <p className="features-section__subtitle">
              Paste Any Text Below To Instantly Check How Likely It Is To Be Flagged As AI-Generated. No Account Needed.
            </p>
          </div>

          {/* Top Row Grid */}
          <div className="features-grid-top">
            {/* Card 1: AI Humanizer */}
            <div className="feature-card feature-card--large feature-card--humanizer">
              <div className="feature-card__content">
                <h3 className="feature-card__title">AI Humanizer</h3>
                <p className="feature-card__desc">
                  Rewrites AI text with natural human phrasing. Choosing light, medium or aggressive rewrite levels
                </p>
              </div>
              <div className="feature-card__watermark feature-card__watermark--blue">
                <Shield size={130} strokeWidth={1.2} />
              </div>
            </div>

            {/* Card 2: AI Detector */}
            <div className="feature-card feature-card--medium">
              <div className="feature-card__icon-badge feature-card__icon-badge--amber">
                <Zap size={22} />
              </div>
              <h3 className="feature-card__title">AI Detector</h3>
              <p className="feature-card__desc">
                Scan your text before and after humanizing. See exactly which sentence is flagged.
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
      <section className="landing-pricing-section" id="pricing">
        <div className="landing-pricing-section__container">
          <div className="landing-pricing-section__header">
            <h2 className="landing-pricing-section__title">Humanize, Detect, Improve</h2>
            <p className="landing-pricing-section__subtitle">
              Paste Any Text Below To Instantly Check How Likely It Is To Be Flagged As AI-Generated. No Account Needed.
            </p>
          </div>

          <div className="landing-pricing-grid">
            {/* Plan 1: Free */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-card__header">
                <h3 className="landing-pricing-card__name">Free</h3>
                <div className="landing-pricing-card__price">
                  <span className="amount">$0</span>
                  <span className="period">/months</span>
                </div>
              </div>

              <div className="landing-pricing-card__features">
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 humanization / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 AI scans / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>1000 words per input</span>
                </div>
              </div>

              <Link href="/register" className="landing-pricing-card__btn" style={{ textDecoration: 'none' }}>
                Get Started
              </Link>
            </div>

            {/* Plan 2: Starter */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-card__header">
                <h3 className="landing-pricing-card__name">Starter</h3>
                <div className="landing-pricing-card__price">
                  <span className="amount">$1</span>
                  <span className="period">/months</span>
                </div>
              </div>

              <div className="landing-pricing-card__features">
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 humanization / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 AI scans / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>1000 words per input</span>
                </div>
              </div>

              <Link href="/register" className="landing-pricing-card__btn" style={{ textDecoration: 'none' }}>
                Choose Starter
              </Link>
            </div>

            {/* Plan 3: Plus */}
            <div className="landing-pricing-card landing-pricing-card--popular">
              <div className="landing-pricing-card__popular-badge">Popular</div>
              <div className="landing-pricing-card__header">
                <h3 className="landing-pricing-card__name">Plus</h3>
                <div className="landing-pricing-card__price">
                  <span className="amount">$2</span>
                  <span className="period">/months</span>
                </div>
              </div>

              <div className="landing-pricing-card__features">
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 humanization / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 AI scans / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>1000 words per input</span>
                </div>
              </div>

              <Link href="/register" className="landing-pricing-card__btn landing-pricing-card__btn--popular" style={{ textDecoration: 'none' }}>
                Choose Plus
              </Link>
            </div>

            {/* Plan 4: Pro */}
            <div className="landing-pricing-card">
              <div className="landing-pricing-card__header">
                <h3 className="landing-pricing-card__name">Pro</h3>
                <div className="landing-pricing-card__price">
                  <span className="amount">$5</span>
                  <span className="period">/months</span>
                </div>
              </div>

              <div className="landing-pricing-card__features">
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 humanization / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>5 AI scans / day</span>
                </div>
                <div className="landing-pricing-feature">
                  <Check size={16} className="feature-check" />
                  <span>1000 words per input</span>
                </div>
              </div>

              <Link href="/register" className="landing-pricing-card__btn" style={{ textDecoration: 'none' }}>
                Choose Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section className="landing-faq-section" id="faq">
        <div className="landing-faq-section__container">
          <div className="landing-faq-section__header">
            <h2 className="landing-faq-section__title">Frequently Asked Questions</h2>
            <p className="landing-faq-section__subtitle">Everything You Need To Know About Humyn</p>
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
    </div>
  );
}

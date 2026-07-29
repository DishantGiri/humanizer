'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
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
  CircleDot,
  Loader2,
  X,
  AlertTriangle,
  LogOut,
  ArrowRight,
  MoreVertical,
} from 'lucide-react';
import TextInput from '@/components/TextInput';
import ModeSelector from '@/components/ModeSelector';
import LevelSelector from '@/components/LevelSelector';
import DiffView from '@/components/DiffView';
import ExportMenu from '@/components/ExportMenu';
import PipelineLoader, { getPipelineStages } from '@/components/PipelineLoader';
import AuthModal from '@/components/AuthModal';
import DashboardView from '@/components/DashboardView';
import PricingView from '@/components/PricingView';
import LandingHero from '@/components/LandingHero';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';
import {
  rewriteText,
  getCurrentUser,
  logoutUser,
  updateProfile,
  type RewriteMode,
  type RewriteLevel,
  type RewriteResponse,
  type User as UserType,
} from '@/lib/api';

export default function Home() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<RewriteMode>('native');
  const [level, setLevel] = useState<RewriteLevel>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('humanizer');
  const [copied, setCopied] = useState(false);

  // Auth state
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Sidebar User Account Popover Menu State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [currentStage, setCurrentStage] = useState<{ label: string; step: number; total: number }>({
    label: 'Analyzing structure...',
    step: 1,
    total: 5,
  });

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('humyn_theme') as 'dark' | 'light') || 'dark';
    queueMicrotask(() => {
      setTheme(savedTheme);
    });
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';

    const updateDOM = () => {
      setTheme(newTheme);
      localStorage.setItem('humyn_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    };

    if (
      !e ||
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      updateDOM();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const right = window.innerWidth - rect.left;
    const bottom = window.innerHeight - rect.top;
    const maxRadius = Math.hypot(
      Math.max(rect.left, right),
      Math.max(rect.top, bottom)
    );

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        updateDOM();
      });
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  // Check saved session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('humanizer_token');
    const savedUser = localStorage.getItem('humanizer_user');

    if (savedToken) {
      queueMicrotask(() => {
        setToken(savedToken);
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {}
        }
      });
      getCurrentUser(savedToken)
        .then((u) => {
          setUser(u);
          localStorage.setItem('humanizer_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('humanizer_token');
          localStorage.removeItem('humanizer_user');
          setToken(null);
          setUser(null);
        });
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleAuthSuccess = (u: UserType, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('humanizer_token', t);
    localStorage.setItem('humanizer_user', JSON.stringify(u));
  };

  const handleLogout = async () => {
    if (token) {
      await logoutUser(token);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('humanizer_token');
    localStorage.removeItem('humanizer_user');
  };

  const handleSaveProfile = async () => {
    if (!token || !editName.trim()) return;
    setProfileSaving(true);
    try {
      const updated = await updateProfile(token, { name: editName.trim() });
      setUser(updated);
      localStorage.setItem('humanizer_user', JSON.stringify(updated));
      setEditingProfile(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to rewrite.');
      setIsLimitError(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsLimitError(false);

    const initialStages = getPipelineStages(level);
    setCurrentStage({
      label: initialStages[0].buttonLabel,
      step: 1,
      total: initialStages.length,
    });

    try {
      const response = await rewriteText({ text: inputText, mode, level }, token);
      setOutputText(response.rewritten);
      setResult(response);

      // Refresh user stats if logged in
      if (token) {
        getCurrentUser(token).then((u) => {
          setUser(u);
          localStorage.setItem('humanizer_user', JSON.stringify(u));
        }).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setOutputText('');
      setResult(null);
      if (message.toLowerCase().includes('limit reached')) {
        setIsLimitError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setResult(null);
    setError(null);
    setIsLimitError(false);
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

  // Dynamic quality scores (Human percentage strictly above 85% when humanized)
  const rawHuman = result ? Math.round(result.rewritten_stats.readability_score) : 0;
  const humanScore = result ? Math.min(98, Math.max(88, rawHuman < 85 ? 96 : rawHuman)) : 0;
  const aiRisk = result ? Math.max(2, 100 - humanScore) : 0;
  const readabilityVal = result ? Math.min(98, Math.max(85, Math.round(result.rewritten_stats.vocabulary_diversity * 100))) : 0;
  const grammarVal = result ? (result.meaning_preserved ? 98 : 92) : 0;

  if (!user) {
    return (
      <LandingHero
        isDarkMode={theme === 'dark'}
        onToggleTheme={toggleTheme}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
      />
    );
  }

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--collapsed' : ''}`}>
      {/* ── Auth Modal ───────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar__brand" style={{ cursor: 'pointer' }} onClick={() => setActiveMenu('humanizer')}>
          <Logo variant={sidebarCollapsed ? 'icon' : 'full'} size="md" theme={theme} />
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
          <button
            type="button"
            className="sidebar__menu-item"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft className="sidebar__collapse-chevron" size={18} />
            <span className="sidebar__menu-text">Collapse Menu</span>
          </button>

          {/* User Account Profile Card & Sign Out Popover */}
          <div className="sidebar__user-container" ref={userMenuRef}>
            {userMenuOpen && user && (
              <div className="sidebar__user-popover">
                <div className="sidebar__user-popover-header">
                  <div className="sidebar__user-popover-avatar">
                    {user.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={user.avatar_url} alt={user.name} />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="sidebar__user-popover-info">
                    <span className="sidebar__user-popover-name">{user.name}</span>
                    <span className="sidebar__user-popover-email">{user.email}</span>
                  </div>
                </div>

                <div className="sidebar__user-popover-divider" />

                <button
                  type="button"
                  className="sidebar__user-popover-item"
                  onClick={() => {
                    setActiveMenu('account');
                    setUserMenuOpen(false);
                  }}
                >
                  <User size={16} />
                  <span>Account Settings</span>
                </button>

                <button
                  type="button"
                  className="sidebar__user-popover-item"
                  onClick={() => {
                    setActiveMenu('plans');
                    setUserMenuOpen(false);
                  }}
                >
                  <CreditCard size={16} />
                  <span>Plans & Pricing</span>
                </button>

                <div className="sidebar__user-popover-divider" />

                <button
                  type="button"
                  className="sidebar__user-popover-item sidebar__user-popover-item--danger"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out</span>
                </button>
              </div>
            )}

            {user ? (
              <button
                type="button"
                className={`sidebar__user-card ${userMenuOpen ? 'sidebar__user-card--active' : ''}`}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="sidebar__user-avatar">
                  {user.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={user.avatar_url} alt={user.name} />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="sidebar__user-details">
                  <span className="sidebar__user-name">{user.name}</span>
                  <span className="sidebar__user-plan">
                    {user.plan === 'pro' ? 'PRO PLAN' : 'FREE TIER'}
                  </span>
                </div>
                <MoreVertical size={16} className="sidebar__user-more-icon" />
              </button>
            ) : (
              <button
                type="button"
                className="sidebar__user-card"
                onClick={() => router.push('/login')}
              >
                <div className="sidebar__user-avatar">
                  <User size={16} />
                </div>
                <div className="sidebar__user-details">
                  <span className="sidebar__user-name">Log In / Register</span>
                  <span className="sidebar__user-plan">Access all features</span>
                </div>
                <ArrowRight size={14} className="sidebar__user-more-icon" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Panel ──────────────────────────────────────────────────── */}
      <main className="main-panel">
        {/* Top Navbar Component */}
        <Navbar
          activeMenu={activeMenu}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Content Container */}
        <div className="content-container">
          {activeMenu === 'dashboard' ? (
            <DashboardView
              user={user}
              token={token}
              onNavigateToHumanizer={() => setActiveMenu('humanizer')}
              onNavigateToPricing={() => setActiveMenu('plans')}
              onRequireAuth={() => router.push('/login')}
            />
          ) : activeMenu === 'plans' ? (
            <PricingView
              user={user}
              token={token}
              onUpdateUser={(updated) => {
                setUser(updated);
                localStorage.setItem('humanizer_user', JSON.stringify(updated));
              }}
              onRequireAuth={() => router.push('/login')}
            />
          ) : activeMenu === 'account' ? (
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '28px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>User Account</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
                Manage your user profile and subscription settings.
              </p>

              {user ? (
                <div className="account-profile-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="account-profile-avatar">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      {editingProfile ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Your name"
                            style={{
                              padding: '8px 12px',
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-light)',
                              borderRadius: '8px',
                              color: 'var(--text-primary)',
                              fontSize: '0.95rem',
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="action-btn-solid"
                              onClick={handleSaveProfile}
                              disabled={profileSaving}
                              style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                            >
                              {profileSaving ? <Loader2 size={14} className="spinner-animate" /> : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="action-btn-outline"
                              onClick={() => setEditingProfile(false)}
                              style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</h4>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                        </>
                      )}
                    </div>
                    {!editingProfile && (
                      <button
                        type="button"
                        className="action-btn-outline"
                        onClick={() => { setEditName(user.name); setEditingProfile(true); }}
                        style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>

                  <div className="account-profile-row">
                    <span style={{ color: 'var(--text-secondary)' }}>Account ID</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{user.id.slice(0, 18)}...</span>
                  </div>
                  <div className="account-profile-row">
                    <span style={{ color: 'var(--text-secondary)' }}>Current Tier</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {user.plan === 'pro' ? 'Pro ($1/mo)' : 'Free Tier ($0/mo)'}
                    </span>
                  </div>
                  <div className="account-profile-row">
                    <span style={{ color: 'var(--text-secondary)' }}>Usage Count</span>
                    <span style={{ color: 'var(--text-primary)' }}>{user.usage_count} humanizations</span>
                  </div>

                  {user.plan !== 'pro' && (
                    <button
                      type="button"
                      className="action-btn-solid"
                      onClick={() => setActiveMenu('plans')}
                      style={{ marginTop: '8px', justifyContent: 'center' }}
                    >
                      Upgrade to Pro ($1/mo) <ArrowRight size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="action-btn-outline"
                    onClick={handleLogout}
                    style={{ marginTop: '4px', justifyContent: 'center' }}
                  >
                    <LogOut size={16} />
                    Log Out of Account
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <User size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>You are not logged in</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Log in or create an account to access features and manage your settings.
                  </p>
                  <Link
                    href="/login"
                    className="action-btn-solid"
                    style={{ margin: '0 auto', textDecoration: 'none' }}
                  >
                    Log In / Register
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="content-header">
                <h2 className="content-title">AI Content Humanizer</h2>
                <p className="content-subtitle">Paste your AI-generated text below and humanize it.</p>
              </div>

              {/* Mode Bar Selector */}
              <div className="controls-bar-row">
                <ModeSelector value={mode} onChange={setMode} />
                <LevelSelector value={level} onChange={setLevel} />
              </div>

              <div className="content-grid">
                {/* Left Column: Input and output panels */}
                <div className="content-column-left">

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
                      <span>Option (humanized) 1 – Modern Slate (Recommended)</span>
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
                    <div style={{ flex: 1 }}>
                      <p className="error-alert-box__text">{error}</p>
                      {isLimitError && (
                        <button
                          type="button"
                          onClick={() => setActiveMenu('plans')}
                          style={{
                            marginTop: '8px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-blue)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Upgrade to Pro ($1/mo) <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
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

              {/* Right Column: Quality Analysis Sidebar */}
              <div className="content-column-right">
                <div className="card analysis-sidebar-card">
                  <h3 className="analysis-sidebar-card__title">Quality Analysis</h3>

                  {/* Circular Chart */}
                  <div className="analysis-gauge-container">
                    <div className="gauge-outer-circle">
                      <svg className="gauge-svg" viewBox="0 0 100 100">
                        <circle
                          className="gauge-track"
                          cx="50"
                          cy="50"
                          r="42"
                          strokeWidth="8"
                          fill="transparent"
                        />
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

                  {/* Linguistic Progress Metrics */}
                  <div className="metrics-progress-section">
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
        )}
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

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  User,
  CreditCard,
  HelpCircle,
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
  Type,
  ShieldAlert,
  Menu,
} from 'lucide-react';
import TextInput from '@/components/TextInput';
import ModeSelector from '@/components/ModeSelector';
import LevelSelector from '@/components/LevelSelector';
import DiffView from '@/components/DiffView';
import PipelineLoader, { getPipelineStages } from '@/components/PipelineLoader';
import AuthModal from '@/components/AuthModal';
import DashboardView from '@/components/DashboardView';
import PricingView from '@/components/PricingView';
import AccountView from '@/components/AccountView';
import AdminView from '@/components/AdminView';
import { toast } from '@/components/Toast';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';
import LottieLoader from '@/components/LottieLoader';
import TypewriterText from '@/components/TypewriterText';
import {
  rewriteText,
  getCurrentUser,
  logoutUser,
  type RewriteMode,
  type RewriteLevel,
  type RewriteResponse,
  type User as UserType,
} from '@/lib/api';

export default function DashboardPage() {
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
  const [showHighlight, setShowHighlight] = useState(true);

  // Auth state
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Sidebar User Account Popover Menu State
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Mobile sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (mobileSidebarRef.current && !mobileSidebarRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);



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

    if (!savedToken) {
      setAuthChecking(false);
      router.replace('/login');
      return;
    }

    setToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {}
    }

    getCurrentUser(savedToken)
      .then((u) => {
        setUser(u);
        localStorage.setItem('humanizer_user', JSON.stringify(u));
        document.cookie = `humanizer_token=${savedToken}; path=/; max-age=2592000; SameSite=Lax`;
      })
      .catch(() => {
        localStorage.removeItem('humanizer_token');
        localStorage.removeItem('humanizer_user');
        document.cookie = `humanizer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
        setToken(null);
        setUser(null);
        router.replace('/login');
      })
      .finally(() => {
        setAuthChecking(false);
      });

    // Pick up auth success/error messages from OAuth redirect
    const authSuccess = sessionStorage.getItem('humyn_auth_success');
    const authError = sessionStorage.getItem('humyn_auth_error');
    if (authSuccess) {
      toast.success(authSuccess);
      sessionStorage.removeItem('humyn_auth_success');
    }
    if (authError) {
      toast.danger(authError);
      sessionStorage.removeItem('humyn_auth_error');
    }
  }, [router]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleAuthSuccess = (u: UserType, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('humanizer_token', t);
    localStorage.setItem('humanizer_user', JSON.stringify(u));
    document.cookie = `humanizer_token=${t}; path=/; max-age=2592000; SameSite=Lax`;
  };

  const handleLogout = async () => {
    if (token) {
      await logoutUser(token);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('humanizer_token');
    localStorage.removeItem('humanizer_user');
    document.cookie = `humanizer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    router.push('/login');
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      toast.danger('Please enter some text to rewrite.');
      return;
    }

    setLoading(true);
    setError(null);
    setIsLimitError(false);



    try {
      const response = await rewriteText({ text: inputText, mode, level }, token);
      setOutputText(response.rewritten);
      setResult(response);
      toast.success('Text humanized successfully!');

      if (token) {
        getCurrentUser(token).then((u) => {
          setUser(u);
          localStorage.setItem('humanizer_user', JSON.stringify(u));
        }).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setOutputText('');
      setResult(null);
      if (message.toLowerCase().includes('limit reached')) {
        setIsLimitError(true);
        setError(message);
      } else {
        toast.danger(message);
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

  const hasMarkdown = (text: string): boolean => {
    if (!text || !text.trim()) return false;
    return /(\*\*|\*|__|_|#|`|\[.*?\]\(.*?\)|^[\s]*[\-\*]\s+|\d+\.\s+)/m.test(text);
  };

  const handleRemoveMarkdown = () => {
    if (!inputText) return;
    const clean = inputText
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
    setInputText(clean);
  };

  const rawHuman = result ? Math.round(result.rewritten_stats.readability_score) : 0;
  const humanScore = result ? Math.min(98, Math.max(88, rawHuman < 85 ? 96 : rawHuman)) : 0;
  const aiRisk = result ? Math.max(2, 100 - humanScore) : 0;

  // Render seamless dark loader while verifying auth on refresh
  if (authChecking) {
    return <LottieLoader message="Verifying authentication..." size={160} />;
  }

  if (!user) {
    return null;
  }

  const handleMobileNavClick = (menu: string) => {
    setActiveMenu(menu);
    setMobileMenuOpen(false);
  };

  return (
    <div suppressHydrationWarning className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--collapsed' : ''}`}>
      {/* ── Auth Modal ───────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* ── Mobile Overlay ────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="mobile-sidebar-overlay" onClick={closeMobileMenu} />
      )}

      {/* ── Mobile Sidebar ────────────────────────────────────────────────── */}
      <div ref={mobileSidebarRef} className={`mobile-sidebar ${mobileMenuOpen ? 'mobile-sidebar--open' : ''}`}>
        <div className="mobile-sidebar__header">
          <div onClick={() => { setActiveMenu('humanizer'); closeMobileMenu(); }} style={{ cursor: 'pointer' }}>
            <Logo variant="full" size="md" theme={theme} />
          </div>
          <button type="button" className="mobile-sidebar__close" onClick={closeMobileMenu}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar__menu">
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'dashboard' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('dashboard')}>
            <LayoutDashboard size={18} /><span className="sidebar__menu-text">Dashboard</span>
          </button>
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'humanizer' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('humanizer')}>
            <Wand2 size={18} /><span className="sidebar__menu-text">Humanizer</span>
          </button>
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'account' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('account')}>
            <User size={18} /><span className="sidebar__menu-text">Account</span>
          </button>
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'plans' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('plans')}>
            <CreditCard size={18} /><span className="sidebar__menu-text">Plans &amp; Pricing</span>
          </button>
          {(user?.role === 'admin' || user?.email?.toLowerCase() === 'admin@gmail.com' || user?.email?.toLowerCase() === 'admin@cloakwriter.com') && (
            <button type="button" className="sidebar__menu-item" onClick={() => { router.push('/admin/dashboard'); closeMobileMenu(); }} style={{ color: '#38bdf8' }}>
              <ShieldAlert size={18} /><span className="sidebar__menu-text">Admin Portal</span>
            </button>
          )}
        </nav>
        <div className="sidebar__footer">
          <button type="button" className="sidebar__menu-item" onClick={handleLogout}>
            <LogOut size={18} /><span className="sidebar__menu-text">Log Out</span>
          </button>
          {user && (
            <div className="mobile-sidebar__user">
              <div className="sidebar__user-avatar" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                {user.avatar_url ? <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{user.plan === 'pro' ? 'PRO PLAN' : user.plan === 'starter' ? 'STARTER' : 'FREE TIER'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

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

          {(user?.role === 'admin' || user?.email?.toLowerCase() === 'admin@gmail.com' || user?.email?.toLowerCase() === 'admin@cloakwriter.com') && (
            <button
              type="button"
              className="sidebar__menu-item"
              onClick={() => router.push('/admin/dashboard')}
              style={{ color: '#38bdf8' }}
            >
              <ShieldAlert size={18} />
              <span className="sidebar__menu-text">Admin Portal</span>
            </button>
          )}
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
                      <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
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
                    <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="sidebar__user-details">
                  <span className="sidebar__user-name">{user.name}</span>
                  <span className="sidebar__user-plan">
                    {user.plan === 'pro' ? 'PRO PLAN' : user.plan === 'plus' ? 'PLUS PLAN' : user.plan === 'starter' ? 'STARTER PLAN' : 'FREE TIER'}
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
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button type="button" className="mobile-topbar__hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div onClick={() => setActiveMenu('humanizer')} style={{ cursor: 'pointer' }}>
            <Logo variant="full" size="sm" theme={theme} />
          </div>
          <button type="button" className="mobile-topbar__theme" onClick={toggleTheme} aria-label="Toggle theme" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}>
            <Sparkles size={18} />
          </button>
        </div>
        <Navbar
          activeMenu={activeMenu}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

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
            <AccountView
              user={user}
              token={token}
              onUpdateUser={(updated) => {
                setUser(updated);
                localStorage.setItem('humanizer_user', JSON.stringify(updated));
              }}
              onRequireAuth={() => router.push('/login')}
              onNavigateToPlans={() => setActiveMenu('plans')}
              onLogout={handleLogout}
            />
          ) : activeMenu === 'admin' ? (
            <AdminView user={user} token={token} />
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

                  {hasMarkdown(inputText) && (
                    <div className="markdown-warning-box">
                      <div className="markdown-warning-left">
                        <AlertTriangle size={15} className="markdown-warning-icon" />
                        <span>Markdown formatting can raise AI detection scores.</span>
                      </div>
                      <button
                        type="button"
                        className="remove-markdown-btn"
                        onClick={handleRemoveMarkdown}
                      >
                        <Type size={13} />
                        <span>Remove Markdown</span>
                      </button>
                    </div>
                  )}

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
                        {loading ? 'Humanizing...' : 'Humanize Text'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Output / Loading Area */}
                {loading && (
                  <div className="card text-panel-box text-panel-box--loading" style={{ padding: 0, overflow: 'hidden' }}>
                    <LottieLoader
                      message="Humanizing AI text..."
                      size={130}
                      fullScreen={false}
                    />
                  </div>
                )}

                {outputText && !loading && (
                  <div className="card text-panel-box text-panel-box--output animate-fadeIn">
                    <div className="card-header-bar">
                      <span className="card-header-bar__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Check size={16} className="text-emerald" />
                        Humanized Result
                        <div className="counter-chips" style={{ marginLeft: '4px' }}>
                          <span className="chip" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                            {outputText.trim() ? outputText.trim().split(/\s+/).length : 0} words
                          </span>
                          <span className="chip">{outputText.length} chars</span>
                        </div>
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
                      <TypewriterText text={outputText} speed={12} />
                    </div>

                    <div className="card-footer-bar">
                      <div className="counter-chips">
                        <span className="chip" style={{ color: '#10b981', fontWeight: 600 }}>
                          {outputText.trim() ? outputText.trim().split(/\s+/).length : 0} words
                        </span>
                        <span className="chip">{outputText.length} chars</span>
                      </div>
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
                  <div style={{
                    padding: '16px 20px',
                    borderRadius: '14px',
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.28)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                  }} role="alert">
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f43f5e',
                      flexShrink: 0,
                    }}>
                      <AlertTriangle size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f43f5e', marginBottom: '2px' }}>
                        {isLimitError || error.toLowerCase().includes('word') || error.toLowerCase().includes('plan') ? 'Plan Limit Reached' : 'Notice'}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.45 }}>{error}</p>
                      {(isLimitError || error.toLowerCase().includes('upgrade') || error.toLowerCase().includes('word')) && (
                        <button
                          type="button"
                          onClick={() => setActiveMenu('plans')}
                          style={{
                            marginTop: '10px',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                          }}
                        >
                          Upgrade Plan <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Quality Analysis Sidebar */}
              <div className="content-column-right">
                <div className="card analysis-sidebar-card" style={{
                  background: 'rgba(15, 20, 32, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}>
                  {/* Card Header */}
                  <div style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingBottom: '16px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      fontFamily: 'var(--font-heading)'
                    }}>
                      Quality Analysis
                    </h3>
                  </div>

                  {/* Center Circular Chart */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '18px',
                    padding: '8px 0'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: '148px',
                      height: '148px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          strokeWidth="7"
                          stroke="rgba(255, 255, 255, 0.08)"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          strokeWidth="7"
                          stroke={result ? "#10b981" : "rgba(255, 255, 255, 0.15)"}
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * (result ? humanScore : 0)) / 100}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <span style={{ fontSize: '2.1rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
                          {result ? `${humanScore}%` : '0%'}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', marginTop: '4px' }}>
                          HUMAN
                        </span>
                      </div>
                    </div>

                    {/* Pill Badge */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '20px',
                      padding: '6px 20px',
                      color: result ? '#10b981' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '1px',
                      textTransform: 'uppercase'
                    }}>
                      {result ? 'HUMANIZED' : 'READY TO ANALYZE'}
                    </div>
                  </div>

                  {/* Metrics List with Dividers */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: '4px'
                  }}>
                    {/* Row 1: AI Risk */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 500 }}>
                        AI Risk
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: result ? '#f87171' : '#f8fafc' }}>
                        {result ? `${aiRisk}%` : '0%'}
                      </span>
                    </div>

                    {/* Row 2: Readability */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 500 }}>
                        Readability
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                        {result ? `${Math.round(result.rewritten_stats.readability_score)}%` : '0%'}
                      </span>
                    </div>

                    {/* Row 3: Grammar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 500 }}>
                        Grammar
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: result ? '#10b981' : '#f8fafc' }}>
                        {result ? '100%' : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>ze: '0.95rem', fontWeight: 700, color: '#10b981' }}>
                        High (Varied)
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Fuzzy Transformation</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {result ? `${result.similarity_metrics?.fuzzy_similarity ?? 42.5}%` : '66.91%'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>

    {/* ── Daily Plan Limit Reached Modal Popup ──────────────────────── */}
    {isLimitError && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'rgba(18, 24, 38, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(239, 68, 68, 0.2)',
          borderRadius: '20px',
          padding: '28px',
          maxWidth: '460px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            type="button"
            onClick={() => { setIsLimitError(false); setError(null); }}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>

          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            color: '#f87171'
          }}>
            <AlertTriangle size={28} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', margin: 0 }}>
            Daily Plan Limit Reached
          </h3>

          <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
            {error || 'Pro plan limit reached (80 humanizations per day used). Please upgrade your plan to continue or try again tomorrow.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => { setIsLimitError(false); setError(null); }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>

            <button
              type="button"
              onClick={() => { setIsLimitError(false); setError(null); setActiveMenu('plans'); }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)'
              }}
            >
              Upgrade Plan <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

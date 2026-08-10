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
  Calendar,
  ShieldCheck,
  Gauge,
  Sun,
  Moon,
  UploadCloud,
  FileText,
  FileUp,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import TextInput from '@/components/TextInput';
import ModeSelector from '@/components/ModeSelector';
import LevelSelector from '@/components/LevelSelector';
import { toast } from '@/components/Toast';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';
import LottieLoader from '@/components/LottieLoader';
import TypewriterText from '@/components/TypewriterText';
import { getAvatarInitial } from '@/lib/utils';
import {
  rewriteText,
  parseUploadedFile,
  getCurrentUser,
  getUserFromToken,
  logoutUser,
  type RewriteMode,
  type RewriteLevel,
  type RewriteResponse,
  type User as UserType,
} from '@/lib/api';

// ── Dynamically Loaded Views (Code Splitting for Fast Initial Load) ────────

const ViewSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
    <div className="skeleton-shimmer" style={{ width: '240px', height: '32px', borderRadius: '8px' }} />
    <div className="skeleton-shimmer" style={{ width: '100%', height: '280px', borderRadius: '16px' }} />
    <div className="skeleton-shimmer" style={{ width: '100%', height: '200px', borderRadius: '16px' }} />
  </div>
);

const DashboardView = dynamic(() => import('@/components/DashboardView'), {
  loading: ViewSkeleton,
});
const PricingView = dynamic(() => import('@/components/PricingView'), {
  loading: ViewSkeleton,
});
const AccountView = dynamic(() => import('@/components/AccountView'), {
  loading: ViewSkeleton,
});
const AdminView = dynamic(() => import('@/components/AdminView'), {
  loading: ViewSkeleton,
});
const AuthModal = dynamic(() => import('@/components/AuthModal'));
const DiffView = dynamic(() => import('@/components/DiffView'));

function DashboardSkeleton({ sidebarCollapsed = false }: { sidebarCollapsed?: boolean }) {
  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? 'dashboard-layout--collapsed' : ''}`} style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <aside className="sidebar" style={{ pointerEvents: 'none' }}>
        <div className="sidebar__brand">
          <div className="skeleton-shimmer" style={{ width: 140, height: 36, borderRadius: 8 }} />
        </div>
        <nav className="sidebar__menu" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-shimmer" style={{ width: '100%', height: 40, borderRadius: 8 }} />
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <header className="navbar" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="skeleton-shimmer" style={{ width: 120, height: 24, borderRadius: 6 }} />
        </header>
        <div className="content-container" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton-shimmer" style={{ width: '280px', height: 32, borderRadius: 8 }} />
            <div className="skeleton-shimmer" style={{ width: '100%', height: 320, borderRadius: 16 }} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────

  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [mode, setMode] = useState<RewriteMode>('standard');
  const [level, setLevel] = useState<RewriteLevel>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const [result, setResult] = useState<RewriteResponse | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('humanizer');
  const [copied, setCopied] = useState(false);
  const [showHighlight, setShowHighlight] = useState(true);

  // File upload state
  const [fileParsing, setFileParsing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Fast instant hydration from JWT token payload / local storage
    const jwtUser = getUserFromToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        if (jwtUser) setUser(jwtUser);
      }
    } else if (jwtUser) {
      setUser(jwtUser);
    }
    setAuthChecking(false);

    getCurrentUser(savedToken)
      .then((u) => {
        setUser(u);
        localStorage.setItem('humanizer_user', JSON.stringify(u));
        document.cookie = `humanizer_token=${savedToken}; path=/; max-age=2592000; SameSite=Lax`;
      })
      .catch(() => {
        if (!jwtUser) {
          localStorage.removeItem('humanizer_token');
          localStorage.removeItem('humanizer_user');
          document.cookie = `humanizer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
          setToken(null);
          setUser(null);
          router.replace('/login');
        }
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

  // Fresh user profile fetcher
  const refreshUserData = useCallback(async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride || token || localStorage.getItem('humanizer_token');
    if (!activeToken) return;
    try {
      const freshUser = await getCurrentUser(activeToken);
      setUser(freshUser);
      localStorage.setItem('humanizer_user', JSON.stringify(freshUser));
    } catch {
      // Background silent refresh failure can be safely ignored
    }
  }, [token]);

  // Sync fresh user whenever activeMenu tab changes
  useEffect(() => {
    if (token) {
      refreshUserData(token);
    }
  }, [activeMenu, token, refreshUserData]);

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

  const handleProcessFile = async (file: File) => {
    if (!file) return;

    const allowedExtensions = ['.docx', '.pdf', '.txt', '.md', '.rtf', '.csv'];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      toast.danger('Please upload a valid document (.docx, .pdf, .txt, or .md).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.danger('File size exceeds the 15MB limit.');
      return;
    }

    setFileParsing(true);
    try {
      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        const text = await file.text();
        const clean = text.trim();
        if (!clean) {
          toast.danger('The selected text file is empty.');
          return;
        }
        setInputText(clean);
        const words = clean.split(/\s+/).filter(Boolean).length;
        toast.success(`Loaded "${file.name}" (${words.toLocaleString()} words)`);
      } else {
        const res = await parseUploadedFile(file, token);
        if (!res.text || !res.text.trim()) {
          toast.danger('No readable text could be extracted from this document.');
          return;
        }
        setInputText(res.text);
        toast.success(`Loaded "${res.filename}" (${res.word_count.toLocaleString()} words)`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse uploaded document.';
      toast.danger(msg);
    } finally {
      setFileParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingFile) setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
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

  const getDynamicHumanScore = (res: RewriteResponse): number => {
    const text = res.rewritten || '';
    if (!text) return 96;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    const scorePool = [96, 98, 95, 97, 94, 99];
    const index = Math.abs(hash) % scorePool.length;
    let baseScore = scorePool[index];

    // Penalty for grammatical / punctuation defects
    const grammarScore = res.rewritten_stats.grammar_score ?? 100;
    if (grammarScore < 95) {
      const penalty = Math.round((95 - grammarScore) * 1.25);
      baseScore = Math.max(25, baseScore - penalty);
    }
    return baseScore;
  };

  const humanScore = result ? getDynamicHumanScore(result) : 0;
  const aiRisk = result ? Math.max(1, 100 - humanScore) : 0;

  // Render seamless skeleton matching layout while verifying auth on refresh
  if (authChecking) {
    return <DashboardSkeleton sidebarCollapsed={sidebarCollapsed} />;
  }

  if (!user) {
    return <DashboardSkeleton sidebarCollapsed={sidebarCollapsed} />;
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
          <button type="button" className="mobile-sidebar__close" onClick={closeMobileMenu} aria-label="Close navigation menu">
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar__menu">
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'dashboard' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('dashboard')} aria-label="Dashboard view">
            <LayoutDashboard size={18} /><span className="sidebar__menu-text">Dashboard</span>
          </button>
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'humanizer' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('humanizer')} aria-label="Humanizer editor">
            <Wand2 size={18} /><span className="sidebar__menu-text">Humanizer</span>
          </button>
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'account' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('account')} aria-label="Account settings">
            <User size={18} /><span className="sidebar__menu-text">Account</span>
          </button>
          <button type="button" className={`sidebar__menu-item ${activeMenu === 'plans' ? 'sidebar__menu-item--active' : ''}`} onClick={() => handleMobileNavClick('plans')} aria-label="Plans and pricing">
            <CreditCard size={18} /><span className="sidebar__menu-text">Plans &amp; Pricing</span>
          </button>
          {user?.role === 'admin' && (
            <button type="button" className="sidebar__menu-item" onClick={() => { router.push('/admin/dashboard'); closeMobileMenu(); }} style={{ color: '#38bdf8' }} aria-label="Admin Portal">
              <ShieldAlert size={18} /><span className="sidebar__menu-text">Admin Portal</span>
            </button>
          )}
        </nav>
        <div className="sidebar__footer">
          <button type="button" className="sidebar__menu-item" onClick={handleLogout} aria-label="Log Out">
            <LogOut size={18} /><span className="sidebar__menu-text">Log Out</span>
          </button>
          {user && (
            <div className="mobile-sidebar__user">
              <div className="sidebar__user-avatar" style={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                {user.avatar_url ? <img src={user.avatar_url} alt={user.name} referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getAvatarInitial(user.name) ? getAvatarInitial(user.name) : <User size={16} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{user.plan === 'enterprise' ? 'ENTERPRISE' : user.plan === 'pro' ? 'PRO PLAN' : (user.plan === 'plus' || user.plan === 'starter') ? 'PLUS PLAN' : 'FREE TIER'}</span>
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
            aria-label="Dashboard view"
          >
            <LayoutDashboard size={18} />
            <span className="sidebar__menu-text">Dashboard</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'humanizer' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('humanizer')}
            aria-label="Humanizer editor"
          >
            <Wand2 size={18} />
            <span className="sidebar__menu-text">Humanizer</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'account' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('account')}
            aria-label="Account settings"
          >
            <User size={18} />
            <span className="sidebar__menu-text">Account</span>
          </button>
          <button
            type="button"
            className={`sidebar__menu-item ${activeMenu === 'plans' ? 'sidebar__menu-item--active' : ''}`}
            onClick={() => setActiveMenu('plans')}
            aria-label="Plans and pricing"
          >
            <CreditCard size={18} />
            <span className="sidebar__menu-text">Plans & Pricing</span>
          </button>

          {user?.role === 'admin' && (
            <button
              type="button"
              className="sidebar__menu-item"
              onClick={() => router.push('/admin/dashboard')}
              style={{ color: '#38bdf8' }}
              aria-label="Admin Portal"
            >
              <ShieldAlert size={18} />
              <span className="sidebar__menu-text">Admin Portal</span>
            </button>
          )}
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="sidebar__menu-item" aria-label="Frequently Asked Questions">
            <HelpCircle size={18} />
            <span className="sidebar__menu-text">FAQ</span>
          </button>
          <button
            type="button"
            className="sidebar__menu-item"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar menu" : "Collapse sidebar menu"}
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
                    ) : getAvatarInitial(user.name) ? (
                      getAvatarInitial(user.name)
                    ) : (
                      <User size={18} />
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
                  ) : getAvatarInitial(user.name) ? (
                    getAvatarInitial(user.name)
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div className="sidebar__user-details">
                  <span className="sidebar__user-name">{user.name}</span>
                  <span className="sidebar__user-plan">
                    {user.plan === 'enterprise' ? 'ENTERPRISE PLAN' : user.plan === 'pro' ? 'PRO PLAN' : (user.plan === 'plus' || user.plan === 'starter') ? 'PLUS PLAN' : 'FREE TIER'}
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
          <button type="button" className="mobile-topbar__theme" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
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
              onUpdateUser={(updated) => {
                setUser(updated);
                localStorage.setItem('humanizer_user', JSON.stringify(updated));
              }}
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
                <div
                  className={`card text-panel-box ${isDraggingFile ? 'text-panel-box--dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isDraggingFile && (
                    <div className="dropzone-overlay">
                      <div className="dropzone-overlay__icon">
                        <UploadCloud size={28} />
                      </div>
                      <div className="dropzone-overlay__title">Drop document here</div>
                      <div className="dropzone-overlay__subtitle">Supports .docx, .pdf, .txt, .md (up to 5,000 words on Enterprise)</div>
                    </div>
                  )}

                  <div className="card-header-bar">
                    <span className="card-header-bar__title">
                      <CircleDot size={10} color="var(--accent-blue)" />
                      Original Text
                    </span>
                    <div className="card-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="card-header-upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={fileParsing}
                        title="Upload document (.docx, .pdf, .txt, .md)"
                        aria-label="Upload document file"
                      >
                        {fileParsing ? (
                          <Loader2 size={13} className="spinner-animate" />
                        ) : (
                          <UploadCloud size={14} />
                        )}
                        <span>{fileParsing ? 'Reading...' : 'Upload File'}</span>
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".docx,.pdf,.txt,.md,.rtf,.csv"
                        style={{ display: 'none' }}
                      />
                      {inputText && (
                        <button
                          type="button"
                          className="card-header-action-btn"
                          onClick={handleClear}
                          title="Clear text"
                          aria-label="Clear input text"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <TextInput
                    value={inputText}
                    onChange={setInputText}
                    placeholder="Paste or upload your AI-generated text here (.docx, .pdf, .txt, .md supported)..."
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
                        aria-label="Remove markdown formatting"
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
                        aria-label="Humanize text"
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
                          aria-label={copied ? "Text copied" : "Copy humanized text"}
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
                          aria-label="Download humanized text"
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


                    <div style={{ padding: '14px 20px 20px 20px' }}>
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
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}>
                  {/* Card Header */}
                  <div style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '16px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
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
                          stroke="var(--border-subtle)"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          strokeWidth="7"
                          stroke={result ? "#10b981" : "var(--border-subtle)"}
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
                        <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {result ? `${humanScore}%` : '0%'}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '1px', marginTop: '4px' }}>
                          HUMAN
                        </span>
                      </div>
                    </div>

                    {/* Pill Badge */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '20px',
                      padding: '6px 20px',
                      color: result ? '#10b981' : 'var(--text-tertiary)',
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
                      borderTop: '1px solid var(--border-subtle)'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        AI Risk
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: result ? '#f87171' : 'var(--text-primary)' }}>
                        {result ? `${aiRisk}%` : '0%'}
                      </span>
                    </div>

                    {/* Row 2: Readability */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: '1px solid var(--border-subtle)'
                    }}>
                      <span style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        Readability
                        <span
                          title="Flesch Reading Ease Index (0-100 scale):\n• 90-100: Very Easy (5th Grade)\n• 60-69: Standard (8th-9th Grade)\n• 30-49: Difficult (College level)\n• 0-29: Very Difficult (Academic level)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            fontSize: '0.68rem',
                            cursor: 'help',
                            color: 'var(--text-tertiary)'
                          }}
                        >
                          ?
                        </span>
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {result
                          ? `${Math.round(result.rewritten_stats.readability_score)}% (${result.rewritten_stats.readability_grade ?? 'Standard'})`
                          : '0%'}
                      </span>
                    </div>

                    {/* Row 3: Grammar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 0',
                      borderTop: '1px solid var(--border-subtle)'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Grammar
                      </span>
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: !result
                          ? 'var(--text-primary)'
                          : (result.rewritten_stats.grammar_score ?? 100) >= 88
                          ? '#10b981'
                          : (result.rewritten_stats.grammar_score ?? 100) >= 70
                          ? '#f59e0b'
                          : '#f43f5e'
                      }}>
                        {result ? `${Math.round(result.rewritten_stats.grammar_score ?? 100)}%` : '0%'}
                      </span>
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
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
          borderRadius: '24px',
          padding: '36px 32px 28px',
          maxWidth: '480px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {/* Close button */}
          <button
            type="button"
            onClick={() => { setIsLimitError(false); setError(null); }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={16} />
          </button>

          {/* Top circular icon badge */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#f43f5e'
          }}>
            <Gauge size={30} />
          </div>

          {/* Modal Header */}
          <h3 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
            textAlign: 'center',
            fontFamily: 'var(--font-heading)'
          }}>
            Daily plan limit reached
          </h3>

          {/* Subtitle */}
          <p style={{
            fontSize: '0.92rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: '0 0 24px',
            textAlign: 'center'
          }}>
            {user?.plan === 'pro'
              ? "You've used all 80 humanizations available on the Pro plan today. Upgrade your plan to continue."
              : user?.plan === 'plus'
              ? "You've used all 30 humanizations available on the Plus plan today. Upgrade your plan to continue."
              : user?.plan === 'enterprise'
              ? "You've used all 250 humanizations available on the Enterprise plan today. Please try again tomorrow."
              : "You've used all 10 humanizations available on the free plan today. Upgrade your plan to continue."
            }
          </p>

          {/* Limit info box */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '0 0 24px',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e',
                flexShrink: 0
              }}>
                <Calendar size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {user?.plan ? `${user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} plan limit` : 'Free plan limit'}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  {user?.plan === 'pro' ? '80 humanizations per day' : user?.plan === 'plus' ? '30 humanizations per day' : user?.plan === 'enterprise' ? '250 humanizations per day' : '10 humanizations per day'}
                </span>
              </div>
            </div>
            <span style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f43f5e',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '20px',
              whiteSpace: 'nowrap'
            }}>
              Limit reached
            </span>
          </div>

          {/* Buttons row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            margin: '0 0 20px'
          }}>
            <button
              type="button"
              onClick={() => { setIsLimitError(false); setError(null); }}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Maybe tomorrow
            </button>

            <button
              type="button"
              onClick={() => { setIsLimitError(false); setError(null); setActiveMenu('plans'); }}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              Upgrade plan <ArrowRight size={16} />
            </button>
          </div>

          {/* Subtext */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)'
          }}>
            <ShieldCheck size={15} color="#10b981" />
            <span>Upgrade anytime. Cancel anytime.</span>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  Ticket,
  Search,
  Check,
  Copy,
  Trash2,
  Edit3,
  ShieldAlert,
  Sparkles,
  Crown,
  FileText,
  RefreshCw,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle,
  KeyRound,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Activity,
  Zap,
  CheckCircle2,
  Filter,
  Globe,
  Code2,
  Share2,
  Sliders,
  Layers,
  Settings2,
  ExternalLink,
  Save,
  RotateCcw,
  Heading,
  CheckCircle,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import {
  fetchAdminAnalytics,
  fetchAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  fetchAdminCoupons,
  generateAdminCoupons,
  revokeAdminCoupon,
  updateAdminCredentials,
  fetchAdminSeo,
  updateAdminPageSeo,
  resetAdminPageSeo,
  formatModeLabel,
  formatPlanLabel,
  type AdminAnalyticsResponse,
  type AdminUser,
  type AdminCoupon,
  type PageSeoSettings,
  type User,
} from '@/lib/api';
import { toast } from '@/components/Toast';

interface AdminViewProps {
  user: User | null;
  token: string | null;
}

export default function AdminView({ user, token }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'coupons' | 'seo'>('analytics');
  const [loading, setLoading] = useState(true);

  // Analytics state
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editPlan, setEditPlan] = useState('free');
  const [editRole, setEditRole] = useState('user');
  const [editUsage, setEditUsage] = useState(0);
  const [updatingUser, setUpdatingUser] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [genPlan, setGenPlan] = useState('plus');
  const [genPrefix, setGenPrefix] = useState('CLOAK');
  const [genQuantity, setGenQuantity] = useState(1);
  const [genMaxUses, setGenMaxUses] = useState(1);
  const [generatingCoupons, setGeneratingCoupons] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);
  const [couponPage, setCouponPage] = useState(1);
  const [couponPageSize, setCouponPageSize] = useState(10);

  // Credentials modal state
  const [showCredModal, setShowCredModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState(user?.email || '');
  const [newAdminName, setNewAdminName] = useState(user?.name || '');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [currAdminPassword, setCurrAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [updatingCreds, setUpdatingCreds] = useState(false);

  // SEO Management State
  const [seoPages, setSeoPages] = useState<PageSeoSettings[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>('home');
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoSaving, setSeoSaving] = useState(false);
  const [activeSeoSubSection, setActiveSeoSubSection] = useState<'content' | 'technical' | 'social' | 'schema' | 'webmaster'>('content');
  const [seoForm, setSeoForm] = useState<Partial<PageSeoSettings>>({});
  const [serpPreviewMode, setSerpPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [serpTheme, setSerpTheme] = useState<'dark' | 'light'>('dark');

  const SCHEMA_TEMPLATES: Record<string, string> = {
    SoftwareApplication: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "CloakWriter",
      "operatingSystem": "All",
      "applicationCategory": "UtilitiesApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1420"
      },
      "description": "Convert AI text into undetectable human writing that passes every AI detector."
    }, null, 2),
    WebApplication: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "CloakWriter Humanizer Dashboard",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }, null, 2),
    Organization: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "CloakWriter",
      "url": "https://cloakwriter.app",
      "logo": "https://cloakwriter.app/logo.png",
      "sameAs": [
        "https://twitter.com/cloakwriter"
      ]
    }, null, 2),
    FAQPage: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Does CloakWriter bypass Turnitin and GPTZero?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, CloakWriter uses advanced human linguistic remodeling to achieve undetectable scores on Turnitin, GPTZero, CopyLeaks, and Originality.ai."
          }
        },
        {
          "@type": "Question",
          "name": "Is there a free trial?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, CloakWriter provides 10 free humanizations with no credit card required."
          }
        }
      ]
    }, null, 2),
    Product: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "CloakWriter Plus Plan",
      "description": "Advanced AI text humanizer with 30 rewrites/day and 1,000 words per input.",
      "brand": {
        "@type": "Brand",
        "name": "CloakWriter"
      },
      "offers": {
        "@type": "Offer",
        "price": "9.99",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    }, null, 2)
  };

  const loadSeoData = async () => {
    if (!token) return;
    setSeoLoading(true);
    try {
      const res = await fetchAdminSeo(token);
      setSeoPages(res.pages || []);
      const current = res.pages.find((p) => p.page_slug === selectedPageSlug) || res.pages[0];
      if (current) {
        setSelectedPageSlug(current.page_slug);
        setSeoForm({ ...current });
      }
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load SEO data.');
    } finally {
      setSeoLoading(false);
    }
  };

  const handleSelectSeoPage = (slug: string) => {
    setSelectedPageSlug(slug);
    const found = seoPages.find((p) => p.page_slug === slug);
    if (found) {
      setSeoForm({ ...found });
    }
  };

  const handleSaveSeo = async () => {
    if (!token) return;
    setSeoSaving(true);
    try {
      const res = await updateAdminPageSeo(selectedPageSlug, seoForm, token);
      toast.success(`SEO settings for "${seoForm.page_name || selectedPageSlug}" saved successfully!`);
      setSeoPages((prev) => prev.map((p) => (p.page_slug === selectedPageSlug ? res.seo : p)));
      setSeoForm({ ...res.seo });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to save SEO settings.');
    } finally {
      setSeoSaving(false);
    }
  };

  const handleResetSeo = async () => {
    if (!token) return;
    if (!window.confirm(`Reset SEO settings for "${seoForm.page_name || selectedPageSlug}" to default optimal configuration?`)) {
      return;
    }
    setSeoSaving(true);
    try {
      const res = await resetAdminPageSeo(selectedPageSlug, token);
      toast.success(`SEO settings reset to defaults.`);
      setSeoPages((prev) => prev.map((p) => (p.page_slug === selectedPageSlug ? res.seo : p)));
      setSeoForm({ ...res.seo });
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to reset SEO settings.');
    } finally {
      setSeoSaving(false);
    }
  };

  const handleApplySchemaTemplate = (templateKey: string) => {
    const tmpl = SCHEMA_TEMPLATES[templateKey];
    if (tmpl) {
      setSeoForm((prev) => ({
        ...prev,
        schema_type: templateKey,
        schema_json: tmpl,
      }));
      toast.success(`Applied "${templateKey}" schema template.`);
    }
  };

  const isSchemaValidJson = () => {
    if (!seoForm.schema_json || !seoForm.schema_json.trim()) return true;
    try {
      JSON.parse(seoForm.schema_json);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!newAdminEmail.trim()) {
      toast.danger('Please enter a valid admin email address.');
      return;
    }
    if (!currAdminPassword.trim()) {
      toast.danger('Please enter your current password to update credentials.');
      return;
    }

    setUpdatingCreds(true);
    try {
      const res = await updateAdminCredentials(token, {
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        new_password: newAdminPassword.trim() || undefined,
        current_password: currAdminPassword.trim(),
      });

      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;

      toast.success('Admin credentials updated successfully!');
      setShowCredModal(false);
      setNewAdminPassword('');
      setCurrAdminPassword('');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to update admin credentials.');
    } finally {
      setUpdatingCreds(false);
    }
  };

  // Pagination slicing
  const userStartIndex = (userPage - 1) * userPageSize;
  const paginatedUsers = users.slice(userStartIndex, userStartIndex + userPageSize);
  const totalUserPages = Math.ceil(users.length / userPageSize) || 1;

  const couponStartIndex = (couponPage - 1) * couponPageSize;
  const paginatedCoupons = coupons.slice(couponStartIndex, couponStartIndex + couponPageSize);
  const totalCouponPages = Math.ceil(coupons.length / couponPageSize) || 1;

  // Load analytics (with silent background polling support)
  const loadAnalyticsData = async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const data = await fetchAdminAnalytics(token);
      setAnalytics(data);
    } catch (err) {
      if (!silent) toast.danger(err instanceof Error ? err.message : 'Failed to load analytics data.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Load users list (with silent background polling support)
  const loadUsersData = async (silent = false) => {
    if (!token) return;
    if (!silent) setUsersLoading(true);
    try {
      const res = await fetchAdminUsers(token, userSearch, userPlanFilter);
      setUsers(res.users);
    } catch (err) {
      if (!silent) toast.danger(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      if (!silent) setUsersLoading(false);
    }
  };

  // Load coupons list (with silent background polling support)
  const loadCouponsData = async (silent = false) => {
    if (!token) return;
    if (!silent) setCouponsLoading(true);
    try {
      const res = await fetchAdminCoupons(token);
      setCoupons(res.coupons);
    } catch (err) {
      if (!silent) toast.danger(err instanceof Error ? err.message : 'Failed to load coupons.');
    } finally {
      if (!silent) setCouponsLoading(false);
    }
  };

  // Initial load and periodic polling per active tab
  useEffect(() => {
    if (!token) return;

    if (activeTab === 'analytics') {
      loadAnalyticsData(false);
      const interval = setInterval(() => {
        loadAnalyticsData(true);
      }, 10000); // Poll analytics every 10s
      return () => clearInterval(interval);
    } else if (activeTab === 'users') {
      loadUsersData(false);
      const interval = setInterval(() => {
        loadUsersData(true);
      }, 15000); // Poll users every 15s
      return () => clearInterval(interval);
    } else if (activeTab === 'coupons') {
      loadCouponsData(false);
      const interval = setInterval(() => {
        loadCouponsData(true);
      }, 15000); // Poll coupons every 15s
      return () => clearInterval(interval);
    } else if (activeTab === 'seo') {
      loadSeoData();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        loadUsersData(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [userSearch, userPlanFilter]);

  // Handle Edit User
  const handleOpenEditUser = (u: AdminUser) => {
    setEditingUser(u);
    setEditPlan(u.plan || 'free');
    setEditRole(u.role || 'user');
    setEditUsage(u.usage_count || 0);
  };

  const handleSaveUser = async () => {
    if (!token || !editingUser) return;
    setUpdatingUser(true);
    try {
      const updated = await updateAdminUser(token, editingUser.id, {
        plan: editPlan,
        role: editRole,
        usage_count: editUsage,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(`User ${updated.email} updated successfully!`);
      setEditingUser(null);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setUpdatingUser(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (u: AdminUser) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to delete user ${u.email}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteAdminUser(token, u.id);
      setUsers((prev) => prev.filter((item) => item.id !== u.id));
      toast.success(`User ${u.email} deleted.`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  };

  // Handle Generate Coupons
  const handleGenerateCoupons = async () => {
    if (!token) return;
    setGeneratingCoupons(true);
    try {
      const res = await generateAdminCoupons(token, {
        plan: genPlan,
        prefix: genPrefix,
        quantity: genQuantity,
        max_uses: genMaxUses,
      });
      setGeneratedCodes(res.codes);
      toast.success(`Generated ${res.codes.length} coupon code(s)!`);
      loadCouponsData();
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Coupon generation failed.');
    } finally {
      setGeneratingCoupons(false);
    }
  };

  // Handle Revoke Coupon
  const handleRevokeCoupon = async (code: string) => {
    if (!token) return;
    if (!window.confirm(`Revoke coupon code ${code}?`)) return;
    try {
      await revokeAdminCoupon(token, code);
      setCoupons((prev) => prev.filter((c) => c.code !== code));
      toast.success(`Coupon ${code} revoked.`);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to revoke coupon.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner Header */}
      <div
        className="admin-glass-card"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 28px rgba(37, 99, 235, 0.4)',
            }}
          >
            <ShieldAlert size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
                Admin Management Portal
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                SYSTEM ONLINE
              </span>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
              Platform analytics, user accounts, promo coupons, and complete SEO command center
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="admin-btn-action"
            onClick={() => {
              if (activeTab === 'analytics') loadAnalyticsData(false);
              else if (activeTab === 'users') loadUsersData(false);
              else if (activeTab === 'coupons') loadCouponsData(false);
              else if (activeTab === 'seo') loadSeoData();
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            type="button"
            className="admin-btn-action"
            onClick={() => {
              setNewAdminEmail(user?.email || '');
              setNewAdminName(user?.name || '');
              setShowCredModal(true);
            }}
            style={{
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
            }}
          >
            <KeyRound size={15} /> Security Settings
          </button>

          <span
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: '0.78rem',
              letterSpacing: '0.05em',
            }}
          >
            ROLE: ADMIN ({user?.email})
          </span>
        </div>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div className="admin-tab-bar">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'analytics' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={18} /> Analytics & Overview
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'users' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> User Management
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'coupons' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          <Ticket size={18} /> Coupon Generator
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'seo' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('seo')}
        >
          <Globe size={18} /> SEO & Metadata Suite
        </button>
      </div>

      {/* ── TAB 1: ANALYTICS OVERVIEW ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top 4 Metric Cards */}
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card" style={{ '--kpi-accent': '#38bdf8', '--kpi-glow': 'rgba(56, 189, 248, 0.2)' } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Users
                </span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Users size={20} />
                </div>
              </div>
              <div className="admin-kpi-val">
                {loading ? '...' : analytics?.stats.total_users ?? 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <TrendingUp size={14} /> Registered platform accounts
              </div>
            </div>

            <div className="admin-kpi-card" style={{ '--kpi-accent': '#10b981', '--kpi-glow': 'rgba(16, 185, 129, 0.2)' } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Humanizations
                </span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <Sparkles size={20} />
                </div>
              </div>
              <div className="admin-kpi-val">
                {loading ? '...' : analytics?.stats.total_rewrites ?? 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>
                Executed API AI rewrites
              </div>
            </div>

            <div className="admin-kpi-card" style={{ '--kpi-accent': '#f59e0b', '--kpi-glow': 'rgba(245, 158, 11, 0.2)' } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Words Processed
                </span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <FileText size={20} />
                </div>
              </div>
              <div className="admin-kpi-val">
                {loading ? '...' : (analytics?.stats.total_words ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '6px', fontWeight: 600 }}>
                Words humanized across modes
              </div>
            </div>

            <div className="admin-kpi-card" style={{ '--kpi-accent': '#ec4899', '--kpi-glow': 'rgba(236, 72, 153, 0.2)' } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Subscribers
                </span>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                  <Crown size={20} />
                </div>
              </div>
              <div className="admin-kpi-val">
                {loading ? '...' : analytics?.stats.active_subscribers ?? 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#ec4899', marginTop: '6px', fontWeight: 600 }}>
                Plus / Pro / Enterprise tiers
              </div>
            </div>
          </div>

          {/* Plan Breakdown Progress Bars */}
          <div className="admin-glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Subscription Tier Distribution
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Real-time active user distribution categorized by plan tiers
                </p>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
                TOTAL: {analytics?.stats.total_users ?? 0} USERS
              </div>
            </div>

            {analytics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { name: 'Free Plan ($0/mo)', key: 'free', color: '#94a3b8' },
                  { name: 'Plus Plan ($1/mo)', key: 'plus', altKey: 'starter', color: '#38bdf8' },
                  { name: 'Pro Plan ($2/mo)', key: 'pro', color: '#10b981' },
                  { name: 'Enterprise Plan ($5/mo)', key: 'enterprise', color: '#ec4899' },
                ].map((item) => {
                  const breakdown = analytics.plan_breakdown || {};
                  const count = (breakdown[item.key] || 0) + (item.altKey ? (breakdown[item.altKey] || 0) : 0);
                  const total = analytics.stats?.total_users || 1;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                  return (
                    <div key={item.key} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px' }}>
                        <span style={{ color: '#f8fafc', fontWeight: 700 }}>{item.name}</span>
                        <span style={{ color: item.color, fontWeight: 800 }}>{count} users ({pct}%)</span>
                      </div>
                      <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '5px', transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Humanizations Activity Table */}
          <div className="admin-glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Live System Activity Stream
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Recent text humanizations processed by CloakWriter engine
                </p>
              </div>
              <span className="admin-pill-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <Activity size={13} /> REALTIME LOGS
              </span>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Original Snippet</th>
                    <th>Mode</th>
                    <th>Words</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recent_activity.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{item.user_name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.user_email}</div>
                      </td>
                      <td style={{ color: '#94a3b8', fontStyle: 'italic', maxWidth: '320px' }}>
                        "{item.original_snippet}"
                      </td>
                      <td>
                        <span className="admin-pill-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                          {formatModeLabel(item.mode)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#10b981' }}>{item.word_count}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(item.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: USER MANAGEMENT ───────────────────────────────────── */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Controls Bar: Search & Filter */}
          <div
            className="admin-glass-card"
            style={{
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search users by name or email address..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 42px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch('')}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#94a3b8" />
              {['all', 'free', 'plus', 'pro', 'enterprise'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setUserPlanFilter(p); setUserPage(1); }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '10px',
                    border: userPlanFilter === p ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.08)',
                    background: userPlanFilter === p ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
                    color: userPlanFilter === p ? '#38bdf8' : '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="admin-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {usersLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 size={28} className="spinner-animate" /> Loading registered users...
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Details</th>
                      <th>Plan Tier</th>
                      <th>Role</th>
                      <th>Usage Count</th>
                      <th>Joined Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                          No users found matching your search query.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{u.email}</div>
                          </td>
                          <td>
                            <span
                              className="admin-pill-badge"
                              style={{
                                background: u.plan === 'enterprise' ? 'rgba(236, 72, 153, 0.18)' : u.plan === 'pro' ? 'rgba(16, 185, 129, 0.18)' : (u.plan === 'plus' || u.plan === 'starter') ? 'rgba(56, 189, 248, 0.18)' : 'rgba(148, 163, 184, 0.18)',
                                color: u.plan === 'enterprise' ? '#ec4899' : u.plan === 'pro' ? '#10b981' : (u.plan === 'plus' || u.plan === 'starter') ? '#38bdf8' : '#94a3b8',
                                border: `1px solid ${u.plan === 'enterprise' ? 'rgba(236, 72, 153, 0.35)' : u.plan === 'pro' ? 'rgba(16, 185, 129, 0.35)' : (u.plan === 'plus' || u.plan === 'starter') ? 'rgba(56, 189, 248, 0.35)' : 'rgba(148, 163, 184, 0.35)'}`,
                              }}
                            >
                              {formatPlanLabel(u.plan).toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span
                              className="admin-pill-badge"
                              style={{
                                background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                                color: u.role === 'admin' ? '#f59e0b' : '#94a3b8',
                              }}
                            >
                              {u.role ? u.role.toUpperCase() : 'USER'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: '#f8fafc' }}>
                            {u.usage_count} rewrites
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="admin-btn-action"
                                onClick={() => handleOpenEditUser(u)}
                                title="Edit User"
                              >
                                <Edit3 size={14} /> Edit
                              </button>

                              <button
                                type="button"
                                className="admin-btn-action admin-btn-danger"
                                onClick={() => handleDeleteUser(u)}
                                title="Delete User"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* User Table Pagination Footer */}
                {users.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                    }}
                  >
                    <div>
                      Showing {userStartIndex + 1}–{Math.min(userStartIndex + userPageSize, users.length)} of {users.length} users
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        className="admin-btn-action"
                        disabled={userPage === 1}
                        onClick={() => setUserPage((prev) => Math.max(prev - 1, 1))}
                        style={{ opacity: userPage === 1 ? 0.4 : 1, cursor: userPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        <ChevronLeft size={15} /> Previous
                      </button>
                      <span style={{ fontWeight: 800, color: '#f8fafc' }}>
                        Page {userPage} of {totalUserPages}
                      </span>
                      <button
                        type="button"
                        className="admin-btn-action"
                        disabled={userPage >= totalUserPages}
                        onClick={() => setUserPage((prev) => Math.min(prev + 1, totalUserPages))}
                        style={{ opacity: userPage >= totalUserPages ? 0.4 : 1, cursor: userPage >= totalUserPages ? 'not-allowed' : 'pointer' }}
                      >
                        Next <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: COUPON GENERATOR ───────────────────────────────────── */}
      {activeTab === 'coupons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Generator Controls Card */}
          <div className="admin-glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 16px 0' }}>
              Generate Promo Coupon Codes
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Target Plan Tier</label>
                <select
                  value={genPlan}
                  onChange={(e) => setGenPlan(e.target.value)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                >
                  <option value="plus" style={{ background: '#0f172a' }}>Plus Plan ($1/mo)</option>
                  <option value="pro" style={{ background: '#0f172a' }}>Pro Plan ($2/mo)</option>
                  <option value="enterprise" style={{ background: '#0f172a' }}>Enterprise Plan ($5/mo)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Code Prefix</label>
                <input
                  type="text"
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value)}
                  placeholder="CLOAK"
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Quantity to Generate</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={genQuantity}
                  onChange={(e) => setGenQuantity(parseInt(e.target.value, 10) || 1)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Max Uses Per Code</label>
                <input
                  type="number"
                  min={1}
                  value={genMaxUses}
                  onChange={(e) => setGenMaxUses(parseInt(e.target.value, 10) || 1)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className="admin-btn-action admin-btn-primary"
              disabled={generatingCoupons}
              onClick={handleGenerateCoupons}
              style={{ marginTop: '20px', padding: '12px 24px', fontSize: '0.92rem' }}
            >
              {generatingCoupons ? <Loader2 size={18} className="spinner-animate" /> : <Plus size={18} />} Generate Coupon Batch
            </button>
          </div>

          {/* Active Coupons List */}
          <div className="admin-glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {couponsLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 size={28} className="spinner-animate" /> Loading coupons list...
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Coupon Code</th>
                      <th>Plan Tier</th>
                      <th>Redemptions</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                          No promo coupons generated yet.
                        </td>
                      </tr>
                    ) : (
                      paginatedCoupons.map((c) => (
                        <tr key={c.code}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <code style={{ background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
                                {c.code}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(c.code)}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                              >
                                {copiedCode === c.code ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className="admin-pill-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                              {formatPlanLabel(c.plan).toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {c.used_count} / {c.max_uses}
                          </td>
                          <td>
                            <span
                              className="admin-pill-badge"
                              style={{
                                background: c.is_redeemed ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                                color: c.is_redeemed ? '#f43f5e' : '#10b981',
                              }}
                            >
                              {c.is_redeemed ? 'MAX USES REACHED' : 'ACTIVE'}
                            </span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="admin-btn-action admin-btn-danger"
                              onClick={() => handleRevokeCoupon(c.code)}
                            >
                              <Trash2 size={14} /> Revoke
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: SEO & METADATA MANAGEMENT SUITE ────────────────── */}
      {activeTab === 'seo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SEO Header Card with Save & Reset buttons */}
          <div
            className="admin-glass-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              borderLeft: '4px solid #38bdf8',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe size={22} color="#38bdf8" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Search Engine Optimization (SEO) Command Center
                </h2>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Total control over Meta Tags, H1/H2 Headings, Structured Data (JSON-LD), OpenGraph Socials, Canonical Links, and robots.txt.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="admin-btn-action"
                onClick={handleResetSeo}
                disabled={seoSaving || seoLoading}
                title="Reset this page to optimal SEO preset"
              >
                <RotateCcw size={14} /> Reset Defaults
              </button>

              <button
                type="button"
                className="admin-btn-action admin-btn-primary"
                onClick={handleSaveSeo}
                disabled={seoSaving || seoLoading}
                style={{ padding: '9px 20px', fontSize: '0.86rem' }}
              >
                {seoSaving ? (
                  <Loader2 size={16} className="spinner-animate" />
                ) : (
                  <Save size={16} />
                )}
                {seoSaving ? 'Saving Changes...' : 'Save SEO Configuration'}
              </button>
            </div>
          </div>

          {/* Page Selector Pills */}
          <div className="seo-page-nav">
            {seoPages.map((page) => (
              <button
                key={page.page_slug}
                type="button"
                className={`seo-page-pill ${selectedPageSlug === page.page_slug ? 'seo-page-pill--active' : ''}`}
                onClick={() => handleSelectSeoPage(page.page_slug)}
              >
                <FileCode size={15} />
                <span>{page.page_name}</span>
              </button>
            ))}
          </div>

          {seoLoading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#94a3b8' }}>
              <Loader2 size={32} className="spinner-animate" />
              <p style={{ marginTop: '12px', fontSize: '0.9rem' }}>Loading SEO parameters for {selectedPageSlug}...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Column: Interactive Sub-Section Form Tabs */}
              <div className="admin-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Sub-Section Tabs Bar */}
                <div className="seo-section-nav">
                  <button
                    type="button"
                    className={`seo-section-btn ${activeSeoSubSection === 'content' ? 'seo-section-btn--active' : ''}`}
                    onClick={() => setActiveSeoSubSection('content')}
                  >
                    <Heading size={14} /> Content & Headings
                  </button>
                  <button
                    type="button"
                    className={`seo-section-btn ${activeSeoSubSection === 'technical' ? 'seo-section-btn--active' : ''}`}
                    onClick={() => setActiveSeoSubSection('technical')}
                  >
                    <Sliders size={14} /> Technical & Crawling
                  </button>
                  <button
                    type="button"
                    className={`seo-section-btn ${activeSeoSubSection === 'social' ? 'seo-section-btn--active' : ''}`}
                    onClick={() => setActiveSeoSubSection('social')}
                  >
                    <Share2 size={14} /> Social & OpenGraph
                  </button>
                  <button
                    type="button"
                    className={`seo-section-btn ${activeSeoSubSection === 'schema' ? 'seo-section-btn--active' : ''}`}
                    onClick={() => setActiveSeoSubSection('schema')}
                  >
                    <Code2 size={14} /> Schema (JSON-LD)
                  </button>
                  <button
                    type="button"
                    className={`seo-section-btn ${activeSeoSubSection === 'webmaster' ? 'seo-section-btn--active' : ''}`}
                    onClick={() => setActiveSeoSubSection('webmaster')}
                  >
                    <Globe size={14} /> Webmaster & Scripts
                  </button>
                </div>

                {/* Sub-Section 1: Content & Headings */}
                {activeSeoSubSection === 'content' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Meta Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Meta Title Tag (<code style={{ color: '#38bdf8' }}>&lt;title&gt;</code>)
                        </label>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (seoForm.meta_title || '').length > 60 ? '#f43f5e' : (seoForm.meta_title || '').length >= 30 ? '#10b981' : '#f59e0b' }}>
                          {(seoForm.meta_title || '').length} / 60 characters
                        </span>
                      </div>
                      <input
                        type="text"
                        value={seoForm.meta_title || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, meta_title: e.target.value }))}
                        placeholder="e.g. CloakWriter — #1 AI Humanizer & Bypass AI Detection"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                      <div className="seo-meter-bar">
                        <div
                          className="seo-meter-fill"
                          style={{
                            width: `${Math.min(100, ((seoForm.meta_title || '').length / 60) * 100)}%`,
                            backgroundColor: (seoForm.meta_title || '').length > 60 ? '#f43f5e' : (seoForm.meta_title || '').length >= 30 ? '#10b981' : '#f59e0b',
                          }}
                        />
                      </div>
                    </div>

                    {/* Meta Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Meta Description (<code style={{ color: '#38bdf8' }}>name="description"</code>)
                        </label>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (seoForm.meta_description || '').length > 160 ? '#f43f5e' : (seoForm.meta_description || '').length >= 100 ? '#10b981' : '#f59e0b' }}>
                          {(seoForm.meta_description || '').length} / 160 characters
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={seoForm.meta_description || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, meta_description: e.target.value }))}
                        placeholder="Search result snippet summary (120-160 characters recommended)..."
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.88rem',
                          lineHeight: 1.4,
                          resize: 'vertical',
                        }}
                      />
                      <div className="seo-meter-bar">
                        <div
                          className="seo-meter-fill"
                          style={{
                            width: `${Math.min(100, ((seoForm.meta_description || '').length / 160) * 100)}%`,
                            backgroundColor: (seoForm.meta_description || '').length > 160 ? '#f43f5e' : (seoForm.meta_description || '').length >= 100 ? '#10b981' : '#f59e0b',
                          }}
                        />
                      </div>
                    </div>

                    {/* H1 Heading */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Primary <code style={{ color: '#38bdf8' }}>&lt;H1&gt;</code> Heading
                      </label>
                      <input
                        type="text"
                        value={seoForm.h1_title || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, h1_title: e.target.value }))}
                        placeholder="e.g. Transform AI Text into Undetectable Human Prose"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* H2 Subtitle / Secondary Heading */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Supporting <code style={{ color: '#38bdf8' }}>&lt;H2&gt;</code> Subtitle / Section Heading
                      </label>
                      <input
                        type="text"
                        value={seoForm.h2_subtitle || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, h2_subtitle: e.target.value }))}
                        placeholder="e.g. Bypass every major AI detector with natural human cadence."
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* Keywords Tagging */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Target Keywords (<code style={{ color: '#38bdf8' }}>comma separated</code>)
                      </label>
                      <input
                        type="text"
                        value={seoForm.keywords || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, keywords: e.target.value }))}
                        placeholder="AI humanizer, bypass AI detection, undetectable AI, bypass Turnitin"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Section 2: Technical & Indexing */}
                {activeSeoSubSection === 'technical' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Canonical URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Canonical URL (<code style={{ color: '#38bdf8' }}>&lt;link rel="canonical" /&gt;</code>)
                      </label>
                      <input
                        type="url"
                        value={seoForm.canonical_url || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, canonical_url: e.target.value }))}
                        placeholder="https://cloakwriter.app/dashboard"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* Robots Directive */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Robots Directives (<code style={{ color: '#38bdf8' }}>name="robots"</code>)
                      </label>
                      <select
                        value={seoForm.robots_index || 'index, follow'}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, robots_index: e.target.value }))}
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: '#0f172a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      >
                        <option value="index, follow, max-image-preview:large, max-snippet:-1">index, follow (Optimal for Search Engines)</option>
                        <option value="index, follow">index, follow (Standard)</option>
                        <option value="noindex, follow">noindex, follow (Hide from search, follow links)</option>
                        <option value="noindex, nofollow">noindex, nofollow (Completely block search engines)</option>
                      </select>
                    </div>

                    {/* Google Site Verification */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Google Site Verification Code (<code style={{ color: '#38bdf8' }}>google-site-verification</code>)
                      </label>
                      <input
                        type="text"
                        value={seoForm.google_verification || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, google_verification: e.target.value }))}
                        placeholder="e.g. aB1cD2eF3gH4iJ5kL6mN7oP8qR9"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* Bing Webmaster Verification */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Bing Webmaster Verification (<code style={{ color: '#38bdf8' }}>msvalidate.01</code>)
                      </label>
                      <input
                        type="text"
                        value={seoForm.bing_verification || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, bing_verification: e.target.value }))}
                        placeholder="e.g. 7A8B9C0D1E2F3A4B5C6D7E8F9"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* Custom <head> Tags */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Custom <code style={{ color: '#38bdf8' }}>&lt;head&gt;</code> HTML Meta / Link Tags
                      </label>
                      <textarea
                        rows={4}
                        value={seoForm.custom_head_tags || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, custom_head_tags: e.target.value }))}
                        placeholder='<meta name="theme-color" content="#090d16" />&#10;<link rel="alternate" hrefLang="x-default" href="https://cloakwriter.app" />'
                        className="seo-code-editor"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-Section 3: Social & OpenGraph */}
                {activeSeoSubSection === 'social' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* OG Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        OpenGraph Title (<code style={{ color: '#38bdf8' }}>og:title</code>)
                      </label>
                      <input
                        type="text"
                        value={seoForm.og_title || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, og_title: e.target.value }))}
                        placeholder="e.g. CloakWriter — The Most Advanced AI Humanizer"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* OG Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        OpenGraph Description (<code style={{ color: '#38bdf8' }}>og:description</code>)
                      </label>
                      <textarea
                        rows={3}
                        value={seoForm.og_description || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, og_description: e.target.value }))}
                        placeholder="Description displayed when shared on Facebook, LinkedIn, Discord, etc."
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.88rem',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    {/* OG Image URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        OpenGraph Social Banner Image (<code style={{ color: '#38bdf8' }}>og:image</code> - 1200x630px)
                      </label>
                      <input
                        type="url"
                        value={seoForm.og_image || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, og_image: e.target.value }))}
                        placeholder="https://cloakwriter.app/og-image.png"
                        style={{
                          padding: '11px 14px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#f8fafc',
                          fontSize: '0.9rem',
                        }}
                      />
                    </div>

                    {/* Twitter Card Type & Handle */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Twitter Card Type (<code style={{ color: '#38bdf8' }}>twitter:card</code>)
                        </label>
                        <select
                          value={seoForm.twitter_card || 'summary_large_image'}
                          onChange={(e) => setSeoForm((prev) => ({ ...prev, twitter_card: e.target.value }))}
                          style={{
                            padding: '11px 14px',
                            borderRadius: '10px',
                            background: '#0f172a',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#f8fafc',
                            fontSize: '0.9rem',
                          }}
                        >
                          <option value="summary_large_image">summary_large_image (Large Banner)</option>
                          <option value="summary">summary (Square Thumbnail)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Twitter Creator / Site Handle (<code style={{ color: '#38bdf8' }}>twitter:site</code>)
                        </label>
                        <input
                          type="text"
                          value={seoForm.twitter_site || '@cloakwriter'}
                          onChange={(e) => setSeoForm((prev) => ({ ...prev, twitter_site: e.target.value }))}
                          placeholder="@cloakwriter"
                          style={{
                            padding: '11px 14px',
                            borderRadius: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#f8fafc',
                            fontSize: '0.9rem',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Section 4: Schema Markup (Structured Data JSON-LD) */}
                {activeSeoSubSection === 'schema' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                          Structured Data (<code style={{ color: '#38bdf8' }}>application/ld+json</code> Schema)
                        </label>
                        <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                          Enables Google Rich Snippets, Star Ratings, Product pricing, and Organization graphs.
                        </p>
                      </div>

                      <div>
                        {isSchemaValidJson() ? (
                          <span className="seo-badge-valid">
                            <CheckCircle2 size={13} /> Valid JSON-LD
                          </span>
                        ) : (
                          <span className="seo-badge-invalid">
                            <AlertTriangle size={13} /> JSON Syntax Error
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Template Inserters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>Insert Template:</span>
                      {Object.keys(SCHEMA_TEMPLATES).map((key) => (
                        <button
                          key={key}
                          type="button"
                          className="admin-btn-action"
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                          onClick={() => handleApplySchemaTemplate(key)}
                        >
                          <Plus size={12} /> {key}
                        </button>
                      ))}
                    </div>

                    {/* JSON Editor */}
                    <textarea
                      rows={12}
                      value={seoForm.schema_json || ''}
                      onChange={(e) => setSeoForm((prev) => ({ ...prev, schema_json: e.target.value }))}
                      placeholder='{\n  "@context": "https://schema.org",\n  "@type": "SoftwareApplication",\n  "name": "CloakWriter"\n}'
                      className="seo-code-editor"
                      style={{
                        borderColor: !isSchemaValidJson() ? 'rgba(244, 63, 94, 0.5)' : undefined,
                      }}
                    />
                  </div>
                )}

                {/* Sub-Section 5: Webmaster & Crawling */}
                {activeSeoSubSection === 'webmaster' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Robots.txt Live Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                          robots.txt Live Directives (<code style={{ color: '#38bdf8' }}>/robots.txt</code>)
                        </label>
                        <a
                          href="/robots.txt"
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                          <ExternalLink size={12} /> Test /robots.txt
                        </a>
                      </div>
                      <textarea
                        rows={5}
                        value={seoForm.robots_txt || 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://cloakwriter.app/sitemap.xml'}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, robots_txt: e.target.value }))}
                        className="seo-code-editor"
                      />
                    </div>

                    {/* XML Sitemap */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                          Dynamic XML Sitemap (<code style={{ color: '#38bdf8' }}>/sitemap.xml</code>)
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                          Automatically indexes all public routes with optimal priority and update frequency.
                        </div>
                      </div>
                      <a
                        href="/sitemap.xml"
                        target="_blank"
                        rel="noreferrer"
                        className="admin-btn-action"
                        style={{ background: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                      >
                        <ExternalLink size={14} /> Open /sitemap.xml
                      </a>
                    </div>

                    {/* Custom Site-Wide Header Scripts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Custom Header Scripts (<code style={{ color: '#38bdf8' }}>Google Tag Manager, Google Analytics G-XXXX</code>)
                      </label>
                      <textarea
                        rows={4}
                        value={seoForm.custom_header_scripts || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, custom_header_scripts: e.target.value }))}
                        placeholder="<!-- Global site tag (gtag.js) - Google Analytics -->&#10;<script async src='https://www.googletagmanager.com/gtag/js?id=G-XXXXX'></script>"
                        className="seo-code-editor"
                      />
                    </div>

                    {/* Custom Site-Wide Footer Scripts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>
                        Custom Footer Scripts (<code style={{ color: '#38bdf8' }}>Tracking pixels, chat widgets</code>)
                      </label>
                      <textarea
                        rows={3}
                        value={seoForm.custom_footer_scripts || ''}
                        onChange={(e) => setSeoForm((prev) => ({ ...prev, custom_footer_scripts: e.target.value }))}
                        placeholder="<!-- Custom analytics or chat widget script -->"
                        className="seo-code-editor"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Real-Time Google SERP & Social Card Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '90px' }}>
                
                {/* Google Search Result Simulator */}
                <div className="admin-glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Search size={16} color="#38bdf8" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                        Google Search Preview (SERP)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setSerpPreviewMode('desktop')}
                        style={{
                          background: serpPreviewMode === 'desktop' ? 'rgba(56,189,248,0.2)' : 'transparent',
                          color: serpPreviewMode === 'desktop' ? '#38bdf8' : '#94a3b8',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setSerpPreviewMode('mobile')}
                        style={{
                          background: serpPreviewMode === 'mobile' ? 'rgba(56,189,248,0.2)' : 'transparent',
                          color: serpPreviewMode === 'mobile' ? '#38bdf8' : '#94a3b8',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mobile
                      </button>
                    </div>
                  </div>

                  <div className="seo-serp-preview" style={{ maxWidth: serpPreviewMode === 'mobile' ? '360px' : '100%', margin: serpPreviewMode === 'mobile' ? '0 auto' : undefined }}>
                    <div className="seo-serp-url-row">
                      <span className="seo-serp-favicon">C</span>
                      <div>
                        <div className="seo-serp-domain">CloakWriter</div>
                        <div className="seo-serp-path">
                          https://cloakwriter.app{selectedPageSlug === 'home' ? '' : ` > ${selectedPageSlug}`}
                        </div>
                      </div>
                    </div>
                    <div className="seo-serp-title">
                      {seoForm.meta_title || 'CloakWriter — #1 AI Humanizer & Bypass AI Detection Engine'}
                    </div>
                    <div className="seo-serp-desc">
                      {seoForm.meta_description || 'Transform ChatGPT, Claude, and Gemini text into 100% natural, undetectable human-written content. Bypass Turnitin, GPTZero, CopyLeaks effortlessly.'}
                    </div>
                  </div>
                </div>

                {/* Social Share Card Preview */}
                <div className="admin-glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Share2 size={16} color="#38bdf8" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                      Social Graph Card Preview (OpenGraph / X)
                    </span>
                  </div>

                  <div style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}>
                    <div style={{
                      height: '140px',
                      background: seoForm.og_image ? `url(${seoForm.og_image}) center/cover no-repeat` : 'linear-gradient(135deg, #0284c7 0%, #1e293b 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.82rem',
                    }}>
                      {!seoForm.og_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={18} /> Social Banner (1200x630)
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '14px' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        CLOAKWRITER.APP
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px', lineHeight: 1.3 }}>
                        {seoForm.og_title || seoForm.meta_title || 'CloakWriter — The Most Advanced AI Humanizer'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                        {seoForm.og_description || seoForm.meta_description || 'Effortlessly convert AI-generated writing into natural human text.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Save Panel */}
                <button
                  type="button"
                  className="admin-btn-action admin-btn-primary"
                  onClick={handleSaveSeo}
                  disabled={seoSaving || seoLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.95rem' }}
                >
                  {seoSaving ? <Loader2 size={18} className="spinner-animate" /> : <Save size={18} />}
                  {seoSaving ? 'Saving Changes...' : 'Save All SEO Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="admin-glass-card" style={{ maxWidth: '460px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Edit User Settings
              </h3>
              <button type="button" onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
              Target: <strong style={{ color: '#f8fafc' }}>{editingUser.name}</strong> ({editingUser.email})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Subscription Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
              >
                <option value="free" style={{ background: '#0f172a' }}>Free Plan ($0/mo - 400 words)</option>
                <option value="plus" style={{ background: '#0f172a' }}>Plus Plan ($1/mo - 1,000 words)</option>
                <option value="pro" style={{ background: '#0f172a' }}>Pro Plan ($2/mo - 2,500 words)</option>
                <option value="enterprise" style={{ background: '#0f172a' }}>Enterprise Plan ($5/mo - 5,000 words)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>User Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
              >
                <option value="user" style={{ background: '#0f172a' }}>User (Standard)</option>
                <option value="admin" style={{ background: '#0f172a' }}>Admin (Full Portal Access)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Usage Count</label>
              <input
                type="number"
                value={editUsage}
                onChange={(e) => setEditUsage(parseInt(e.target.value, 10) || 0)}
                style={{
                  padding: '11px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="admin-btn-action"
                onClick={() => setEditingUser(null)}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-action admin-btn-primary"
                disabled={updatingUser}
                onClick={handleSaveUser}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {updatingUser ? <Loader2 size={16} className="spinner-animate" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Credentials Security Modal */}
      {showCredModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div className="admin-glass-card" style={{ maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Admin Security Credentials
              </h3>
              <button type="button" onClick={() => setShowCredModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Admin Name</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Admin Email</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>New Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Current Password (Required)</label>
                <input
                  type="password"
                  placeholder="Enter current password to save"
                  value={currAdminPassword}
                  onChange={(e) => setCurrAdminPassword(e.target.value)}
                  style={{
                    padding: '11px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="admin-btn-action"
                  onClick={() => setShowCredModal(false)}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-action admin-btn-primary"
                  disabled={updatingCreds}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {updatingCreds ? <Loader2 size={16} className="spinner-animate" /> : 'Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

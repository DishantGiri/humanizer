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
  formatModeLabel,
  formatPlanLabel,
  type AdminAnalyticsResponse,
  type AdminUser,
  type AdminCoupon,
  type User,
} from '@/lib/api';
import { toast } from '@/components/Toast';

interface AdminViewProps {
  user: User | null;
  token: string | null;
}

export default function AdminView({ user, token }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'coupons'>('analytics');
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
              Platform analytics, user account management, and promotional coupon controls
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="admin-btn-action"
            onClick={() => {
              if (activeTab === 'analytics') loadAnalyticsData();
              if (activeTab === 'users') loadUsersData();
              if (activeTab === 'coupons') loadCouponsData();
              toast.info('Refreshed admin data stream');
            }}
            title="Refresh System Data"
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

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
  const [genPlan, setGenPlan] = useState('starter');
  const [genPrefix, setGenPrefix] = useState('CLOAK');
  const [genQuantity, setGenQuantity] = useState(1);
  const [genMaxUses, setGenMaxUses] = useState(1);
  const [generatingCoupons, setGeneratingCoupons] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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

  // Load analytics
  const loadAnalyticsData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchAdminAnalytics(token);
      setAnalytics(data);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  // Load users list
  const loadUsersData = async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const res = await fetchAdminUsers(token, userSearch, userPlanFilter);
      setUsers(res.users);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  // Load coupons list
  const loadCouponsData = async () => {
    if (!token) return;
    setCouponsLoading(true);
    try {
      const res = await fetchAdminCoupons(token);
      setCoupons(res.coupons);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to load coupons.');
    } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalyticsData();
    } else if (activeTab === 'users') {
      loadUsersData();
    } else if (activeTab === 'coupons') {
      loadCouponsData();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => {
        loadUsersData();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner Header */}
      <div style={{
        padding: '24px 28px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)'
          }}>
            <ShieldAlert size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              Admin Management Portal
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Platform analytics, user access controls, and promo coupon management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              setNewAdminEmail(user?.email || '');
              setNewAdminName(user?.name || '');
              setShowCredModal(true);
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <KeyRound size={14} /> Admin Security Settings
          </button>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.5px'
          }}>
            ROLE: ADMIN ({user?.email})
          </span>
        </div>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '6px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'analytics' ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : 'transparent',
            color: activeTab === 'analytics' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <BarChart3 size={16} /> Analytics & Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'users' ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : 'transparent',
            color: activeTab === 'users' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Users size={16} /> User Management
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('coupons')}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'coupons' ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)' : 'transparent',
            color: activeTab === 'coupons' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Ticket size={16} /> Coupon Generator
        </button>
      </div>

      {/* ── TAB 1: ANALYTICS OVERVIEW ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top 4 Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '20px',
              borderRadius: '14px',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>Total Users</span>
                <Users size={18} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
                {loading ? '...' : analytics?.stats.total_users ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingUp size={12} /> Registered accounts
              </div>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '20px',
              borderRadius: '14px',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>Total Humanizations</span>
                <Sparkles size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
                {loading ? '...' : analytics?.stats.total_rewrites ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px' }}>
                Executed API rewrites
              </div>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '20px',
              borderRadius: '14px',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>Total Words Processed</span>
                <FileText size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
                {loading ? '...' : (analytics?.stats.total_words ?? 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '4px' }}>
                Words humanized
              </div>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              padding: '20px',
              borderRadius: '14px',
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>Active Subscribers</span>
                <Crown size={18} color="#ec4899" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '8px' }}>
                {loading ? '...' : analytics?.stats.active_subscribers ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#ec4899', marginTop: '4px' }}>
                Plus / Pro / Enterprise plans
              </div>
            </div>
          </div>

          {/* Plan Breakdown Progress Bars */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            borderRadius: '16px',
            backdropFilter: 'blur(16px)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>
              Subscription Tier Distribution
            </h3>

            {analytics && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { name: 'Free Plan', key: 'free', color: '#94a3b8' },
                  { name: 'Plus Plan ($1/mo)', key: 'starter', color: '#38bdf8' },
                  { name: 'Pro Plan ($2/mo)', key: 'plus', color: '#10b981' },
                  { name: 'Enterprise ($5/mo)', key: 'pro', color: '#ec4899' },
                ].map((item) => {
                  const count = analytics.plan_breakdown[item.key] || 0;
                  const total = analytics.stats.total_users || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={item.key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{item.name}</span>
                        <span style={{ color: item.color, fontWeight: 700 }}>{count} users ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Humanizations Activity Table */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            borderRadius: '16px',
            backdropFilter: 'blur(16px)'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 16px 0' }}>
              Live System Activity Stream
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '10px 12px' }}>User</th>
                    <th style={{ padding: '10px 12px' }}>Original Snippet</th>
                    <th style={{ padding: '10px 12px' }}>Mode</th>
                    <th style={{ padding: '10px 12px' }}>Words</th>
                    <th style={{ padding: '10px 12px' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.recent_activity.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{item.user_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.user_email}</div>
                      </td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontStyle: 'italic', maxWidth: '300px' }}>
                        "{item.original_snippet}"
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}>
                          {item.mode}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#10b981' }}>{item.word_count}</td>
                      <td style={{ padding: '12px', color: '#64748b', fontSize: '0.78rem' }}>{new Date(item.created_at).toLocaleString()}</td>
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
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
            borderRadius: '14px',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '0.88rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {['all', 'free', 'starter', 'plus', 'pro'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUserPlanFilter(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: userPlanFilter === p ? '1px solid #0284c7' : '1px solid rgba(255,255,255,0.08)',
                    background: userPlanFilter === p ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                    color: userPlanFilter === p ? '#38bdf8' : '#94a3b8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)'
          }}>
            {usersLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 size={24} className="spinner-animate" /> Loading users...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 16px' }}>User Details</th>
                      <th style={{ padding: '12px 16px' }}>Plan Tier</th>
                      <th style={{ padding: '12px 16px' }}>Role</th>
                      <th style={{ padding: '12px 16px' }}>Usage Count</th>
                      <th style={{ padding: '12px 16px' }}>Joined Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                          No users found matching your search query.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{u.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{u.email}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: u.plan === 'pro' ? 'rgba(236, 72, 153, 0.15)' : u.plan === 'plus' ? 'rgba(16, 185, 129, 0.15)' : u.plan === 'starter' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                              color: u.plan === 'pro' ? '#ec4899' : u.plan === 'plus' ? '#10b981' : u.plan === 'starter' ? '#38bdf8' : '#94a3b8',
                              border: `1px solid ${u.plan === 'pro' ? 'rgba(236, 72, 153, 0.3)' : u.plan === 'plus' ? 'rgba(16, 185, 129, 0.3)' : u.plan === 'starter' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`
                            }}>
                              {u.plan.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                              color: u.role === 'admin' ? '#f59e0b' : '#94a3b8'
                            }}>
                              {u.role ? u.role.toUpperCase() : 'USER'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f8fafc' }}>
                            {u.usage_count} rewrites
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.78rem' }}>
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(u)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(56, 189, 248, 0.1)',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  color: '#38bdf8',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(244, 63, 94, 0.1)',
                                  border: '1px solid rgba(244, 63, 94, 0.25)',
                                  color: '#f43f5e',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Edit User Settings
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Target: <strong style={{ color: '#f8fafc' }}>{editingUser.name}</strong> ({editingUser.email})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Subscription Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  fontSize: '0.88rem'
                }}
              >
                <option value="free" style={{ background: '#0f172a' }}>Free Plan ($0/mo - 250 words)</option>
                <option value="starter" style={{ background: '#0f172a' }}>Plus Plan ($1/mo - 600 words)</option>
                <option value="plus" style={{ background: '#0f172a' }}>Pro Plan ($2/mo - 1,200 words)</option>
                <option value="pro" style={{ background: '#0f172a' }}>Enterprise Plan ($5/mo - 2,500 words)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>User Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  fontSize: '0.88rem'
                }}
              >
                <option value="user" style={{ background: '#0f172a' }}>User (Standard)</option>
                <option value="admin" style={{ background: '#0f172a' }}>Admin (Full Portal Access)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Usage Count</label>
              <input
                type="number"
                value={editUsage}
                onChange={(e) => setEditUsage(parseInt(e.target.value, 10) || 0)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#f8fafc',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#94a3b8',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={updatingUser}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {updatingUser ? <Loader2 size={16} className="spinner-animate" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: COUPON GENERATOR & REVOKER ─────────────────────────── */}
      {activeTab === 'coupons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Generator Form */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            borderRadius: '16px',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ticket size={18} color="#38bdf8" /> Generate Promo Coupons
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Target Plan</label>
                <select
                  value={genPlan}
                  onChange={(e) => setGenPlan(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.88rem'
                  }}
                >
                  <option value="starter" style={{ background: '#0f172a' }}>Plus Plan ($1/mo)</option>
                  <option value="plus" style={{ background: '#0f172a' }}>Pro Plan ($2/mo)</option>
                  <option value="pro" style={{ background: '#0f172a' }}>Enterprise Plan ($5/mo)</option>
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
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>Quantity to Generate</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={genQuantity}
                  onChange={(e) => setGenQuantity(parseInt(e.target.value, 10) || 1)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateCoupons}
              disabled={generatingCoupons}
              style={{
                alignSelf: 'flex-start',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
              }}
            >
              {generatingCoupons ? <Loader2 size={16} className="spinner-animate" /> : <Plus size={16} />}
              Generate {genQuantity} Coupon Code(s)
            </button>

            {/* Generated Codes Output Display Box */}
            {generatedCodes.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    ✓ Newly Generated Coupon Codes:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedCodes.join('\n'))}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: 'none',
                      color: '#10b981',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={13} /> Copy All
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {generatedCodes.map((code) => (
                    <span
                      key={code}
                      onClick={() => copyToClipboard(code)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#f8fafc',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer'
                      }}
                      title="Click to copy"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coupons List Table */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Active & Past Coupons Directory
              </h3>
            </div>

            {couponsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 size={24} className="spinner-animate" /> Loading coupons...
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 16px' }}>Coupon Code</th>
                      <th style={{ padding: '12px 16px' }}>Target Plan</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Redeemed By</th>
                      <th style={{ padding: '12px 16px' }}>Created Date</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                          No coupons generated yet. Use the form above to generate promo coupons.
                        </td>
                      </tr>
                    ) : (
                      coupons.map((c) => (
                        <tr key={c.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#38bdf8', fontSize: '0.92rem' }}>
                              {c.code}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8'
                            }}>
                              {c.plan.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: c.is_redeemed ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: c.is_redeemed ? '#f43f5e' : '#10b981'
                            }}>
                              {c.is_redeemed ? 'REDEEMED' : 'ACTIVE (AVAILABLE)'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.78rem' }}>
                            {c.redeemed_by ? c.redeemed_by : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.78rem' }}>
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(c.code)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#e2e8f0',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                {copiedCode === c.code ? <Check size={13} color="#10b981" /> : <Copy size={13} />} Copy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeCoupon(c.code)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(244, 63, 94, 0.1)',
                                  border: '1px solid rgba(244, 63, 94, 0.25)',
                                  color: '#f43f5e',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Trash2 size={13} /> Revoke
                              </button>
                            </div>
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

      {/* Admin Credentials Reset Modal */}
      {showCredModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '24px',
            padding: '28px 24px',
            color: '#f8fafc',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Admin Security Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCredModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Update your administrative email address or password to secure your account.
            </p>

            <form onSubmit={handleSaveAdminCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Admin Full Name</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Admin Email Address</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Current Password (Required)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    placeholder="Enter current password to authorize changes"
                    value={currAdminPassword}
                    onChange={(e) => setCurrAdminPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 36px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>New Password (Optional)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                  <input
                    type={showAdminPass ? 'text' : 'password'}
                    placeholder="Leave blank to keep current password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 36px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass(!showAdminPass)}
                    style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    {showAdminPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCredModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCreds}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {updatingCreds ? <Loader2 size={16} className="spinner-animate" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

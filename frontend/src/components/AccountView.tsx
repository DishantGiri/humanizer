'use client';

import React, { useState, useRef } from 'react';
import {
  User as UserIcon,
  Shield,
  CreditCard,
  Camera,
  Loader2,
  Lock,
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { updateProfile, changePassword, type User } from '@/lib/api';

interface AccountViewProps {
  user: User | null;
  token: string | null;
  onUpdateUser: (user: User) => void;
  onRequireAuth: () => void;
  onNavigateToPlans: () => void;
  onLogout: () => void;
}

export default function AccountView({
  user,
  token,
  onUpdateUser,
  onRequireAuth,
  onNavigateToPlans,
  onLogout,
}: AccountViewProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'billing'>('general');

  // General Tab state
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalMsg, setGeneralMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Security Tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user || !token) {
    return (
      <div className="card" style={{ maxWidth: '520px', margin: '40px auto', padding: '40px 24px', textAlign: 'center' }}>
        <UserIcon size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Sign in to View Account</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '24px' }}>
          Please log in or create an account to manage your profile, security settings, and subscription plans.
        </p>
        <button type="button" className="action-btn-solid" onClick={onRequireAuth} style={{ margin: '0 auto' }}>
          Sign In / Register
        </button>
      </div>
    );
  }

  // Handle Avatar Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 5 * 1024 * 1024) {
      setGeneralMsg({ type: 'error', text: 'Image file size must be less than 5MB.' });
      return;
    }

    setAvatarUploading(true);
    setGeneralMsg(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const updated = await updateProfile(token, { avatar_url: dataUrl });
        onUpdateUser(updated);
        setGeneralMsg({ type: 'success', text: 'Profile picture updated successfully!' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update avatar.';
        setGeneralMsg({ type: 'error', text: msg });
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Save General Info
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !displayName.trim()) return;

    setSavingGeneral(true);
    setGeneralMsg(null);

    try {
      const updated = await updateProfile(token, { name: displayName.trim() });
      onUpdateUser(updated);
      setGeneralMsg({ type: 'success', text: 'Display name updated successfully!' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update name.';
      setGeneralMsg({ type: 'error', text: msg });
    } finally {
      setSavingGeneral(false);
    }
  };

  // Handle Save Password
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!currentPassword) {
      setSecurityMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      setSecurityMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSavingSecurity(true);
    setSecurityMsg(null);

    try {
      const res = await changePassword(token, currentPassword, newPassword);
      setSecurityMsg({ type: 'success', text: res.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      setSecurityMsg({ type: 'error', text: msg });
    } finally {
      setSavingSecurity(false);
    }
  };

  const getPlanBadgeLabel = (planStr: string) => {
    const p = planStr.toLowerCase();
    if (p === 'pro') return 'Pro';
    if (p === 'plus') return 'Plus';
    if (p === 'starter') return 'Starter';
    return 'Free';
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Hidden File Input for Avatar */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleAvatarChange}
        style={{ display: 'none' }}
      />

      {/* Top Profile Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Avatar Ring */}
        <div
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
          title="Click to upload new profile picture"
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #38bdf8, #10b981)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              background: '#38bdf8',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              border: '2px solid var(--bg-primary)',
            }}
          >
            {avatarUploading ? <Loader2 size={12} className="spinner-animate" /> : <Camera size={12} />}
          </div>
        </div>

        {/* User Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {user.name}
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}
            >
              {getPlanBadgeLabel(user.plan)}
            </span>
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user.email}</span>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'general' ? '2px solid var(--text-primary)' : '2px solid transparent',
            padding: '10px 4px',
            fontSize: '0.95rem',
            fontWeight: activeTab === 'general' ? 700 : 500,
            color: activeTab === 'general' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <UserIcon size={17} />
          General
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'security' ? '2px solid var(--text-primary)' : '2px solid transparent',
            padding: '10px 4px',
            fontSize: '0.95rem',
            fontWeight: activeTab === 'security' ? 700 : 500,
            color: activeTab === 'security' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Shield size={17} />
          Security
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'billing' ? '2px solid var(--text-primary)' : '2px solid transparent',
            padding: '10px 4px',
            fontSize: '0.95rem',
            fontWeight: activeTab === 'billing' ? 700 : 500,
            color: activeTab === 'billing' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <CreditCard size={17} />
          Billing
        </button>
      </div>

      {/* Tab 1: General */}
      {activeTab === 'general' && (
        <div
          className="card"
          style={{
            borderRadius: '16px',
            padding: '0',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            overflow: 'hidden',
          }}
        >
          <form onSubmit={handleSaveGeneral}>
            <div style={{ padding: '28px 28px 24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>General Information</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  Update your display name and personal details
                </p>
              </div>

              {generalMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: generalMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${generalMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: generalMsg.type === 'success' ? '#34d399' : '#f87171',
                  }}
                >
                  {generalMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {generalMsg.text}
                </div>
              )}

              {/* Display Name Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                />
                <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                  This is how your name appears across the app.
                </span>
              </div>

              {/* Email Address Input (Disabled) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user.email}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.95rem',
                    cursor: 'not-allowed',
                  }}
                />
                <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                  Your email is tied to your account and cannot be changed.
                </span>
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <div
              style={{
                padding: '16px 28px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="submit"
                className="action-btn-solid"
                disabled={savingGeneral}
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                {savingGeneral ? <Loader2 size={16} className="spinner-animate" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Security */}
      {activeTab === 'security' && (
        <div
          className="card"
          style={{
            borderRadius: '16px',
            padding: '0',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            overflow: 'hidden',
          }}
        >
          <form onSubmit={handleSaveSecurity}>
            <div style={{ padding: '28px 28px 24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Security & Password</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  Update your account password to stay secure
                </p>
              </div>

              {securityMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: securityMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${securityMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: securityMsg.type === 'success' ? '#34d399' : '#f87171',
                  }}
                >
                  {securityMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {securityMsg.text}
                </div>
              )}

              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: '8px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>

            {/* Bottom Footer Bar */}
            <div
              style={{
                padding: '16px 28px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="submit"
                className="action-btn-solid"
                disabled={savingSecurity}
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                {savingSecurity ? <Loader2 size={16} className="spinner-animate" /> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Billing */}
      {activeTab === 'billing' && (
        <div
          className="card"
          style={{
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px' }}>Subscription & Usage</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Manage your plan tier and view your rewriting usage
            </p>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CURRENT ACTIVE PLAN
              </span>
              <h4 style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase' }}>
                {getPlanBadgeLabel(user.plan)} Plan
              </h4>
            </div>

            <button
              type="button"
              className="action-btn-solid"
              onClick={onNavigateToPlans}
              style={{ fontSize: '0.88rem', padding: '10px 20px' }}
            >
              Explore Plans <ArrowRight size={15} />
            </button>
          </div>

          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Total Humanizations Completed
              </span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                {user.usage_count} rewrites
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Logout Row */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '8px' }}>
        <button
          type="button"
          className="action-btn-outline"
          onClick={onLogout}
          style={{ padding: '10px 20px', fontSize: '0.88rem' }}
        >
          <LogOut size={16} />
          Log Out of Account
        </button>
      </div>

    </div>
  );
}

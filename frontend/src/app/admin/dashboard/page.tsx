'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Lock,
  Loader2,
  LogOut,
  LayoutDashboard,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getCurrentUser, updateAdminCredentials, type User } from '@/lib/api';
import AdminView from '@/components/AdminView';
import { toast } from '@/components/Toast';

const ADMIN_EMAILS = [
  'admin@gmail.com',
  'admin@cloakwriter.com',
  'rahul@fishtailinfosolutions.com',
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Forced First Login Setup state
  const [newSetupPassword, setNewSetupPassword] = useState('');
  const [confirmSetupPassword, setConfirmSetupPassword] = useState('');
  const [showSetupPass, setShowSetupPass] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // Check auth status & admin privileges on mount
  useEffect(() => {
    const savedTheme =
      (localStorage.getItem('humyn_theme') as 'dark' | 'light') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedToken = localStorage.getItem('humanizer_token');
    if (!savedToken) {
      setLoading(false);
      router.push('/login?redirect=/admin/dashboard');
      return;
    }

    setToken(savedToken);
    getCurrentUser(savedToken)
      .then((userData) => {
        const isAdmin =
          userData.role === 'admin' ||
          ADMIN_EMAILS.includes(userData.email.toLowerCase());

        if (!isAdmin) {
          toast.danger('Access Denied: Admin privileges required.');
          router.push('/dashboard');
          return;
        }

        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('humanizer_token');
        localStorage.removeItem('humanizer_user');
        document.cookie = 'humanizer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        setToken(null);
        setUser(null);
        router.push('/login?redirect=/admin/dashboard');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  // Handle First-Login Forced Password Reset
  const handleFirstLoginSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    if (!newSetupPassword.trim() || newSetupPassword.length < 6) {
      toast.danger('New password must be at least 6 characters long.');
      return;
    }
    if (newSetupPassword !== confirmSetupPassword) {
      toast.danger('Passwords do not match. Please recheck.');
      return;
    }

    setSetupLoading(true);
    try {
      const res = await updateAdminCredentials(token, {
        new_password: newSetupPassword.trim(),
      });

      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;

      setToken(res.token);
      setUser(res.user);
      toast.success('Admin password updated successfully! Welcome to your Admin Portal.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to save admin password.');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    localStorage.removeItem('humanizer_token');
    localStorage.removeItem('humanizer_user');
    document.cookie = 'humanizer_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    setToken(null);
    setUser(null);
    toast.info('Logged out of Admin Portal.');
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        <Loader2 size={32} className="spinner-animate" />
      </div>
    );
  }

  const isAdmin =
    user &&
    (user.role === 'admin' || ADMIN_EMAILS.includes(user.email.toLowerCase()));

  // Unauthenticated or non-admin -> Show loading while redirecting
  if (!token || !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090d16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8'
      }}>
        <Loader2 size={32} className="spinner-animate" />
      </div>
    );
  }

  // First-time Admin Login Setup -> Force Credential Update Step BEFORE Dashboard
  const isFirstLogin = user?.is_first_login === 1;

  if (isFirstLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #0f172a 0%, #090d16 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#f8fafc'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '24px',
          padding: '36px 32px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
              marginBottom: '4px'
            }}>
              <KeyRound size={28} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#fef08a' }}>
              Change Admin Password
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
              For security purposes, please set a new password for <strong style={{ color: '#f8fafc' }}>{user?.email}</strong> before accessing the portal.
            </p>
          </div>

          <form onSubmit={handleFirstLoginSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>New Admin Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type={showSetupPass ? 'text' : 'password'}
                  placeholder="Minimum 6 characters"
                  value={newSetupPassword}
                  onChange={(e) => setNewSetupPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSetupPass(!showSetupPass)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  {showSetupPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Confirm New Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
                <input
                  type={showSetupPass ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmSetupPassword}
                  onChange={(e) => setConfirmSetupPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={setupLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                marginTop: '4px'
              }}
            >
              {setupLoading ? <Loader2 size={18} className="spinner-animate" /> : 'Save Credentials & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Fully Authenticated Admin User -> Render Standalone Admin Dashboard
  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      
      {/* Top Navbar */}
      <header style={{
        height: '64px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(16px)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={20} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              CloakWriter Admin
            </span>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', marginLeft: '8px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)' }}>
              v3.0 PORTAL
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LayoutDashboard size={14} /> Main App Dashboard
          </button>

          <button
            type="button"
            onClick={handleAdminLogout}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#f43f5e',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {/* Main Admin View Content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px' }}>
        <AdminView user={user} token={token} />
      </main>
    </div>
  );
}

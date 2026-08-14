'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Loader2,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { getCurrentUser, type User } from '@/lib/api';
import AdminView from '@/components/AdminView';
import { toast } from '@/components/Toast';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth status & live database admin role on mount
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

    // Query live DB user record to verify current role
    getCurrentUser(savedToken)
      .then((userData) => {
        if (userData.role !== 'admin') {
          toast.danger('Access Denied: Admin privileges required.');
          router.push('/dashboard');
          return;
        }

        // Fresh DB check confirmed user is admin
        setUser(userData);
        localStorage.setItem('humanizer_user', JSON.stringify(userData));
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

  const isAdmin = user && user.role === 'admin';

  // Unauthenticated or non-admin -> Show loading spinner while redirecting
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

  // Authenticated Admin User -> Render Standalone Admin Management Portal
  return (
    <div className="admin-page-root" style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', overflowX: 'hidden' }}>
      
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-navbar-brand">
          <div className="admin-navbar-logo">
            <ShieldAlert size={20} color="#ffffff" />
          </div>
          <div className="admin-navbar-title-group">
            <span className="admin-navbar-title">
              CloakWriter Admin
            </span>
            <span className="admin-navbar-badge">
              v3.0 PORTAL
            </span>
          </div>
        </div>

        <div className="admin-navbar-actions">
          <button
            type="button"
            className="admin-navbar-btn"
            onClick={() => router.push('/dashboard')}
            title="Main App Dashboard"
            aria-label="Main App Dashboard"
          >
            <LayoutDashboard size={14} />
            <span className="admin-btn-text">Main App Dashboard</span>
            <span className="admin-btn-text-mobile">Dashboard</span>
          </button>

          <button
            type="button"
            className="admin-navbar-btn admin-navbar-btn--danger"
            onClick={handleAdminLogout}
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut size={14} />
            <span className="admin-btn-text">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin View Content */}
      <main className="admin-main-container">
        <AdminView user={user} token={token} />
      </main>
    </div>
  );
}

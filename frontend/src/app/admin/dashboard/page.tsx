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

  // Check auth status & admin role on mount
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
        if (userData.role !== 'admin') {
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

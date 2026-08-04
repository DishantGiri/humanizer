'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, ArrowDown, Eye, EyeOff, KeyRound, X, MailCheck } from 'lucide-react';
import { loginUser, googleAuthUser, forgotPassword, resetPassword, fetchGoogleOauthConfig } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem('humyn_theme') as 'dark' | 'light') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);

    const token = localStorage.getItem('humanizer_token');
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  // Pick up auth errors from OAuth redirect sessionStorage
  useEffect(() => {
    const authError = sessionStorage.getItem('humyn_auth_error');
    if (authError) {
      toast.danger(authError);
      sessionStorage.removeItem('humyn_auth_error');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setLoading(true);
      googleAuthUser({
        code,
        redirect_uri: window.location.origin + '/login',
      })
        .then((res) => {
          localStorage.setItem('humanizer_token', res.token);
          localStorage.setItem('humanizer_user', JSON.stringify(res.user));
          document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
          router.push('/dashboard');
        })
        .catch((err) => {
          toast.danger(err instanceof Error ? err.message : 'Google OAuth login failed.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      const config = await fetchGoogleOauthConfig();
      const clientId = config.client_id;
      if (!clientId) {
        toast.danger('Google Client ID is not configured on backend.');
        return;
      }
      const redirectUri = window.location.origin + '/api/auth/callback/google';
      const scope = 'openid email profile';
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&prompt=select_account`;
      window.location.href = googleAuthUrl;
    } catch {
      toast.danger('Failed to load Google OAuth configuration.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.danger('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser(email, password);
      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      toast.danger(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.danger('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotEmail);
      toast.success(res.message || '6-digit reset code sent to your email!');
      setForgotStep('reset');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || !newPassword.trim()) {
      toast.danger('Please enter the 6-digit code and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      toast.danger('New password must be at least 6 characters long.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await resetPassword(forgotEmail, resetCode, newPassword);
      toast.success(res.message || 'Password reset successfully!');
      setForgotModalOpen(false);
      setForgotStep('request');
      setPassword(newPassword);
      setEmail(forgotEmail);
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* ── Main Container ────────────────────────────────────────── */}
      <div className="auth-split-main">
        {/* Back Link */}
        <Link href="/" className="auth-back-link">
          <ArrowLeft size={16} />
          <span>Back to home</span>
        </Link>

        {/* ── Split Card Container ────────────────────────────────── */}
        <div className="auth-split-card">
          {/* Left Column: Form */}
          <div className="auth-left-col">
            <h1 className="auth-split-title">Welcome back</h1>
            <p className="auth-split-subtitle">
              Enter your email below to sign in to your account
            </p>

            <form onSubmit={handleSubmit} className="auth-split-form">
              {/* Email */}
              <div className="auth-split-field">
                <label className="auth-split-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="auth-split-input"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Password */}
              <div className="auth-split-field">
                <div className="auth-split-label-row">
                  <label className="auth-split-label" htmlFor="password">
                    Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setForgotEmail(email);
                      setForgotModalOpen(true);
                    }}
                    className="auth-split-forgot"
                  >
                    Forgot your password?
                  </a>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-split-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #94a3b8)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="auth-split-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={16} className="spinner-animate" />
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Divider */}
              <div className="auth-split-divider">
                <span>Or</span>
              </div>

              {/* Google Login Button */}
              <button
                type="button"
                className="auth-split-google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Login with Google</span>
              </button>
            </form>

            <div className="auth-split-footer">
              <span>Don&apos;t have an account?</span>
              <Link href="/register" className="auth-split-footer-link">
                Sign up
              </Link>
            </div>
          </div>

          {/* Right Column: Live AI Humanizer Showcase */}
          <div className="auth-right-col">
            <div className="auth-preview-header">
              <div className="auth-preview-title">
                <Sparkles size={16} color="#38bdf8" />
                <span>CloakWriter Engine v3.0</span>
              </div>
              <div className="auth-preview-badge--live">
                <div className="auth-preview-badge__dot--green" />
                <span>Live Pipeline</span>
              </div>
            </div>

            <div className="auth-showcase-container">
              {/* Before AI */}
              <div className="auth-showcase-card auth-showcase-card--ai">
                <div className="auth-showcase-tag auth-showcase-tag--red">
                  AI DETECTED (98%)
                </div>
                <p className="auth-showcase-text">
                  &ldquo;The implementation of strategic initiatives facilitates optimal synergy across operations...&rdquo;
                </p>
              </div>

              <div className="auth-showcase-arrow">
                <ArrowDown size={18} />
              </div>

              {/* After Humanized */}
              <div className="auth-showcase-card auth-showcase-card--human">
                <div className="auth-showcase-tag auth-showcase-tag--green">
                  100% HUMAN SCORE
                </div>
                <p className="auth-showcase-text">
                  &ldquo;We put key strategies to work so our teams could naturally collaborate better...&rdquo;
                </p>
              </div>
            </div>

            <div className="auth-preview-footer-metrics">
              <div className="auth-gauge-row">
                <div className="auth-gauge-circle--green">
                  <span>98%</span>
                </div>
                <div className="auth-metric-details">
                  <span className="auth-metric-score--green">98% Humanized</span>
                  <span className="auth-metric-tag--green">Bypass Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Overlay */}
      {forgotModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.8)',
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
            padding: '28px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.9)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Reset Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setForgotModalOpen(false); setForgotStep('request'); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestResetCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  Enter your account email address. We will send you a 6-digit password reset code via SMTP.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="m@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#f8fafc',
                      fontSize: '0.88rem'
                    }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
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
                    gap: '8px'
                  }}
                >
                  {forgotLoading ? <Loader2 size={16} className="spinner-animate" /> : 'Send Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                  A 6-digit code was sent to <strong style={{ color: '#f8fafc' }}>{forgotEmail}</strong>. Enter it below along with your new password:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>6-Digit Reset Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#f8fafc',
                      fontSize: '1.1rem',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      fontWeight: 800
                    }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#f8fafc',
                        fontSize: '0.88rem'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {forgotLoading ? <Loader2 size={16} className="spinner-animate" /> : 'Reset Password & Sign In'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

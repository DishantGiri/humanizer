'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, ArrowDown, Eye, EyeOff, KeyRound, X, MailCheck } from 'lucide-react';
import { loginUser, googleAuthUser, forgotPassword, resetPassword, fetchGoogleOauthConfig } from '@/lib/api';
import { validateEmail } from '@/lib/utils';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const otpBox0 = useRef<HTMLInputElement>(null);
  const otpBox1 = useRef<HTMLInputElement>(null);
  const otpBox2 = useRef<HTMLInputElement>(null);
  const otpBox3 = useRef<HTMLInputElement>(null);
  const otpBox4 = useRef<HTMLInputElement>(null);
  const otpBox5 = useRef<HTMLInputElement>(null);
  const otpRefs = [otpBox0, otpBox1, otpBox2, otpBox3, otpBox4, otpBox5];

  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const chars = resetCode.padEnd(6, ' ').split('');
    chars[index] = digit || ' ';
    const newCode = chars.join('').trimEnd();
    setResetCode(newCode.replace(/\s+/g, ''));

    if (digit && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !resetCode[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setResetCode(pasted);
      const focusIndex = Math.min(pasted.length, 5);
      otpRefs[focusIndex].current?.focus();
    }
  };

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

    const emailErr = validateEmail(email);
    if (emailErr) {
      toast.danger(emailErr);
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser(email, password);
      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectPath = urlParams?.get('redirect') || (res.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
      router.push(redirectPath);
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
    const forgotEmailErr = validateEmail(forgotEmail);
    if (forgotEmailErr) {
      toast.danger(forgotEmailErr);
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

  const handleResendCode = async () => {
    if (!forgotEmail || forgotLoading) return;
    setForgotLoading(true);
    try {
      await forgotPassword(forgotEmail);
      toast.success('A new reset code has been sent to your email.');
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Failed to resend code.');
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
    if (resetCode.length < 6) {
      toast.danger('Please enter all 6 digits of the verification code.');
      return;
    }
    if (newPassword.length < 6) {
      toast.danger('New password must be at least 6 characters long.');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      toast.danger('Passwords do not match.');
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
            <div className="auth-mobile-banner">
              <Sparkles size={14} color="#38bdf8" />
              <span>CloakWriter Engine v3.0</span>
              <span className="auth-mobile-banner-dot">•</span>
              <span className="auth-mobile-banner-badge">100% Human Score</span>
            </div>
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
                  placeholder="name@fishtailinfosolutions.com"
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

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '36px 32px',
            maxWidth: '420px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
            position: 'relative',
          }}>
            {/* Close button X */}
            <button
              type="button"
              onClick={() => { setForgotModalOpen(false); setForgotStep('request'); }}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestResetCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header Title & Subtitle */}
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                    Forgot your password?
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    Enter your email and we'll send you a code to reset your password
                  </p>
                </div>

                {/* Email Field */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>Email</label>
                  <input
                    type="email"
                    placeholder="m@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      width: '100%',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: 'none',
                    color: '#090a0f',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {forgotLoading ? <Loader2 size={18} className="spinner-animate" color="#090a0f" /> : 'Send Reset Code'}
                </button>

                {/* Footer Sign in Link */}
                <div style={{ textAlign: 'center', fontSize: '0.88rem', color: '#94a3b8', marginTop: '4px' }}>
                  Remember your password?{' '}
                  <span
                    onClick={() => { setForgotModalOpen(false); setForgotStep('request'); }}
                    style={{ color: '#ffffff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Sign in
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header Title & Subtitle */}
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                    Reset your password
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    Enter the code sent to <strong style={{ color: '#ffffff' }}>{forgotEmail}</strong><br />
                    and your new password
                  </p>
                </div>

                {/* 6-Digit OTP Verification Code Boxes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>Verification Code</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        ref={otpRefs[idx]}
                        type="text"
                        maxLength={1}
                        value={resetCode[idx] || ''}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        style={{
                          width: '42px',
                          height: '46px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    ))}
                    <span style={{ color: '#94a3b8', fontWeight: 700, padding: '0 2px' }}>-</span>
                    {[3, 4, 5].map((idx) => (
                      <input
                        key={idx}
                        ref={otpRefs[idx]}
                        type="text"
                        maxLength={1}
                        value={resetCode[idx] || ''}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        style={{
                          width: '42px',
                          height: '46px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#ffffff',
                          fontSize: '1.2rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 44px 12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>Confirm Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 44px 12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        fontSize: '0.92rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                      }}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: 'none',
                    color: '#090a0f',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '4px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {forgotLoading ? <Loader2 size={18} className="spinner-animate" color="#090a0f" /> : 'Reset Password'}
                </button>

                {/* Footer Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                  <div>
                    Didn't get the code?{' '}
                    <span
                      onClick={handleResendCode}
                      style={{ color: '#ffffff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Resend code
                    </span>
                  </div>
                  <div>
                    Back to{' '}
                    <span
                      onClick={() => { setForgotModalOpen(false); setForgotStep('request'); }}
                      style={{ color: '#ffffff', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Sign in
                    </span>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

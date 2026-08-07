'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, ArrowDown, Eye, EyeOff, MailCheck } from 'lucide-react';
import { registerUser, verifyEmail, googleAuthUser, fetchGoogleOauthConfig } from '@/lib/api';
import { toast } from '@/components/Toast';
import { validateName, validateEmail } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

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

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.danger('Please fill in all required fields.');
      return;
    }

    const nameErr = validateName(name);
    if (nameErr) {
      toast.danger(nameErr);
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      toast.danger(emailErr);
      return;
    }

    if (password.length < 6) {
      toast.danger('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.danger('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerUser(name, email, password);
      toast.success(res.message || 'Verification code sent to your email!');
      setStep('verify');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      toast.danger(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      toast.danger('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail(email, verificationCode);
      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
      toast.success('Email verified successfully!');
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      toast.danger(msg);
    } finally {
      setLoading(false);
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
            {step === 'verify' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <MailCheck size={28} color="#10b981" />
                </div>
                <h1 className="auth-split-title">Verify your email</h1>
                <p className="auth-split-subtitle">
                  We sent a 6-digit verification code to <strong style={{ color: '#f8fafc' }}>{email}</strong>.
                </p>

                <form onSubmit={handleVerifyCode} className="auth-split-form">
                  <div className="auth-split-field">
                    <label className="auth-split-label" htmlFor="verification-code">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="verification-code"
                      type="text"
                      maxLength={6}
                      className="auth-split-input"
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      style={{ letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 800 }}
                      disabled={loading}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="auth-split-submit-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="spinner-animate" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>Verify & Activate Account</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    ← Back to Registration
                  </button>
                </form>
              </div>
            ) : (
              <>
                <h1 className="auth-split-title">Create an account</h1>
                <p className="auth-split-subtitle">
                  Enter your details below to create your account
                </p>

                <form onSubmit={handleSubmit} className="auth-split-form" noValidate>
              {/* Name */}
              <div className="auth-split-field">
                <label className="auth-split-label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  className="auth-split-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  disabled={loading}
                  required
                />
              </div>

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
                <label className="auth-split-label" htmlFor="password">
                  Password
                </label>
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

              {/* Confirm Password */}
              <div className="auth-split-field">
                <label className="auth-split-label" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-split-input"
                    style={{ paddingRight: '40px' }}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
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
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  'Sign Up'
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
              <span>Already have an account?</span>
              <Link href="/login" className="auth-split-footer-link">
                Sign in
              </Link>
            </div>
              </>
            )}
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
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles, ArrowDown } from 'lucide-react';
import { registerUser, googleAuthUser } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleGoogleSignIn = () => {
    const clientId = '365929988554-7v1geh55lljqdvcj5n71712f667ttems.apps.googleusercontent.com';
    const redirectUri = window.location.origin + '/api/auth/callback/google';
    const scope = 'openid email profile';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&prompt=select_account`;
    window.location.href = googleAuthUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.danger('Please fill in all required fields.');
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
      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
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
            <h1 className="auth-split-title">Create an account</h1>
            <p className="auth-split-subtitle">
              Enter your details below to create your account
            </p>

            <form onSubmit={handleSubmit} className="auth-split-form">
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
                  placeholder="m@example.com"
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
                <input
                  id="password"
                  type="password"
                  className="auth-split-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Confirm Password */}
              <div className="auth-split-field">
                <label className="auth-split-label" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  className="auth-split-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
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

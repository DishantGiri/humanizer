'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight, Loader2, AlertCircle, Wand2, CheckCircle2 } from 'lucide-react';
import { loginUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser(email, password);
      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper auth-page-wrapper--login">
      {/* Dynamic Background Image & Ambient Light Elements */}
      <div className="auth-page-bg-overlay" />
      <div className="auth-ambient-glow auth-ambient-glow--blue" />
      <div className="auth-ambient-glow auth-ambient-glow--purple" />

      {/* Grid Pattern Overlay */}
      <div className="auth-grid-pattern" />

      {/* Main Container */}
      <div className="auth-page-container">
        {/* Brand Header */}
        <Link href="/" className="auth-page-brand">
          <div className="auth-brand-logo">
            <Wand2 size={22} color="white" />
          </div>
          <span className="auth-brand-title">HumanizePro</span>
        </Link>

        {/* Card */}
        <div className="auth-page-card animate-fadeIn">
          <div className="auth-card-header">
            <div className="auth-icon-badge">
              <Sparkles size={24} color="var(--accent-blue)" />
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Log in to access your HumanizePro account & dashboard.</p>
          </div>

          {error && (
            <div className="auth-error-alert" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-layout">
            <div className="auth-form-field">
              <label className="auth-field-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="auth-field-input-box">
                <Mail size={18} className="auth-field-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="auth-field-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth-form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-field-label" htmlFor="login-password">
                  Password
                </label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to your email address.'); }} className="auth-forgot-link">
                  Forgot password?
                </a>
              </div>
              <div className="auth-field-input-box">
                <Lock size={18} className="auth-field-icon" />
                <input
                  id="login-password"
                  type="password"
                  className="auth-field-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth-checkbox-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="auth-checkbox"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-primary-btn"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="spinner-animate" />
              ) : (
                <>
                  Log In <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Social / Direct Feature Callouts */}
          <div className="auth-feature-bullets">
            <div className="auth-feature-item">
              <CheckCircle2 size={14} color="#10b981" />
              <span>10 Free Humanizations for New Accounts</span>
            </div>
            <div className="auth-feature-item">
              <CheckCircle2 size={14} color="#10b981" />
              <span>Only $1/mo for Unlimited Access</span>
            </div>
          </div>

          <div className="auth-card-footer">
            <p>
              Don't have an account?{' '}
              <Link href="/register" className="auth-accent-link">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

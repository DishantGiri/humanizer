'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle, Wand2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { registerUser } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service to create an account.');
      return;
    }

    setLoading(true);

    try {
      const res = await registerUser(name, email, password);
      localStorage.setItem('humanizer_token', res.token);
      localStorage.setItem('humanizer_user', JSON.stringify(res.user));
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper auth-page-wrapper--register">
      {/* Dynamic Background Image & Ambient Light Elements */}
      <div className="auth-page-bg-overlay" />
      <div className="auth-ambient-glow auth-ambient-glow--cyan" />
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
          <span className="auth-brand-title">Humyn</span>
        </Link>

        {/* Card */}
        <div className="auth-page-card animate-fadeIn">
          <div className="auth-card-header">
            <div className="auth-icon-badge">
              <Sparkles size={24} color="#ffffff" />
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join Humyn and start transforming AI text today.</p>
          </div>

          {error && (
            <div className="auth-error-alert" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-layout">
            <div className="auth-form-field">
              <label className="auth-field-label" htmlFor="register-name">
                Full Name
              </label>
              <div className="auth-field-input-box">
                <UserIcon size={18} className="auth-field-icon" />
                <input
                  id="register-name"
                  type="text"
                  className="auth-field-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth-form-field">
              <label className="auth-field-label" htmlFor="register-email">
                Email Address
              </label>
              <div className="auth-field-input-box">
                <Mail size={18} className="auth-field-icon" />
                <input
                  id="register-email"
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
              <label className="auth-field-label" htmlFor="register-password">
                Password
              </label>
              <div className="auth-field-input-box">
                <Lock size={18} className="auth-field-icon" />
                <input
                  id="register-password"
                  type="password"
                  className="auth-field-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth-form-field">
              <label className="auth-field-label" htmlFor="register-confirm-password">
                Confirm Password
              </label>
              <div className="auth-field-input-box">
                <Lock size={18} className="auth-field-icon" />
                <input
                  id="register-confirm-password"
                  type="password"
                  className="auth-field-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="auth-checkbox-row">
              <label className="auth-checkbox-label">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="auth-checkbox"
                />
                <span>I agree to the Terms of Service & Privacy Policy</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-primary-btn"
              style={{ background: '#ffffff', color: '#000000' }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="spinner-animate" />
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Social / Direct Feature Callouts */}
          <div className="auth-feature-bullets">
            <div className="auth-feature-item">
              <CheckCircle2 size={14} color="#ffffff" />
              <span>Includes 10 Free Humanizations instantly</span>
            </div>
            <div className="auth-feature-item">
              <ShieldCheck size={14} color="#ffffff" />
              <span>No credit card required for free signup</span>
            </div>
          </div>

          <div className="auth-card-footer">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="auth-accent-link">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

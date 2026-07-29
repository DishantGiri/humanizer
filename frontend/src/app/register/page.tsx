'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Wand2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { registerUser, googleAuthUser } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      setLoading(true);
      googleAuthUser({
        code,
        redirect_uri: window.location.origin + '/register',
      })
        .then((res) => {
          localStorage.setItem('humanizer_token', res.token);
          localStorage.setItem('humanizer_user', JSON.stringify(res.user));
          router.push('/');
        })
        .catch((err) => {
          toast.danger(err instanceof Error ? err.message : 'Google OAuth registration failed.');
        })
        .finally(() => {
          setLoading(false);
        });
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

    if (!agreeTerms) {
      toast.danger('You must agree to the Terms of Service to create an account.');
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
      toast.danger(msg);
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



          {/* Google OAuth Button */}
          <div className="auth-social-section" style={{ marginBottom: 20 }}>
            <button
              type="button"
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="auth-google-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="auth-divider">
              <span>or continue with email</span>
            </div>
          </div>

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

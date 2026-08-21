'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginUser, registerUser, verifyEmail, googleAuthUser, fetchGoogleOauthConfig, type User } from '@/lib/api';
import { validateName, validateEmail } from '@/lib/utils';
import { toast } from '@/components/Toast';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export default function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      const config = await fetchGoogleOauthConfig();
      const clientId = config.client_id;
      if (!clientId) {
        toast.danger('Google Client ID is not configured on backend.');
        return;
      }
      const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('humyn_oauth_state', state);
      const redirectUri = window.location.origin + '/api/auth/callback/google';
      const scope = 'openid email profile';
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&prompt=select_account`;
      window.location.href = googleAuthUrl;
    } catch {
      toast.danger('Failed to load Google OAuth configuration.');
    }
  };

  if (!isOpen) return null;

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isVerifying) {
      if (!verificationCode.trim()) {
        setError('Please enter the 6-digit verification code sent to your email.');
        return;
      }
      setLoading(true);
      try {
        const res = await verifyEmail(email, verificationCode);
        onSuccess(res.user, res.token);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'register') {
      const nameErr = validateName(name);
      if (nameErr) {
        setError(nameErr);
        return;
      }
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      toast.danger(emailErr);
      return;
    }

    if (!password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await registerUser(name, email, password);
        if (res.require_verification) {
          setIsVerifying(true);
        } else if (res.user && res.token) {
          onSuccess(res.user, res.token);
          onClose();
        }
      } else {
        const res = await loginUser(email, password);
        onSuccess(res.user, res.token);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div
        className="auth-modal-card animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auth-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <div className="auth-modal-logo">
            <Sparkles size={24} color="#ffffff" />
          </div>
          <h3 className="auth-modal-title">
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="auth-modal-subtitle">
            {mode === 'login'
              ? 'Log in to access your CloakWriter account'
              : 'Join CloakWriter to get started'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab ${mode === 'login' ? 'auth-modal-tab--active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-modal-tab ${mode === 'register' ? 'auth-modal-tab--active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <div className="auth-social-section" style={{ marginBottom: 16 }}>
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

        <form onSubmit={handleFormSubmit} className="auth-form">
          {isVerifying ? (
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="auth-verification-code">
                6-Digit Verification Code Sent to Email
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="auth-verification-code"
                  type="text"
                  maxLength={6}
                  className="auth-input"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}
                  disabled={loading}
                  required
                />
              </div>
            </div>
          ) : (
            <>
              {mode === 'register' && (
                <div className="auth-input-group">
                  <label className="auth-label" htmlFor="auth-name">
                    Full Name
                  </label>
                  <div className="auth-input-wrapper">
                    <UserIcon size={16} className="auth-input-icon" />
                    <input
                      id="auth-name"
                      type="text"
                      className="auth-input"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="auth-input-group">
                <label className="auth-label" htmlFor="auth-email">
                  Email Address
                </label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label" htmlFor="auth-password">
                  Password
                </label>
                <div className="auth-input-wrapper" style={{ position: 'relative' }}>
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
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
            </>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="spinner-animate" />
            ) : mode === 'login' ? (
              'Log In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-modal-footer">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

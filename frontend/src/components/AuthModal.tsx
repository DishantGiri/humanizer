'use client';

import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { loginUser, registerUser, type User } from '@/lib/api';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Please enter your name.');
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
        onSuccess(res.user, res.token);
      } else {
        const res = await loginUser(email, password);
        onSuccess(res.user, res.token);
      }
      onClose();
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
            <Sparkles size={24} color="var(--accent-blue)" />
          </div>
          <h3 className="auth-modal-title">
            {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
          </h3>
          <p className="auth-modal-subtitle">
            {mode === 'login'
              ? 'Log in to access your HumanizePro account'
              : 'Join HumanizePro to get started'}
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

        <form onSubmit={handleSubmit} className="auth-form">
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
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="auth-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

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
              Don't have an account?{' '}
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

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { googleAuthUser } from '@/lib/api';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const authError = urlParams.get('error');

    if (authError) {
      setError(`Google authorization was denied or canceled (${authError}).`);
      return;
    }

    if (!code) {
      setError('No authorization code found in Google callback URL.');
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/google`;

    googleAuthUser({ code, redirect_uri: redirectUri })
      .then((res) => {
        localStorage.setItem('humanizer_token', res.token);
        localStorage.setItem('humanizer_user', JSON.stringify(res.user));
        router.push('/');
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Google authentication failed.';
        setError(msg);
      });
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: 'rgba(15, 17, 26, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        {!error ? (
          <>
            <div style={{ display: 'inline-flex', padding: 16, background: 'rgba(56, 189, 248, 0.1)', borderRadius: '50%', marginBottom: 20 }}>
              <Loader2 size={32} style={{ color: '#38bdf8' }} className="spinner-animate" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Completing Google Login</h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
              Please wait while we verify your Google credentials...
            </p>
          </>
        ) : (
          <>
            <div style={{ display: 'inline-flex', padding: 16, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: 20 }}>
              <AlertCircle size={32} style={{ color: '#ef4444' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, color: '#f87171' }}>Authentication Failed</h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 24 }}>{error}</p>
            <button
              type="button"
              onClick={() => router.push('/login')}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: '#ffffff',
                color: '#0f172a',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

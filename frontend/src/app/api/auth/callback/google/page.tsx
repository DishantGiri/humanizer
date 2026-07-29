'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { googleAuthUser } from '@/lib/api';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const authError = urlParams.get('error');

    if (authError) {
      // Store error for the login page to pick up as a toast
      sessionStorage.setItem('humyn_auth_error', `Google login was denied or canceled.`);
      router.replace('/login');
      return;
    }

    if (!code) {
      sessionStorage.setItem('humyn_auth_error', 'No authorization code received from Google.');
      router.replace('/login');
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/google`;

    googleAuthUser({ code, redirect_uri: redirectUri })
      .then((res) => {
        localStorage.setItem('humanizer_token', res.token);
        localStorage.setItem('humanizer_user', JSON.stringify(res.user));
        sessionStorage.setItem('humyn_auth_success', `Welcome back, ${res.user.name}!`);
        router.replace('/');
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Google authentication failed.';
        sessionStorage.setItem('humyn_auth_error', msg);
        router.replace('/login');
      });
  }, [router]);

  // Minimal transparent loading — no ugly card UI
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #090a0f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(56, 189, 248, 0.15)',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

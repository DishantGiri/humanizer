'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LottieLoader from '@/components/LottieLoader';
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

    const state = urlParams.get('state');
    const savedState = sessionStorage.getItem('humyn_oauth_state');
    sessionStorage.removeItem('humyn_oauth_state');

    if (savedState && state !== savedState) {
      sessionStorage.setItem('humyn_auth_error', 'Google OAuth security verification failed (invalid CSRF state token). Please try signing in again.');
      router.replace('/login');
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/google`;

    googleAuthUser({ code, redirect_uri: redirectUri, state: state || undefined })
      .then((res) => {
        localStorage.setItem('humanizer_token', res.token);
        localStorage.setItem('humanizer_user', JSON.stringify(res.user));
        document.cookie = `humanizer_token=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
        sessionStorage.setItem('humyn_auth_success', `Welcome back, ${res.user.name}!`);
        router.replace('/dashboard');
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Google authentication failed.';
        sessionStorage.setItem('humyn_auth_error', msg);
        router.replace('/login');
      });
  }, [router]);

  return <LottieLoader message="Signing in with Google..." size={160} />;
}



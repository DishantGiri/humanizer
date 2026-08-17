'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import LandingHero from '@/components/LandingHero';
import AuthModal from '@/components/AuthModal';
import DynamicSeo from '@/components/DynamicSeo';
import { type User as UserType } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const token = localStorage.getItem('humanizer_token');
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleAuthSuccess = (u: UserType, t: string) => {
    localStorage.setItem('humanizer_token', t);
    localStorage.setItem('humanizer_user', JSON.stringify(u));
    document.cookie = `humanizer_token=${t}; path=/; max-age=2592000; SameSite=Lax`;
    router.push('/dashboard');
  };

  return (
    <>
      <DynamicSeo pageSlug="home" />
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      <LandingHero
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
      />
    </>
  );
}

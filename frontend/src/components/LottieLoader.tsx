'use client';

import React from 'react';
import Image from 'next/image';
import Logo from '@/components/Logo';

interface LottieLoaderProps {
  message?: string;
  size?: number;
}

export default function LottieLoader({ message = 'Loading...', size = 160 }: LottieLoaderProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090A0F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      <Logo size="md" theme="dark" />

      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src="/loading.svg"
          alt="Loading..."
          width={size}
          height={size}
          unoptimized
          priority
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {message && (
        <span
          style={{
            fontSize: '0.88rem',
            color: '#94a3b8',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}

'use client';

import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  theme?: 'dark' | 'light';
}

export default function Logo({ variant = 'full', size = 'md', className = '', theme = 'dark' }: LogoProps) {
  const isLight = theme === 'light';

  // Heights for different sizes
  const heightMap = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  const h = heightMap[size];

  if (variant === 'icon') {
    return (
      <div
        className={`logo-icon-wrapper ${className}`}
        style={{
          width: h,
          height: h,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 100 100" width={h} height={h} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="humynGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          {/* Circuit dots on left */}
          <circle cx="12" cy="28" r="3.5" fill="url(#humynGrad)" />
          <line x1="12" y1="28" x2="26" y2="28" stroke="url(#humynGrad)" strokeWidth="2.5" />
          
          <circle cx="8" cy="46" r="3.5" fill="url(#humynGrad)" />
          <line x1="8" y1="46" x2="26" y2="46" stroke="url(#humynGrad)" strokeWidth="2.5" />
          
          <circle cx="14" cy="64" r="3.5" fill="url(#humynGrad)" />
          <line x1="14" y1="64" x2="26" y2="64" stroke="url(#humynGrad)" strokeWidth="2.5" />

          {/* Main H Body */}
          <path
            d="M 28 16 A 8 8 0 0 1 44 16 L 44 42 C 50 36 62 36 70 42 L 70 16 A 8 8 0 0 1 86 16 L 86 78 C 86 84 78 88 72 84 L 54 74 L 44 80 L 44 84 A 8 8 0 0 1 28 84 Z"
            fill="url(#humynGrad)"
          />

          {/* Speech bubble & dots inside */}
          <ellipse cx="58" cy="54" rx="14" ry="10" fill={isLight ? '#ffffff' : '#090a0f'} />
          <path d="M 64 62 L 70 70 L 56 64 Z" fill={isLight ? '#ffffff' : '#090a0f'} />

          <circle cx="51" cy="54" r="2" fill="url(#humynGrad)" />
          <circle cx="58" cy="54" r="2" fill="url(#humynGrad)" />
          <circle cx="65" cy="54" r="2" fill="url(#humynGrad)" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`logo-full-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : '12px',
        flexShrink: 0,
      }}
    >
      <Logo variant="icon" size={size} theme={theme} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: size === 'sm' ? '1.1rem' : size === 'md' ? '1.35rem' : '1.8rem',
            fontWeight: 800,
            color: isLight ? '#0f172a' : '#ffffff',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          Hum
          <span style={{ color: '#38bdf8' }}>y</span>
          n
        </span>
        {size !== 'sm' && (
          <span
            style={{
              fontSize: size === 'md' ? '0.55rem' : '0.7rem',
              fontWeight: 700,
              color: isLight ? '#64748b' : '#94a3b8',
              letterSpacing: '0.18em',
              marginTop: '2px',
              textTransform: 'uppercase',
            }}
          >
            AI TEXT HUMANIZER
          </span>
        )}
      </div>
    </div>
  );
}

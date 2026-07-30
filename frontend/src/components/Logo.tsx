'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  theme?: 'dark' | 'light';
}

/**
 * CloakWriter logo component.
 *
 * Icon: uses /public/logo.png
 * Full: icon + two-tone wordmark ("Cloak" neutral, "Writer" blue gradient)
 * with "AI TEXT HUMANIZER" subtitle.
 */
export default function Logo({
  variant = 'full',
  size = 'md',
  className = '',
  theme = 'dark',
}: LogoProps) {
  const isLight = theme === 'light';

  const heightMap = { sm: 34, md: 44, lg: 62 };
  const h = heightMap[size];

  const LogoIcon = () => (
    <Image
      src="/logo.png"
      alt="CloakWriter logo"
      width={h}
      height={h}
      style={{ objectFit: 'contain', flexShrink: 0 }}
      priority
    />
  );

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
        <LogoIcon />
      </div>
    );
  }

  const fontSizeMap = { sm: '1.2rem', md: '1.65rem', lg: '2.3rem' };
  const subtitleSizeMap = { sm: '0', md: '0.6rem', lg: '0.78rem' };

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
      <div style={{ width: h, height: h, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <LogoIcon />
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-heading, "Inter", sans-serif)',
            fontSize: fontSizeMap[size],
            fontWeight: 800,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          {/* "Cloak" — neutral */}
          <span style={{ color: isLight ? '#0F172A' : '#FFFFFF' }}>Cloak</span>
          {/* "Writer" — blue gradient */}
          <span
            style={{
              background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 50%, #2563EB 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Writer
          </span>
        </span>

        {size !== 'sm' && (
          <span
            style={{
              fontSize: subtitleSizeMap[size],
              fontWeight: 600,
              color: isLight ? '#64748B' : '#94A3B8',
              letterSpacing: '0.18em',
              marginTop: '3px',
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

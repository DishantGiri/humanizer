'use client';

import React from 'react';
import Link from 'next/link';
import Script from 'next/script';
import Logo from '@/components/Logo';

// Declare JSX IntrinsicElement for <dotlottie-player> (React 19 & React 18 compatible)
declare global {
  namespace React.JSX {
    interface IntrinsicElements {
      'dotlottie-player': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          autoplay?: boolean;
          loop?: boolean;
          style?: React.CSSProperties;
          background?: string;
          speed?: string | number;
        },
        HTMLElement
      >;
    }
  }
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-player': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          autoplay?: boolean;
          loop?: boolean;
          style?: React.CSSProperties;
          background?: string;
          speed?: string | number;
        },
        HTMLElement
      >;
    }
  }
}

export default function NotFound() {
  const lottieUrl = 'https://lottie.host/83518838-527f-4c92-a193-84f49400b324/WscyMlONTu.lottie';

  return (
    <>
      {/* Load DotLottie Web Component Player */}
      <Script
        src="https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs"
        type="module"
        strategy="afterInteractive"
      />

      <div
        style={{
          position: 'relative',
          width: '100vw',
          minHeight: '100vh',
          backgroundColor: '#090A0F',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-heading, "Inter", sans-serif)',
          paddingBottom: '0.5rem',
        }}
      >
        {/* Header with Logo */}
        <header
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            padding: '1.75rem 2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size="md" theme="dark" />
          </Link>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            404 PAGE NOT FOUND
          </div>
        </header>

        {/* Center Content Wrapper (Animation + Text + Button Stacked Vertically) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '750px',
            flex: 1,
            padding: '0 1.5rem',
          }}
        >
          {/* DotLottie Animation Section */}
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              height: '320px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <dotlottie-player
              src={lottieUrl}
              autoplay
              loop
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Text and Button Section (Positioned Below Animation) */}
          <main
            style={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              textAlign: 'center',
              marginTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                  fontWeight: 800,
                  marginBottom: '0.5rem',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                }}
              >
                Lost in the Digital Void
              </h1>

              <p
                style={{
                  fontSize: '1rem',
                  color: '#94A3B8',
                  maxWidth: '480px',
                  margin: '0 auto',
                  lineHeight: 1.5,
                }}
              >
                The page you are looking for has vanished into thin air.
              </p>
            </div>

            {/* Single Action Button */}
            <div>
              <Link
                href="/"
                style={{
                  padding: '0.85rem 2.25rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 50%, #2563EB 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Return to Home
              </Link>
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '1rem',
            color: '#64748B',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          © {new Date().getFullYear()} CloakWriter. All rights reserved.
        </footer>
      </div>
    </>
  );
}

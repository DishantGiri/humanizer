'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import Logo from '@/components/Logo';

interface ErrorViewProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  subtitle?: string;
  statusCode?: string;
}

export default function ErrorView({
  error,
  reset,
  title = "This Page Couldn't Load",
  subtitle = 'An unexpected error occurred while rendering this page. You can reload to try again, or return to safety.',
  statusCode = 'PAGE ERROR',
}: ErrorViewProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    if (reset) {
      try {
        reset();
      } catch {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const handleCopy = () => {
    const textToCopy = `Error: ${error?.message || 'Unknown Error'}\nDigest: ${error?.digest || 'N/A'}\nStack: ${error?.stack || 'N/A'}\nURL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#090A0F',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'var(--font-heading, "Inter", sans-serif)',
        overflowX: 'hidden',
      }}
    >
      {/* Ambient background glow elements */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.12) 0%, rgba(108, 99, 255, 0.08) 45%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '15%',
          width: '500px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 65%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(9, 10, 15, 0.6)',
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
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#F87171',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              boxShadow: '0 0 8px #EF4444',
              display: 'inline-block',
            }}
          />
          {statusCode}
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '720px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        {/* Glowing Icon Card */}
        <div
          style={{
            position: 'relative',
            marginBottom: '2rem',
          }}
        >
          {/* Subtle Outer Glow */}
          <div
            style={{
              position: 'absolute',
              inset: '-12px',
              borderRadius: '32px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(99, 102, 241, 0.25) 50%, rgba(59, 130, 246, 0.2) 100%)',
              filter: 'blur(16px)',
              opacity: 0.8,
            }}
          />

          {/* Icon Box */}
          <div
            style={{
              position: 'relative',
              width: '96px',
              height: '96px',
              borderRadius: '24px',
              background: 'linear-gradient(145deg, rgba(26, 28, 38, 0.95), rgba(15, 17, 26, 0.95))',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <AlertTriangle
              size={44}
              style={{
                color: '#F87171',
                filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.45))',
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(1.85rem, 4.5vw, 2.75rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            marginBottom: '1rem',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.075rem)',
            lineHeight: 1.6,
            color: '#94A3B8',
            maxWidth: '540px',
            margin: '0 auto 2.25rem',
          }}
        >
          {subtitle}
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginBottom: '2rem',
          }}
        >
          {/* Reload / Try Again Button */}
          <button
            onClick={handleReload}
            disabled={isReloading}
            style={{
              padding: '0.85rem 1.85rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: isReloading ? 'wait' : 'pointer',
              background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 50%, #2563EB 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(59, 130, 246, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.45)';
            }}
          >
            <RefreshCw
              size={18}
              style={{
                animation: isReloading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            {isReloading ? 'Reloading...' : 'Reload Page'}
          </button>

          {/* Back Button */}
          <button
            onClick={handleBack}
            style={{
              padding: '0.85rem 1.75rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.95rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#F1F5F9',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>

          {/* Return Home Button */}
          <Link
            href="/"
            style={{
              padding: '0.85rem 1.4rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <Home size={18} />
            Home
          </Link>
        </div>

        {/* Technical Error Details Accordion */}
        {(error?.message || error?.digest) && (
          <div
            style={{
              width: '100%',
              maxWidth: '580px',
              marginTop: '1rem',
              borderRadius: '14px',
              backgroundColor: 'rgba(15, 17, 26, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                width: '100%',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#94A3B8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#64748B';
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={15} style={{ color: '#F87171' }} />
                Technical Details & Diagnostics
              </span>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDetails && (
              <div
                style={{
                  padding: '14px 18px 18px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  backgroundColor: 'rgba(9, 10, 15, 0.85)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono, monospace)',
                      color: '#94A3B8',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Error Log {error.digest ? `(ID: ${error.digest})` : ''}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {copied ? <Check size={13} style={{ color: '#34D399' }} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '0.8rem',
                    color: '#F87171',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    wordBreak: 'break-all',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    lineHeight: 1.5,
                  }}
                >
                  {error.message || 'An unhandled exception occurred in the application.'}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          padding: '1.25rem 2rem',
          color: '#64748B',
          fontSize: '0.8rem',
          textAlign: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
          <span>© {new Date().getFullYear()} CloakWriter. All rights reserved.</span>
          <span style={{ color: 'rgba(255, 255, 255, 0.15)' }}>•</span>
          <Link
            href="/"
            style={{
              color: '#94A3B8',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            AI Text Humanizer
          </Link>
        </div>
      </footer>
    </div>
  );
}

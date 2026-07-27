'use client';

import React, { useState } from 'react';
import { Check, Crown, Sparkles, Zap, Shield, Loader2, ArrowRight } from 'lucide-react';
import { upgradeToPro, type User } from '@/lib/api';

interface PricingViewProps {
  user: User | null;
  token: string | null;
  onUpdateUser: (user: User) => void;
  onRequireAuth: () => void;
}

export default function PricingView({
  user,
  token,
  onUpdateUser,
  onRequireAuth,
}: PricingViewProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPro = user?.plan === 'pro';

  const handleUpgrade = async () => {
    if (!user || !token) {
      onRequireAuth();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updatedUser = await upgradeToPro(token);
      onUpdateUser(updatedUser);
      setSuccessMsg('🎉 Successfully upgraded to Pro Plan! You now have unlimited humanizations.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upgrade failed.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--accent-blue)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          Super Cheap Pricing
        </span>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Flexible Plans for Every Writer
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Choose the plan that fits your writing and humanizing workflow.
        </p>
      </div>

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#10b981',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.92rem',
          }}
        >
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#f87171',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.92rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Free Plan */}
        <div
          className="card"
          style={{
            padding: '32px 28px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Free Plan</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800 }}>$0</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>/ month</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Perfect for trying out HumanizePro and light writing tasks.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Check size={16} color="#10b981" /> 10 Free Humanizations Limit
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Check size={16} color="#10b981" /> All standard rewrite modes
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Check size={16} color="#10b981" /> Sentence diff visualization
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '32px' }}>
            {!isPro ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Current Active Plan
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                Free Tier
              </div>
            )}
          </div>
        </div>

        {/* Pro Plan */}
        <div
          className="card"
          style={{
            padding: '32px 28px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(13, 24, 60, 0.95), rgba(24, 38, 90, 0.9))',
            border: '2px solid var(--accent-blue)',
            boxShadow: '0 0 30px rgba(79, 140, 255, 0.2)',
            position: 'relative',
          }}
        >
          {/* Badge */}
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              right: '24px',
              background: 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
              color: 'white',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
            }}
          >
            BEST VALUE
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Crown size={20} color="var(--accent-amber)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Pro Model</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--accent-blue)' }}>$1</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>/ month</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Unrestricted access to high quality rewriting at an unbeatable price.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', fontWeight: 600 }}>
                <Zap size={16} color="var(--accent-amber)" /> UNLIMITED Humanizations
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Check size={16} color="#10b981" /> Priority Groq LLM processing
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Check size={16} color="#10b981" /> Level 3 Heavy restructuring pipeline
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Check size={16} color="#10b981" /> Translation bounce & grammar polish
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                <Shield size={16} color="#10b981" /> Unlimited saved history
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '32px' }}>
            {isPro ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#10b981',
                }}
              >
                ✓ Active Pro Plan
              </div>
            ) : (
              <button
                type="button"
                className="action-btn-solid"
                disabled={loading}
                onClick={handleUpgrade}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.92rem',
                }}
              >
                {loading ? (
                  <Loader2 size={16} className="spinner-animate" />
                ) : (
                  <>
                    Upgrade to Pro ($1/mo) <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

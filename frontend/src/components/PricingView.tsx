'use client';

import React, { useState } from 'react';
import { Check, Crown, Sparkles, Zap, Shield, Loader2, ArrowRight } from 'lucide-react';
import { createRazorpayOrder, verifyRazorpayPayment, type User } from '@/lib/api';
import { toast } from '@/components/Toast';

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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlan = user?.plan || 'free';

  const handleUpgrade = async (planName: string) => {
    if (!user || !token) {
      toast.info('Please log in or register to select a plan.');
      onRequireAuth();
      return;
    }

    if (currentPlan === planName) {
      toast.info(`You are already on the ${planName.toUpperCase()} plan.`);
      return;
    }

    setLoadingPlan(planName);

    try {
      const order = await createRazorpayOrder(token, planName);

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Humyn',
        description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan Subscription`,
        order_id: order.order_id,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const updatedUser = await verifyRazorpayPayment(token!, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planName,
            });
            onUpdateUser({ ...updatedUser, plan: planName });
            toast.success(`Successfully activated ${planName.toUpperCase()} Plan!`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Payment verification failed.';
            toast.danger(msg);
          } finally {
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#38bdf8' },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled.');
            setLoadingPlan(null);
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate payment.';
      toast.danger(msg);
      setLoadingPlan(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#38bdf8',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          HUMYN REWRITING ENGINES
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>
          Flexible Plans for Every Writer
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
          Choose the plan that fits your writing workflow. Powered by proprietary Humyn neural rewriting models.
        </p>
      </div>



      {/* Pricing Cards Grid (4 Plans) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', paddingTop: '16px' }}>
        
        {/* Plan 1: Free ($0) */}
        <div
          className="card"
          style={{
            padding: '28px 24px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={18} color="var(--text-primary)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Free</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>$0</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <div className="landing-pricing-model-tag" style={{ marginBottom: '20px' }}>
              Humyn Lite Engine
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 2 humanizations / day
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 250 words per input
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Standard Bypass Pipeline
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Basic Processing Speed
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '28px' }}>
            {currentPlan === 'free' ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
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
                  background: 'var(--border-subtle)',
                  textAlign: 'center',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                Included
              </div>
            )}
          </div>
        </div>

        {/* Plan 2: Starter ($1) */}
        <div
          className="card"
          style={{
            padding: '28px 24px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Starter</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>$1</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <div className="landing-pricing-model-tag" style={{ marginBottom: '20px' }}>
              Humyn SpeedEngine v1.5
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 10 humanizations / day
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 600 words per input
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Enhanced Paraphrase Quality
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Fast Processing Speed
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '28px' }}>
            {currentPlan === 'starter' ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#38bdf8',
                }}
              >
                ✓ Active Plan
              </div>
            ) : (
              <button
                type="button"
                className="action-btn-solid"
                disabled={loadingPlan === 'starter'}
                onClick={() => handleUpgrade('starter')}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.88rem',
                }}
              >
                {loadingPlan === 'starter' ? (
                  <Loader2 size={16} className="spinner-animate" />
                ) : (
                  <>Select Starter ($1)</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Plan 3: Plus ($2) - Popular */}
        <div
          className="card"
          style={{
            padding: '28px 24px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 8px 30px rgba(56, 189, 248, 0.15)',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: '#38bdf8',
              color: '#0f172a',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.4)',
              zIndex: 2,
            }}
          >
            POPULAR
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Plus</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>$2</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <div className="landing-pricing-model-tag" style={{ marginBottom: '20px' }}>
              Humyn Turbo Core v2.5
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 30 humanizations / day
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 1,200 words per input
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Advanced Humanization Engine
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> High AI Detector Bypass Rate
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Tone & Flow Controls
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '28px' }}>
            {currentPlan === 'plus' ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#38bdf8',
                }}
              >
                ✓ Active Plan
              </div>
            ) : (
              <button
                type="button"
                className="action-btn-solid"
                disabled={loadingPlan === 'plus'}
                onClick={() => handleUpgrade('plus')}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.88rem',
                }}
              >
                {loadingPlan === 'plus' ? (
                  <Loader2 size={16} className="spinner-animate" />
                ) : (
                  <>
                    Choose Plus ($2) <ArrowRight size={15} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Plan 4: Pro ($5) */}
        <div
          className="card"
          style={{
            padding: '28px 24px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Crown size={18} color="#f59e0b" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Pro</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '12px' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>$5</span>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>/ month</span>
            </div>
            <div className="landing-pricing-model-tag" style={{ marginBottom: '20px' }}>
              Humyn Ultra DeepRewrite v3.0
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 80 humanizations / day
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> 2,500 words per input
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Maximum Detection Bypass
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Priority Processing Queue
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                <Check size={16} color="#34d399" /> Full Export Options
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '28px' }}>
            {currentPlan === 'pro' ? (
              <div
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  color: '#f59e0b',
                }}
              >
                ✓ Active Pro Plan
              </div>
            ) : (
              <button
                type="button"
                className="action-btn-solid"
                disabled={loadingPlan === 'pro'}
                onClick={() => handleUpgrade('pro')}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  fontSize: '0.88rem',
                }}
              >
                {loadingPlan === 'pro' ? (
                  <Loader2 size={16} className="spinner-animate" />
                ) : (
                  <>
                    Upgrade to Pro ($5) <ArrowRight size={15} />
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

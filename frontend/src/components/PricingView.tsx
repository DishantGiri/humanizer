'use client';

import React, { useState } from 'react';
import { Check, Crown, Sparkles, Zap, Shield, Loader2, ArrowRight, X, Ticket } from 'lucide-react';
import { createRazorpayOrder, verifyRazorpayPayment, redeemCoupon, type User } from '@/lib/api';
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
  const [paymentModalPlan, setPaymentModalPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const PLAN_RANKS: Record<string, number> = {
    free: 0,
    plus: 1,
    starter: 1,
    pro: 2,
    enterprise: 3,
  };

  const currentPlan = user?.plan || 'free';
  const currentRank = PLAN_RANKS[currentPlan] ?? 0;

  const openPaymentModal = (planName: string) => {
    if (!user || !token) {
      toast.info('Please log in or register to select a plan.');
      onRequireAuth();
      return;
    }
    const targetRank = PLAN_RANKS[planName] ?? 0;
    if (targetRank === currentRank) {
      toast.info(`You are already on the ${planName.toUpperCase()} plan.`);
      return;
    }
    if (targetRank < currentRank) {
      toast.warning('Downgrading plans is not available. You can only upgrade to higher tier plans.');
      return;
    }
    setCouponCode('');
    setCouponError(null);
    setPaymentModalPlan(planName);
  };

  const closePaymentModal = () => {
    setPaymentModalPlan(null);
    setCouponCode('');
    setCouponError(null);
  };

  const handleCouponRedeem = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }
    if (!token || !paymentModalPlan) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const updatedUser = await redeemCoupon(token, couponCode.trim());
      onUpdateUser({ ...updatedUser, plan: updatedUser.plan || paymentModalPlan });
      toast.success(`Coupon redeemed! ${updatedUser.plan.toUpperCase()} plan activated.`);
      closePaymentModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Coupon redemption failed.';
      setCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRazorpayPayment = async () => {
    if (!user || !token || !paymentModalPlan) return;

    setLoadingPlan(paymentModalPlan);

    try {
      const order = await createRazorpayOrder(token, paymentModalPlan);

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'CloakWriter',
        description: `${paymentModalPlan.charAt(0).toUpperCase() + paymentModalPlan.slice(1)} Plan Subscription`,
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
              plan: paymentModalPlan,
            });
            onUpdateUser({ ...updatedUser, plan: paymentModalPlan });
            toast.success(`Successfully activated ${paymentModalPlan.toUpperCase()} Plan!`);
            closePaymentModal();
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

  const planDisplayName = paymentModalPlan
    ? paymentModalPlan.charAt(0).toUpperCase() + paymentModalPlan.slice(1)
    : '';

  return (
    <div className="pricing-section-container">

      {/* ── Payment Modal ──────────────────────────────────────────────── */}
      {paymentModalPlan && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closePaymentModal(); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '32px 28px',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={closePaymentModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px' }}>
                Activate {planDisplayName} Plan
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Choose how you&apos;d like to subscribe
              </p>
            </div>

            {/* ── Coupon Section ── */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '10px',
                  color: 'var(--text-primary)',
                }}
              >
                <Ticket size={16} color="#38bdf8" />
                Have a coupon code?
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCouponRedeem(); }}
                  placeholder="e.g. HUMYN-a7f3e9c1b2d04815"
                  style={{
                    flex: 1,
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: couponError
                      ? '1px solid rgba(239, 68, 68, 0.6)'
                      : '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.02em',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCouponRedeem}
                  disabled={couponLoading || !couponCode.trim()}
                  style={{
                    padding: '11px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#38bdf8',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: couponLoading || !couponCode.trim() ? 'not-allowed' : 'pointer',
                    opacity: couponLoading || !couponCode.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {couponLoading ? (
                    <Loader2 size={15} className="spinner-animate" />
                  ) : (
                    'Redeem'
                  )}
                </button>
              </div>

              {/* Coupon Error */}
              {couponError && (
                <p style={{
                  color: '#f87171',
                  fontSize: '0.8rem',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {couponError}
                </p>
              )}
            </div>

            {/* ── OR Divider ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                margin: '24px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                or
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* ── Razorpay Section ── */}
            <button
              type="button"
              onClick={handleRazorpayPayment}
              disabled={loadingPlan === paymentModalPlan}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 50%, #2563EB 100%)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: loadingPlan === paymentModalPlan ? 'not-allowed' : 'pointer',
                opacity: loadingPlan === paymentModalPlan ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(59, 130, 246, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loadingPlan === paymentModalPlan ? (
                <Loader2 size={16} className="spinner-animate" />
              ) : (
                <>
                  Pay with Razorpay <ArrowRight size={15} />
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '16px' }}>
              Secure payment powered by Razorpay. Cancel anytime.
            </p>
          </div>
        </div>
      )}

      {/* Header & Billing Cycle Toggle */}
      <div className="pricing-header">
        <h2 className="pricing-header-title">Flexible Plans for Every Writer</h2>
        <p className="pricing-header-subtitle">
          Choose the plan that fits your writing workflow. Powered by proprietary CloakWriter neural rewriting models.
        </p>

        {/* Toggle Capsule */}
        <div className="pricing-billing-toggle-container">
          <button
            type="button"
            className={`pricing-billing-toggle-btn ${billingCycle === 'monthly' ? 'pricing-billing-toggle-btn--active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              className={`pricing-billing-toggle-btn ${billingCycle === 'annually' ? 'pricing-billing-toggle-btn--active' : ''}`}
              onClick={() => setBillingCycle('annually')}
            >
              Annually
            </button>
            <span className="pricing-billing-badge">Save 25%</span>
          </div>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="pricing-cards-grid">
        
        {/* Plan 1: Free ($0) */}
        <div className="pricing-card">
          <div>
            <h3 className="pricing-card-title">Free</h3>
            <div className="pricing-card-price-container">
              <span className="pricing-card-price-amount">$0</span>
              <span className="pricing-card-price-period">Per month</span>
            </div>
            <p className="pricing-card-description">
              Essential AI humanization for quick tests and casual writing.
            </p>

            <div style={{ marginBottom: '28px' }}>
              {currentRank === 0 ? (
                <div className="pricing-btn-active">
                  ✓ Current Active Plan
                </div>
              ) : (
                <div style={{ opacity: 0.45, cursor: 'not-allowed', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Lower Tier Plan
                </div>
              )}
            </div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <Check size={16} /> 10 humanizations / day
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> 400 words per input
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Standard Bypass Pipeline
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Basic Processing Speed
              </li>
            </ul>
          </div>
        </div>

        {/* Plan 2: Plus Plan ($1) - Popular */}
        <div className="pricing-card pricing-card--popular">
          <div className="pricing-popular-badge">Popular</div>
          <div>
            <h3 className="pricing-card-title">Plus Plan</h3>
            <div className="pricing-card-price-container">
              <span className="pricing-card-price-amount">
                {billingCycle === 'annually' ? '$0.75' : '$1'}
              </span>
              <span className="pricing-card-price-period">Per month</span>
            </div>
            <p className="pricing-card-description">
              Perfect for students & creators needing daily anti-AI humanization.
            </p>

            <div style={{ marginBottom: '28px' }}>
              {currentRank === 1 ? (
                <div className="pricing-btn-active">
                  ✓ Current Active Plan
                </div>
              ) : currentRank < 1 ? (
                <button
                  type="button"
                  className="pricing-btn-white"
                  onClick={() => openPaymentModal('plus')}
                >
                  Upgrade to Plus
                </button>
              ) : (
                <div style={{ opacity: 0.45, cursor: 'not-allowed', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Lower Tier Plan
                </div>
              )}
            </div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <Check size={16} /> 30 humanizations / day
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> 1,000 words per input
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Enhanced Paraphrase Quality
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Fast Processing Speed
              </li>
            </ul>
          </div>
        </div>

        {/* Plan 3: Pro Plan ($2) */}
        <div className="pricing-card">
          <div>
            <h3 className="pricing-card-title">Pro Plan</h3>
            <div className="pricing-card-price-container">
              <span className="pricing-card-price-amount">
                {billingCycle === 'annually' ? '$1.50' : '$2'}
              </span>
              <span className="pricing-card-price-period">Per month</span>
            </div>
            <p className="pricing-card-description">
              Advanced anti-AI bypass for professionals, essays & articles.
            </p>

            <div style={{ marginBottom: '28px' }}>
              {currentRank === 2 ? (
                <div className="pricing-btn-active">
                  ✓ Current Active Plan
                </div>
              ) : currentRank < 2 ? (
                <button
                  type="button"
                  className="pricing-btn-dark"
                  onClick={() => openPaymentModal('pro')}
                >
                  Upgrade to Pro
                </button>
              ) : (
                <div style={{ opacity: 0.45, cursor: 'not-allowed', textAlign: 'center', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Lower Tier Plan
                </div>
              )}
            </div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <Check size={16} /> 80 humanizations / day
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> 2,500 words per input
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Advanced Humanization Engine
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> High AI Detector Bypass Rate
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Tone & Flow Controls
              </li>
            </ul>
          </div>
        </div>

        {/* Plan 4: Enterprise ($5) */}
        <div className="pricing-card">
          <div>
            <h3 className="pricing-card-title">Enterprise</h3>
            <div className="pricing-card-price-container">
              <span className="pricing-card-price-amount">
                {billingCycle === 'annually' ? '$3.75' : '$5'}
              </span>
              <span className="pricing-card-price-period">Per month</span>
            </div>
            <p className="pricing-card-description">
              Maximum word limits, priority AI engine, & full access.
            </p>

            <div style={{ marginBottom: '28px' }}>
              {currentRank === 3 ? (
                <div className="pricing-btn-active">
                  ✓ Current Active Plan
                </div>
              ) : (
                <button
                  type="button"
                  className="pricing-btn-dark"
                  onClick={() => openPaymentModal('enterprise')}
                >
                  Upgrade to Enterprise
                </button>
              )}
            </div>

            <ul className="pricing-features-list">
              <li className="pricing-feature-item">
                <Check size={16} /> 250 Humanizations / day
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> 5,000 words per input
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Maximum Detection Bypass
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Priority Processing Queue
              </li>
              <li className="pricing-feature-item">
                <Check size={16} /> Full Export Options
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

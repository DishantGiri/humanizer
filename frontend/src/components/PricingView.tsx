'use client';

import React, { useState } from 'react';
import { Check, Loader2, ArrowRight, Ticket, AlertCircle } from 'lucide-react';
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
  const [pageCouponCode, setPageCouponCode] = useState('');
  const [pageCouponLoading, setPageCouponLoading] = useState(false);
  const [pageCouponError, setPageCouponError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const PLAN_RANKS: Record<string, number> = {
    free: 0,
    plus: 1,
    starter: 1,
    pro: 2,
    enterprise: 3,
  };

  const currentPlan = (user?.plan || 'free').toLowerCase();
  const currentRank = PLAN_RANKS[currentPlan] ?? 0;

  // Direct upgrade flow via Payment Gateway
  const handleDirectUpgrade = async (planName: string) => {
    if (!user || !token) {
      toast.info('Please log in or register to choose a plan.');
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

    setLoadingPlan(planName);

    try {
      // Ensure Razorpay SDK script is dynamically available
      if (typeof (window as unknown as { Razorpay: unknown }).Razorpay === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.head.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
          script.onerror = resolve;
        });
      }

      if (typeof (window as unknown as { Razorpay: unknown }).Razorpay === 'undefined') {
        throw new Error('Payment gateway could not be loaded. Please check your internet connection or use a promo voucher code.');
      }

      const order = await createRazorpayOrder(token, planName);

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'CloakWriter',
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
              billing_cycle: billingCycle,
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
            toast.info('Payment checkout dismissed.');
            setLoadingPlan(null);
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Payment gateway currently unavailable. You can enter a promo voucher code below for instant activation.';
      toast.danger(msg);
      setLoadingPlan(null);
    }
  };

  // Promo code direct redemption
  const handlePageCouponRedeem = async () => {
    if (!pageCouponCode.trim()) {
      setPageCouponError('Please enter a promo coupon code.');
      return;
    }
    if (!token || !user) {
      toast.info('Please log in or register to redeem a promo code.');
      onRequireAuth();
      return;
    }

    setPageCouponLoading(true);
    setPageCouponError(null);

    try {
      const updatedUser = await redeemCoupon(token, pageCouponCode.trim());
      onUpdateUser(updatedUser);
      toast.success(`Promo code applied! ${updatedUser.plan.toUpperCase()} Plan activated.`);
      setPageCouponCode('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired coupon code.';
      setPageCouponError(msg);
    } finally {
      setPageCouponLoading(false);
    }
  };

  return (
    <div className="pricing-section-container">
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
                  disabled={loadingPlan === 'plus'}
                  onClick={() => handleDirectUpgrade('plus')}
                >
                  {loadingPlan === 'plus' ? <Loader2 size={16} className="spinner-animate" /> : 'Upgrade to Plus'}
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
                  disabled={loadingPlan === 'pro'}
                  onClick={() => handleDirectUpgrade('pro')}
                >
                  {loadingPlan === 'pro' ? <Loader2 size={16} className="spinner-animate" /> : 'Upgrade to Pro'}
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
                  disabled={loadingPlan === 'enterprise'}
                  onClick={() => handleDirectUpgrade('enterprise')}
                >
                  {loadingPlan === 'enterprise' ? <Loader2 size={16} className="spinner-animate" /> : 'Upgrade to Enterprise'}
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

      {/* Promo Code Quick Redeem Banner (Placed Below Pricing Cards) */}
      <div className="pricing-redeem-card">
        <div className="pricing-redeem-header">
          <div className="pricing-redeem-title">
            <Ticket size={18} />
            <span>Promo or Referral Code</span>
          </div>
          <span className="pricing-redeem-badge">
            Instant Free Access
          </span>
        </div>

        <p className="pricing-redeem-desc">
          Have a voucher or coupon code? Enter it below to unlock instant subscription tier upgrades without payment.
        </p>

        <div className="pricing-redeem-form">
          <input
            type="text"
            className={`pricing-redeem-input ${pageCouponError ? 'pricing-redeem-input--error' : ''}`}
            value={pageCouponCode}
            onChange={(e) => { setPageCouponCode(e.target.value); setPageCouponError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePageCouponRedeem(); }}
            placeholder="e.g. HUMYN-4a2b9c1d or CLOAK-PRO-..."
          />
          <button
            type="button"
            className="pricing-redeem-btn"
            onClick={handlePageCouponRedeem}
            disabled={pageCouponLoading || !pageCouponCode.trim()}
          >
            {pageCouponLoading ? (
              <Loader2 size={15} className="spinner-animate" />
            ) : (
              <>
                Apply Code <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>

        {pageCouponError && (
          <div className="pricing-redeem-error">
            <AlertCircle size={14} />
            <span>{pageCouponError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

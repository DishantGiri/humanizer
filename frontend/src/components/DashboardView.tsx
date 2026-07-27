'use client';

import React, { useEffect, useState } from 'react';
import {
  Wand2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Crown,
  History,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { getUserHistory, type User, type HistoryItem } from '@/lib/api';

interface DashboardViewProps {
  user: User | null;
  token: string | null;
  onNavigateToHumanizer: () => void;
  onNavigateToPricing: () => void;
  onRequireAuth: () => void;
}

export default function DashboardView({
  user,
  token,
  onNavigateToHumanizer,
  onNavigateToPricing,
  onRequireAuth,
}: DashboardViewProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user && token) {
      setLoadingHistory(true);
      getUserHistory(token)
        .then((items) => setHistory(items))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [user, token]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const usageCount = user ? user.usage_count : 0;
  const plan = user ? user.plan : 'free';
  const isPro = plan === 'pro';
  const limit = 10;
  const remaining = isPro ? 'Unlimited' : Math.max(0, limit - usageCount);
  const usagePercentage = isPro ? 100 : Math.min(100, Math.round((usageCount / limit) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(13, 22, 54, 0.9), rgba(18, 30, 75, 0.7))',
          border: '1px solid rgba(79, 140, 255, 0.2)',
          padding: '28px',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Welcome back, {user ? user.name : 'Creator'}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Transform AI-generated text into humanized content effortlessly.
          </p>
        </div>
        <button
          type="button"
          className="action-btn-solid"
          onClick={onNavigateToHumanizer}
          style={{ padding: '12px 20px', fontSize: '0.92rem' }}
        >
          <Wand2 size={16} />
          Start Humanizing
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Metric 1: Active Plan */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Current Plan
            </span>
            {isPro ? (
              <Crown size={20} color="var(--accent-amber)" />
            ) : (
              <Sparkles size={20} color="var(--accent-blue)" />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, textTransform: 'capitalize' }}>
              {isPro ? 'Pro Member' : 'Free Tier'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              {isPro ? '$1/month' : '$0/month'}
            </span>
          </div>
          {!isPro && (
            <button
              type="button"
              onClick={onNavigateToPricing}
              style={{
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              Upgrade to Pro ($1/mo) <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Metric 2: Usage Quota */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Humanizations Used
            </span>
            <Zap size={20} color={usageCount >= limit && !isPro ? '#f87171' : 'var(--accent-blue)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {usageCount}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              {isPro ? '/ Unlimited' : `/ ${limit} limit`}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${usagePercentage}%`,
                background: isPro ? '#10b981' : usageCount >= 8 ? '#f87171' : 'var(--accent-blue)',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Metric 3: Remaining */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Remaining Quota
            </span>
            <CheckCircle2 size={20} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
            {remaining}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '8px', display: 'block' }}>
            {isPro ? 'Unlimited rewrites active' : `${remaining} free uses left`}
          </span>
        </div>
      </div>

      {/* Upgrade Banner for Free Users */}
      {!isPro && user && usageCount >= 8 && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle color="#f87171" size={22} />
            <div>
              <h4 style={{ color: '#f87171', fontWeight: 600, fontSize: '0.95rem' }}>
                {usageCount >= 10 ? 'Free Limit Reached (10/10)' : 'Running Low on Free Humanizations'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Upgrade to Pro for only $1/month to unlock unlimited humanizations.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn-solid"
            onClick={onNavigateToPricing}
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            Upgrade for $1/mo
          </button>
        </div>
      )}

      {/* History Activity Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Humanizations</h3>
          </div>
          {user && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              {history.length} saved
            </span>
          )}
        </div>

        {!user ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              Log in or create an account to view and save your humanization history.
            </p>
            <button
              type="button"
              className="action-btn-solid"
              onClick={onRequireAuth}
              style={{ margin: '0 auto' }}
            >
              Log In / Register
            </button>
          </div>
        ) : loadingHistory ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Loading history...</span>
          </div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '16px' }}>
              No history found yet. Start humanizing text to view past activity!
            </p>
            <button type="button" className="action-btn-outline" onClick={onNavigateToHumanizer} style={{ margin: '0 auto' }}>
              Humanize Text Now
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(8, 12, 30, 0.6)',
                  border: '1px solid rgba(79, 140, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="chip" style={{ textTransform: 'capitalize' }}>
                      Mode: {item.mode}
                    </span>
                    <span className="chip">Level {item.level}</span>
                    <span className="chip">{item.word_count} words</span>
                  </div>
                  <button
                    type="button"
                    className="card-header-action-btn"
                    onClick={() => handleCopy(item.id, item.rewritten_text)}
                    title="Copy result"
                  >
                    {copiedId === item.id ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                  </button>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {item.rewritten_text.length > 180
                    ? `${item.rewritten_text.substring(0, 180)}...`
                    : item.rewritten_text}
                </p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

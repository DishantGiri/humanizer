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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getUserHistory, getCurrentUser, formatModeLabel, type User, type HistoryItem } from '@/lib/api';

interface DashboardViewProps {
  user: User | null;
  token: string | null;
  onUpdateUser?: (user: User) => void;
  onNavigateToHumanizer: () => void;
  onNavigateToPricing: () => void;
  onRequireAuth: () => void;
}

export default function DashboardView({
  user,
  token,
  onUpdateUser,
  onNavigateToHumanizer,
  onNavigateToPricing,
  onRequireAuth,
}: DashboardViewProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 5;

  const totalHistoryPages = Math.ceil(history.length / HISTORY_PER_PAGE) || 1;
  const currentHistoryPage = Math.min(historyPage, totalHistoryPages);
  const paginatedHistory = history.slice(
    (currentHistoryPage - 1) * HISTORY_PER_PAGE,
    currentHistoryPage * HISTORY_PER_PAGE
  );

  useEffect(() => {
    if (token) {
      setLoadingHistory(true);
      getUserHistory(token)
        .then((items) => setHistory(items))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [token]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const plan = (user?.plan || 'free').toLowerCase().trim();
  const PLAN_DAILY_LIMITS: Record<string, number> = {
    free: 10,
    starter: 30,
    plus: 30,
    pro: 80,
    enterprise: 250,
  };
  const limit = PLAN_DAILY_LIMITS[plan] || 10;

  // Calculate actual rewrites performed today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = history.filter((item) => {
    if (!item.created_at) return false;
    return item.created_at.startsWith(todayStr);
  }).length;

  const displayUsage = Math.min(limit, todayCount);
  const remaining = Math.max(0, limit - displayUsage);
  const usagePercentage = Math.min(100, Math.round((displayUsage / limit) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
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
            {plan !== 'free' ? (
              <Crown size={20} color="var(--text-primary)" />
            ) : (
              <Sparkles size={20} color="var(--text-primary)" />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, textTransform: 'capitalize' }}>
              {plan === 'enterprise' ? 'Enterprise' : plan === 'pro' ? 'Pro Member' : (plan === 'plus' || plan === 'starter') ? 'Plus Member' : 'Free Tier'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              {plan === 'enterprise' ? '$5/month' : plan === 'pro' ? '$2/month' : (plan === 'plus' || plan === 'starter') ? '$1/month' : '$0/month'}
            </span>
          </div>
          {plan === 'free' && (
            <button
              type="button"
              onClick={onNavigateToPricing}
              style={{
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              Upgrade Plan <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Metric 2: Usage Quota */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Humanizations Used Today
            </span>
            <Zap size={20} color={displayUsage >= limit ? '#f87171' : 'var(--text-primary)'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              {displayUsage}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              {`/ ${limit} daily limit`}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${usagePercentage}%`,
                background: displayUsage >= limit ? '#f87171' : 'var(--text-primary)',
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
              Remaining Daily Quota
            </span>
            <CheckCircle2 size={20} color="var(--text-primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {remaining}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '8px', display: 'block' }}>
            {`${remaining} daily uses left`}
          </span>
        </div>
      </div>

      {/* Upgrade Banner for Free Users */}
      {plan === 'free' && user && displayUsage >= 8 && (
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
                {displayUsage >= 10 ? 'Free Daily Limit Reached (10/10)' : 'Running Low on Free Daily Humanizations'}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Upgrade your plan for up to 250 daily humanizations and 5,000 max words per input.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn-solid"
            onClick={onNavigateToPricing}
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* History Activity Section */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="var(--text-primary)" />
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
            {paginatedHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="chip">
                      Mode: {formatModeLabel(item.mode)}
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

            {/* Pagination Controls */}
            {totalHistoryPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  Showing {(currentHistoryPage - 1) * HISTORY_PER_PAGE + 1} - {Math.min(currentHistoryPage * HISTORY_PER_PAGE, history.length)} of {history.length} humanizations
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={currentHistoryPage === 1}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: currentHistoryPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: currentHistoryPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentHistoryPage === 1 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>

                  {Array.from({ length: totalHistoryPages }, (_, idx) => idx + 1).map((pg) => {
                    if (
                      pg === 1 ||
                      pg === totalHistoryPages ||
                      Math.abs(pg - currentHistoryPage) <= 1
                    ) {
                      return (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => setHistoryPage(pg)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            padding: '0 6px',
                            borderRadius: '8px',
                            border: pg === currentHistoryPage ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                            background: pg === currentHistoryPage ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-secondary)',
                            color: pg === currentHistoryPage ? '#38bdf8' : 'var(--text-secondary)',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {pg}
                        </button>
                      );
                    }
                    if (pg === 2 && currentHistoryPage > 3) {
                      return <span key="ellipsis-start" style={{ color: 'var(--text-tertiary)', padding: '0 2px' }}>...</span>;
                    }
                    if (pg === totalHistoryPages - 1 && currentHistoryPage < totalHistoryPages - 2) {
                      return <span key="ellipsis-end" style={{ color: 'var(--text-tertiary)', padding: '0 2px' }}>...</span>;
                    }
                    return null;
                  })}

                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={currentHistoryPage === totalHistoryPages}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-secondary)',
                      color: currentHistoryPage === totalHistoryPages ? 'var(--text-muted)' : 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: currentHistoryPage === totalHistoryPages ? 'not-allowed' : 'pointer',
                      opacity: currentHistoryPage === totalHistoryPages ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

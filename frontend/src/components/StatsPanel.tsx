'use client';

import React, { useEffect, useState } from 'react';
import {
  Type,
  Hash,
  BookOpen,
  Clock,
  RefreshCw,
  Percent,
  AlignLeft,
  Ruler,
  BarChart3,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import type { TextStats, ChangeStats, ReadingTime } from '@/lib/api';

interface StatsPanelProps {
  originalStats: TextStats | null;
  rewrittenStats: TextStats | null;
  changes: ChangeStats | null;
  readingTime: ReadingTime | null;
  meaningPreserved: boolean | null;
  meaningReason: string;
}

function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) {
      queueMicrotask(() => setDisplayed(0));
      return;
    }

    const startTime = performance.now();
    const startVal = displayed;
    const diff = value - startVal;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(startVal + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{displayed.toLocaleString()}</>;
}

function readabilityColor(score: number): string {
  if (score >= 70) return 'stat-card__value--success';
  if (score >= 50) return 'stat-card__value--warning';
  return 'stat-card__value--danger';
}

interface StatItemProps {
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  valueClass?: string;
}

function StatItem({ icon: Icon, value, label, valueClass = '' }: StatItemProps) {
  return (
    <div className="glass-card stat-card">
      <div style={{ color: 'var(--text-tertiary)', marginBottom: '6px' }}>
        <Icon size={18} />
      </div>
      <div className={`stat-card__value ${valueClass}`}>{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

export default function StatsPanel({
  originalStats,
  rewrittenStats,
  changes,
  readingTime,
  meaningPreserved,
  meaningReason,
}: StatsPanelProps) {
  if (!rewrittenStats) return null;

  const stats = rewrittenStats;

  return (
    <div className="stats-section">
      <h2 className="stats-section__title">
        <BarChart3 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
        Statistics
      </h2>
      <div className="stats-grid">
        <StatItem
          icon={Type}
          value={<AnimatedNumber value={stats.word_count} />}
          label="Words"
        />
        <StatItem
          icon={Hash}
          value={<AnimatedNumber value={stats.character_count} />}
          label="Characters"
        />
        <StatItem
          icon={BookOpen}
          value={<AnimatedNumber value={Math.round(stats.readability_score)} />}
          label="Readability"
          valueClass={readabilityColor(stats.readability_score)}
        />
        <StatItem
          icon={Clock}
          value={readingTime ? readingTime.label : '—'}
          label="Reading Time"
        />

        {changes && (
          <StatItem
            icon={RefreshCw}
            value={<AnimatedNumber value={changes.total_changes} />}
            label="Changes"
          />
        )}

        {changes && (
          <StatItem
            icon={Percent}
            value={`${changes.change_percentage}%`}
            label="Changed"
          />
        )}

        <StatItem
          icon={AlignLeft}
          value={<AnimatedNumber value={stats.sentence_count} />}
          label="Sentences"
        />
        <StatItem
          icon={Ruler}
          value={stats.avg_sentence_length}
          label="Avg Length"
        />
      </div>

      {meaningPreserved !== null && (
        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
          <span
            className={`meaning-badge ${
              meaningPreserved ? 'meaning-badge--preserved' : 'meaning-badge--warning'
            }`}
            title={meaningReason}
          >
            {meaningPreserved ? (
              <ShieldCheck size={14} style={{ verticalAlign: 'middle' }} />
            ) : (
              <ShieldAlert size={14} style={{ verticalAlign: 'middle' }} />
            )}{' '}
            {meaningPreserved ? 'Meaning Preserved' : 'Meaning May Have Changed'}
          </span>
          {meaningReason && (
            <p
              style={{
                color: 'var(--text-tertiary)',
                fontSize: '0.78rem',
                marginTop: '8px',
              }}
            >
              {meaningReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

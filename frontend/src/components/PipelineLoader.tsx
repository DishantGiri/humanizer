'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ScanSearch,
  Layers,
  Wand2,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface PipelineStage {
  id: number;
  title: string;
  subtitle: string;
  buttonLabel: string;
  icon: React.ElementType;
}

export const getPipelineStages = (level: number): PipelineStage[] => {
  const stages: PipelineStage[] = [
    {
      id: 1,
      title: 'Analyzing Text Patterns',
      subtitle: 'Evaluating sentence structure, rhythm, and baseline tone...',
      buttonLabel: 'Analyzing structure...',
      icon: ScanSearch,
    },
    {
      id: 2,
      title: 'Refining Flow & Structure',
      subtitle: 'Mapping vocabulary variations and natural human expressions...',
      buttonLabel: 'Planning strategy...',
      icon: Layers,
    },
    {
      id: 3,
      title: 'Enhancing Natural Variety',
      subtitle: 'Introducing organic phrasing variations and cadence shifts...',
      buttonLabel: 'Optimizing flow...',
      icon: Wand2,
    },
  ];

  if (level >= 3) {
    stages.push({
      id: stages.length + 1,
      title: 'Deep Humanization Pass',
      subtitle: 'Restructuring complex phrasing for complete AI detector bypass...',
      buttonLabel: 'Applying deep pass...',
      icon: RefreshCw,
    });
  }

  stages.push({
    id: stages.length + 1,
    title: 'Polishing Readability',
    subtitle: 'Smoothing sentence transitions and vocabulary flow...',
    buttonLabel: 'Polishing text...',
    icon: SlidersHorizontal,
  });

  stages.push({
    id: stages.length + 1,
    title: 'Final Quality Check',
    subtitle: 'Preserving original meaning, accuracy, and tone...',
    buttonLabel: 'Verifying result...',
    icon: ShieldCheck,
  });

  // Re-index stages just to be safe
  return stages.map((stage, index) => ({
    ...stage,
    id: index + 1,
  }));
};

interface PipelineLoaderProps {
  isLoading: boolean;
  level: number;
  onStageChange?: (stage: PipelineStage, currentStep: number, totalSteps: number) => void;
}

export default function PipelineLoader({
  isLoading,
  level,
  onStageChange,
}: PipelineLoaderProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const stages = useMemo(() => getPipelineStages(level), [level]);

  const onStageChangeRef = useRef(onStageChange);

  // Keep ref updated to latest handler reference
  useEffect(() => {
    onStageChangeRef.current = onStageChange;
  }, [onStageChange]);

  // Synchronize state index changes to parent callback via effect
  useEffect(() => {
    if (isLoading && onStageChangeRef.current) {
      onStageChangeRef.current(stages[currentStageIdx], currentStageIdx + 1, stages.length);
    }
  }, [currentStageIdx, isLoading, stages]);

  useEffect(() => {
    if (!isLoading) {
      queueMicrotask(() => setCurrentStageIdx(0));
      return;
    }

    // Determine step duration based on intensity level and stage count
    // Level 1: fast (~0.8s per step)
    // Level 2: moderate (~1.5s per step)
    // Level 3: deep (~2.5s per step)
    const stepDuration = level === 1 ? 800 : level === 2 ? 1500 : 2500;

    queueMicrotask(() => setCurrentStageIdx(0));

    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isLoading, level, stages]);



  if (!isLoading) return null;


  const currentStage = stages[currentStageIdx];
  const progressPercent = Math.round(
    ((currentStageIdx + 1) / stages.length) * 100
  );

  return (
    <div className="pipeline-loader">
      {/* Background ambient glow */}
      <div className="pipeline-loader__glow" />

      {/* Top Header & Progress */}
      <div className="pipeline-loader__header">
        <div className="pipeline-loader__badge">
          <Sparkles className="pipeline-loader__badge-icon" size={14} />
          <span>Stage {currentStageIdx + 1} of {stages.length}</span>
        </div>
        <span className="pipeline-loader__percentage">{progressPercent}%</span>
      </div>

      {/* Animated Progress Bar */}
      <div className="pipeline-loader__progress-track">
        <div
          className="pipeline-loader__progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Active Stage Highlight Box */}
      <div className="pipeline-loader__active-box">
        <div className="pipeline-loader__active-icon-wrapper">
          <currentStage.icon className="pipeline-loader__active-icon" size={22} />
          <div className="pipeline-loader__pulse-ring" />
        </div>
        <div className="pipeline-loader__active-info">
          <h4 className="pipeline-loader__active-title">{currentStage.title}</h4>
          <p className="pipeline-loader__active-subtitle">{currentStage.subtitle}</p>
        </div>
        <Loader2 size={18} className="pipeline-loader__spinner" />
      </div>

      {/* Step List Overview */}
      <div className="pipeline-loader__steps">
        {stages.map((stage, idx) => {
          const isDone = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;

          return (
            <div
              key={stage.id}
              className={`pipeline-loader__step ${
                isDone
                  ? 'pipeline-loader__step--done'
                  : isCurrent
                  ? 'pipeline-loader__step--current'
                  : 'pipeline-loader__step--pending'
              }`}
            >
              <div className="pipeline-loader__step-indicator">
                {isDone ? (
                  <CheckCircle2 size={15} className="pipeline-loader__check-icon" />
                ) : isCurrent ? (
                  <div className="pipeline-loader__current-dot" />
                ) : (
                  <span className="pipeline-loader__step-num">{stage.id}</span>
                )}
              </div>
              <span className="pipeline-loader__step-name">{stage.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

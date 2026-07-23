/**
 * API client for communicating with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────

export type RewriteMode =
  | 'academic'
  | 'professional'
  | 'casual'
  | 'business'
  | 'friendly'
  | 'simple'
  | 'native'
  | 'formal'
  | 'concise';

export type RewriteLevel = 1 | 2 | 3;

export interface RewriteRequest {
  text: string;
  mode: RewriteMode;
  level: RewriteLevel;
}

export interface TextStats {
  word_count: number;
  character_count: number;
  sentence_count: number;
  paragraph_count: number;
  avg_sentence_length: number;
  readability_score: number;
  readability_grade: string;
  vocabulary_diversity: number;
  repeated_words: { word: string; count: number }[];
  repeated_phrases: { phrase: string; count: number }[];
  passive_voice_count: number;
  reading_time_seconds: number;
}

export interface ChangeStats {
  total_changes: number;
  words_added: number;
  words_removed: number;
  change_percentage: number;
}

export interface ReadingTime {
  minutes: number;
  seconds: number;
  label: string;
}

export interface DiffWord {
  type: 'equal' | 'insert' | 'delete';
  value: string;
}

export interface RewriteResponse {
  rewritten: string;
  original_stats: TextStats;
  rewritten_stats: TextStats;
  changes: ChangeStats;
  reading_time: ReadingTime;
  meaning_preserved: boolean;
  meaning_reason: string;
  word_diff: DiffWord[];
}

export interface ApiError {
  detail: string;
}

// ── API Functions ──────────────────────────────────────────────────────────

export async function rewriteText(request: RewriteRequest): Promise<RewriteResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 240_000); // 4 min timeout for translation bounce pipeline

  try {
    const response = await fetch(`${API_BASE}/api/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `Server error (${response.status})`,
      }));
      throw new Error(error.detail);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The text may be too long or the server is busy.');
      }
      throw error;
    }
    throw new Error('An unexpected error occurred.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function analyzeText(text: string): Promise<TextStats> {
  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Server error (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

// ── Mode metadata (icon names reference Lucide icon components) ────────────

export type ModeIcon =
  | 'speech'
  | 'graduation'
  | 'briefcase'
  | 'coffee'
  | 'chart'
  | 'smile'
  | 'sparkles'
  | 'crown'
  | 'zap';

export const MODES: { value: RewriteMode; label: string; icon: ModeIcon; description: string }[] = [
  { value: 'native',       label: 'Native Speaker',  icon: 'speech',     description: 'Natural, idiomatic English' },
  { value: 'academic',     label: 'Academic',        icon: 'graduation', description: 'Scholarly, precise tone' },
  { value: 'professional', label: 'Professional',    icon: 'briefcase',  description: 'Clean, workplace-ready' },
  { value: 'casual',       label: 'Casual',          icon: 'coffee',     description: 'Relaxed, conversational' },
  { value: 'business',     label: 'Business',        icon: 'chart',      description: 'Action-oriented, executive' },
  { value: 'friendly',     label: 'Friendly',        icon: 'smile',      description: 'Warm and approachable' },
  { value: 'simple',       label: 'Simple English',  icon: 'sparkles',   description: 'Plain, easy to understand' },
  { value: 'formal',       label: 'Formal',          icon: 'crown',      description: 'Polished, official tone' },
  { value: 'concise',      label: 'Concise',         icon: 'zap',        description: 'Tight, minimal wording' },
];

export const LEVELS: { value: RewriteLevel; label: string; description: string }[] = [
  { value: 1, label: 'Light',    description: 'Grammar fixes, small improvements' },
  { value: 2, label: 'Moderate', description: 'Restructured sentences, better flow' },
  { value: 3, label: 'Heavy',    description: 'Significant restructuring' },
];

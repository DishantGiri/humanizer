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
  meaning_preservation_score?: number;
  similarity_metrics?: {
    fuzzy_similarity?: number;
    token_set_ratio?: number;
    semantic_similarity?: number;
    meaning_preservation_score?: number;
    is_duplicate?: boolean;
  };
  nlp_analysis?: {
    pos_distribution?: Record<string, number>;
    passive_voice_count?: number;
    active_voice_count?: number;
    entities?: { text: string; label: string }[];
    avg_dependency_depth?: number;
    has_spacy?: boolean;
  };
  word_diff: DiffWord[];
}

export interface ApiError {
  detail?: string | any;
  message?: string;
  error?: string;
}

/**
 * Safely parses backend error responses (strings, Pydantic validation error lists, objects)
 * into a clean, human-readable error message. Prevents [object Object] toast bugs.
 */
export function parseErrorMessage(errorJson: any, defaultMsg: string): string {
  if (!errorJson) return defaultMsg;
  if (typeof errorJson === 'string') {
    if (errorJson.toLowerCase().includes('valid email address') || errorJson.includes('EmailStr')) {
      return 'Please enter correct email format';
    }
    return errorJson;
  }

  const detail = errorJson.detail !== undefined ? errorJson.detail : (errorJson.message || errorJson.error);

  if (typeof detail === 'string') {
    if (detail.toLowerCase().includes('valid email address') || detail.includes('EmailStr')) {
      return 'Please enter correct email format';
    }
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          if (item.toLowerCase().includes('valid email address')) return 'Please enter correct email format';
          return item;
        }
        if (item && typeof item === 'object') {
          if (item.msg) {
            if (typeof item.msg === 'string' && item.msg.toLowerCase().includes('valid email address')) {
              return 'Please enter correct email format';
            }
            const field = Array.isArray(item.loc) && item.loc.length > 0 ? `${item.loc[item.loc.length - 1]}` : '';
            return field && field !== 'body' ? `${field}: ${item.msg}` : item.msg;
          }
          return JSON.stringify(item);
        }
        return '';
      })
      .filter(Boolean);

    if (messages.length > 0) return Array.from(new Set(messages)).join('. ');
  }

  if (typeof detail === 'object' && detail !== null) {
    if (detail.msg) {
      if (typeof detail.msg === 'string' && detail.msg.toLowerCase().includes('valid email address')) {
        return 'Please enter correct email format';
      }
      return detail.msg;
    }
    return JSON.stringify(detail);
  }

  return defaultMsg;
}

// ── Auth & User Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'starter' | 'plus' | 'pro' | string;
  role?: 'user' | 'admin' | string;
  usage_count: number;
  is_first_login?: number;
  created_at: string;
  avatar_url?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface HistoryItem {
  id: string;
  original_text: string;
  rewritten_text: string;
  mode: string;
  level: number;
  word_count: number;
  created_at: string;
}

// ── API Functions ──────────────────────────────────────────────────────────

export async function rewriteText(request: RewriteRequest, token?: string | null): Promise<RewriteResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 240_000); // 4 min timeout

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}/api/rewrite`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => null);
      throw new Error(parseErrorMessage(errorJson, `Server error (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Server error (${response.status})`));
  }

  return await response.json();
}

// ── Auth & Plan API Functions ──────────────────────────────────────────────

export async function registerUser(name: string, email: string, password: string): Promise<{
  message: string;
  email: string;
  user?: User;
  token?: string;
  require_verification?: boolean;
  email_sent?: boolean;
}> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Registration failed (${response.status})`));
  }

  return await response.json();
}

export async function verifyEmail(email: string, code: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Email verification failed (${response.status})`));
  }

  return await response.json();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Forgot password request failed (${response.status})`));
  }

  return await response.json();
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Password reset failed (${response.status})`));
  }

  return await response.json();
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Login failed (${response.status})`));
  }

  return await response.json();
}

export async function fetchGoogleOauthConfig(): Promise<{ client_id: string }> {
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    return { client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID };
  }
  const response = await fetch(`${API_BASE}/api/auth/google/config`).catch(() => null);
  if (!response || !response.ok) {
    return { client_id: '' };
  }
  return await response.json().catch(() => ({ client_id: '' }));
}

export async function googleAuthUser(params: { credential?: string; code?: string; redirect_uri?: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Google authentication failed (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Failed to authenticate (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

export async function upgradeToPro(token: string, plan: string = 'pro'): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/upgrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Upgrade failed (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

export async function createRazorpayOrder(token: string, plan: string): Promise<{
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan: string;
}> {
  const response = await fetch(`${API_BASE}/api/auth/razorpay/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  });
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Failed to create order (${response.status})`,
    }));
    throw new Error(error.detail);
  }
  return await response.json();
}

export async function verifyRazorpayPayment(
  token: string,
  data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan: string;
  }
): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/razorpay/verify-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Payment verification failed (${response.status})`,
    }));
    throw new Error(error.detail);
  }
  return await response.json();
}

export async function redeemCoupon(token: string, code: string): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/redeem-coupon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Coupon redemption failed (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

export async function updateProfile(token: string, data: { name?: string; avatar_url?: string }): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Profile update failed (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

export async function changePassword(token: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: `Password change failed (${response.status})`,
    }));
    throw new Error(error.detail);
  }

  return await response.json();
}

export async function getUserHistory(token: string): Promise<HistoryItem[]> {
  const response = await fetch(`${API_BASE}/api/user/history`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

export async function logoutUser(token?: string): Promise<void> {
  if (!token) return;
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// ── Admin API Functions ────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number;
  total_rewrites: number;
  total_words: number;
  active_subscribers: number;
  total_coupons: number;
}

export interface AdminActivityItem {
  id: string;
  user_name: string;
  user_email: string;
  original_snippet: string;
  rewritten_snippet: string;
  word_count: number;
  mode: string;
  created_at: string;
}

export interface AdminAnalyticsResponse {
  stats: AdminStats;
  plan_breakdown: Record<string, number>;
  recent_activity: AdminActivityItem[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  usage_count: number;
  avatar_url?: string;
  created_at: string;
}

export interface AdminCoupon {
  code: string;
  plan: string;
  max_uses: number;
  used_count: number;
  is_redeemed: boolean;
  redeemed_by?: string;
  redeemed_at?: string;
  created_at: string;
}

export async function fetchAdminAnalytics(token: string): Promise<AdminAnalyticsResponse> {
  const response = await fetch(`${API_BASE}/api/admin/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch admin analytics' }));
    throw new Error(errorData.detail || 'Failed to fetch admin analytics');
  }
  return await response.json();
}

export async function fetchAdminUsers(token: string, search?: string, planFilter?: string): Promise<{ total: number; users: AdminUser[] }> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (planFilter) params.set('plan_filter', planFilter);

  const response = await fetch(`${API_BASE}/api/admin/users?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch users list' }));
    throw new Error(errorData.detail || 'Failed to fetch users list');
  }
  return await response.json();
}

export async function updateAdminUser(
  token: string,
  userId: string,
  data: { plan?: string; role?: string; usage_count?: number }
): Promise<AdminUser> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to update user' }));
    throw new Error(errorData.detail || 'Failed to update user');
  }
  const result = await response.json();
  return result.user;
}

export async function deleteAdminUser(token: string, userId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to delete user' }));
    throw new Error(errorData.detail || 'Failed to delete user');
  }
}

export async function fetchAdminCoupons(token: string): Promise<{ total: number; coupons: AdminCoupon[] }> {
  const response = await fetch(`${API_BASE}/api/admin/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch coupons list' }));
    throw new Error(errorData.detail || 'Failed to fetch coupons list');
  }
  return await response.json();
}

export async function generateAdminCoupons(
  token: string,
  data: { plan: string; prefix?: string; quantity?: number; max_uses?: number }
): Promise<{ message: string; codes: string[]; plan: string }> {
  const response = await fetch(`${API_BASE}/api/admin/coupons/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to generate coupons' }));
    throw new Error(errorData.detail || 'Failed to generate coupons');
  }
  return await response.json();
}

export async function revokeAdminCoupon(token: string, code: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/admin/coupons/${code}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.detail || 'Failed to revoke coupon code.');
  }

  return response.json();
}

export async function updateAdminCredentials(
  token: string,
  data: { name?: string; email?: string; new_password?: string; current_password?: string }
): Promise<{ message: string; user: User; token: string }> {
  const response = await fetch(`${API_BASE}/api/admin/update-credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.detail || 'Failed to update admin credentials.');
  }

  return response.json();
}

// ── Mode metadata ──────────────────────────────────────────────────────────

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

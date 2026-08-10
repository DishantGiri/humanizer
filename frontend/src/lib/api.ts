/**
 * API client for communicating with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────

export type RewriteMode =
  | 'standard'
  | 'fluency'
  | 'natural'
  | 'academic'
  | 'creative'
  | 'native'
  | 'professional'
  | 'casual'
  | 'business'
  | 'friendly'
  | 'simple'
  | 'formal'
  | 'concise';

export function formatModeLabel(mode?: string | null): string {
  if (!mode) return 'Standard';
  const m = mode.toLowerCase().trim();
  const map: Record<string, string> = {
    standard: 'Standard',
    native: 'Standard',
    fluency: 'Fluency',
    professional: 'Fluency',
    natural: 'Natural',
    casual: 'Natural',
    academic: 'Academic',
    creative: 'Creative',
    friendly: 'Creative',
    business: 'Business',
    formal: 'Formal',
    simple: 'Simple',
    concise: 'Concise',
  };
  return map[m] || (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Standard');
}

export function formatPlanLabel(planStr?: string | null): string {
  const p = (planStr || 'free').toLowerCase().trim();
  if (p === 'enterprise') return 'Enterprise';
  if (p === 'pro') return 'Pro';
  if (p === 'plus' || p === 'starter') return 'Plus';
  return 'Free';
}

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
  grammar_score?: number;
  grammar_issues_count?: number;
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

  const isEmailError = (str: string, locArr?: any[]) => {
    const lower = str.toLowerCase();
    if (
      lower.includes('already exists') ||
      lower.includes('already registered') ||
      lower.includes('invalid email or password') ||
      lower.includes('email or password') ||
      lower.includes('incorrect email or password') ||
      lower.includes('user not found') ||
      lower.includes('invalid credentials')
    ) {
      return false;
    }
    if (
      lower.includes('valid email') ||
      lower.includes('not a valid email') ||
      lower.includes('email format') ||
      lower.includes('emailstr') ||
      lower.includes('top-level domain') ||
      lower.includes('contain a @') ||
      lower.includes('value_error.email') ||
      lower.includes('email_parsing') ||
      (Array.isArray(locArr) && locArr.some((loc) => String(loc).toLowerCase() === 'email'))
    ) {
      return true;
    }
    return false;
  };

  const isNameError = (str: string, locArr?: any[]): string | null => {
    const lower = str.toLowerCase();
    const isNameLoc = Array.isArray(locArr) && locArr.some((loc) => String(loc).toLowerCase() === 'name');
    if (isNameLoc || lower.includes('name')) {
      if (
        lower.includes('at least 2') ||
        lower.includes('2 character') ||
        lower.includes('too short') ||
        lower.includes('min_length') ||
        lower.includes('string_too_short') ||
        lower.includes('special character')
      ) {
        if (lower.includes('special character')) {
          return 'Name cannot contain special characters (e.g., !@#$%^&*).';
        }
        return 'Name must be at least 2 characters long.';
      }
    }
    return null;
  };

  const isPasswordError = (str: string, locArr?: any[]): string | null => {
    const lower = str.toLowerCase();
    const isPwdLoc = Array.isArray(locArr) && locArr.some((loc) => String(loc).toLowerCase() === 'password');
    if (isPwdLoc || lower.includes('password')) {
      if (lower.includes('6 character') || lower.includes('min_length') || lower.includes('too short') || lower.includes('string_too_short')) {
        return 'Password must be at least 6 characters long.';
      }
    }
    return null;
  };

  if (typeof errorJson === 'string') {
    if (errorJson === '[object Object]') return defaultMsg;
    if (isEmailError(errorJson)) return 'Please enter correct email format';
    const nameErr = isNameError(errorJson);
    if (nameErr) return nameErr;
    const pwdErr = isPasswordError(errorJson);
    if (pwdErr) return pwdErr;
    return errorJson;
  }

  const detail = errorJson.detail !== undefined ? errorJson.detail : (errorJson.message || errorJson.error);

  if (typeof detail === 'string') {
    if (detail === '[object Object]') return defaultMsg;
    if (isEmailError(detail)) return 'Please enter correct email format';
    const nameErr = isNameError(detail);
    if (nameErr) return nameErr;
    const pwdErr = isPasswordError(detail);
    if (pwdErr) return pwdErr;
    return detail;
  }

  if (Array.isArray(detail)) {
    let emailErrFound = false;
    let nameErrFound: string | null = null;
    let pwdErrFound: string | null = null;

    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          if (isEmailError(item)) {
            emailErrFound = true;
            return 'Please enter correct email format';
          }
          const nErr = isNameError(item);
          if (nErr) {
            nameErrFound = nErr;
            return nErr;
          }
          const pErr = isPasswordError(item);
          if (pErr) {
            pwdErrFound = pErr;
            return pErr;
          }
          return item;
        }
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc) ? item.loc : [];
          const itemMsg = typeof item.msg === 'string' ? item.msg : (item.detail || item.message || '');
          const itemType = typeof item.type === 'string' ? item.type : '';

          if (isEmailError(itemMsg, loc) || itemType.includes('email')) {
            emailErrFound = true;
            return 'Please enter correct email format';
          }

          const nErr = isNameError(itemMsg + ' ' + itemType, loc);
          if (nErr) {
            nameErrFound = nErr;
            return nErr;
          }

          const pErr = isPasswordError(itemMsg + ' ' + itemType, loc);
          if (pErr) {
            pwdErrFound = pErr;
            return pErr;
          }

          if (itemMsg) {
            const field = loc.length > 0 ? `${loc[loc.length - 1]}` : '';
            return field && field !== 'body' ? `${field}: ${itemMsg}` : itemMsg;
          }
          try {
            return JSON.stringify(item);
          } catch {
            return '';
          }
        }
        return '';
      })
      .filter(Boolean);

    if (nameErrFound) return nameErrFound;
    if (emailErrFound) return 'Please enter correct email format';
    if (pwdErrFound) return pwdErrFound;
    if (messages.length > 0) return Array.from(new Set(messages)).join('. ');
  }

  if (typeof detail === 'object' && detail !== null) {
    const loc = Array.isArray(detail.loc) ? detail.loc : [];
    if (detail.msg && typeof detail.msg === 'string') {
      if (isEmailError(detail.msg, loc)) return 'Please enter correct email format';
      const nErr = isNameError(detail.msg, loc);
      if (nErr) return nErr;
      const pErr = isPasswordError(detail.msg, loc);
      if (pErr) return pErr;
      return detail.msg;
    }
    try {
      const jsonStr = JSON.stringify(detail);
      if (isEmailError(jsonStr, loc)) return 'Please enter correct email format';
      const nErr = isNameError(jsonStr, loc);
      if (nErr) return nErr;
      const pErr = isPasswordError(jsonStr, loc);
      if (pErr) return pErr;
      return jsonStr !== '{}' && jsonStr !== '[object Object]' ? jsonStr : defaultMsg;
    } catch {
      return defaultMsg;
    }
  }

  return defaultMsg;
}

// ── Auth & User Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'plus' | 'pro' | 'enterprise' | 'starter' | string;
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

export interface FileParseResponse {
  filename: string;
  text: string;
  word_count: number;
  character_count: number;
}

// ── API Functions ──────────────────────────────────────────────────────────

export async function parseUploadedFile(file: File, token?: string | null): Promise<FileParseResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/parse-file`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Failed to parse document (${response.status})`));
  }

  return await response.json();
}

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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Google authentication failed (${response.status})`));
  }

  return await response.json();
}

export function getUserFromToken(token: string): User | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || (!payload.sub && !payload.id && !payload.email)) return null;
    return {
      id: payload.sub || payload.id || '',
      email: payload.email || '',
      name: payload.name || payload.email?.split('@')[0] || 'User',
      role: payload.role || 'user',
      plan: payload.plan || 'free',
      usage_count: payload.usage_count || 0,
      avatar_url: payload.avatar_url || null,
      created_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Failed to authenticate (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Upgrade failed (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Failed to create order (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Payment verification failed (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Coupon redemption failed (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Profile update failed (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, `Password change failed (${response.status})`));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to fetch admin analytics'));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to fetch users list'));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to update user'));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to delete user'));
  }
}

export async function fetchAdminCoupons(token: string): Promise<{ total: number; coupons: AdminCoupon[] }> {
  const response = await fetch(`${API_BASE}/api/admin/coupons`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to fetch coupons list'));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to generate coupons'));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to revoke coupon code.'));
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
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to update admin credentials.'));
  }

  return response.json();
}

// ── SEO Management Types & API Functions ───────────────────────────────────

export interface PageSeoSettings {
  page_slug: string;
  page_name: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  h1_title: string;
  h2_subtitle: string;
  canonical_url: string;
  robots_index: string;
  og_title: string;
  og_description: string;
  og_image: string;
  og_type: string;
  twitter_card: string;
  twitter_site: string;
  schema_type: string;
  schema_json: string;
  custom_head_tags: string;
  google_verification: string;
  bing_verification: string;
  robots_txt: string;
  sitemap_enabled: number;
  custom_header_scripts: string;
  custom_footer_scripts: string;
  updated_at?: string;
}

export async function fetchAdminSeo(token: string): Promise<{ pages: PageSeoSettings[] }> {
  const response = await fetch(`${API_BASE}/api/admin/seo`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to load SEO settings.'));
  }

  return response.json();
}

export async function updateAdminPageSeo(
  pageSlug: string,
  data: Partial<PageSeoSettings>,
  token: string
): Promise<{ message: string; seo: PageSeoSettings }> {
  const response = await fetch(`${API_BASE}/api/admin/seo/${pageSlug}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to save SEO settings.'));
  }

  return response.json();
}

export async function resetAdminPageSeo(
  pageSlug: string,
  token: string
): Promise<{ message: string; seo: PageSeoSettings }> {
  const response = await fetch(`${API_BASE}/api/admin/seo/reset/${pageSlug}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to reset SEO settings.'));
  }

  return response.json();
}

export async function fetchPublicSeo(pageSlug: string): Promise<PageSeoSettings> {
  const response = await fetch(`${API_BASE}/api/admin/public/seo/${pageSlug}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => null);
    throw new Error(parseErrorMessage(errorJson, 'Failed to fetch SEO metadata.'));
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
  { value: 'standard',     label: 'Standard',        icon: 'speech',     description: 'Natural, idiomatic English' },
  { value: 'fluency',      label: 'Fluency',         icon: 'briefcase',  description: 'Clean, polished, workplace-ready' },
  { value: 'natural',      label: 'Natural',         icon: 'coffee',     description: 'Relaxed, conversational' },
  { value: 'academic',     label: 'Academic',        icon: 'graduation', description: 'Scholarly, precise tone' },
  { value: 'creative',     label: 'Creative',        icon: 'smile',      description: 'Warm, engaging, approachable' },
  { value: 'native',       label: 'Standard',        icon: 'speech',     description: 'Natural, idiomatic English' },
  { value: 'professional', label: 'Fluency',         icon: 'briefcase',  description: 'Clean, workplace-ready' },
  { value: 'casual',       label: 'Natural',         icon: 'coffee',     description: 'Relaxed, conversational' },
  { value: 'business',     label: 'Business',        icon: 'chart',      description: 'Action-oriented, executive' },
  { value: 'friendly',     label: 'Creative',        icon: 'smile',      description: 'Warm and approachable' },
  { value: 'simple',       label: 'Simple English',  icon: 'sparkles',   description: 'Plain, easy to understand' },
  { value: 'formal',       label: 'Formal',          icon: 'crown',      description: 'Polished, official tone' },
  { value: 'concise',      label: 'Concise',         icon: 'zap',        description: 'Tight, minimal wording' },
];

export const LEVELS: { value: RewriteLevel; label: string; description: string }[] = [
  { value: 1, label: 'Light',    description: 'Grammar fixes, small improvements' },
  { value: 2, label: 'Moderate', description: 'Restructured sentences, better flow' },
  { value: 3, label: 'Heavy',    description: 'Significant restructuring' },
];

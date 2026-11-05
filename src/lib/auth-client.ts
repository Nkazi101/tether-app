import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase/client';

export type AppAuthProvider = 'supabase';

export interface AppUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: AppAuthProvider;
}

export function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'That email and password combination is not recognized.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  if (normalized.includes('user already registered')) {
    return 'An account already exists for this email. Try signing in instead.';
  }

  if (normalized.includes('password should be at least')) {
    return 'Use a password with at least 8 characters.';
  }

  if (normalized.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (normalized.includes('provider is not enabled')) {
    return 'Google sign-in is not enabled for this project yet. Use email instead.';
  }

  return message || 'Authentication failed. Please try again.';
}

export function mapSupabaseUser(user: SupabaseUser): AppUser {
  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      (typeof metadata.display_name === 'string' && metadata.display_name) ||
      null,
    photoURL:
      (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      (typeof metadata.picture === 'string' && metadata.picture) ||
      null,
    provider: 'supabase',
  };
}

export async function getAuthHeaders() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error('Supabase is not configured in this environment.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

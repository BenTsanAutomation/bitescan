// BiteScan Auth Service — Supabase Auth with email verification
import { supabase } from './supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

export interface AuthSession {
  user: AuthUser;
  session: Session;
}

function mapUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'User',
    emailVerified: !!user.email_confirmed_at,
  };
}

/**
 * Sign up with email + password. Supabase sends a verification email automatically.
 * The user can use the app immediately but `emailVerified` will be false until they confirm.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { display_name: displayName.trim() },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Signup failed — no user returned');

  return mapUser(data.user);
}

/**
 * Sign in with email + password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign-in failed — no user returned');

  // Block unverified users
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut(); // Clear the session
    throw new Error('Please verify your email before signing in. Check your inbox for the confirmation link.');
  }

  return mapUser(data.user);
}

/**
 * Sign out and clear session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Get the current session if one exists (persisted via AsyncStorage).
 */
export async function getStoredSession(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;
  return mapUser(data.session.user);
}

/**
 * Resend the verification email for the current user.
 */
export async function resendVerificationEmail(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) throw new Error('No user email found');

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: data.user.email,
  });

  if (error) throw new Error(error.message);
}

/**
 * Refresh the user from Supabase to get updated email_confirmed_at.
 */
export async function refreshUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return mapUser(data.user);
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase()
  );
  if (error) throw new Error(error.message);
}

/**
 * Listen to auth state changes (login, logout, token refresh, etc.)
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? mapUser(session.user) : null);
  });
  return { unsubscribe: data.subscription.unsubscribe };
}

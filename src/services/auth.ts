// BiteScan Auth Service — Convex-backed with local session persistence
import AsyncStorage from "@react-native-async-storage/async-storage";
import { convex } from "./convexClient";
import { api } from "../../convex/_generated/api";

const SESSION_TOKEN_KEY = "bitescan_session_token";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

/**
 * Sign up with email + password.
 * Returns the verification code (in production this would be emailed).
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: AuthUser; verificationCode: string }> {
  const result = await convex.mutation(api.auth.signUp, {
    email,
    password,
    displayName,
  });

  return {
    user: {
      id: result.externalId,
      email: result.email,
      displayName: result.displayName,
      emailVerified: false,
    },
    verificationCode: result.verificationCode,
  };
}

/**
 * Verify email with 6-digit code.
 */
export async function verifyEmail(
  email: string,
  code: string
): Promise<void> {
  await convex.mutation(api.auth.verifyEmail, { email, code });
}

/**
 * Sign in with email + password. Requires verified email.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthUser> {
  const result = await convex.mutation(api.auth.signIn, { email, password });

  // Store session token
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, result.token);

  return result.user;
}

/**
 * Sign out and clear session.
 */
export async function signOut(): Promise<void> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (token) {
    try {
      await convex.mutation(api.auth.signOut, { token });
    } catch {
      // Ignore errors during sign out
    }
  }
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
}

/**
 * Get stored session from AsyncStorage and validate with Convex.
 */
export async function getStoredSession(): Promise<AuthUser | null> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) return null;

  try {
    const user = await convex.query(api.auth.validateSession, { token });
    if (!user) {
      await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
      return null;
    }
    return user;
  } catch {
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    return null;
  }
}

/**
 * Resend verification code.
 */
export async function resendVerificationEmail(
  email: string
): Promise<string> {
  const result = await convex.mutation(api.auth.resendVerification, { email });
  return result.verificationCode;
}

/**
 * Update user preferences in Convex.
 */
export async function updatePreferencesRemote(
  externalUserId: string,
  preferencesJson: string
): Promise<void> {
  await convex.mutation(api.auth.updatePreferences, {
    externalUserId,
    preferencesJson,
  });
}

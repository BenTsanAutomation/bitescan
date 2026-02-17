// BiteScan Auth Service — Convex-backed with secure session persistence
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { convex } from "./convexClient";
import { api } from "../../convex/_generated/api";

const SESSION_TOKEN_KEY = "bitescan_session_token";

// expo-secure-store is not available on web — fall back to AsyncStorage
const isSecureStoreAvailable = Platform.OS !== "web";

async function getToken(): Promise<string | null> {
  if (isSecureStoreAvailable) {
    return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  }
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

async function setToken(token: string): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } else {
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

async function deleteToken(): Promise<void> {
  if (isSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } else {
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
  }
}

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

  // Store session token securely
  await setToken(result.token);

  return result.user;
}

/**
 * Sign out and clear session.
 */
export async function signOut(): Promise<void> {
  const token = await getToken();
  if (token) {
    try {
      await convex.mutation(api.auth.signOut, { token });
    } catch {
      // Ignore errors during sign out
    }
  }
  await deleteToken();
}

/**
 * Get stored session from AsyncStorage and validate with Convex.
 */
export async function getStoredSession(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const user = await convex.query(api.auth.validateSession, { token });
    if (!user) {
      await deleteToken();
      return null;
    }
    return user;
  } catch {
    await deleteToken();
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
 * Request a password reset code via email.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ sent: boolean; code?: string }> {
  return await convex.mutation(api.auth.requestPasswordReset, { email });
}

/**
 * Reset password using the emailed code.
 */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  await convex.mutation(api.auth.resetPassword, { email, code, newPassword });
  // Clear any stored session since all sessions are invalidated
  await deleteToken();
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

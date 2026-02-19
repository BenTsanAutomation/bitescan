import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  AuthUser,
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "../services/auth";
import { UserPreferences } from "../types";

interface AuthContextValue {
  authUser: AuthUser | null;
  token: string | null;
  authChecked: boolean;
  isAuthenticated: boolean;
  isLoadingProfile: boolean;
  preferences: UserPreferences;
  createdAt: number | null;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ user: AuthUser }>;
  signOut: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ sent: boolean }>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;
  updatePreferences: (prefs: UserPreferences) => Promise<void>;
}

const defaultPreferences: UserPreferences = { goals: [], priorities: {} };

const AuthContext = createContext<AuthContextValue | null>(null);

const parsePreferences = (preferencesJson?: string): UserPreferences => {
  if (!preferencesJson) return defaultPreferences;
  try {
    const parsed = JSON.parse(preferencesJson) as UserPreferences;
    return {
      goals: parsed.goals ?? [],
      priorities: parsed.priorities ?? {},
      macroTargets: parsed.macroTargets,
      tasteProfile: parsed.tasteProfile,
      useMetric: parsed.useMetric,
      darkMode: parsed.darkMode,
      mealRemindersEnabled: parsed.mealRemindersEnabled,
      mealReminderHour: parsed.mealReminderHour,
      mealReminderMinute: parsed.mealReminderMinute,
    };
  } catch {
    return defaultPreferences;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [optimisticPreferences, setOptimisticPreferences] = useState<UserPreferences | null>(null);

  const signInMutation = useMutation(api.auth.signIn);
  const signUpMutation = useMutation(api.auth.signUp);
  const signOutMutation = useMutation(api.auth.signOut);
  const verifyEmailMutation = useMutation(api.auth.verifyEmail);
  const resendVerificationMutation = useMutation(api.auth.resendVerification);
  const requestPasswordResetMutation = useMutation(api.auth.requestPasswordReset);
  const resetPasswordMutation = useMutation(api.auth.resetPassword);
  const updatePreferencesMutation = useMutation(api.auth.updatePreferences);

  useEffect(() => {
    let mounted = true;
    async function loadToken() {
      const storedToken = await getSessionToken();
      if (!mounted) return;
      setToken(storedToken);
      setAuthChecked(true);
    }
    void loadToken();
    return () => {
      mounted = false;
    };
  }, []);

  const sessionUser = useQuery(api.auth.validateSession, token ? { token } : "skip");
  const profile = useQuery(api.auth.getProfile, token ? { token } : "skip");

  useEffect(() => {
    if (!authChecked || !token || sessionUser !== null) return;
    void (async () => {
      await clearSessionToken();
      setToken(null);
      setOptimisticPreferences(null);
    })();
  }, [authChecked, sessionUser, token]);

  useEffect(() => {
    setOptimisticPreferences(null);
  }, [profile?._id, profile?.preferencesJson]);

  const preferencesFromProfile = useMemo(
    () => parsePreferences(profile?.preferencesJson),
    [profile?.preferencesJson]
  );

  const preferences = optimisticPreferences ?? preferencesFromProfile;

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await signInMutation({ email, password });
      await setSessionToken(result.token);
      setToken(result.token);
      return result.user;
    },
    [signInMutation]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await signUpMutation({ email, password, displayName });
      return {
        user: {
          id: result.externalId,
          email: result.email,
          displayName: result.displayName,
          emailVerified: result.emailVerified,
        },
      };
    },
    [signUpMutation]
  );

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await signOutMutation({ token });
      } catch {
        // Clear local session even if server-side sign-out fails.
      }
    }
    await clearSessionToken();
    setToken(null);
    setOptimisticPreferences(null);
  }, [signOutMutation, token]);

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      await verifyEmailMutation({ email, code });
    },
    [verifyEmailMutation]
  );

  const resendVerificationEmail = useCallback(
    async (email: string) => {
      await resendVerificationMutation({ email });
    },
    [resendVerificationMutation]
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      return await requestPasswordResetMutation({ email });
    },
    [requestPasswordResetMutation]
  );

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      await resetPasswordMutation({ email, code, newPassword });
      await clearSessionToken();
      setToken(null);
      setOptimisticPreferences(null);
    },
    [resetPasswordMutation]
  );

  const updatePreferences = useCallback(
    async (nextPreferences: UserPreferences) => {
      if (!token) throw new Error("Not authenticated");
      setOptimisticPreferences(nextPreferences);
      try {
        await updatePreferencesMutation({
          token,
          preferencesJson: JSON.stringify(nextPreferences),
        });
      } catch (error) {
        setOptimisticPreferences(null);
        throw error;
      }
    },
    [token, updatePreferencesMutation]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser: sessionUser ?? null,
      token,
      authChecked,
      isAuthenticated: !!sessionUser,
      isLoadingProfile: !!token && profile === undefined,
      preferences,
      createdAt: profile?._creationTime ?? null,
      signIn,
      signUp,
      signOut,
      verifyEmail,
      resendVerificationEmail,
      requestPasswordReset,
      resetPassword,
      updatePreferences,
    }),
    [
      authChecked,
      preferences,
      profile?._creationTime,
      profile,
      requestPasswordReset,
      resendVerificationEmail,
      resetPassword,
      sessionUser,
      signIn,
      signOut,
      signUp,
      token,
      updatePreferences,
      verifyEmail,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

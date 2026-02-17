import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { borderRadius, colors, shadows, spacing, typography } from "../theme";
import type { AuthUser } from "../services/auth";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser, isNewUser: boolean) => void;
  onSignIn: (email: string, password: string) => Promise<AuthUser>;
  onSignUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ user: AuthUser; verificationCode: string }>;
  onVerifyEmail: (email: string, code: string) => Promise<void>;
  onResendCode: (email: string) => Promise<string>;
  onRequestPasswordReset?: (email: string) => Promise<{ sent: boolean }>;
  onResetPassword?: (email: string, code: string, newPassword: string) => Promise<void>;
}

type Mode = "login" | "signup" | "forgot" | "reset";

export default function AuthScreen({
  onAuthenticated,
  onSignIn,
  onSignUp,
  onVerifyEmail,
  onResendCode,
  onRequestPasswordReset,
  onResetPassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [showVerifyScreen, setShowVerifyScreen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerificationCode, setPendingVerificationCode] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const validate = (): boolean => {
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email");
      return false;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (mode === "signup") {
      if (!displayName.trim()) {
        setError("Display name is required");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const user = await onSignIn(email.trim(), password);
        onAuthenticated(user, false);
      } else {
        const result = await onSignUp(
          email.trim(),
          password,
          displayName.trim()
        );
        setPendingVerificationCode(result.verificationCode);
        setShowVerifyScreen(true);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setError("Enter the verification code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onVerifyEmail(email.trim(), verificationCode.trim());
      Alert.alert("Email Verified!", "You can now sign in.", [
        {
          text: "Sign In",
          onPress: () => {
            setShowVerifyScreen(false);
            setMode("login");
            setPassword("");
            setVerificationCode("");
            setError(null);
          },
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const code = await onResendCode(email.trim());
      setPendingVerificationCode(code);
      Alert.alert("Code Resent", "A new verification code has been generated.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email above first");
      return;
    }
    if (!onRequestPasswordReset) {
      Alert.alert("Password Reset", "Password reset is not yet available.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onRequestPasswordReset(trimmedEmail);
      setMode("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetCode.trim()) {
      setError("Enter the reset code");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!onResetPassword) return;
    setLoading(true);
    setError(null);
    try {
      await onResetPassword(email.trim(), resetCode.trim(), newPassword);
      Alert.alert("Password Reset", "Your password has been reset. You can now sign in.", [
        {
          text: "Sign In",
          onPress: () => {
            setMode("login");
            setPassword("");
            setResetCode("");
            setNewPassword("");
            setConfirmNewPassword("");
            setError(null);
          },
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setConfirmPassword("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  // ---- VERIFICATION SCREEN ----
  // Hidden TextInput approach: a single hidden input captures keyboard,
  // while 6 visible digit boxes display the entered code. This is the
  // most reliable pattern on Android where styled TextInputs can be
  // untappable.
  const hiddenInputRef = useRef<TextInput>(null);

  const focusHiddenInput = () => {
    hiddenInputRef.current?.focus();
  };

  if (showVerifyScreen) {
    const digits = verificationCode.padEnd(6, " ").split("");

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>📧</Text>
            <Text style={styles.appName}>Verify Your Email</Text>
            <Text style={styles.tagline}>
              Enter the 6-digit code to verify your account
            </Text>
            <Text style={styles.verifyEmail}>
              {email.trim().toLowerCase()}
            </Text>
          </View>

          {__DEV__ && pendingVerificationCode ? (
            <View style={styles.codePreview}>
              <Text style={styles.codePreviewLabel}>
                DEV — Your verification code:
              </Text>
              <Text style={styles.codePreviewValue} selectable={true}>
                {pendingVerificationCode}
              </Text>
            </View>
          ) : null}

          <View style={[styles.card, shadows.md]}>
            <Text style={styles.label}>Verification Code</Text>

            {/* Hidden input that actually captures keyboard */}
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              value={verificationCode}
              onChangeText={(text) =>
                setVerificationCode(text.replace(/[^0-9]/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
              caretHidden={true}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />

            {/* Visible digit boxes */}
            <Pressable style={styles.digitRow} onPress={focusHiddenInput}>
              {digits.map((digit, i) => (
                <View
                  key={i}
                  style={[
                    styles.digitBox,
                    i < verificationCode.length && styles.digitBoxFilled,
                    i === verificationCode.length && styles.digitBoxActive,
                  ]}
                >
                  <Text style={styles.digitText}>
                    {digit !== " " ? digit : ""}
                  </Text>
                </View>
              ))}
            </Pressable>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.submitText}>Verify Email</Text>
              )}
            </Pressable>
          </View>

          <Pressable style={styles.toggleButton} onPress={handleResendCode}>
            <Text style={styles.toggleText}>Resend Code</Text>
          </Pressable>

          <Pressable
            style={styles.toggleButton}
            onPress={() => {
              setShowVerifyScreen(false);
              setMode("login");
              setPassword("");
              setError(null);
            }}
          >
            <Text style={styles.toggleText}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---- PASSWORD RESET SCREEN ----
  if (mode === "reset") {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.logo}>🔑</Text>
            <Text style={styles.appName}>Reset Password</Text>
            <Text style={styles.tagline}>
              Enter the code sent to your email
            </Text>
            <Text style={styles.verifyEmail}>
              {email.trim().toLowerCase()}
            </Text>
          </View>

          <View style={[styles.card, shadows.md]}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reset Code</Text>
              <TextInput
                style={styles.input}
                value={resetCode}
                onChangeText={(text) => setResetCode(text.replace(/[^0-9]/g, ""))}
                placeholder="6-digit code"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Repeat new password"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.submitText}>Reset Password</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            style={styles.toggleButton}
            onPress={() => {
              setMode("login");
              setError(null);
            }}
          >
            <Text style={styles.toggleText}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---- LOGIN / SIGNUP SCREEN ----
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🍃</Text>
          <Text style={styles.appName}>BiteScan</Text>
          <Text style={styles.tagline}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </Text>
        </View>

        <View style={[styles.card, shadows.md]}>
          {mode === "signup" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </View>

          {mode === "signup" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.submitText}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </Pressable>

          {mode === "login" && (
            <Pressable
              style={styles.forgotButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          )}
        </View>

        {mode === "signup" && (
          <View style={styles.verificationNote}>
            <Text style={styles.verificationNoteText}>
              📧 You'll receive a verification code after signing up
            </Text>
          </View>
        )}

        <Pressable style={styles.toggleButton} onPress={toggleMode}>
          <Text style={styles.toggleText}>
            {mode === "login"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: typography.fontSizes.hero ?? 32,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary[600],
  },
  tagline: {
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  digitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  digitBoxFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50] ?? "#f0fdf4",
  },
  digitBoxActive: {
    borderColor: colors.primary[400],
    borderStyle: "dashed" as any,
  },
  digitText: {
    fontSize: 24,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  submitButton: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  forgotButton: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  forgotText: {
    color: colors.primary[500],
    fontSize: typography.fontSizes.sm,
  },
  verificationNote: {
    marginTop: spacing.md,
    backgroundColor: colors.primary[50] ?? "#f0fdf4",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[200] ?? "#bbf7d0",
  },
  verificationNoteText: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary[700] ?? "#15803d",
    textAlign: "center",
  },
  verifyEmail: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary[600],
    marginTop: spacing.xs,
  },
  codePreview: {
    backgroundColor: "#fef9c3",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#fde047",
    alignItems: "center",
  },
  codePreviewLabel: {
    fontSize: typography.fontSizes.xs,
    color: "#854d0e",
    marginBottom: spacing.xs,
  },
  codePreviewValue: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: "#854d0e",
    letterSpacing: 4,
  },
  toggleButton: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  toggleText: {
    color: colors.primary[500],
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});

import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../theme';
import { resendVerificationEmail } from '../services/auth';

interface Props {
  onDismiss?: () => void;
}

export default function EmailVerificationBanner({ onDismiss }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (error) {
      console.error('Resend verification failed:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'Verification email sent! Check your inbox.'
              : 'Check your inbox and click the verification link.'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {!sent && (
          <Pressable style={styles.resendButton} onPress={handleResend} disabled={sending}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : (
              <Text style={styles.resendText}>Resend</Text>
            )}
          </Pressable>
        )}
        {onDismiss && (
          <Pressable onPress={onDismiss}>
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef9c3',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: '#854d0e',
  },
  subtitle: {
    fontSize: typography.fontSizes.xs,
    color: '#a16207',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resendButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resendText: {
    color: colors.primary[600],
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  dismissText: {
    fontSize: typography.fontSizes.md,
    color: '#a16207',
    paddingHorizontal: spacing.xs,
  },
});

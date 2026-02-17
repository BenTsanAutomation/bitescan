import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, colors, shadows, spacing, typography } from "../theme";
import type { AuthUser } from "../services/auth";

interface ProfileScreenProps {
  displayName: string;
  email: string;
  apiHealthy: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  displayName,
  email,
  apiHealthy,
  onOpenSettings,
  onSignOut,
}) => (
  <View style={styles.screen}>
    <Text style={styles.title}>Profile</Text>
    <Text style={styles.subtitle}>Account and preferences</Text>

    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.cardTitle}>Name</Text>
      <Text style={styles.cardValue}>{displayName}</Text>
    </View>

    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.cardTitle}>Email</Text>
      <Text style={styles.cardValue}>{email}</Text>
    </View>

    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.cardTitle}>API Status</Text>
      <Text
        style={[
          styles.cardValue,
          apiHealthy ? styles.goodStatus : styles.badStatus,
        ]}
      >
        {apiHealthy ? "Online" : "Offline"}
      </Text>
    </View>

    <Pressable style={styles.settingsButton} onPress={onOpenSettings}>
      <Text style={styles.settingsText}>Open Settings</Text>
    </Pressable>

    <Pressable style={styles.signOutButton} onPress={onSignOut}>
      <Text style={styles.signOutText}>Sign Out</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  title: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },
  card: {
    marginBottom: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  goodStatus: { color: colors.success },
  badStatus: { color: colors.error },
  settingsButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  settingsText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
  signOutButton: {
    marginTop: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  signOutText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default ProfileScreen;

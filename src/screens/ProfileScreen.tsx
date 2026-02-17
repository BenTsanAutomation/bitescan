import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, shadows, spacing, typography, ThemeColors } from "../theme";
import { useThemeContext } from "../contexts/ThemeContext";

interface ProfileScreenProps {
  displayName: string;
  email: string;
  createdAt?: number | null;
  totalMealsLogged: number;
  totalScans: number;
  apiHealthy: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const formatDate = (timestamp?: number | null): string => {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  displayName,
  email,
  createdAt,
  totalMealsLogged,
  totalScans,
  apiHealthy,
  onOpenSettings,
  onSignOut,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account and preferences</Text>

      <View style={[styles.avatarWrap, shadows.sm]}>
        <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>Name</Text>
        <Text style={styles.cardValue}>{displayName}</Text>
      </View>

      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>Email</Text>
        <Text style={styles.cardValue}>{email}</Text>
      </View>

      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.cardTitle}>Member Since</Text>
        <Text style={styles.cardValue}>{formatDate(createdAt)}</Text>
      </View>

      <View style={[styles.row, shadows.sm]}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalMealsLogged}</Text>
          <Text style={styles.statLabel}>Meals logged</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalScans}</Text>
          <Text style={styles.statLabel}>Scans</Text>
        </View>
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
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    avatarWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary[100],
      marginBottom: spacing.md,
      alignSelf: "center",
    },
    avatarText: {
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary[700],
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
    row: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    statValue: {
      fontSize: typography.fontSizes.lg,
      color: colors.primary[700],
      fontWeight: typography.fontWeights.bold,
    },
    statLabel: {
      marginTop: spacing.xs,
      color: colors.text.secondary,
      fontSize: typography.fontSizes.xs,
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

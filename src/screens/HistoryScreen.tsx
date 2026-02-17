import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, colors, shadows, spacing, typography } from "../theme";
import { RecentMeal } from "../types";

interface HistoryScreenProps {
  recentMeals: RecentMeal[];
  onManualEntry: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  recentMeals,
  onManualEntry,
}) => (
  <View style={styles.screen}>
    <Text style={styles.title}>History</Text>
    <Text style={styles.subtitle}>Detailed history view coming soon.</Text>

    <View style={[styles.card, shadows.sm]}>
      <Text style={styles.cardTitle}>Recent Entries</Text>
      <Text style={styles.cardValue}>{recentMeals.length}</Text>
    </View>

    <Pressable style={styles.manualEntryButton} onPress={onManualEntry}>
      <Text style={styles.manualEntryText}>Add Manual Entry</Text>
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
  manualEntryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary[400],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  manualEntryText: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default HistoryScreen;

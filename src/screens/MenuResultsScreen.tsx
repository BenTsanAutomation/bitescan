import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { borderRadius, shadows, spacing, ThemeColors, typography } from '../theme';
import { FoodItem, MacroRemaining, MealRecommendation, ScanResult } from '../types';
import { GradeDisplay } from '../components/GradeDisplay';
import { useThemeContext } from '../contexts/ThemeContext';

interface MenuResultsScreenProps {
  result: ScanResult;
  imageUri: string;
  remainingMacros?: MacroRemaining | null;
  onClose: () => void;
  onRescan: () => void;
  onLogItem: (item: FoodItem) => Promise<void>;
}

const getFitBadge = (score?: number) => {
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  if (safeScore >= 80) return { emoji: '🟢', tone: 'good' as const };
  if (safeScore >= 55) return { emoji: '🟡', tone: 'mid' as const };
  return { emoji: '🔴', tone: 'low' as const };
};

type RankedRecommendation = {
  item: FoodItem;
  rank: number;
  macroFitScore: number;
  tasteScore: number;
  combinedScore: number;
  reason: string;
  confidenceValue: number;
};

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const scorePillTone = (
  score: number
): { text: string; textColor: string; backgroundColor: string } => {
  if (score >= 80) {
    return { text: 'Strong', textColor: '#14532d', backgroundColor: '#dcfce7' };
  }
  if (score >= 60) {
    return { text: 'Solid', textColor: '#78350f', backgroundColor: '#fef9c3' };
  }
  return { text: 'Weak', textColor: '#7f1d1d', backgroundColor: '#fee2e2' };
};

const confidenceMeta = (confidence: number): { label: string; tone: 'high' | 'medium' | 'low' } => {
  if (confidence >= 80) return { label: 'High confidence', tone: 'high' };
  if (confidence >= 60) return { label: 'Medium confidence', tone: 'medium' };
  return { label: 'Low confidence', tone: 'low' };
};

const buildExplainability = (item: FoodItem, recommendation: MealRecommendation | undefined): string => {
  if (recommendation?.reason) {
    return recommendation.reason;
  }

  if (item.macroFit) {
    const fit = item.macroFit;
    return `Uses ${fit.calorieImpactPct}% of calorie room, ${fit.proteinImpactPct}% protein, ${fit.carbsImpactPct}% carbs, ${fit.fatImpactPct}% fat.`;
  }

  return 'Balanced against your targets using available nutrition data.';
};

const toRankedRecommendations = (
  foods: FoodItem[],
  recommendations: MealRecommendation[] | undefined
): RankedRecommendation[] => {
  const byId = new Map<string, MealRecommendation>();
  const byName = new Map<string, MealRecommendation>();
  for (const rec of recommendations ?? []) {
    byId.set(rec.foodId, rec);
    byName.set(rec.foodName.trim().toLowerCase(), rec);
  }

  const merged = foods.map((item) => {
    const fromRec = byId.get(item.id) ?? byName.get(item.name.trim().toLowerCase());
    const macroFitScore = clampScore(fromRec?.macroFitScore ?? item.macroFit?.score ?? 50);
    const tasteScore = clampScore(fromRec?.tasteScore ?? item.taste?.score ?? 55);
    const combinedScore = clampScore(
      fromRec?.combinedScore ?? Math.round(macroFitScore * 0.58 + tasteScore * 0.42)
    );

    return {
      item,
      rank: 0,
      macroFitScore,
      tasteScore,
      combinedScore,
      reason: buildExplainability(item, fromRec),
      confidenceValue: clampScore(item.confidence),
    };
  });

  merged.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    if (b.macroFitScore !== a.macroFitScore) return b.macroFitScore - a.macroFitScore;
    return b.tasteScore - a.tasteScore;
  });

  return merged.map((entry, index) => ({ ...entry, rank: index + 1 }));
};

export const MenuResultsScreen: React.FC<MenuResultsScreenProps> = ({
  result,
  imageUri: _imageUri,
  remainingMacros,
  onClose,
  onRescan,
  onLogItem,
}) => {
  const { colors } = useThemeContext();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const styles = useMemo(() => createStyles(colors, isCompact), [colors, isCompact]);
  const [loggingIds, setLoggingIds] = useState<Record<string, boolean>>({});

  const remainingSummary = remainingMacros
    ? `${Math.round(remainingMacros.calories)} cal · ${Math.round(remainingMacros.protein)}g P remaining`
    : null;
  const rankedRecommendations = useMemo(
    () => toRankedRecommendations(result.foods, result.mealRecommendations),
    [result.foods, result.mealRecommendations]
  );

  const handleLog = async (item: FoodItem) => {
    if (loggingIds[item.id]) return;
    setLoggingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await onLogItem(item);
    } finally {
      setLoggingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Menu Scan - {result.foods.length} items found</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Ranked by macro fit{remainingSummary ? ` · ${remainingSummary}` : ''}
      </Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {rankedRecommendations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No menu items found</Text>
            <Text style={styles.emptyText}>Try scanning the full board in good lighting.</Text>
          </View>
        ) : (
          rankedRecommendations.map((entry, index) => {
            const item = entry.item;
            const fitScore = entry.macroFitScore;
            const fitBadge = getFitBadge(fitScore);
            const isLogged = !!loggingIds[item.id];
            const bestPick = index === 0;
            const fitColor =
              fitBadge.tone === 'good'
                ? colors.success
                : fitBadge.tone === 'mid'
                  ? colors.warning
                  : colors.error;
            const confidence = confidenceMeta(entry.confidenceValue);
            const confidenceToneStyle =
              confidence.tone === 'high'
                ? styles.confidence_high
                : confidence.tone === 'medium'
                  ? styles.confidence_medium
                  : styles.confidence_low;
            const fitTone = scorePillTone(entry.macroFitScore);
            const tasteTone = scorePillTone(entry.tasteScore);
            const combinedTone = scorePillTone(entry.combinedScore);

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  shadows.md,
                  bestPick && styles.bestCard,
                ]}
                accessible
                accessibilityLabel={`${bestPick ? 'Best pick. ' : ''}${item.name}. Rank ${entry.rank}. Combined score ${entry.combinedScore}. Macro fit ${entry.macroFitScore}. Taste score ${entry.tasteScore}. ${confidence.label}.`}
              >
                <View style={styles.cardRankRow}>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankText}>#{entry.rank}</Text>
                  </View>
                  {bestPick ? (
                    <View style={styles.bestPickPill}>
                      <Text style={styles.bestPickText}>Best pick</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <View style={[styles.confidencePill, confidenceToneStyle]}>
                      <Text style={styles.confidenceText}>{confidence.label}</Text>
                    </View>
                  </View>
                  <View style={styles.gradeWrap}>
                    <GradeDisplay grade={item.grade} size="sm" showLabel={false} />
                  </View>
                </View>

                <View style={styles.scoreRow}>
                  <View style={[styles.scoreCard, { backgroundColor: fitTone.backgroundColor }]}>
                    <Text style={styles.scoreTitle}>Macro Fit</Text>
                    <Text style={[styles.scoreValue, { color: fitTone.textColor }]}>{entry.macroFitScore}</Text>
                    <Text style={[styles.scoreTag, { color: fitTone.textColor }]}>{fitTone.text}</Text>
                  </View>
                  <View style={[styles.scoreCard, { backgroundColor: tasteTone.backgroundColor }]}>
                    <Text style={styles.scoreTitle}>Taste</Text>
                    <Text style={[styles.scoreValue, { color: tasteTone.textColor }]}>{entry.tasteScore}</Text>
                    <Text style={[styles.scoreTag, { color: tasteTone.textColor }]}>{tasteTone.text}</Text>
                  </View>
                  <View style={[styles.scoreCard, styles.scoreCardCombined, { backgroundColor: combinedTone.backgroundColor }]}>
                    <Text style={styles.scoreTitle}>Combined</Text>
                    <Text style={[styles.scoreValue, { color: combinedTone.textColor }]}>{entry.combinedScore}</Text>
                    <Text style={[styles.scoreTag, { color: combinedTone.textColor }]}>Ranked</Text>
                  </View>
                </View>

                <View style={styles.fitBadgeRow}>
                  <View style={[styles.fitBadge, { borderColor: fitColor }]}>
                    <Text style={[styles.fitBadgeText, { color: fitColor }]}>
                      {fitBadge.emoji} {fitScore}% macro alignment
                    </Text>
                  </View>
                </View>

                <Text style={styles.explainabilityText}>{entry.reason}</Text>

                <View style={styles.macroRow}>
                  <Text style={styles.macroText}>{Math.round(item.nutrition.calories)} cal</Text>
                  <Text style={styles.macroText}>{Math.round(item.nutrition.protein)}g P</Text>
                  <Text style={styles.macroText}>{Math.round(item.nutrition.carbs)}g C</Text>
                  <Text style={styles.macroText}>{Math.round(item.nutrition.fat)}g F</Text>
                </View>

                <Pressable
                  style={[
                    styles.logButton,
                    bestPick && styles.logButtonBest,
                    isLogged && styles.logButtonLogged,
                  ]}
                  onPress={() => void handleLog(item)}
                  disabled={isLogged}
                  accessibilityRole="button"
                  accessibilityLabel={`${isLogged ? 'Logged' : bestPick ? 'Log best pick' : 'Log this option'} ${item.name}`}
                  accessibilityHint={bestPick ? 'Adds the highest-ranked menu pick to your meal log.' : 'Adds this menu option to your meal log.'}
                >
                  <Text style={styles.logButtonText}>
                    {isLogged ? 'Saved to log' : bestPick ? 'Log Best Pick' : 'Log This Option'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.rescanButton} onPress={onRescan}>
        <Text style={styles.rescanButtonText}>Rescan Menu</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ThemeColors, isCompact: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    headerTitle: {
      flex: 1,
      marginRight: spacing.sm,
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    closeButton: {
      width: 38,
      height: 38,
      borderRadius: borderRadius.full,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.neutral[300],
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: colors.text.primary,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
    },
    subtitle: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      marginBottom: spacing.md,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    emptyState: {
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    },
    bestCard: {
      borderColor: colors.primary[500],
      borderWidth: 2,
      backgroundColor: colors.primary[50],
    },
    cardRankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    rankPill: {
      borderWidth: 1,
      borderColor: colors.neutral[300],
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: colors.background.secondary,
    },
    rankText: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
      fontWeight: typography.fontWeights.semibold,
    },
    bestPickPill: {
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: colors.primary[500],
    },
    bestPickText: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.inverse,
      fontWeight: typography.fontWeights.bold,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    cardTitleWrap: {
      flex: 1,
      marginRight: spacing.sm,
      gap: spacing.xs,
    },
    scoreRow: {
      flexDirection: isCompact ? 'column' : 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    scoreCard: {
      flex: 1,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      minWidth: isCompact ? undefined : 90,
    },
    scoreCardCombined: {
      borderWidth: 1,
      borderColor: colors.primary[200],
    },
    scoreTitle: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    scoreValue: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      lineHeight: typography.fontSizes.lg + 2,
    },
    scoreTag: {
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.semibold,
      marginTop: 2,
    },
    fitBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    fitBadge: {
      borderWidth: 1,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background.secondary,
    },
    fitBadgeText: {
      fontSize: typography.fontSizes.xs,
      fontWeight: typography.fontWeights.semibold,
    },
    confidencePill: {
      alignSelf: 'flex-start',
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    confidence_high: {
      backgroundColor: '#dcfce7',
    },
    confidence_medium: {
      backgroundColor: '#fef9c3',
    },
    confidence_low: {
      backgroundColor: '#fee2e2',
    },
    confidenceText: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.primary,
      fontWeight: typography.fontWeights.semibold,
    },
    gradeWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    foodName: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.primary,
    },
    explainabilityText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    macroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    macroText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
    },
    logButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    logButtonBest: {
      backgroundColor: colors.primary[600],
    },
    logButtonLogged: {
      backgroundColor: colors.success,
    },
    logButtonText: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
    },
    rescanButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.secondary[500],
      borderRadius: borderRadius.full,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rescanButtonText: {
      color: colors.text.primary,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.bold,
    },
  });

export default MenuResultsScreen;

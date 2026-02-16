import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { FoodItem, MacroRemaining } from '../types';
import { calculateMacroFit } from '../utils/macroCalculations';

interface MacroFitCardProps {
  food: FoodItem;
  remaining: MacroRemaining;
}

export const MacroFitCard: React.FC<MacroFitCardProps> = ({ food, remaining }) => {
  const fitScore = useMemo(() => calculateMacroFit(food, remaining), [food, remaining]);

  const traffic = useMemo(() => {
    if (fitScore.level === 'great') {
      return { icon: '🟢', text: 'Great', label: 'GREAT FIT', color: colors.success, bg: colors.primary[50] };
    }
    if (fitScore.level === 'over') {
      return { icon: '🔴', text: 'Over', label: 'OVER BUDGET', color: colors.error, bg: '#fef2f2' };
    }
    if (fitScore.level === 'good') {
      return { icon: '🟡', text: 'Good', label: 'GOOD FIT', color: colors.warning, bg: colors.secondary[50] };
    }
    return { icon: '🟡', text: 'Borderline', label: 'BORDERLINE', color: colors.warning, bg: colors.secondary[50] };
  }, [fitScore.level]);

  const breakdownText = `This will use: ${Math.round(food.nutrition.calories)} cal (${fitScore.calories}%), ${food.nutrition.protein.toFixed(1)} g protein (${fitScore.protein}%), ${food.nutrition.carbs.toFixed(1)} g carbs (${fitScore.carbs}%), ${food.nutrition.fat.toFixed(1)} g fat (${fitScore.fat}%).`;

  return (
    <View style={[styles.card, shadows.md, { borderColor: traffic.color }]}>
      <View style={[styles.headerBadge, { backgroundColor: traffic.bg }]}>
        <Text style={styles.headerBadgeText}>
          {traffic.icon} {traffic.text}
        </Text>
      </View>

      <Text style={styles.fitLevelText}>{traffic.label}</Text>
      <Text style={styles.foodName}>{food.name}</Text>
      <Text style={styles.breakdownText}>{breakdownText}</Text>

      <View style={styles.tipBox}>
        <Text style={styles.tipTitle}>Smart tip</Text>
        <Text style={styles.tipText}>{fitScore.tip}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerBadgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  fitLevelText: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  foodName: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  breakdownText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  tipBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  tipTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary[700],
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  tipText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
});

export default MacroFitCard;

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { spacing, borderRadius, typography, shadows, ThemeColors } from '../theme';
import { useThemeContext } from '../contexts/ThemeContext';

interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface User {
  preferences: {
    macroTargets?: {
      calories: number;
      protein: number;
      carbs?: number;
      fat?: number;
    };
  };
}

interface MacroDashboardProps {
  user: User;
  todayTotals: MacroTotals;
}

type MacroKey = keyof MacroTotals;

const MACRO_META: Array<{
  key: MacroKey;
  label: string;
  emoji: string;
}> = [
  { key: 'calories', label: 'Calories', emoji: '🔥' },
  { key: 'protein', label: 'Protein', emoji: '💪' },
  { key: 'carbs', label: 'Carbs', emoji: '🍚' },
  { key: 'fat', label: 'Fat', emoji: '🥑' },
];

const getProgressColor = (percent: number, colors: ThemeColors): string => {
  if (percent > 100) return colors.error;
  if (percent >= 80) return colors.secondary[400];
  return colors.primary[500];
};

const formatValue = (value: number, key: MacroKey): string => {
  if (key === 'calories') return `${Math.round(value)} kcal`;
  return `${Math.round(value * 10) / 10}g`;
};

export const MacroDashboard: React.FC<MacroDashboardProps> = ({ user, todayTotals }) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const targets: MacroTotals = {
    calories: user.preferences.macroTargets?.calories ?? 0,
    protein: user.preferences.macroTargets?.protein ?? 0,
    carbs: user.preferences.macroTargets?.carbs ?? 0,
    fat: user.preferences.macroTargets?.fat ?? 0,
  };

  const [progressAnim] = useState<Record<MacroKey, Animated.Value>>(() => ({
    calories: new Animated.Value(0),
    protein: new Animated.Value(0),
    carbs: new Animated.Value(0),
    fat: new Animated.Value(0),
  }));

  const getPercent = (key: MacroKey): number => {
    const target = targets[key];
    if (target <= 0) return 0;
    return (todayTotals[key] / target) * 100;
  };

  useEffect(() => {
    const animations = MACRO_META.map((macro, index) =>
      Animated.timing(progressAnim[macro.key], {
        toValue: Math.min(Math.max(getPercent(macro.key) / 100, 0), 1),
        duration: 700,
        delay: index * 90,
        useNativeDriver: false,
      })
    );

    Animated.stagger(90, animations).start();
  }, [
    todayTotals.calories,
    todayTotals.protein,
    todayTotals.carbs,
    todayTotals.fat,
    targets.calories,
    targets.protein,
    targets.carbs,
    targets.fat,
    progressAnim,
  ]);

  return (
    <View style={[styles.container, shadows.md]}>
      <Text style={styles.title}>Today&apos;s Macro Progress</Text>
      <Text style={styles.subtitle}>Track your intake against daily targets</Text>

      {MACRO_META.map((macro) => {
        const current = todayTotals[macro.key];
        const target = targets[macro.key];
        const percent = getPercent(macro.key);
        const remaining = target - current;
        const color = getProgressColor(percent, colors);

        return (
          <View key={macro.key} style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.labelWrap}>
                <Text style={styles.emoji}>{macro.emoji}</Text>
                <Text style={styles.label}>{macro.label}</Text>
              </View>
              <Text style={styles.valueText}>
                {formatValue(current, macro.key)} / {formatValue(target, macro.key)} · {Math.round(percent)}%
              </Text>
            </View>

            <View style={styles.track}>
              <Animated.View
                style={[
                  styles.fill,
                  {
                    backgroundColor: color,
                    width: progressAnim[macro.key].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={[styles.remainingText, remaining < 0 && styles.overText]}>
              {target <= 0
                ? 'No target set'
                : remaining >= 0
                ? `${formatValue(remaining, macro.key)} remaining`
                : `${formatValue(Math.abs(remaining), macro.key)} over`}
            </Text>
          </View>
        );
      })}

      <View style={styles.remainingSection}>
        <Text style={styles.remainingTitle}>Remaining</Text>
        <View style={styles.remainingRow}>
          {MACRO_META.map((macro) => {
            const target = targets[macro.key];
            const remaining = target - todayTotals[macro.key];
            const isOver = remaining < 0;

            return (
              <View key={`remaining-${macro.key}`} style={styles.remainingChip}>
                <Text style={styles.remainingChipText}>
                  {macro.emoji}{' '}
                  {target <= 0
                    ? '--'
                    : isOver
                    ? `${formatValue(Math.abs(remaining), macro.key)} over`
                    : `${formatValue(remaining, macro.key)} left`}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  title: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: typography.fontSizes.md,
    marginRight: spacing.sm,
  },
  label: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  valueText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  track: {
    height: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  remainingText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
  },
  overText: {
    color: colors.error,
    fontWeight: typography.fontWeights.medium,
  },
  remainingSection: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  remainingTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  remainingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  remainingChip: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  remainingChipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
});

export default MacroDashboard;

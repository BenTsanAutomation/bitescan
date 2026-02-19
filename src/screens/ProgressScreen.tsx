import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, shadows, spacing, typography, ThemeColors } from '../theme';
import { DailyMacroSummary, MacroTargets } from '../types';
import { useThemeContext } from '../contexts/ThemeContext';

interface ProgressScreenProps {
  data: DailyMacroSummary[];
  macroTargets: MacroTargets;
  range: 7 | 14 | 30;
  onRangeChange: (range: 7 | 14 | 30) => void;
}

const MAX_BAR_HEIGHT = 160;

type MacroDeltaSet = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const getDateLabel = (dateKey: string): string => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return labels[parsed.getDay()] ?? '?';
};

const averageOf = (rows: DailyMacroSummary[]): MacroDeltaSet => {
  const count = Math.max(1, rows.length);
  return {
    calories: rows.reduce((sum, row) => sum + row.calories, 0) / count,
    protein: rows.reduce((sum, row) => sum + row.protein, 0) / count,
    carbs: rows.reduce((sum, row) => sum + row.carbs, 0) / count,
    fat: rows.reduce((sum, row) => sum + row.fat, 0) / count,
  };
};

const formatDelta = (value: number, unit: string): string => {
  const rounded = Math.round(value);
  if (rounded === 0) return `On target (${unit})`;
  if (rounded > 0) return `+${rounded} ${unit}`;
  return `${rounded} ${unit}`;
};

const formatWeeklyDelta = (value: number, unit: string): string => {
  const rounded = Math.round(value);
  if (rounded === 0) return `0 ${unit}`;
  if (rounded > 0) return `↑ ${rounded} ${unit}`;
  return `↓ ${Math.abs(rounded)} ${unit}`;
};

const coachingHints = (goalVsActual: MacroDeltaSet, weeklyDelta: MacroDeltaSet | null): string[] => {
  const hints: string[] = [];

  if (goalVsActual.calories > 180) {
    hints.push('Average calories are above target. Trim sauces or liquid calories this week.');
  } else if (goalVsActual.calories < -180) {
    hints.push('Calories are below target. Add one balanced snack to support consistency.');
  }

  if (goalVsActual.protein < -15) {
    hints.push('Protein is trending low. Add 20-30g protein at your next meal.');
  }

  if (goalVsActual.carbs > 30) {
    hints.push('Carbs are running high. Pair carb-heavy meals with lean protein and fiber.');
  }

  if (goalVsActual.fat > 12) {
    hints.push('Fat intake is above target. Watch oils, dressings, and fried sides.');
  }

  if (weeklyDelta && weeklyDelta.calories < -120 && goalVsActual.protein > -10) {
    hints.push('Nice progress: calories are down week-over-week without sacrificing protein.');
  }

  if (hints.length === 0) {
    hints.push('You are close to target averages. Keep portions steady and maintain your logging streak.');
  }

  return hints.slice(0, 3);
};

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  data,
  macroTargets,
  range,
  onRangeChange,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sortedData = useMemo(
    () => [...data].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [data]
  );

  const maxCalories = useMemo(
    () => Math.max(macroTargets.calories, 1, ...sortedData.map((entry) => entry.calories)),
    [sortedData, macroTargets.calories]
  );

  const avg = useMemo(() => averageOf(sortedData), [sortedData]);

  const goalVsActual = useMemo<MacroDeltaSet>(
    () => ({
      calories: avg.calories - macroTargets.calories,
      protein: avg.protein - macroTargets.protein,
      carbs: avg.carbs - macroTargets.carbs,
      fat: avg.fat - macroTargets.fat,
    }),
    [avg, macroTargets]
  );

  const weeklyDelta = useMemo<MacroDeltaSet | null>(() => {
    if (sortedData.length < 4) return null;
    const windowSize = sortedData.length >= 14 ? 7 : Math.floor(sortedData.length / 2);
    if (windowSize < 2) return null;

    const currentWindow = sortedData.slice(-windowSize);
    const previousWindow = sortedData.slice(-windowSize * 2, -windowSize);
    if (previousWindow.length === 0) return null;

    const currentAvg = averageOf(currentWindow);
    const previousAvg = averageOf(previousWindow);

    return {
      calories: currentAvg.calories - previousAvg.calories,
      protein: currentAvg.protein - previousAvg.protein,
      carbs: currentAvg.carbs - previousAvg.carbs,
      fat: currentAvg.fat - previousAvg.fat,
    };
  }, [sortedData]);

  const hints = useMemo(() => coachingHints(goalVsActual, weeklyDelta), [goalVsActual, weeklyDelta]);
  const averageLineHeight = (avg.calories / maxCalories) * MAX_BAR_HEIGHT;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Nutrition trend, weekly movement, and coaching cues</Text>

      <View style={styles.rangeRow}>
        {[7, 14, 30].map((value) => (
          <Pressable
            key={value}
            onPress={() => onRangeChange(value as 7 | 14 | 30)}
            style={[styles.rangeChip, range === value && styles.rangeChipActive]}
          >
            <Text style={[styles.rangeChipText, range === value && styles.rangeChipTextActive]}>
              {value}d
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.chartCard, shadows.md]}>
        <Text style={styles.cardTitle}>Daily Calories</Text>
        <View style={styles.chartWrap}>
          <View style={[styles.averageLine, { bottom: Math.max(4, averageLineHeight) }]} />
          {sortedData.map((day) => {
            const barHeight = (day.calories / maxCalories) * MAX_BAR_HEIGHT;
            return (
              <View key={day.date} style={styles.barCol}>
                <Text style={styles.barValue}>{Math.round(day.calories)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: Math.max(4, barHeight) }]} />
                </View>
                <Text style={styles.barLabel}>{getDateLabel(day.date)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.averageLabel}>Avg: {Math.round(avg.calories)} kcal/day</Text>
      </View>

      <View style={[styles.summaryCard, shadows.sm]}>
        <Text style={styles.cardTitle}>Goal vs Actual (Avg / day)</Text>
        <SummaryCell styles={styles} label="Calories" value={formatDelta(goalVsActual.calories, 'kcal')} />
        <SummaryCell styles={styles} label="Protein" value={formatDelta(goalVsActual.protein, 'g')} />
        <SummaryCell styles={styles} label="Carbs" value={formatDelta(goalVsActual.carbs, 'g')} />
        <SummaryCell styles={styles} label="Fat" value={formatDelta(goalVsActual.fat, 'g')} />
      </View>

      <View style={[styles.summaryCard, shadows.sm]}>
        <Text style={styles.cardTitle}>Weekly Delta (Recent vs Prior)</Text>
        {weeklyDelta ? (
          <>
            <SummaryCell
              styles={styles}
              label="Calories"
              value={formatWeeklyDelta(weeklyDelta.calories, 'kcal/day')}
            />
            <SummaryCell
              styles={styles}
              label="Protein"
              value={formatWeeklyDelta(weeklyDelta.protein, 'g/day')}
            />
            <SummaryCell
              styles={styles}
              label="Carbs"
              value={formatWeeklyDelta(weeklyDelta.carbs, 'g/day')}
            />
            <SummaryCell
              styles={styles}
              label="Fat"
              value={formatWeeklyDelta(weeklyDelta.fat, 'g/day')}
            />
          </>
        ) : (
          <Text style={styles.pendingDeltaText}>Log a few more days to unlock weekly delta insights.</Text>
        )}
      </View>

      <View style={[styles.summaryCard, shadows.sm]}>
        <Text style={styles.cardTitle}>Coaching Hints</Text>
        {hints.map((hint) => (
          <Text key={hint} style={styles.hintText}>
            • {hint}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

const SummaryCell: React.FC<{
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}> = ({ styles, label, value }) => {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    content: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    title: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    subtitle: {
      marginTop: -spacing.sm,
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
    },
    rangeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    rangeChip: {
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.neutral[300],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background.card,
    },
    rangeChipActive: {
      borderColor: colors.primary[500],
      backgroundColor: colors.primary[50],
    },
    rangeChipText: {
      color: colors.text.secondary,
      fontWeight: typography.fontWeights.medium,
      fontSize: typography.fontSizes.sm,
    },
    rangeChipTextActive: {
      color: colors.primary[700],
      fontWeight: typography.fontWeights.semibold,
    },
    chartCard: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      padding: spacing.md,
    },
    cardTitle: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    chartWrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      minHeight: 210,
      position: 'relative',
    },
    averageLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: colors.secondary[400],
      opacity: 0.9,
    },
    averageLabel: {
      marginTop: spacing.sm,
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    barValue: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
    },
    barTrack: {
      width: 20,
      height: MAX_BAR_HEIGHT,
      borderRadius: borderRadius.full,
      backgroundColor: colors.neutral[100],
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      backgroundColor: colors.primary[500],
      borderRadius: borderRadius.full,
      minHeight: 4,
    },
    barLabel: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
      fontWeight: typography.fontWeights.medium,
    },
    summaryCard: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      padding: spacing.md,
      gap: spacing.sm,
    },
    summaryCell: {
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    summaryLabel: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    summaryValue: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.primary,
    },
    pendingDeltaText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    hintText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.primary,
      lineHeight: 20,
    },
  });

export default ProgressScreen;

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';
import { DailyMacroSummary, MacroTotals } from '../types';

interface ProgressScreenProps {
  weekData: DailyMacroSummary[];
}

const MAX_BAR_HEIGHT = 160;

const getDateLabel = (dateKey: string): string => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return labels[parsed.getDay()] ?? '?';
};

const safeAverage = (sum: number, count: number): number => {
  if (count <= 0) return 0;
  return sum / count;
};

const buildWeeklyAverageMacros = (rows: DailyMacroSummary[]): MacroTotals => {
  if (rows.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const total = rows.reduce(
    (acc, row) => ({
      calories: acc.calories + row.calories,
      protein: acc.protein + row.protein,
      carbs: acc.carbs + row.carbs,
      fat: acc.fat + row.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    calories: safeAverage(total.calories, rows.length),
    protein: safeAverage(total.protein, rows.length),
    carbs: safeAverage(total.carbs, rows.length),
    fat: safeAverage(total.fat, rows.length),
  };
};

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ weekData }) => {
  const averageMacros = useMemo(() => buildWeeklyAverageMacros(weekData), [weekData]);
  const maxCalories = useMemo(
    () => Math.max(1, ...weekData.map((entry) => entry.calories)),
    [weekData]
  );

  const weekTotals = useMemo(
    () =>
      weekData.reduce(
        (acc, row) => ({
          calories: acc.calories + row.calories,
          protein: acc.protein + row.protein,
          carbs: acc.carbs + row.carbs,
          fat: acc.fat + row.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [weekData]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Past 7 days summary</Text>

      <View style={[styles.chartCard, shadows.md]}>
        <Text style={styles.cardTitle}>Daily Calories</Text>
        <View style={styles.chartWrap}>
          {weekData.map((day) => {
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
      </View>

      <View style={[styles.summaryCard, shadows.sm]}>
        <Text style={styles.cardTitle}>Weekly Totals</Text>
        <View style={styles.row}>
          <SummaryCell label="Calories" value={`${Math.round(weekTotals.calories)} kcal`} />
          <SummaryCell label="Protein" value={`${Math.round(weekTotals.protein)} g`} />
        </View>
        <View style={styles.row}>
          <SummaryCell label="Carbs" value={`${Math.round(weekTotals.carbs)} g`} />
          <SummaryCell label="Fat" value={`${Math.round(weekTotals.fat)} g`} />
        </View>
      </View>

      <View style={[styles.summaryCard, shadows.sm]}>
        <Text style={styles.cardTitle}>Average Macros / Day</Text>
        <View style={styles.row}>
          <SummaryCell label="Calories" value={`${Math.round(averageMacros.calories)} kcal`} />
          <SummaryCell label="Protein" value={`${Math.round(averageMacros.protein)} g`} />
        </View>
        <View style={styles.row}>
          <SummaryCell label="Carbs" value={`${Math.round(averageMacros.carbs)} g`} />
          <SummaryCell label="Fat" value={`${Math.round(averageMacros.fat)} g`} />
        </View>
      </View>
    </View>
  );
};

const SummaryCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.summaryCell}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    gap: spacing.md,
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
    width: 24,
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
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCell: {
    flex: 1,
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
});

export default ProgressScreen;

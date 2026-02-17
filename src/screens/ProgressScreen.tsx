import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, shadows, spacing, typography, ThemeColors } from "../theme";
import { DailyMacroSummary, MacroTargets } from "../types";
import { useThemeContext } from "../contexts/ThemeContext";

interface ProgressScreenProps {
  data: DailyMacroSummary[];
  macroTargets: MacroTargets;
  range: 7 | 14 | 30;
  onRangeChange: (range: 7 | 14 | 30) => void;
}

const MAX_BAR_HEIGHT = 160;

const getDateLabel = (dateKey: string): string => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  return labels[parsed.getDay()] ?? "?";
};

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  data,
  macroTargets,
  range,
  onRangeChange,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const maxCalories = useMemo(
    () => Math.max(macroTargets.calories, 1, ...data.map((entry) => entry.calories)),
    [data, macroTargets.calories]
  );

  const averageCalories = useMemo(() => {
    if (data.length === 0) return 0;
    return (
      data.reduce((sum, row) => sum + row.calories, 0) /
      Math.max(1, data.length)
    );
  }, [data]);

  const goalVsActual = useMemo(() => {
    return {
      calories: averageCalories - macroTargets.calories,
      protein:
        data.reduce((sum, row) => sum + row.protein, 0) /
          Math.max(1, data.length) -
        macroTargets.protein,
      carbs:
        data.reduce((sum, row) => sum + row.carbs, 0) /
          Math.max(1, data.length) -
        macroTargets.carbs,
      fat:
        data.reduce((sum, row) => sum + row.fat, 0) / Math.max(1, data.length) -
        macroTargets.fat,
    };
  }, [averageCalories, data, macroTargets]);

  const averageLineHeight = (averageCalories / maxCalories) * MAX_BAR_HEIGHT;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Nutrition trend and goal tracking</Text>

      <View style={styles.rangeRow}>
        {[7, 14, 30].map((value) => (
          <Pressable
            key={value}
            onPress={() => onRangeChange(value as 7 | 14 | 30)}
            style={[
              styles.rangeChip,
              range === value && styles.rangeChipActive,
            ]}
          >
            <Text
              style={[
                styles.rangeChipText,
                range === value && styles.rangeChipTextActive,
              ]}
            >
              {value}d
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.chartCard, shadows.md]}>
        <Text style={styles.cardTitle}>Daily Calories</Text>
        <View style={styles.chartWrap}>
          <View style={[styles.averageLine, { bottom: Math.max(4, averageLineHeight) }]} />
          {data.map((day) => {
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
        <Text style={styles.averageLabel}>
          Avg: {Math.round(averageCalories)} kcal/day
        </Text>
      </View>

      <View style={[styles.summaryCard, shadows.sm]}>
        <Text style={styles.cardTitle}>Goal vs Actual (Avg / day)</Text>
        <SummaryCell label="Calories" value={formatDelta(goalVsActual.calories, "kcal")} />
        <SummaryCell label="Protein" value={formatDelta(goalVsActual.protein, "g")} />
        <SummaryCell label="Carbs" value={formatDelta(goalVsActual.carbs, "g")} />
        <SummaryCell label="Fat" value={formatDelta(goalVsActual.fat, "g")} />
      </View>
    </View>
  );
};

const formatDelta = (value: number, unit: string): string => {
  const rounded = Math.round(value);
  if (rounded === 0) return `On target (${unit})`;
  if (rounded > 0) return `+${rounded} ${unit}`;
  return `${rounded} ${unit}`;
};

const SummaryCell: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    rangeRow: {
      flexDirection: "row",
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
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      minHeight: 210,
      position: "relative",
    },
    averageLine: {
      position: "absolute",
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
      alignItems: "center",
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
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    barFill: {
      width: "100%",
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
  });

export default ProgressScreen;

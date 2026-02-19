import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, shadows, spacing, typography, ThemeColors } from '../theme';
import { MacroRemaining, MacroTargets, MacroTotals, RecentMeal, UserStreak } from '../types';
import { CircularProgress } from '../components/CircularProgress';
import { WeekCalendar } from '../components/WeekCalendar';
import { MealCard } from '../components/MealCard';
import { useThemeContext } from '../contexts/ThemeContext';

interface HomeScreenProps {
  todayTotals: MacroTotals;
  macroTargets: MacroTargets;
  remainingMacros: MacroRemaining | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  daysWithMeals: string[];
  recentMeals: RecentMeal[];
  streak: UserStreak | null;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
  onDeleteMeal?: (mealId: string) => Promise<void>;
  deletingMealIds?: string[];
  onMealPress?: (meal: RecentMeal) => void;
  onQuickAdd?: () => void;
  onScanMenu?: () => void;
  onScanBarcode?: () => void;
}

type MacroFocus = 'calories' | 'protein' | 'carbs' | 'fat';

type RemainingMacroHelper = {
  title: string;
  summary: string;
  ideas: string[];
  focus: MacroFocus;
};

const clampProgress = (current: number, target: number): number => {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(1, current / target));
};

const getRemainingText = (value: number, unitSuffix: string): string => {
  if (value >= 0) return `${Math.round(value)}${unitSuffix} left`;
  return `${Math.round(Math.abs(value))}${unitSuffix} over`;
};

const buildRemainingHelper = (remaining: MacroTotals): RemainingMacroHelper => {
  const focusOrder: Array<{ key: MacroFocus; value: number }> = [
    { key: 'protein', value: remaining.protein },
    { key: 'carbs', value: remaining.carbs },
    { key: 'fat', value: remaining.fat },
    { key: 'calories', value: remaining.calories },
  ];

  const focus =
    focusOrder
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)[0]?.key ?? 'calories';

  if (remaining.calories <= 0) {
    return {
      title: 'Target reached for calories',
      summary: 'Stay in range with lighter portions and higher-volume foods.',
      focus,
      ideas: [
        'Choose lean protein + vegetables for your next meal.',
        'Skip sugary drinks and high-fat add-ons for the rest of today.',
      ],
    };
  }

  if (focus === 'protein') {
    return {
      title: 'Protein is your main gap',
      summary: `You still have about ${Math.max(0, Math.round(remaining.protein))}g protein to hit today.`,
      focus,
      ideas: [
        'Try grilled chicken, fish, tofu, or Greek yogurt first.',
        'Scan a menu and prioritize items with at least 25g protein.',
      ],
    };
  }

  if (focus === 'carbs') {
    return {
      title: 'Carbs can carry your next meal',
      summary: `You still have about ${Math.max(0, Math.round(remaining.carbs))}g carbs available.`,
      focus,
      ideas: [
        'Pick rice, oats, potatoes, or whole-grain wraps with lean protein.',
        'Keep fats moderate to avoid overshooting calories.',
      ],
    };
  }

  if (focus === 'fat') {
    return {
      title: 'Fat budget is still open',
      summary: `You still have about ${Math.max(0, Math.round(remaining.fat))}g fat left today.`,
      focus,
      ideas: [
        'Add avocado, nuts, or olive-oil based toppings to balance meals.',
        'Pair fat sources with protein so calories stay useful.',
      ],
    };
  }

  return {
    title: 'Calories remain for one more meal',
    summary: `You have about ${Math.max(0, Math.round(remaining.calories))} kcal left today.`,
    focus,
    ideas: [
      'Keep portions measured and prioritize foods with clear macros.',
      'Use menu scan to compare options before logging.',
    ],
  };
};

const noStreak: UserStreak = {
  userId: '',
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  todayTotals,
  macroTargets,
  remainingMacros,
  selectedDate,
  onSelectDate,
  daysWithMeals,
  recentMeals,
  streak,
  error,
  onRefresh,
  onDeleteMeal,
  deletingMealIds = [],
  onMealPress,
  onQuickAdd,
  onScanMenu,
  onScanBarcode,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const safeStreak = streak ?? noStreak;
  const caloriesRemaining = remainingMacros
    ? remainingMacros.calories
    : macroTargets.calories - todayTotals.calories;
  const proteinRemaining = remainingMacros
    ? remainingMacros.protein
    : macroTargets.protein - todayTotals.protein;
  const carbsRemaining = remainingMacros
    ? remainingMacros.carbs
    : macroTargets.carbs - todayTotals.carbs;
  const fatRemaining = remainingMacros
    ? remainingMacros.fat
    : macroTargets.fat - todayTotals.fat;

  const helper = useMemo(
    () =>
      buildRemainingHelper({
        calories: caloriesRemaining,
        protein: proteinRemaining,
        carbs: carbsRemaining,
        fat: fatRemaining,
      }),
    [caloriesRemaining, proteinRemaining, carbsRemaining, fatRemaining]
  );

  const deletingMealSet = useMemo(() => new Set(deletingMealIds), [deletingMealIds]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        ) : undefined
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.subtitle}>Daily nutrition dashboard</Text>
        </View>
        <View style={[styles.streakBadge, shadows.sm]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakCount}>{safeStreak.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      <View style={styles.quickActionsRow}>
        {onQuickAdd ? (
          <Pressable style={styles.quickAddButton} onPress={onQuickAdd}>
            <Text style={styles.quickActionText}>⚡ Quick Add</Text>
          </Pressable>
        ) : null}
        {onScanMenu ? (
          <Pressable style={[styles.quickActionSecondary, styles.scanMenuButton]} onPress={onScanMenu}>
            <Text style={styles.quickActionText}>📋 Scan Menu</Text>
          </Pressable>
        ) : null}
        {onScanBarcode ? (
          <Pressable style={[styles.quickActionSecondary, styles.scanBarcodeButton]} onPress={onScanBarcode}>
            <Text style={styles.quickActionText}>📦 Scan Barcode</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      <WeekCalendar selectedDate={selectedDate} onSelectDate={onSelectDate} daysWithMeals={daysWithMeals} />

      <View style={[styles.calorieRingWrap, shadows.md]}>
        <CircularProgress
          progress={clampProgress(todayTotals.calories, macroTargets.calories)}
          size={210}
          strokeWidth={16}
          color={colors.primary[500]}
          label="Calories"
          valueText={`${Math.round(todayTotals.calories)} kcal`}
          trackColor={colors.neutral[200]}
        />
        <Text style={styles.remainingPrimary}>{getRemainingText(caloriesRemaining, ' calories')}</Text>
      </View>

      <View style={styles.macroRow}>
        <View style={[styles.macroRingWrap, shadows.sm]}>
          <CircularProgress
            progress={clampProgress(todayTotals.protein, macroTargets.protein)}
            size={112}
            strokeWidth={10}
            color={colors.primary[600]}
            label="Protein"
            valueText={`${Math.round(todayTotals.protein)}g`}
          />
          <Text style={styles.remainingSmall}>{getRemainingText(proteinRemaining, 'g')}</Text>
        </View>

        <View style={[styles.macroRingWrap, shadows.sm]}>
          <CircularProgress
            progress={clampProgress(todayTotals.carbs, macroTargets.carbs)}
            size={112}
            strokeWidth={10}
            color={colors.secondary[600]}
            label="Carbs"
            valueText={`${Math.round(todayTotals.carbs)}g`}
          />
          <Text style={styles.remainingSmall}>{getRemainingText(carbsRemaining, 'g')}</Text>
        </View>

        <View style={[styles.macroRingWrap, shadows.sm]}>
          <CircularProgress
            progress={clampProgress(todayTotals.fat, macroTargets.fat)}
            size={112}
            strokeWidth={10}
            color={colors.neutral[700]}
            label="Fat"
            valueText={`${Math.round(todayTotals.fat)}g`}
          />
          <Text style={styles.remainingSmall}>{getRemainingText(fatRemaining, 'g')}</Text>
        </View>
      </View>

      <View style={[styles.helperCard, shadows.sm]}>
        <Text style={styles.helperTitle}>Remaining Macro Helper</Text>
        <Text style={styles.helperHeadline}>{helper.title}</Text>
        <Text style={styles.helperSummary}>{helper.summary}</Text>
        <View style={styles.helperList}>
          {helper.ideas.map((idea) => (
            <Text key={idea} style={styles.helperBullet}>
              • {idea}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recently uploaded</Text>
        <Text style={styles.sectionMeta}>{recentMeals.length} today</Text>
      </View>

      {recentMeals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No meals logged today</Text>
          <Text style={styles.emptyText}>Use the Scan tab to add your first meal.</Text>
        </View>
      ) : (
        recentMeals.map((meal) => (
          <MealCard
            key={meal.id}
            mealName={meal.foodName}
            timestamp={meal.timestamp}
            calories={meal.calories}
            protein={meal.protein}
            carbs={meal.carbs}
            fat={meal.fat}
            imageUri={meal.imageUri}
            onDelete={onDeleteMeal ? () => onDeleteMeal(meal.id) : undefined}
            onPress={onMealPress ? () => onMealPress(meal) : undefined}
            isDeleting={deletingMealSet.has(meal.id)}
          />
        ))
      )}
    </ScrollView>
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
      paddingBottom: spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    subtitle: {
      marginTop: spacing.xs,
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
    },
    streakBadge: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.secondary[200],
    },
    quickActionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    quickAddButton: {
      backgroundColor: colors.secondary[400],
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.secondary[600],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    quickActionSecondary: {
      borderRadius: borderRadius.full,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.background.card,
    },
    scanMenuButton: {
      borderColor: colors.primary[300],
    },
    scanBarcodeButton: {
      borderColor: colors.info,
    },
    quickActionText: {
      color: colors.text.primary,
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
    },
    streakEmoji: {
      fontSize: typography.fontSizes.md,
    },
    streakCount: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    streakLabel: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
    },
    calorieRingWrap: {
      marginTop: spacing.sm,
      marginBottom: spacing.md,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.background.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.neutral[200],
    },
    remainingPrimary: {
      marginTop: spacing.sm,
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.secondary,
    },
    macroRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    macroRingWrap: {
      flex: 1,
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    remainingSmall: {
      marginTop: spacing.xs,
      fontSize: typography.fontSizes.xs,
      color: colors.text.secondary,
    },
    helperCard: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      backgroundColor: colors.background.card,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    helperTitle: {
      fontSize: typography.fontSizes.xs,
      textTransform: 'uppercase',
      color: colors.text.tertiary,
      fontWeight: typography.fontWeights.semibold,
      marginBottom: spacing.xs,
    },
    helperHeadline: {
      fontSize: typography.fontSizes.md,
      color: colors.text.primary,
      fontWeight: typography.fontWeights.bold,
      marginBottom: spacing.xs,
    },
    helperSummary: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      marginBottom: spacing.sm,
      lineHeight: 20,
    },
    helperList: {
      gap: spacing.xs,
    },
    helperBullet: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.primary,
      lineHeight: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    sectionMeta: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
    },
    emptyState: {
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      padding: spacing.lg,
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
    },
    errorBanner: {
      backgroundColor: '#fef2f2',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    errorText: {
      color: colors.error,
      fontSize: typography.fontSizes.sm,
      textAlign: 'center',
    },
  });

export default HomeScreen;

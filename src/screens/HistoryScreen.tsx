import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { borderRadius, shadows, spacing, typography, ThemeColors } from "../theme";
import { RecentMeal } from "../types";
import { MealCard } from "../components/MealCard";
import { useThemeContext } from "../contexts/ThemeContext";

interface HistoryScreenProps {
  meals: RecentMeal[];
  deletingMealIds: string[];
  onManualEntry: () => void;
  onExportCsv?: () => Promise<{ fileUri: string; rowCount: number }>;
  onDeleteMeal: (mealId: string) => Promise<void>;
  onMealPress: (meal: RecentMeal) => void;
  onRefresh: () => Promise<void>;
}

type HistorySection = {
  title: string;
  date: string;
  data: RecentMeal[];
};

const formatSectionTitle = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  meals,
  deletingMealIds,
  onManualEntry,
  onExportCsv,
  onDeleteMeal,
  onMealPress,
  onRefresh,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sections = useMemo<HistorySection[]>(() => {
    const grouped = new Map<string, RecentMeal[]>();
    for (const meal of meals) {
      const key =
        meal.date ??
        new Date(meal.timestamp - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10);
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(meal);
      } else {
        grouped.set(key, [meal]);
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([date, dayMeals]) => ({
        title: formatSectionTitle(date),
        date,
        data: dayMeals.sort((a, b) => b.timestamp - a.timestamp),
      }));
  }, [meals]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    if (!onExportCsv || exporting) return;
    setExporting(true);
    try {
      await onExportCsv();
    } finally {
      setExporting(false);
    }
  };

  return (
    <SectionList
      sections={sections}
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary[500]]}
          tintColor={colors.primary[500]}
        />
      }
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Last 30 days of meals</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.manualEntryButton} onPress={onManualEntry}>
              <Text style={styles.manualEntryText}>Add Manual Entry</Text>
            </Pressable>
            {onExportCsv ? (
              <Pressable style={styles.exportButton} onPress={() => void handleExport()} disabled={exporting}>
                <Text style={styles.exportButtonText}>{exporting ? "Exporting..." : "Export CSV"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionMeta}>{section.data.length} meals</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Swipeable
          overshootRight={false}
          renderRightActions={() => (
            <Pressable
              style={styles.deleteAction}
              onPress={() => {
                void onDeleteMeal(item.id);
              }}
            >
              <Text style={styles.deleteActionText}>Delete</Text>
            </Pressable>
          )}
        >
          <MealCard
            mealName={item.foodName}
            timestamp={item.timestamp}
            calories={item.calories}
            protein={item.protein}
            carbs={item.carbs}
            fat={item.fat}
            imageUri={item.imageUri}
            onDelete={() => {
              void onDeleteMeal(item.id);
            }}
            onPress={() => onMealPress(item)}
            isDeleting={deletingMealIds.includes(item.id)}
          />
        </Swipeable>
      )}
      ListEmptyComponent={
        <View style={[styles.emptyState, shadows.sm]}>
          <Text style={styles.emptyTitle}>No meals in history yet</Text>
          <Text style={styles.emptyText}>
            Scan your first meal or add a manual entry.
          </Text>
        </View>
      }
    />
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    headerWrap: {
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.fontSizes.xxl,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    subtitle: {
      marginTop: spacing.xs,
      marginBottom: spacing.md,
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
    },
    manualEntryButton: {
      flex: 1,
      backgroundColor: colors.secondary[400],
      borderRadius: borderRadius.full,
      paddingVertical: spacing.sm,
      alignItems: "center",
    },
    manualEntryText: {
      color: colors.text.primary,
      fontWeight: typography.fontWeights.semibold,
    },
    headerActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    exportButton: {
      flex: 1,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.primary[300],
      backgroundColor: colors.background.card,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    exportButtonText: {
      color: colors.primary[700],
      fontWeight: typography.fontWeights.semibold,
    },
    sectionHeader: {
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.secondary,
    },
    sectionMeta: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.tertiary,
    },
    deleteAction: {
      backgroundColor: colors.error,
      justifyContent: "center",
      alignItems: "center",
      width: 96,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
    },
    deleteActionText: {
      color: colors.text.inverse,
      fontWeight: typography.fontWeights.bold,
      fontSize: typography.fontSizes.sm,
    },
    emptyState: {
      marginTop: spacing.sm,
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      padding: spacing.md,
    },
    emptyTitle: {
      fontSize: typography.fontSizes.md,
      color: colors.text.primary,
      fontWeight: typography.fontWeights.semibold,
    },
    emptyText: {
      marginTop: spacing.xs,
      color: colors.text.secondary,
      fontSize: typography.fontSizes.sm,
    },
  });

export default HistoryScreen;

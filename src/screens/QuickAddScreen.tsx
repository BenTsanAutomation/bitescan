import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { borderRadius, shadows, spacing, ThemeColors, typography } from '../theme';
import { useThemeContext } from '../contexts/ThemeContext';

type QuickAddEntry = {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

interface QuickAddScreenProps {
  externalUserId: string;
  onAdd: (entry: QuickAddEntry) => Promise<void>;
  onClose: () => void;
}

const dedupeByName = (entries: QuickAddEntry[]) => {
  const seen = new Set<string>();
  const deduped: QuickAddEntry[] = [];
  for (const entry of entries) {
    const key = entry.foodName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
};

export const QuickAddScreen: React.FC<QuickAddScreenProps> = ({
  externalUserId,
  onAdd,
  onClose,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [addedNames, setAddedNames] = useState<Record<string, boolean>>({});

  const favoritesQuery = useQuery(api.favorites.listFavorites, { externalUserId });
  const recentMealsQuery = useQuery(api.favorites.getRecentMeals, { externalUserId });
  const favorites = favoritesQuery ?? [];
  const recentMeals = recentMealsQuery ?? [];

  const favoriteEntries = (favorites as QuickAddEntry[]).slice(0, 6);
  const recentEntries = dedupeByName(recentMeals as QuickAddEntry[]);
  const isLoading = favoritesQuery === undefined || recentMealsQuery === undefined;

  const handleAdd = async (entry: QuickAddEntry) => {
    const key = entry.foodName.trim().toLowerCase();
    if (!key || pendingName === key) return;
    setPendingName(key);
    try {
      await onAdd(entry);
      setAddedNames((prev) => ({ ...prev, [key]: true }));
    } finally {
      setPendingName(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Add</Text>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⭐ Favorites</Text>
            {favoriteEntries.length === 0 ? (
              <Text style={styles.emptyText}>No favorites yet. Add meals you log often to save them here.</Text>
            ) : (
              favoriteEntries.map((entry) => {
                const key = entry.foodName.trim().toLowerCase();
                const isAdded = !!addedNames[key];
                const isPending = pendingName === key;
                return (
                  <View key={`fav-${key}`} style={[styles.rowCard, shadows.sm]}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.foodName}>{entry.foodName}</Text>
                      <Text style={styles.metaText}>
                        {Math.round(entry.calories)} cal · {Math.round(entry.protein)}g protein
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.addButton, (isAdded || isPending) && styles.addedButton]}
                      onPress={() => void handleAdd(entry)}
                      disabled={isPending}
                    >
                      <Text style={styles.addButtonText}>{isAdded ? '✓' : '+ Add'}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Recent (7 days)</Text>
            {recentEntries.length === 0 ? (
              <Text style={styles.emptyText}>No recent meals in the last 7 days.</Text>
            ) : (
              recentEntries.map((entry) => {
                const key = entry.foodName.trim().toLowerCase();
                const isAdded = !!addedNames[key];
                const isPending = pendingName === key;
                return (
                  <View key={`recent-${key}`} style={[styles.rowCard, shadows.sm]}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.foodName}>{entry.foodName}</Text>
                      <Text style={styles.metaText}>
                        {Math.round(entry.calories)} cal · {Math.round(entry.protein)}g protein
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.addButton, (isAdded || isPending) && styles.addedButton]}
                      onPress={() => void handleAdd(entry)}
                      disabled={isPending}
                    >
                      <Text style={styles.addButtonText}>{isAdded ? '✓' : '+ Add'}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
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
      marginBottom: spacing.md,
    },
    title: {
      fontSize: typography.fontSizes.xl,
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
    closeText: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.primary,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: typography.fontSizes.lg,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    rowCard: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.neutral[200],
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    foodName: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    metaText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
    },
    addButton: {
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary[500],
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    addedButton: {
      backgroundColor: colors.success,
    },
    addButtonText: {
      color: colors.text.inverse,
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
    },
    emptyText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      paddingVertical: spacing.sm,
    },
  });

export default QuickAddScreen;

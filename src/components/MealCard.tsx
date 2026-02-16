import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';

interface MealCardProps {
  mealName: string;
  timestamp: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUri?: string;
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours = hours24 % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

const MacroPill: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View style={[styles.pill, { borderColor: color }]}> 
    <Text style={[styles.pillText, { color }]}>
      {label} {Math.round(value)}g
    </Text>
  </View>
);

export const MealCard: React.FC<MealCardProps> = ({
  mealName,
  timestamp,
  calories,
  protein,
  carbs,
  fat,
  imageUri,
}) => {
  return (
    <View style={[styles.card, shadows.sm]}>
      <View style={styles.thumbnailWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.placeholder]}>
            <Text style={styles.placeholderIcon}>🍽️</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={styles.mealName}>
            {mealName}
          </Text>
          <Text style={styles.calories}>{Math.round(calories)} kcal</Text>
        </View>

        <Text style={styles.time}>{formatTime(timestamp)}</Text>

        <View style={styles.pillRow}>
          <MacroPill label="P" value={protein} color={colors.primary[600]} />
          <MacroPill label="C" value={carbs} color={colors.secondary[700]} />
          <MacroPill label="F" value={fat} color={colors.neutral[700]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailWrap: {
    marginRight: spacing.sm,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  mealName: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  calories: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary[700],
  },
  time: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.background.primary,
  },
  pillText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
});

export default MealCard;

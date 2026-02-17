// Food Item Card with Nutrition Info
import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { spacing, borderRadius, typography, shadows, ThemeColors } from '../theme';
import { FoodItem, HealthGrade } from '../types';
import { GradeDisplay } from './GradeDisplay';
import { useThemeContext } from '../contexts/ThemeContext';

interface FoodCardProps {
  food: FoodItem;
  index?: number;
  onPress?: () => void;
  expanded?: boolean;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  food,
  index = 0,
  onPress,
  expanded = false,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(entryTranslateY, {
        toValue: 0,
        delay: index * 100,
        tension: 100,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const { nutrition } = food;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }}
    >
      <Animated.View
        style={[
          styles.card,
          shadows.md,
          {
            opacity: entryOpacity,
            transform: [{ scale }, { translateY: entryTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.name} numberOfLines={1}>
              {food.name}
            </Text>
            {food.nameLocalized && (
              <Text style={styles.localName}>{food.nameLocalized}</Text>
            )}
            <View style={styles.metaRow}>
              {food.cuisine && (
                <Text style={styles.cuisine}>{food.cuisine}</Text>
              )}
              <Text style={styles.portion}>{food.portion}</Text>
            </View>
          </View>
          <GradeDisplay grade={food.grade as HealthGrade} size="sm" showLabel={false} />
        </View>

        {/* Main Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.calorieBox}>
            <Text style={styles.calorieValue}>{nutrition.calories}</Text>
            <Text style={styles.calorieLabel}>kcal</Text>
          </View>
          
          <View style={styles.macros}>
            <MacroBar label="Protein" value={nutrition.protein} color={colors.primary[500]} />
            <MacroBar label="Carbs" value={nutrition.carbs} color={colors.secondary[400]} />
            <MacroBar label="Fat" value={nutrition.fat} color={colors.neutral[400]} />
          </View>
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <DetailItem label="Fiber" value={`${nutrition.fiber}g`} />
              <DetailItem label="Sugar" value={`${nutrition.sugar}g`} />
              <DetailItem label="Sodium" value={`${nutrition.sodium}mg`} />
            </View>
            
            <View style={styles.gradeReason}>
              <Text style={styles.gradeReasonLabel}>Why this grade?</Text>
              <Text style={styles.gradeReasonText}>{food.gradeReason}</Text>
            </View>
            
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>AI Confidence</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { width: `${food.confidence}%` }
                  ]} 
                />
              </View>
              <Text style={styles.confidenceValue}>{food.confidence}%</Text>
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

interface MacroBarProps {
  label: string;
  value: number;
  color: string;
}

const MacroBar: React.FC<MacroBarProps> = ({ label, value, color }) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{value}g</Text>
      </View>
      <View style={styles.macroBarBg}>
        <View 
          style={[
            styles.macroBarFill, 
            { width: `${Math.min(value * 2, 100)}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );
};

interface DetailItemProps {
  label: string;
  value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailValue}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  localName: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cuisine: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary[600],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  portion: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calorieBox: {
    backgroundColor: colors.secondary[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  calorieValue: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.secondary[600],
  },
  calorieLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.secondary[500],
  },
  macros: {
    flex: 1,
    gap: spacing.sm,
  },
  macroItem: {},
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
  },
  macroValue: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  macroBarBg: {
    height: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  details: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailValue: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  detailLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  gradeReason: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  gradeReasonLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  gradeReasonText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confidenceLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral[100],
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: colors.primary[400],
    borderRadius: 2,
  },
  confidenceValue: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
    minWidth: 32,
    textAlign: 'right',
  },
});

export default FoodCard;

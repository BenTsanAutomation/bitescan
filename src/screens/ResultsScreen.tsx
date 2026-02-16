// Results Screen - Card Stack with Dashboard Toggle
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';
import { ScanResult, FoodItem, MealRecommendation, MacroRemaining } from '../types';
import { GradeDisplay } from '../components/GradeDisplay';
import { FoodCard } from '../components/FoodCard';
import { LeafParticles } from '../animations/LeafParticles';
import MacroFitCard from '../components/MacroFitCard';
import { calculateMacroFit } from '../utils/macroCalculations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ResultsScreenProps {
  result: ScanResult;
  imageUri: string;
  onSave: () => void;
  onRescan: () => void;
  onClose: () => void;
  remainingMacros?: MacroRemaining | null;
}

type ViewMode = 'cards' | 'dashboard';

// Helper component for fade-in-down animation
const FadeInDown: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: any;
}> = ({ delay = 0, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 100,
        friction: 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// Helper for simple fade-in
const FadeIn: React.FC<{
  duration?: number;
  children: React.ReactNode;
  style?: any;
}> = ({ duration = 400, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
};

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  result,
  imageUri,
  onSave,
  onRescan,
  onClose,
  remainingMacros,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <LeafParticles count={6} />
      
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Image Preview */}
        <FadeIn duration={400} style={styles.header}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <View style={styles.headerOverlay}>
            <Pressable onPress={onClose} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </Pressable>
          </View>
        </FadeIn>

        {/* Overall Score Card */}
        <FadeInDown delay={200} style={[styles.scoreCard, shadows.lg]}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreLabel}>Overall Health Score</Text>
              <Text style={styles.totalCalories}>
                {result.totalCalories} <Text style={styles.calorieUnit}>kcal</Text>
              </Text>
            </View>
            <GradeDisplay grade={result.overallGrade} size="lg" />
          </View>
          
          <View style={styles.matchContainer}>
            <Text style={styles.matchLabel}>Goal Match</Text>
            <View style={styles.matchBar}>
              <View 
                style={[
                  styles.matchFill, 
                  { width: `${result.userGoalsMatch}%` }
                ]} 
              />
            </View>
            <Text style={styles.matchValue}>{result.userGoalsMatch}%</Text>
          </View>

          <Text style={styles.recommendation}>{result.recommendation}</Text>

          {!!result.mealRecommendations?.length && (
            <View style={styles.recommendationList}>
              <Text style={styles.recommendationTitle}>Best picks for your macros + taste</Text>
              {result.mealRecommendations.slice(0, 3).map((rec) => (
                <RecommendationRow key={rec.foodId} rec={rec} />
              ))}
            </View>
          )}
        </FadeInDown>

        {/* View Mode Toggle */}
        <FadeInDown delay={300} style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === 'cards' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('cards')}
          >
            <Text style={[
              styles.toggleText,
              viewMode === 'cards' && styles.toggleTextActive,
            ]}>
              🃏 Cards
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === 'dashboard' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('dashboard')}
          >
            <Text style={[
              styles.toggleText,
              viewMode === 'dashboard' && styles.toggleTextActive,
            ]}>
              📊 Dashboard
            </Text>
          </Pressable>
        </FadeInDown>

        {/* Macro Fit Analysis */}
        {remainingMacros && result.foods.length > 0 && (
          <FadeInDown delay={200}>
            {result.foods.map((food, idx) => (
              <View key={food.id || idx} style={{ marginBottom: spacing.md }}>
                <MacroFitCard food={food} remaining={remainingMacros} />
              </View>
            ))}
          </FadeInDown>
        )}

        {/* Food Items */}
        <View style={styles.foodsContainer}>
          <Text style={styles.sectionTitle}>
            Detected Items ({result.foods.length})
          </Text>
          
          {viewMode === 'cards' ? (
            // Card Stack View
            result.foods.map((food, index) => (
              <FoodCard
                key={food.id}
                food={food}
                index={index}
                expanded={expandedCard === food.id}
                onPress={() => setExpandedCard(
                  expandedCard === food.id ? null : food.id
                )}
              />
            ))
          ) : (
            // Dashboard View
            <DashboardView foods={result.foods} />
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <FadeInDown delay={400} style={styles.actionBar}>
        <Pressable style={styles.secondaryButton} onPress={onRescan}>
          <Text style={styles.secondaryButtonText}>↻ Rescan</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={onSave}>
          <Text style={styles.primaryButtonText}>💾 Save</Text>
        </Pressable>
      </FadeInDown>
    </View>
  );
};

// Dashboard View Component
const DashboardView: React.FC<{ foods: FoodItem[] }> = ({ foods }) => {
  const totals = foods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.nutrition.calories,
      protein: acc.protein + food.nutrition.protein,
      carbs: acc.carbs + food.nutrition.carbs,
      fat: acc.fat + food.nutrition.fat,
      fiber: acc.fiber + food.nutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const macroTotal = totals.protein + totals.carbs + totals.fat;
  const proteinPct = macroTotal > 0 ? (totals.protein / macroTotal) * 100 : 0;
  const carbsPct = macroTotal > 0 ? (totals.carbs / macroTotal) * 100 : 0;
  const fatPct = macroTotal > 0 ? (totals.fat / macroTotal) * 100 : 0;

  return (
    <View style={dashStyles.container}>
      {/* Macro Distribution */}
      <View style={[dashStyles.card, shadows.md]}>
        <Text style={dashStyles.cardTitle}>Macro Distribution</Text>
        <View style={dashStyles.macroBar}>
          <View style={[dashStyles.macroSegment, { 
            flex: proteinPct, 
            backgroundColor: colors.primary[500] 
          }]} />
          <View style={[dashStyles.macroSegment, { 
            flex: carbsPct, 
            backgroundColor: colors.secondary[400] 
          }]} />
          <View style={[dashStyles.macroSegment, { 
            flex: fatPct, 
            backgroundColor: colors.neutral[400] 
          }]} />
        </View>
        <View style={dashStyles.macroLegend}>
          <LegendItem color={colors.primary[500]} label="Protein" value={`${totals.protein.toFixed(1)}g`} />
          <LegendItem color={colors.secondary[400]} label="Carbs" value={`${totals.carbs.toFixed(1)}g`} />
          <LegendItem color={colors.neutral[400]} label="Fat" value={`${totals.fat.toFixed(1)}g`} />
        </View>
      </View>

      {/* Nutrients Grid */}
      <View style={dashStyles.grid}>
        <NutrientCard 
          emoji="🔥" 
          label="Calories" 
          value={totals.calories.toString()} 
          unit="kcal" 
        />
        <NutrientCard 
          emoji="🌾" 
          label="Fiber" 
          value={totals.fiber.toFixed(1)} 
          unit="g" 
        />
      </View>

      {/* Items Summary */}
      <View style={[dashStyles.card, shadows.md]}>
        <Text style={dashStyles.cardTitle}>Items Breakdown</Text>
        {foods.map((food, index) => (
          <View key={food.id} style={dashStyles.itemRow}>
            <View style={dashStyles.itemInfo}>
              <Text style={dashStyles.itemName}>{food.name}</Text>
              <Text style={dashStyles.itemPortion}>{food.portion}</Text>
            </View>
            <Text style={dashStyles.itemCal}>{food.nutrition.calories} kcal</Text>
            <View style={[dashStyles.itemGrade, { backgroundColor: colors.grade[food.grade] }]}>
              <Text style={dashStyles.itemGradeText}>{food.grade}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const LegendItem: React.FC<{ color: string; label: string; value: string }> = ({
  color,
  label,
  value,
}) => (
  <View style={dashStyles.legendItem}>
    <View style={[dashStyles.legendDot, { backgroundColor: color }]} />
    <Text style={dashStyles.legendLabel}>{label}</Text>
    <Text style={dashStyles.legendValue}>{value}</Text>
  </View>
);

const NutrientCard: React.FC<{
  emoji: string;
  label: string;
  value: string;
  unit: string;
}> = ({ emoji, label, value, unit }) => (
  <View style={[dashStyles.nutrientCard, shadows.sm]}>
    <Text style={dashStyles.nutrientEmoji}>{emoji}</Text>
    <Text style={dashStyles.nutrientValue}>{value}</Text>
    <Text style={dashStyles.nutrientUnit}>{unit}</Text>
    <Text style={dashStyles.nutrientLabel}>{label}</Text>
  </View>
);

const RecommendationRow: React.FC<{ rec: MealRecommendation }> = ({ rec }) => (
  <View style={styles.recommendationRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.recommendationFood}>{rec.foodName}</Text>
      <Text style={styles.recommendationReason}>{rec.reason}</Text>
    </View>
    <View style={styles.recommendationScores}>
      <Text style={styles.recommendationBadge}>Fit {rec.macroFitScore}</Text>
      <Text style={styles.recommendationBadge}>Taste {rec.tasteScore}</Text>
      <Text style={[styles.recommendationBadge, styles.recommendationBadgePrimary]}>{rec.combinedScore}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    height: 200,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingTop: 50,
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: colors.text.inverse,
    fontSize: 24,
  },
  scoreCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.md,
    marginTop: -40,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  totalCalories: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  calorieUnit: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.regular,
    color: colors.text.tertiary,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  matchLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  matchBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  matchFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },
  matchValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary[600],
    marginLeft: spacing.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  recommendation: {
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  recommendationList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  recommendationTitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.semibold,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  recommendationFood: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  recommendationReason: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
  },
  recommendationScores: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recommendationBadge: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  recommendationBadgePrimary: {
    color: colors.text.inverse,
    backgroundColor: colors.primary[500],
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.background.card,
  },
  toggleText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  toggleTextActive: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  foodsContainer: {
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    paddingBottom: 34,
    backgroundColor: colors.background.card,
    gap: spacing.md,
    ...shadows.lg,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
});

const dashStyles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  macroBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  macroSegment: {
    height: '100%',
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  legendValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nutrientCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  nutrientEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  nutrientValue: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  nutrientUnit: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.tertiary,
  },
  nutrientLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  itemPortion: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
  },
  itemCal: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginRight: spacing.md,
  },
  itemGrade: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemGradeText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});

export default ResultsScreen;

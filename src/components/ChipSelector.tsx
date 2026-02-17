// Chip/Tag Selection + Priority Slider Component
import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import Slider from '@react-native-community/slider';
import { spacing, borderRadius, typography, ThemeColors } from '../theme';
import { DietaryGoal } from '../types';
import { useThemeContext } from '../contexts/ThemeContext';

interface ChipSelectorProps {
  selectedGoals: DietaryGoal[];
  priorities: Partial<Record<DietaryGoal, number>>;
  onGoalsChange: (goals: DietaryGoal[]) => void;
  onPrioritiesChange: (priorities: Partial<Record<DietaryGoal, number>>) => void;
}

const GOALS: { id: DietaryGoal; label: string; emoji: string }[] = [
  { id: 'protein', label: 'High Protein', emoji: '💪' },
  { id: 'low_calorie', label: 'Low Calorie', emoji: '🔥' },
  { id: 'collagen', label: 'Collagen', emoji: '✨' },
  { id: 'fiber', label: 'High Fiber', emoji: '🌾' },
  { id: 'low_carb', label: 'Low Carb', emoji: '🥑' },
  { id: 'low_fat', label: 'Low Fat', emoji: '🫒' },
  { id: 'vitamins', label: 'Vitamins', emoji: '🍊' },
  { id: 'omega3', label: 'Omega-3', emoji: '🐟' },
  { id: 'antioxidants', label: 'Antioxidants', emoji: '🫐' },
  { id: 'hydration', label: 'Hydration', emoji: '💧' },
];

interface ChipProps {
  goal: typeof GOALS[0];
  selected: boolean;
  onPress: () => void;
}

const Chip: React.FC<ChipProps> = ({ goal, selected, onPress }) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: selected ? 1 : 0,
      friction: 15,
      useNativeDriver: false,
    }).start();
  }, [selected]);

  const backgroundColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.neutral[100], colors.primary[500]],
  });

  const borderColor = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.neutral[300], colors.primary[600]],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: false }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start();
      }}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            transform: [{ scale }],
            backgroundColor,
            borderColor,
          },
        ]}
      >
        <Text style={styles.chipEmoji}>{goal.emoji}</Text>
        <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
          {goal.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

interface PrioritySliderProps {
  goal: typeof GOALS[0];
  value: number;
  onChange: (value: number) => void;
}

const PrioritySlider: React.FC<PrioritySliderProps> = ({ goal, value, onChange }) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderEmoji}>{goal.emoji}</Text>
        <Text style={styles.sliderLabel}>{goal.label}</Text>
        <Text style={styles.sliderValue}>{value}%</Text>
      </View>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onChange}
        minimumValue={0}
        maximumValue={100}
        step={5}
        minimumTrackTintColor={colors.primary[500]}
        maximumTrackTintColor={colors.neutral[200]}
        thumbTintColor={colors.primary[600]}
      />
    </View>
  );
};

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  selectedGoals,
  priorities,
  onGoalsChange,
  onPrioritiesChange,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const toggleGoal = (goalId: DietaryGoal) => {
    if (selectedGoals.includes(goalId)) {
      onGoalsChange(selectedGoals.filter(g => g !== goalId));
      const newPriorities = { ...priorities };
      delete newPriorities[goalId];
      onPrioritiesChange(newPriorities);
    } else {
      onGoalsChange([...selectedGoals, goalId]);
      onPrioritiesChange({ ...priorities, [goalId]: 50 });
    }
  };

  const updatePriority = (goalId: DietaryGoal, value: number) => {
    onPrioritiesChange({ ...priorities, [goalId]: Math.round(value) });
  };

  const selectedGoalData = GOALS.filter(g => selectedGoals.includes(g.id));

  return (
    <View style={styles.container}>
      {/* Chip Selection */}
      <Text style={styles.sectionTitle}>Select Your Goals</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.chipContainer}
      >
        {GOALS.map(goal => (
          <Chip
            key={goal.id}
            goal={goal}
            selected={selectedGoals.includes(goal.id)}
            onPress={() => toggleGoal(goal.id)}
          />
        ))}
      </ScrollView>

      {/* Priority Sliders */}
      {selectedGoalData.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>
            Set Priorities
          </Text>
          <View style={styles.slidersContainer}>
            {selectedGoalData.map(goal => (
              <PrioritySlider
                key={goal.id}
                goal={goal}
                value={priorities[goal.id] || 50}
                onChange={(v) => updatePriority(goal.id, v)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    gap: spacing.xs,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  chipLabelSelected: {
    color: colors.text.inverse,
  },
  slidersContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  sliderContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sliderEmoji: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  sliderLabel: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  sliderValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeights.bold,
    minWidth: 40,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

export default ChipSelector;

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as theme from '../theme';
import { MacroTargets } from '../types';

const { colors, spacing, borderRadius, typography, shadows } = theme;

interface MacroGoalsScreenProps {
  onSave: (targets: MacroTargets) => void;
  onSkip?: () => void;
}

const PRESETS = [
  { label: 'Cut', calories: 1800, protein: 150 },
  { label: 'Bulk', calories: 2800, protein: 200 },
  { label: 'Maintain', calories: 2200, protein: 150 },
];

const parseInput = (raw: string): { value: number | null; invalid: boolean } => {
  const trimmed = raw.trim();
  if (trimmed === '') return { value: null, invalid: false };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { value: null, invalid: true };
  return { value, invalid: false };
};

export const MacroGoalsScreen: React.FC<MacroGoalsScreenProps> = ({ onSave, onSkip }) => {
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setCalories(String(preset.calories));
    setProtein(String(preset.protein));
    setError(null);
  };

  const handleSave = () => {
    const caloriesParsed = parseInput(calories);
    const proteinParsed = parseInput(protein);
    const carbsParsed = parseInput(carbs);
    const fatParsed = parseInput(fat);

    if (caloriesParsed.invalid || proteinParsed.invalid || carbsParsed.invalid || fatParsed.invalid) {
      setError('Please enter valid numbers only.');
      return;
    }

    if (caloriesParsed.value === null || proteinParsed.value === null) {
      setError('Calories and protein are required.');
      return;
    }

    if (caloriesParsed.value < 500) {
      setError('Calories must be at least 500.');
      return;
    }

    if (proteinParsed.value < 0) {
      setError('Protein must be 0 or greater.');
      return;
    }

    if (carbsParsed.value !== null && carbsParsed.value < 0) {
      setError('Carbs must be 0 or greater.');
      return;
    }

    if (fatParsed.value !== null && fatParsed.value < 0) {
      setError('Fat must be 0 or greater.');
      return;
    }

    setError(null);
    onSave({
      calories: Math.round(caloriesParsed.value),
      protein: Math.round(proteinParsed.value * 10) / 10,
      carbs: carbsParsed.value === null ? 0 : Math.round(carbsParsed.value * 10) / 10,
      fat: fatParsed.value === null ? 0 : Math.round(fatParsed.value * 10) / 10,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, shadows.md]}>
        <Text style={styles.title}>Daily Macro Goals</Text>
        <Text style={styles.subtitle}>Set targets to personalize BiteScan recommendations.</Text>

        <Text style={styles.sectionLabel}>Quick Presets</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              style={({ pressed }) => [
                styles.presetButton,
                pressed && styles.presetButtonPressed,
              ]}
              onPress={() => applyPreset(preset)}
            >
              <Text style={styles.presetTitle}>{preset.label}</Text>
              <Text style={styles.presetMeta}>{preset.calories} kcal</Text>
              <Text style={styles.presetMeta}>{preset.protein}g protein</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Calories *</Text>
          <TextInput
            value={calories}
            onChangeText={setCalories}
            placeholder="e.g. 2200"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Protein (g) *</Text>
          <TextInput
            value={protein}
            onChangeText={setProtein}
            placeholder="e.g. 150"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Carbs (g) (optional)</Text>
          <TextInput
            value={carbs}
            onChangeText={setCarbs}
            placeholder="e.g. 220"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Fat (g) (optional)</Text>
          <TextInput
            value={fat}
            onChangeText={setFat}
            placeholder="e.g. 70"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Goals</Text>
        </Pressable>

        {onSkip ? (
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.skipButtonPressed,
            ]}
            onPress={onSkip}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetButton: {
    flex: 1,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  presetButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  presetTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary[700],
    marginBottom: spacing.xs,
  },
  presetMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
  },
  errorText: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.error,
    fontWeight: typography.fontWeights.medium,
  },
  saveButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonPressed: {
    opacity: 0.9,
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  skipButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  skipButtonPressed: {
    opacity: 0.85,
  },
  skipButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});

export default MacroGoalsScreen;

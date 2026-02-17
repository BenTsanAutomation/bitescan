import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { borderRadius, shadows, spacing, typography, ThemeColors } from '../theme';
import { useThemeContext } from '../contexts/ThemeContext';

type ManualEntry = {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

interface ManualEntryScreenProps {
  initialEntry?: ManualEntry;
  title?: string;
  subtitle?: string;
  saveLabel?: string;
  onSave: (entry: ManualEntry) => Promise<void> | void;
  onCancel: () => void;
}

type FieldKey = 'foodName' | 'calories' | 'protein' | 'carbs' | 'fat';
type FieldErrors = Partial<Record<FieldKey, string>>;

export const ManualEntryScreen: React.FC<ManualEntryScreenProps> = ({
  initialEntry,
  title = 'Manual Entry',
  subtitle = 'Add nutrition details when scan results are missing.',
  saveLabel = 'Save Entry',
  onSave,
  onCancel,
}) => {
  const { colors } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [foodName, setFoodName] = useState(initialEntry?.foodName ?? '');
  const [calories, setCalories] = useState(
    initialEntry ? String(initialEntry.calories) : ''
  );
  const [protein, setProtein] = useState(
    initialEntry ? String(initialEntry.protein) : ''
  );
  const [carbs, setCarbs] = useState(initialEntry ? String(initialEntry.carbs) : '');
  const [fat, setFat] = useState(initialEntry ? String(initialEntry.fat) : '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const caloriesRef = useRef<TextInput>(null);
  const proteinRef = useRef<TextInput>(null);
  const carbsRef = useRef<TextInput>(null);
  const fatRef = useRef<TextInput>(null);

  const numericKeyboardType: 'numeric' | 'decimal-pad' =
    Platform.OS === 'ios' ? 'decimal-pad' : 'numeric';

  const isFilled = useMemo(
    () =>
      [foodName, calories, protein, carbs, fat].every(
        (value) => value.trim().length > 0
      ),
    [foodName, calories, protein, carbs, fat]
  );

  const sanitizeNumeric = (value: string) => value.replace(',', '.').trim();

  const clearFieldError = (field: FieldKey) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): ManualEntry | null => {
    const nextErrors: FieldErrors = {};

    const cleanFoodName = foodName.trim();
    const cleanCalories = sanitizeNumeric(calories);
    const cleanProtein = sanitizeNumeric(protein);
    const cleanCarbs = sanitizeNumeric(carbs);
    const cleanFat = sanitizeNumeric(fat);

    if (!cleanFoodName) nextErrors.foodName = 'Food name is required.';
    if (!cleanCalories) nextErrors.calories = 'Calories are required.';
    if (!cleanProtein) nextErrors.protein = 'Protein is required.';
    if (!cleanCarbs) nextErrors.carbs = 'Carbs are required.';
    if (!cleanFat) nextErrors.fat = 'Fat is required.';

    const caloriesValue = Number(cleanCalories);
    const proteinValue = Number(cleanProtein);
    const carbsValue = Number(cleanCarbs);
    const fatValue = Number(cleanFat);

    if (cleanCalories && (!Number.isFinite(caloriesValue) || caloriesValue <= 0)) {
      nextErrors.calories = 'Calories must be greater than 0.';
    }
    if (cleanProtein && (!Number.isFinite(proteinValue) || proteinValue < 0)) {
      nextErrors.protein = 'Protein must be 0 or more.';
    }
    if (cleanCarbs && (!Number.isFinite(carbsValue) || carbsValue < 0)) {
      nextErrors.carbs = 'Carbs must be 0 or more.';
    }
    if (cleanFat && (!Number.isFinite(fatValue) || fatValue < 0)) {
      nextErrors.fat = 'Fat must be 0 or more.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return null;

    return {
      foodName: cleanFoodName,
      calories: caloriesValue,
      protein: proteinValue,
      carbs: carbsValue,
      fat: fatValue,
    };
  };

  const handleSave = async () => {
    const entry = validate();
    if (!entry) return;
    setSaving(true);
    try {
      await onSave(entry);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <View style={[styles.card, shadows.md]}>
            <View style={styles.field}>
              <Text style={styles.label}>Food Name</Text>
              <TextInput
                autoFocus
                value={foodName}
                onChangeText={(text) => {
                  setFoodName(text);
                  clearFieldError('foodName');
                }}
                placeholder="e.g., Protein Bar"
                placeholderTextColor={colors.text.tertiary}
                style={[styles.input, errors.foodName && styles.inputError]}
                returnKeyType="next"
                onSubmitEditing={() => caloriesRef.current?.focus()}
                autoCapitalize="words"
              />
              {!!errors.foodName && <Text style={styles.errorText}>{errors.foodName}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Calories</Text>
              <TextInput
                ref={caloriesRef}
                value={calories}
                onChangeText={(text) => {
                  setCalories(text);
                  clearFieldError('calories');
                }}
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
                style={[styles.input, errors.calories && styles.inputError]}
                keyboardType={numericKeyboardType}
                returnKeyType="next"
                onSubmitEditing={() => proteinRef.current?.focus()}
              />
              {!!errors.calories && <Text style={styles.errorText}>{errors.calories}</Text>}
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroField}>
                <Text style={styles.label}>Protein (g)</Text>
                <TextInput
                  ref={proteinRef}
                  value={protein}
                  onChangeText={(text) => {
                    setProtein(text);
                    clearFieldError('protein');
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.input, errors.protein && styles.inputError]}
                  keyboardType={numericKeyboardType}
                  returnKeyType="next"
                  onSubmitEditing={() => carbsRef.current?.focus()}
                />
                {!!errors.protein && <Text style={styles.errorText}>{errors.protein}</Text>}
              </View>

              <View style={styles.macroField}>
                <Text style={styles.label}>Carbs (g)</Text>
                <TextInput
                  ref={carbsRef}
                  value={carbs}
                  onChangeText={(text) => {
                    setCarbs(text);
                    clearFieldError('carbs');
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.input, errors.carbs && styles.inputError]}
                  keyboardType={numericKeyboardType}
                  returnKeyType="next"
                  onSubmitEditing={() => fatRef.current?.focus()}
                />
                {!!errors.carbs && <Text style={styles.errorText}>{errors.carbs}</Text>}
              </View>

              <View style={styles.macroField}>
                <Text style={styles.label}>Fat (g)</Text>
                <TextInput
                  ref={fatRef}
                  value={fat}
                  onChangeText={(text) => {
                    setFat(text);
                    clearFieldError('fat');
                  }}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  style={[styles.input, errors.fat && styles.inputError]}
                  keyboardType={numericKeyboardType}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                {!!errors.fat && <Text style={styles.errorText}>{errors.fat}</Text>}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.actionBar, shadows.lg]}>
          <Pressable style={styles.cancelButton} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              (!isFilled || saving) && styles.saveButtonDisabled,
              pressed && isFilled && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={!isFilled || saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : saveLabel}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSizes.xs,
    color: colors.error,
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroField: {
    flex: 1,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 30,
    backgroundColor: colors.background.card,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.primary[300],
  },
  saveButtonPressed: {
    backgroundColor: colors.primary[600],
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default ManualEntryScreen;

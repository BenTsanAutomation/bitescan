import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  StatusBar,
  TextInput,
  Switch,
} from 'react-native';
import { spacing, borderRadius, typography, shadows, ThemeColors } from '../theme';
import { ChipSelector } from '../components/ChipSelector';
import { User, UserPreferences, DietaryGoal, MacroTargets } from '../types';
import { useThemeContext } from '../contexts/ThemeContext';

interface SettingsScreenProps {
  user: User;
  onSave: (prefs: UserPreferences) => Promise<void>;
  onClose: () => void;
  onClearTodayData?: () => Promise<void>;
  onExportData?: () => Promise<void>;
  onResetSettings?: () => Promise<void>;
}

const REMINDER_TIME_OPTIONS: Array<{ label: string; hour: number; minute: number }> = [
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onSave,
  onClose,
  onClearTodayData,
  onExportData,
  onResetSettings,
}) => {
  const { colors, isDarkMode, setDarkMode: applyDarkMode } = useThemeContext();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [goals, setGoals] = useState<DietaryGoal[]>(user.preferences.goals || []);
  const [priorities, setPriorities] = useState<Partial<Record<DietaryGoal, number>>>(
    user.preferences.priorities || {}
  );
  const [macroTargets, setMacroTargets] = useState<MacroTargets>(
    user.preferences.macroTargets || { calories: 2000, protein: 150, carbs: 200, fat: 65 }
  );
  const [useMetric, setUseMetric] = useState(user.preferences.useMetric ?? false);
  const [darkMode, setDarkMode] = useState(isDarkMode);
  const [mealRemindersEnabled, setMealRemindersEnabled] = useState(
    user.preferences.mealRemindersEnabled ?? false
  );
  const [mealReminderHour, setMealReminderHour] = useState(user.preferences.mealReminderHour ?? 18);
  const [mealReminderMinute, setMealReminderMinute] = useState(
    user.preferences.mealReminderMinute ?? 0
  );

  const handleDarkModeToggle = useCallback(
    (enabled: boolean) => {
      setDarkMode(enabled);
      void applyDarkMode(enabled);
    },
    [applyDarkMode]
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const updatedPrefs: UserPreferences = {
      goals,
      priorities,
      macroTargets,
      tasteProfile: user.preferences.tasteProfile,
      useMetric,
      darkMode,
      mealRemindersEnabled,
      mealReminderHour,
      mealReminderMinute,
    };
    setSaving(true);
    try {
      await onSave(updatedPrefs);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not sync preferences. Please try again.';
      Alert.alert('Sync Failed', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <Pressable onPress={() => void handleSave()} style={styles.saveButton} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>User ID</Text>
              <Text style={styles.profileValue}>{user.id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Goals</Text>
          <View style={styles.card}>
            <ChipSelector
              selectedGoals={goals}
              priorities={priorities}
              onGoalsChange={setGoals}
              onPrioritiesChange={setPriorities}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Macro Targets</Text>
          <View style={styles.card}>
            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(macroTargets.calories)}
                onChangeText={(text) => setMacroTargets({ ...macroTargets, calories: Number(text) || 0 })}
              />
              <Text style={styles.macroUnit}>kcal</Text>
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Protein</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(macroTargets.protein)}
                onChangeText={(text) => setMacroTargets({ ...macroTargets, protein: Number(text) || 0 })}
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Carbs</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(macroTargets.carbs)}
                onChangeText={(text) => setMacroTargets({ ...macroTargets, carbs: Number(text) || 0 })}
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroInput}>
              <Text style={styles.macroLabel}>Fat</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(macroTargets.fat)}
                onChangeText={(text) => setMacroTargets({ ...macroTargets, fat: Number(text) || 0 })}
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Use Metric Units</Text>
                <Text style={styles.settingDescription}>Display grams instead of ounces</Text>
              </View>
              <Switch
                value={useMetric}
                onValueChange={setUseMetric}
                trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                thumbColor={useMetric ? colors.primary[500] : colors.neutral[100]}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Use dark theme colors</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                thumbColor={darkMode ? colors.primary[500] : colors.neutral[100]}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Daily Meal Reminder</Text>
                <Text style={styles.settingDescription}>
                  Local in-app reminder while BiteScan is running
                </Text>
              </View>
              <Switch
                value={mealRemindersEnabled}
                onValueChange={setMealRemindersEnabled}
                trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
                thumbColor={mealRemindersEnabled ? colors.primary[500] : colors.neutral[100]}
              />
            </View>

            {mealRemindersEnabled ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.subsectionTitle}>Reminder Time</Text>
                <View style={styles.reminderTimesRow}>
                  {REMINDER_TIME_OPTIONS.map((option) => {
                    const selected =
                      option.hour === mealReminderHour && option.minute === mealReminderMinute;
                    return (
                      <Pressable
                        key={option.label}
                        style={[styles.reminderChip, selected && styles.reminderChipSelected]}
                        onPress={() => {
                          setMealReminderHour(option.hour);
                          setMealReminderMinute(option.minute);
                        }}
                      >
                        <Text style={[styles.reminderChipText, selected && styles.reminderChipTextSelected]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.reminderNote}>
                  For background push notifications, add `expo-notifications` and native permissions.
                </Text>
              </>
            ) : null}

            <View style={styles.divider} />

            <Pressable
              style={styles.actionRow}
              onPress={() => {
                Alert.alert("Clear Today's Data", 'This will delete all meals logged today. Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress:
                      () =>
                        onClearTodayData?.() ??
                        Alert.alert('Not Available', 'This feature is not yet connected.'),
                  },
                ]);
              }}
            >
              <Text style={styles.actionLabel}>Clear Today's Data</Text>
              <Text style={styles.actionIcon}>→</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.actionRow}
              onPress={() =>
                onExportData?.() ?? Alert.alert('Coming Soon', 'Data export is not yet available.')
              }
            >
              <Text style={styles.actionLabel}>Export All Data</Text>
              <Text style={styles.actionIcon}>→</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              style={styles.actionRow}
              onPress={() => {
                Alert.alert(
                  'Reset All Settings',
                  'This will reset your dietary goals and macro targets to defaults. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress:
                        () =>
                          onResetSettings?.() ??
                          Alert.alert('Not Available', 'This feature is not yet connected.'),
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.actionLabel, styles.dangerText]}>Reset All Settings</Text>
              <Text style={styles.actionIcon}>→</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>BiteScan v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.secondary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.background.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral[200],
    },
    backButton: {
      padding: spacing.sm,
    },
    backButtonText: {
      fontSize: 28,
      color: colors.primary[500],
    },
    headerTitle: {
      fontSize: typography.fontSizes.xl,
      fontWeight: typography.fontWeights.bold,
      color: colors.text.primary,
    },
    saveButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    saveButtonText: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary[500],
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.fontSizes.sm,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.sm,
    },
    profileRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    profileLabel: {
      fontSize: typography.fontSizes.md,
      color: colors.text.secondary,
    },
    profileValue: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      color: colors.text.primary,
    },
    macroInput: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    macroLabel: {
      fontSize: typography.fontSizes.md,
      color: colors.text.primary,
      flex: 1,
    },
    input: {
      flex: 2,
      backgroundColor: colors.background.secondary,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.fontSizes.md,
      color: colors.text.primary,
      textAlign: 'right',
    },
    macroUnit: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.tertiary,
      marginLeft: spacing.sm,
      width: 40,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    settingInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    settingLabel: {
      fontSize: typography.fontSizes.md,
      fontWeight: typography.fontWeights.medium,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    settingDescription: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.tertiary,
    },
    subsectionTitle: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      fontWeight: typography.fontWeights.semibold,
      marginBottom: spacing.sm,
    },
    reminderTimesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    reminderChip: {
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.neutral[300],
      backgroundColor: colors.background.secondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    reminderChipSelected: {
      borderColor: colors.primary[500],
      backgroundColor: colors.primary[50],
    },
    reminderChipText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.secondary,
      fontWeight: typography.fontWeights.medium,
    },
    reminderChipTextSelected: {
      color: colors.primary[700],
      fontWeight: typography.fontWeights.semibold,
    },
    reminderNote: {
      marginTop: spacing.sm,
      fontSize: typography.fontSizes.xs,
      color: colors.text.tertiary,
      lineHeight: 16,
    },
    divider: {
      height: 1,
      backgroundColor: colors.neutral[200],
      marginVertical: spacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    actionLabel: {
      fontSize: typography.fontSizes.md,
      color: colors.text.primary,
    },
    actionIcon: {
      fontSize: typography.fontSizes.lg,
      color: colors.text.tertiary,
    },
    dangerText: {
      color: colors.error,
    },
    footer: {
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.xxl,
    },
    versionText: {
      fontSize: typography.fontSizes.sm,
      color: colors.text.tertiary,
      marginBottom: spacing.xs,
    },
    copyrightText: {
      fontSize: typography.fontSizes.xs,
      color: colors.text.tertiary,
    },
  });

export default SettingsScreen;

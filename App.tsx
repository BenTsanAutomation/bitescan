import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from './src/theme';
import {
  addMealEntry,
  createUser,
  getMacroTotalsForDate,
  getMealDaysWithEntries,
  getMealsForDate,
  getOrCreateTodayLog,
  getRemainingMacros,
  getUser,
  getUserStreak,
  getWeeklyMacroSummary,
  initDatabase,
  recordUserActivity,
  saveScan,
  updateUserPreferences,
} from './src/services/database';
import { analyzeFoodImage, checkApiHealth, imageToBase64 } from './src/services/api';
import {
  AuthUser,
  getStoredSession,
  onAuthStateChange,
  signIn,
  signOut,
  signUp,
} from './src/services/auth';
import AuthScreen from './src/screens/AuthScreen';
import EmailVerificationBanner from './src/components/EmailVerificationBanner';
import { syncProfileToCloud, syncStreakToCloud } from './src/services/sync';
import {
  DailyMacroSummary,
  MacroRemaining,
  MacroTargets,
  MacroTotals,
  RecentMeal,
  ScanResult,
  User,
  UserPreferences,
  UserStreak,
} from './src/types';
import { CameraScreen } from './src/screens/CameraScreen';
import { ResultsScreen } from './src/screens/ResultsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import MacroGoalsScreen from './src/screens/MacroGoalsScreen';
import ManualEntryScreen from './src/screens/ManualEntryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import { LeafParticles } from './src/animations/LeafParticles';

const DEFAULT_SKIP_TARGETS: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 220,
  fat: 70,
};

type TabKey = 'home' | 'progress' | 'history' | 'profile';
type OverlayScreen = 'tabs' | 'camera' | 'results' | 'manual' | 'settings';

const hasMacroTargets = (targets?: MacroTargets): boolean =>
  !!targets && targets.calories > 0 && targets.protein > 0;

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildRemainingFromTotals = (totals: MacroTotals, targets: MacroTargets): MacroRemaining => ({
  calories: targets.calories - totals.calories,
  protein: targets.protein - totals.protein,
  carbs: targets.carbs - totals.carbs,
  fat: targets.fat - totals.fat,
  caloriesPct: targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0,
  proteinPct: targets.protein > 0 ? (totals.protein / targets.protein) * 100 : 0,
  carbsPct: targets.carbs > 0 ? (totals.carbs / targets.carbs) * 100 : 0,
  fatPct: targets.fat > 0 ? (totals.fat / targets.fat) * 100 : 0,
});

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

const ResultsScreenWithRemaining = ResultsScreen as React.ComponentType<
  React.ComponentProps<typeof ResultsScreen> & {
    remainingMacros?: MacroRemaining | null;
  }
>;

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMacroGoals, setShowMacroGoals] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(false);
  const [verificationDismissed, setVerificationDismissed] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [overlayScreen, setOverlayScreen] = useState<OverlayScreen>('tabs');

  const currentUserId = authUser?.id ?? '';

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [dayTotals, setDayTotals] = useState<MacroTotals>(EMPTY_TOTALS);
  const [remainingMacros, setRemainingMacros] = useState<MacroRemaining | null>(null);
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [daysWithMeals, setDaysWithMeals] = useState<string[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<DailyMacroSummary[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);

  const macroTargets = useMemo<MacroTargets>(() => {
    const targets = user?.preferences.macroTargets;
    return {
      calories: targets?.calories ?? DEFAULT_SKIP_TARGETS.calories,
      protein: targets?.protein ?? DEFAULT_SKIP_TARGETS.protein,
      carbs: targets?.carbs ?? DEFAULT_SKIP_TARGETS.carbs,
      fat: targets?.fat ?? DEFAULT_SKIP_TARGETS.fat,
    };
  }, [user]);

  const loadDashboardData = useCallback(
    async (date: string, currentUser: User | null) => {
      if (!currentUserId) return;
      const [totals, meals, dayKeys, weekly, streakRow] = await Promise.all([
        getMacroTotalsForDate(currentUserId, date),
        getMealsForDate(currentUserId, date),
        getMealDaysWithEntries(currentUserId, 7),
        getWeeklyMacroSummary(currentUserId, 7),
        getUserStreak(currentUserId),
      ]);

      setDayTotals(totals);
      setRecentMeals(meals);
      setDaysWithMeals(dayKeys);
      setWeeklySummary(weekly);
      setStreak(streakRow);

      const today = getTodayDateString();
      if (date === today) {
        try {
          const remaining = await getRemainingMacros(currentUserId);
          setRemainingMacros(remaining);
          return;
        } catch (error) {
          console.error('Failed to load remaining macros:', error);
        }
      }

      const targets = currentUser?.preferences.macroTargets ?? DEFAULT_SKIP_TARGETS;
      setRemainingMacros(buildRemainingFromTotals(totals, targets));
    },
    [currentUserId]
  );

  // Phase 1: Initialize local DB + check Supabase session
  useEffect(() => {
    async function initApp() {
      try {
        await initDatabase();

        // Check for existing Supabase session
        const storedUser = await getStoredSession();
        if (storedUser) {
          setAuthUser(storedUser);
        }
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setAuthChecked(true);
      }
    }
    void initApp();

    // Listen for auth state changes (login/logout/token refresh)
    const { unsubscribe } = onAuthStateChange((updatedUser) => {
      setAuthUser(updatedUser);
    });

    return () => unsubscribe();
  }, []);

  // Phase 2: Load user data once authenticated
  useEffect(() => {
    if (!authUser) {
      setIsLoading(false);
      return;
    }

    async function loadUser() {
      setIsLoading(true);
      try {
        const healthy = await checkApiHealth();
        setApiHealthy(healthy);
        if (!healthy) console.warn('BiteScan API not available');

        // Ensure local SQLite user row exists (uses Supabase UUID as ID)
        let existingUser = await getUser(authUser!.id);
        if (!existingUser) {
          existingUser = await createUser({
            id: authUser!.id,
            email: authUser!.email,
            displayName: authUser!.displayName,
          });
        }

        setUser(existingUser);

        const needsMacroGoals = !hasMacroTargets(existingUser.preferences.macroTargets);
        setShowMacroGoals(needsMacroGoals);

        if (!needsMacroGoals) {
          await getOrCreateTodayLog(authUser!.id);
          await loadDashboardData(getTodayDateString(), existingUser);
        }
      } catch (error) {
        console.error('Load user error:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }
    void loadUser();
  }, [authUser, loadDashboardData]);

  const handleAuthComplete = useCallback(async (authedUser: AuthUser, _isNewUser: boolean) => {
    setAuthUser(authedUser);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setAuthUser(null);
    setUser(null);
    setOverlayScreen('tabs');
    setActiveTab('home');
    setShowMacroGoals(false);
    setDayTotals(EMPTY_TOTALS);
    setRemainingMacros(null);
    setRecentMeals([]);
    setDaysWithMeals([]);
    setWeeklySummary([]);
    setStreak(null);
    setSelectedDate(getTodayDateString());
  }, []);

  useEffect(() => {
    if (!user || showMacroGoals) return;
    void loadDashboardData(selectedDate, user);
  }, [loadDashboardData, selectedDate, showMacroGoals, user]);

  const handleUpdatePreferences = useCallback(
    async (prefs: UserPreferences) => {
      await updateUserPreferences(currentUserId, prefs);
      // Sync to cloud (fire-and-forget)
      syncProfileToCloud(currentUserId, prefs).catch((e) =>
        console.error('Cloud sync failed:', e)
      );
      const updatedUser: User | null = user ? { ...user, preferences: prefs } : null;
      setUser(updatedUser);
      setShowMacroGoals(!hasMacroTargets(prefs.macroTargets));
      if (updatedUser) {
        await loadDashboardData(selectedDate, updatedUser);
      }
    },
    [currentUserId, loadDashboardData, selectedDate, user]
  );

  const handleSaveMacroGoals = useCallback(
    async (targets: MacroTargets) => {
      if (!user) return;

      const prefs: UserPreferences = {
        ...user.preferences,
        goals: user.preferences.goals || [],
        priorities: user.preferences.priorities || {},
        macroTargets: targets,
      };

      try {
        await handleUpdatePreferences(prefs);
        await getOrCreateTodayLog(currentUserId);
        setShowMacroGoals(false);
        await loadDashboardData(getTodayDateString(), { ...user, preferences: prefs });
      } catch (error) {
        console.error('Failed to save macro goals:', error);
        Alert.alert('Error', 'Could not save macro goals');
      }
    },
    [handleUpdatePreferences, loadDashboardData, user]
  );

  const handleSkipMacroGoals = useCallback(async () => {
    await handleSaveMacroGoals(DEFAULT_SKIP_TARGETS);
  }, [handleSaveMacroGoals]);

  const handleCapture = useCallback(
    async (imageUri: string) => {
      setCapturedImage(imageUri);
      setIsAnalyzing(true);
      setOverlayScreen('results');

      try {
        const base64 = await imageToBase64(imageUri);
        const result = await analyzeFoodImage(base64, user?.preferences || { goals: [], priorities: {} });
        setScanResult(result);
      } catch (error) {
        console.error('Analysis error:', error);
        Alert.alert('Analysis Failed', 'Could not analyze the image. Please try again.', [
          { text: 'OK', onPress: () => setOverlayScreen('tabs') },
        ]);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [user]
  );

  const handleSaveScan = useCallback(async () => {
    if (!scanResult || !capturedImage) return;

    try {
      const today = getTodayDateString();
      const log = await getOrCreateTodayLog(currentUserId);

      const macroTotals = scanResult.foods.reduce(
        (acc, food) => ({
          protein: acc.protein + food.nutrition.protein,
          carbs: acc.carbs + food.nutrition.carbs,
          fat: acc.fat + food.nutrition.fat,
        }),
        { protein: 0, carbs: 0, fat: 0 }
      );

      const mealName =
        scanResult.foods
          .map((food) => food.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') || 'Scanned Meal';

      await saveScan(currentUserId, capturedImage, scanResult);

      await addMealEntry(log.id, {
        logId: log.id,
        scanId: scanResult.id,
        foodName: mealName,
        calories: scanResult.totalCalories,
        protein: macroTotals.protein,
        carbs: macroTotals.carbs,
        fat: macroTotals.fat,
        timestamp: Date.now(),
      });

      await recordUserActivity(currentUserId, today);

      setSelectedDate(today);
      await loadDashboardData(today, user);

      setOverlayScreen('tabs');
      setActiveTab('home');
      Alert.alert('Saved!', "Scan saved and logged to today's meals");
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save scan');
    }
  }, [capturedImage, loadDashboardData, scanResult, user]);

  const handleManualEntrySave = useCallback(
    async (entry: { foodName: string; calories: number; protein: number; carbs: number; fat: number }) => {
      try {
        const today = getTodayDateString();
        const log = await getOrCreateTodayLog(currentUserId);

        await addMealEntry(log.id, {
          logId: log.id,
          foodName: entry.foodName,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          timestamp: Date.now(),
        });

        await recordUserActivity(currentUserId, today);

        setSelectedDate(today);
        await loadDashboardData(today, user);
        setOverlayScreen('tabs');
      } catch (error) {
        console.error('Manual entry save error:', error);
        Alert.alert('Error', 'Failed to save manual entry');
      }
    },
    [loadDashboardData, user]
  );

  if (!authChecked || (authUser && isLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading BiteScan...</Text>
      </View>
    );
  }

  if (!authUser) {
    return (
      <AuthScreen
        onAuthenticated={handleAuthComplete}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    );
  }

  if (showMacroGoals && user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <MacroGoalsScreen onSave={handleSaveMacroGoals} onSkip={handleSkipMacroGoals} />
      </SafeAreaView>
    );
  }

  if (overlayScreen === 'manual') {
    return <ManualEntryScreen onSave={handleManualEntrySave} onCancel={() => setOverlayScreen('tabs')} />;
  }

  if (overlayScreen === 'settings' && user) {
    return (
      <SettingsScreen
        user={user}
        onSave={(prefs) => {
          void handleUpdatePreferences(prefs);
        }}
        onClose={() => setOverlayScreen('tabs')}
      />
    );
  }

  if (overlayScreen === 'camera') {
    return <CameraScreen onCapture={handleCapture} onClose={() => setOverlayScreen('tabs')} />;
  }

  if (overlayScreen === 'results') {
    return isAnalyzing ? (
      <View style={styles.analyzingContainer}>
        <LeafParticles count={10} />
        <View style={styles.analyzingCard}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.analyzingTitle}>Analyzing your meal...</Text>
          <Text style={styles.analyzingSubtitle}>Identifying foods and calculating nutrition</Text>
        </View>
      </View>
    ) : scanResult && capturedImage ? (
      <ResultsScreenWithRemaining
        result={scanResult}
        imageUri={capturedImage}
        onSave={handleSaveScan}
        onRescan={() => setOverlayScreen('camera')}
        onClose={() => setOverlayScreen('tabs')}
        remainingMacros={remainingMacros}
      />
    ) : (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No result to display.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.contentArea}>
        {activeTab === 'home' && (
          <HomeScreen
            todayTotals={dayTotals}
            macroTargets={macroTargets}
            remainingMacros={remainingMacros}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            daysWithMeals={daysWithMeals}
            recentMeals={recentMeals}
            streak={streak}
          />
        )}

        {activeTab === 'progress' && <ProgressScreen weekData={weeklySummary} />}

        {activeTab === 'history' && (
          <HistoryPlaceholder
            recentMeals={recentMeals}
            onManualEntry={() => setOverlayScreen('manual')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfilePlaceholder
            user={user}
            authUser={authUser}
            apiHealthy={apiHealthy}
            onOpenSettings={() => setOverlayScreen('settings')}
            onSignOut={handleSignOut}
          />
        )}
      </View>

      <TabBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onScanPress={() => setOverlayScreen('camera')}
      />
    </SafeAreaView>
  );
}

const HistoryPlaceholder: React.FC<{
  recentMeals: RecentMeal[];
  onManualEntry: () => void;
}> = ({ recentMeals, onManualEntry }) => {
  return (
    <View style={styles.placeholderScreen}>
      <Text style={styles.placeholderTitle}>History</Text>
      <Text style={styles.placeholderSubtitle}>Detailed history view coming soon.</Text>

      <View style={[styles.placeholderCard, shadows.sm]}>
        <Text style={styles.placeholderCardTitle}>Recent Entries</Text>
        <Text style={styles.placeholderCardValue}>{recentMeals.length}</Text>
      </View>

      <Pressable style={styles.manualEntryButton} onPress={onManualEntry}>
        <Text style={styles.manualEntryText}>Add Manual Entry</Text>
      </Pressable>
    </View>
  );
};

const ProfilePlaceholder: React.FC<{
  user: User | null;
  authUser: AuthUser | null;
  apiHealthy: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
}> = ({ user, authUser, apiHealthy, onOpenSettings, onSignOut }) => {
  return (
    <View style={styles.placeholderScreen}>
      <Text style={styles.placeholderTitle}>Profile</Text>
      <Text style={styles.placeholderSubtitle}>Account and preferences</Text>

      <View style={[styles.placeholderCard, shadows.sm]}>
        <Text style={styles.placeholderCardTitle}>Name</Text>
        <Text style={styles.placeholderCardValue}>{authUser?.displayName ?? 'Unknown'}</Text>
      </View>

      <View style={[styles.placeholderCard, shadows.sm]}>
        <Text style={styles.placeholderCardTitle}>Email</Text>
        <Text style={styles.placeholderCardValue}>{authUser?.email ?? 'Unknown'}</Text>
      </View>

      <View style={[styles.placeholderCard, shadows.sm]}>
        <Text style={styles.placeholderCardTitle}>API Status</Text>
        <Text style={[styles.placeholderCardValue, apiHealthy ? styles.goodStatus : styles.badStatus]}>
          {apiHealthy ? 'Online' : 'Offline'}
        </Text>
      </View>

      <Pressable style={styles.settingsOpenButton} onPress={onOpenSettings}>
        <Text style={styles.settingsOpenText}>Open Settings</Text>
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
};

const TabBar: React.FC<{
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
  onScanPress: () => void;
}> = ({ activeTab, onTabPress, onScanPress }) => {
  const items: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'home', label: 'Home', icon: '🏠' },
    { key: 'progress', label: 'Progress', icon: '📈' },
    { key: 'history', label: 'History', icon: '🧾' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <View style={styles.tabBarWrap}>
      <View style={[styles.tabBar, shadows.lg]}>
        <View style={styles.tabGroup}>
          {items.slice(0, 2).map((item) => (
            <Pressable key={item.key} style={styles.tabButton} onPress={() => onTabPress(item.key)}>
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.centerGap} />

        <View style={styles.tabGroup}>
          {items.slice(2).map((item) => (
            <Pressable key={item.key} style={styles.tabButton} onPress={() => onTabPress(item.key)}>
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={[styles.scanFab, shadows.lg]} onPress={onScanPress}>
        <Text style={styles.scanFabIcon}>＋</Text>
        <Text style={styles.scanFabText}>Scan</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  analyzingCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.lg,
  },
  analyzingTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  analyzingSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  tabBarWrap: {
    position: 'relative',
  },
  tabBar: {
    minHeight: 74,
    backgroundColor: colors.background.card,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  centerGap: {
    width: 76,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  tabIcon: {
    fontSize: typography.fontSizes.md,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.tertiary,
  },
  tabLabelActive: {
    color: colors.primary[600],
    fontWeight: typography.fontWeights.semibold,
  },
  scanFab: {
    position: 'absolute',
    alignSelf: 'center',
    top: -20,
    width: 74,
    height: 74,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background.secondary,
  },
  scanFabIcon: {
    fontSize: typography.fontSizes.xl,
    color: colors.text.inverse,
    lineHeight: typography.fontSizes.xl,
  },
  scanFabText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
  },
  placeholderScreen: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  placeholderTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  placeholderSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },
  placeholderCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    padding: spacing.md,
  },
  placeholderCardTitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  placeholderCardValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  goodStatus: {
    color: colors.success,
  },
  badStatus: {
    color: colors.error,
  },
  manualEntryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.secondary[400],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  manualEntryText: {
    color: colors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  settingsOpenButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  settingsOpenText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
  signOutButton: {
    marginTop: spacing.md,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  signOutText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeights.semibold,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ConvexProvider } from "convex/react";
import { convex } from "./src/services/convexClient";
import { borderRadius, colors, shadows, spacing, typography } from "./src/theme";
import {
  AuthUser,
  getStoredSession,
  signIn,
  signOut,
  signUp,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  updatePreferencesRemote,
  getSessionToken,
} from "./src/services/auth";
import { api } from "./convex/_generated/api";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import AuthScreen from "./src/screens/AuthScreen";
import {
  DailyMacroSummary,
  MacroRemaining,
  MacroTargets,
  MacroTotals,
  RecentMeal,
  ScanResult,
  UserPreferences,
  UserStreak,
} from "./src/types";
import { analyzeFoodImage, checkApiHealth, imageToBase64 } from "./src/services/api";
import { CameraScreen } from "./src/screens/CameraScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import MacroGoalsScreen from "./src/screens/MacroGoalsScreen";
import ManualEntryScreen from "./src/screens/ManualEntryScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ProgressScreen from "./src/screens/ProgressScreen";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { TabBar, TabKey } from "./src/components/TabBar";
import { LeafParticles } from "./src/animations/LeafParticles";

const DEFAULT_SKIP_TARGETS: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 220,
  fat: 70,
};

type OverlayScreen = "tabs" | "camera" | "results" | "manual" | "settings";

interface UserData {
  id: string;
  email: string;
  displayName: string;
  preferences: UserPreferences;
  createdAt?: number;
}

const hasMacroTargets = (targets?: MacroTargets): boolean =>
  !!targets && targets.calories > 0 && targets.protein > 0;

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = (days: number): string[] => {
  const range: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    range.push(`${year}-${month}-${day}`);
  }
  return range;
};

const buildRemainingFromTotals = (
  totals: MacroTotals,
  targets: MacroTargets
): MacroRemaining => ({
  calories: targets.calories - totals.calories,
  protein: targets.protein - totals.protein,
  carbs: targets.carbs - totals.carbs,
  fat: targets.fat - totals.fat,
  caloriesPct:
    targets.calories > 0 ? (totals.calories / targets.calories) * 100 : 0,
  proteinPct:
    targets.protein > 0 ? (totals.protein / targets.protein) * 100 : 0,
  carbsPct: targets.carbs > 0 ? (totals.carbs / targets.carbs) * 100 : 0,
  fatPct: targets.fat > 0 ? (totals.fat / targets.fat) * 100 : 0,
});

const EMPTY_TOTALS: MacroTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

// ResultsScreen already accepts remainingMacros in its props interface

function AppInner() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMacroGoals, setShowMacroGoals] = useState(false);
  const [apiHealthy, setApiHealthy] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [overlayScreen, setOverlayScreen] = useState<OverlayScreen>("tabs");

  const currentUserId = authUser?.id ?? "";

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    getTodayDateString()
  );
  const [dayTotals, setDayTotals] = useState<MacroTotals>(EMPTY_TOTALS);
  const [remainingMacros, setRemainingMacros] =
    useState<MacroRemaining | null>(null);
  const [recentMeals, setRecentMeals] = useState<RecentMeal[]>([]);
  const [daysWithMeals, setDaysWithMeals] = useState<string[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<DailyMacroSummary[]>([]);
  const [streak, setStreak] = useState<UserStreak | null>(null);

  // Helper to get token — throws if not available
  const getToken = async (): Promise<string> => {
    const token = await getSessionToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  };

  const macroTargets = useMemo<MacroTargets>(() => {
    const targets = user?.preferences.macroTargets;
    return {
      calories: targets?.calories ?? DEFAULT_SKIP_TARGETS.calories,
      protein: targets?.protein ?? DEFAULT_SKIP_TARGETS.protein,
      carbs: targets?.carbs ?? DEFAULT_SKIP_TARGETS.carbs,
      fat: targets?.fat ?? DEFAULT_SKIP_TARGETS.fat,
    };
  }, [user]);

  // ---- Load dashboard data from Convex ----
  const loadDashboardData = useCallback(
    async (date: string, currentUser: UserData | null) => {
      if (!currentUserId) return;

      try {
        const token = await getToken();
        const weekDates = getDateRange(7);

        const [totals, meals, weeklyData, daysWithMealsList, streakData] =
          await Promise.all([
            convex.query(api.meals.getMacroTotalsForDate, { token, date }),
            convex.query(api.meals.getMealsForDate, { token, date }),
            convex.query(api.meals.getWeeklyMacroSummary, {
              token,
              dates: weekDates,
            }),
            convex.query(api.meals.getMealDaysWithEntries, {
              token,
              dates: weekDates,
            }),
            convex.query(api.meals.getStreak, { token }),
          ]);

        setDayTotals(totals);
        setRecentMeals(
          meals.map((m: any) => ({
            id: m.id as string,
            logId: m.logId as string,
            scanId: m.scanId ?? undefined,
            foodName: m.foodName,
            calories: m.calories,
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            timestamp: m.timestamp,
            imageUri: m.imageUri ?? undefined,
          }))
        );
        setWeeklySummary(weeklyData);
        setDaysWithMeals(daysWithMealsList);
        setStreak({
          userId: currentUserId,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          lastActiveDate: streakData.lastActiveDate ?? null,
        });

        const today = getTodayDateString();
        if (date === today) {
          const remaining = await convex.query(api.meals.getRemainingMacros, {
            token,
            date: today,
          });
          setRemainingMacros(remaining);
        } else {
          const targets =
            currentUser?.preferences.macroTargets ?? DEFAULT_SKIP_TARGETS;
          setRemainingMacros(buildRemainingFromTotals(totals, targets));
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    },
    [currentUserId]
  );

  // ---- Phase 1: Check auth session ----
  useEffect(() => {
    async function initApp() {
      try {
        const storedUser = await getStoredSession();
        if (storedUser) {
          setAuthUser(storedUser);
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setAuthChecked(true);
      }
    }
    void initApp();
  }, []);

  // ---- Phase 2: Load user data ----
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
        if (!healthy) console.warn("BiteScan API not available");

        // Get profile from Convex
        const profile = await convex.query(api.auth.getProfile, {
          externalUserId: authUser!.id,
        });

        let prefs: UserPreferences = { goals: [], priorities: {} };
        if (profile?.preferencesJson) {
          try {
            prefs = JSON.parse(profile.preferencesJson);
          } catch {
            // Keep defaults
          }
        }

        const userData: UserData = {
          id: authUser!.id,
          email: authUser!.email,
          displayName: authUser!.displayName,
          preferences: prefs,
          createdAt: profile?._creationTime,
        };

        setUser(userData);

        const needsMacroGoals = !hasMacroTargets(prefs.macroTargets);
        setShowMacroGoals(needsMacroGoals);

        if (!needsMacroGoals) {
          const tkn = await getToken();
          await convex.mutation(api.meals.getOrCreateDailyLog, {
            token: tkn,
            date: getTodayDateString(),
            targetCalories: prefs.macroTargets?.calories ?? DEFAULT_SKIP_TARGETS.calories,
            targetProtein: prefs.macroTargets?.protein ?? DEFAULT_SKIP_TARGETS.protein,
            targetCarbs: prefs.macroTargets?.carbs ?? DEFAULT_SKIP_TARGETS.carbs,
            targetFat: prefs.macroTargets?.fat ?? DEFAULT_SKIP_TARGETS.fat,
          });
          await loadDashboardData(getTodayDateString(), userData);
        }
      } catch (error) {
        console.error("Load user error:", error);
        Alert.alert("Error", "Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    }
    void loadUser();
  }, [authUser, loadDashboardData]);

  useEffect(() => {
    if (!user || showMacroGoals || !authUser) return;
    void loadDashboardData(selectedDate, user);
  }, [loadDashboardData, selectedDate, showMacroGoals, user, authUser]);

  const handleAuthComplete = useCallback(
    (authedUser: AuthUser, _isNewUser: boolean) => {
      setAuthUser(authedUser);
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setAuthUser(null);
    setUser(null);
    setOverlayScreen("tabs");
    setActiveTab("home");
    setShowMacroGoals(false);
    setDayTotals(EMPTY_TOTALS);
    setRemainingMacros(null);
    setRecentMeals([]);
    setDaysWithMeals([]);
    setWeeklySummary([]);
    setStreak(null);
    setSelectedDate(getTodayDateString());
  }, []);

  const handleUpdatePreferences = useCallback(
    async (prefs: UserPreferences) => {
      // Sync to Convex
      updatePreferencesRemote(
        currentUserId,
        JSON.stringify(prefs)
      ).catch((e) => console.error("Cloud sync failed:", e));

      const updatedUser: UserData | null = user
        ? { ...user, preferences: prefs }
        : null;
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

        const tkn = await getToken();
        await convex.mutation(api.meals.getOrCreateDailyLog, {
          token: tkn,
          date: getTodayDateString(),
          targetCalories: targets.calories,
          targetProtein: targets.protein,
          targetCarbs: targets.carbs,
          targetFat: targets.fat,
        });

        setShowMacroGoals(false);
        await loadDashboardData(getTodayDateString(), {
          ...user,
          preferences: prefs,
        });
      } catch (error) {
        console.error("Failed to save macro goals:", error);
        Alert.alert("Error", "Could not save macro goals");
      }
    },
    [currentUserId, handleUpdatePreferences, loadDashboardData, user]
  );

  const handleSkipMacroGoals = useCallback(async () => {
    await handleSaveMacroGoals(DEFAULT_SKIP_TARGETS);
  }, [handleSaveMacroGoals]);

  const handleCapture = useCallback(
    async (imageUri: string) => {
      setCapturedImage(imageUri);
      setIsAnalyzing(true);
      setOverlayScreen("results");

      try {
        const base64 = await imageToBase64(imageUri);
        const result = await analyzeFoodImage(
          base64,
          user?.preferences || { goals: [], priorities: {} }
        );
        setScanResult(result);
      } catch (error) {
        console.error("Analysis error:", error);
        Alert.alert(
          "Analysis Failed",
          "Could not analyze the image. Please try again.",
          [{ text: "OK", onPress: () => setOverlayScreen("tabs") }]
        );
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
      const tkn = await getToken();

      // Ensure today's log exists
      const log = await convex.mutation(api.meals.getOrCreateDailyLog, {
        token: tkn,
        date: today,
        targetCalories: macroTargets.calories,
        targetProtein: macroTargets.protein,
        targetCarbs: macroTargets.carbs,
        targetFat: macroTargets.fat,
      });

      if (!log) throw new Error("Failed to get daily log");

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
          .join(", ") || "Scanned Meal";

      // Save scan to Convex
      await convex.mutation(api.meals.saveScan, {
        token: tkn,
        scanId: scanResult.id,
        imageUri: capturedImage,
        resultJson: JSON.stringify(scanResult),
      });

      // Add meal entry
      await convex.mutation(api.meals.addMealEntry, {
        token: tkn,
        dailyLogId: log._id,
        scanId: scanResult.id,
        foodName: mealName,
        calories: scanResult.totalCalories,
        protein: macroTotals.protein,
        carbs: macroTotals.carbs,
        fat: macroTotals.fat,
        timestamp: Date.now(),
      });

      // Record activity for streak
      await convex.mutation(api.meals.recordActivity, {
        token: tkn,
        date: today,
      });

      setSelectedDate(today);
      await loadDashboardData(today, user);

      setOverlayScreen("tabs");
      setActiveTab("home");
      Alert.alert("Saved!", "Scan saved and logged to today's meals");
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save scan");
    }
  }, [
    capturedImage,
    currentUserId,
    loadDashboardData,
    macroTargets,
    scanResult,
    user,
  ]);

  const handleManualEntrySave = useCallback(
    async (entry: {
      foodName: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }) => {
      try {
        const today = getTodayDateString();
        const tkn = await getToken();

        const log = await convex.mutation(api.meals.getOrCreateDailyLog, {
          token: tkn,
          date: today,
          targetCalories: macroTargets.calories,
          targetProtein: macroTargets.protein,
          targetCarbs: macroTargets.carbs,
          targetFat: macroTargets.fat,
        });

        if (!log) throw new Error("Failed to get daily log");

        await convex.mutation(api.meals.addMealEntry, {
          token: tkn,
          dailyLogId: log._id,
          foodName: entry.foodName,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          timestamp: Date.now(),
        });

        await convex.mutation(api.meals.recordActivity, {
          token: tkn,
          date: today,
        });

        setSelectedDate(today);
        await loadDashboardData(today, user);
        setOverlayScreen("tabs");
      } catch (error) {
        console.error("Manual entry save error:", error);
        Alert.alert("Error", "Failed to save manual entry");
      }
    },
    [currentUserId, loadDashboardData, macroTargets, user]
  );

  // ---- RENDER ----

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
        onVerifyEmail={verifyEmail}
        onResendCode={resendVerificationEmail}
        onRequestPasswordReset={requestPasswordReset}
        onResetPassword={resetPassword}
      />
    );
  }

  if (showMacroGoals && user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <MacroGoalsScreen
          onSave={handleSaveMacroGoals}
          onSkip={handleSkipMacroGoals}
        />
      </SafeAreaView>
    );
  }

  if (overlayScreen === "manual") {
    return (
      <ManualEntryScreen
        onSave={handleManualEntrySave}
        onCancel={() => setOverlayScreen("tabs")}
      />
    );
  }

  if (overlayScreen === "settings" && user) {
    return (
      <SettingsScreen
        user={{
          id: user.id,
          preferences: user.preferences,
          createdAt: user.createdAt ?? Date.now(),
        }}
        onSave={(prefs) => {
          void handleUpdatePreferences(prefs);
        }}
        onClose={() => setOverlayScreen("tabs")}
        onClearTodayData={async () => {
          try {
            const tkn = await getToken();
            const today = getTodayDateString();
            const meals = await convex.query(api.meals.getMealsForDate, {
              token: tkn,
              date: today,
            });
            for (const meal of meals) {
              await convex.mutation(api.meals.deleteMealEntry, {
                token: tkn,
                id: meal.id as any,
              });
            }
            await loadDashboardData(today, user);
            Alert.alert("Cleared", "Today's meal data has been cleared.");
          } catch (err) {
            console.error("Clear today error:", err);
            Alert.alert("Error", "Failed to clear today's data");
          }
        }}
        onResetSettings={async () => {
          const defaultPrefs: UserPreferences = {
            goals: [],
            priorities: {},
            macroTargets: DEFAULT_SKIP_TARGETS,
          };
          await handleUpdatePreferences(defaultPrefs);
          Alert.alert("Reset", "Settings have been reset to defaults.");
        }}
      />
    );
  }

  if (overlayScreen === "camera") {
    return (
      <CameraScreen
        onCapture={handleCapture}
        onClose={() => setOverlayScreen("tabs")}
      />
    );
  }

  if (overlayScreen === "results") {
    return isAnalyzing ? (
      <View style={styles.analyzingContainer}>
        <LeafParticles count={10} />
        <View style={styles.analyzingCard}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.analyzingTitle}>Analyzing your meal...</Text>
          <Text style={styles.analyzingSubtitle}>
            Identifying foods and calculating nutrition
          </Text>
        </View>
      </View>
    ) : scanResult && capturedImage ? (
      <ResultsScreen
        result={scanResult}
        imageUri={capturedImage}
        onSave={handleSaveScan}
        onRescan={() => setOverlayScreen("camera")}
        onClose={() => setOverlayScreen("tabs")}
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
        {activeTab === "home" && (
          <HomeScreen
            todayTotals={dayTotals}
            macroTargets={macroTargets}
            remainingMacros={remainingMacros}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            daysWithMeals={daysWithMeals}
            recentMeals={recentMeals}
            streak={streak}
            onRefresh={async () => {
              await loadDashboardData(selectedDate, user);
            }}
            onDeleteMeal={async (mealId: string) => {
              try {
                const tkn = await getToken();
                await convex.mutation(api.meals.deleteMealEntry, {
                  token: tkn,
                  id: mealId as any,
                });
                await loadDashboardData(selectedDate, user);
              } catch (err) {
                console.error("Delete meal error:", err);
                Alert.alert("Error", "Failed to delete meal entry");
              }
            }}
          />
        )}

        {activeTab === "progress" && (
          <ProgressScreen weekData={weeklySummary} />
        )}

        {activeTab === "history" && (
          <HistoryScreen
            recentMeals={recentMeals}
            onManualEntry={() => setOverlayScreen("manual")}
          />
        )}

        {activeTab === "profile" && (
          <ProfileScreen
            displayName={authUser?.displayName ?? "Unknown"}
            email={authUser?.email ?? "Unknown"}
            apiHealthy={apiHealthy}
            onOpenSettings={() => setOverlayScreen("settings")}
            onSignOut={handleSignOut}
          />
        )}
      </View>

      <TabBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onScanPress={() => setOverlayScreen("camera")}
      />
    </SafeAreaView>
  );
}

// ---- Wrap with ConvexProvider ----
export default function App() {
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <AppInner />
      </ConvexProvider>
    </ErrorBoundary>
  );
}

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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
  },
  analyzingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.secondary,
  },
  analyzingCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: "center",
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
    textAlign: "center",
  },
});

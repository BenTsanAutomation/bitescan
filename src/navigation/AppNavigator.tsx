import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  NavigationContainer,
  Theme as NavigationTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useConvexConnectionState } from "convex/react";
import { borderRadius, shadows, spacing, typography } from "../theme";
import AuthScreen from "../screens/AuthScreen";
import { CameraScreen } from "../screens/CameraScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import MacroGoalsScreen from "../screens/MacroGoalsScreen";
import ManualEntryScreen from "../screens/ManualEntryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MainTabs } from "./MainTabs";
import { RootStackParamList } from "./types";
import { useAuth } from "../contexts/AuthContext";
import { useMeals } from "../contexts/MealContext";
import { useThemeContext } from "../contexts/ThemeContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

const DEFAULT_SKIP_TARGETS = {
  calories: 2000,
  protein: 150,
  carbs: 220,
  fat: 70,
};

const hasMacroTargets = (targets?: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): boolean => !!targets && targets.calories > 0 && targets.protein > 0;

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const AppNavigator: React.FC = () => {
  const { colors, isDarkMode } = useThemeContext();
  const {
    authChecked,
    authUser,
    signIn,
    signUp,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    preferences,
    updatePreferences,
    createdAt,
  } = useAuth();
  const {
    scanResult,
    capturedImage,
    isAnalyzing,
    remainingMacros,
    startScanAnalysis,
    clearScanAnalysis,
    saveCurrentScan,
    addManualEntry,
    updateMeal,
    historyMeals,
    setSelectedDate,
    deleteMeal,
  } = useMeals();

  const connectionState = useConvexConnectionState();
  const isOffline =
    connectionState.hasEverConnected && !connectionState.isWebSocketConnected;

  const navigationTheme = useMemo<NavigationTheme>(
    () => ({
      dark: isDarkMode,
      colors: {
        primary: colors.primary[500],
        background: colors.background.secondary,
        card: colors.background.card,
        text: colors.text.primary,
        border: colors.neutral[200],
        notification: colors.secondary[500],
      },
      fonts: {
        regular: { fontFamily: "System", fontWeight: "400" },
        medium: { fontFamily: "System", fontWeight: "500" },
        bold: { fontFamily: "System", fontWeight: "700" },
        heavy: { fontFamily: "System", fontWeight: "800" },
      },
    }),
    [colors, isDarkMode]
  );

  if (!authChecked) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.secondary }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading BiteScan...
        </Text>
      </View>
    );
  }

  if (!authUser) {
    return (
      <AuthScreen
        onAuthenticated={(_user, _isNewUser) => {
          // Auth is reactive via AuthContext hooks.
        }}
        onSignIn={signIn}
        onSignUp={signUp}
        onVerifyEmail={verifyEmail}
        onResendCode={resendVerificationEmail}
        onRequestPasswordReset={requestPasswordReset}
        onResetPassword={resetPassword}
      />
    );
  }

  const needsMacroGoals = !hasMacroTargets(preferences.macroTargets);

  return (
    <NavigationContainer theme={navigationTheme}>
      <View style={styles.appWrap}>
        {isOffline ? (
          <View
            style={[
              styles.offlineBanner,
              {
                backgroundColor: colors.warning,
              },
            ]}
          >
            <Text style={[styles.offlineText, { color: colors.text.inverse }]}>
              Offline: waiting for Convex reconnection...
            </Text>
          </View>
        ) : null}

        <Stack.Navigator
          initialRouteName={needsMacroGoals ? "MacroGoals" : "MainTabs"}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Camera">
            {({ navigation }) => (
              <CameraScreen
                onCapture={async (imageUri) => {
                  try {
                    await startScanAnalysis(imageUri, preferences);
                    navigation.replace("Results");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Could not analyze the image.";
                    Alert.alert("Analysis Failed", message);
                    navigation.goBack();
                  }
                }}
                onClose={() => navigation.goBack()}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Results">
            {({ navigation }) =>
              isAnalyzing ? (
                <View
                  style={[
                    styles.loadingContainer,
                    { backgroundColor: colors.background.secondary },
                  ]}
                >
                  <ActivityIndicator size="large" color={colors.primary[500]} />
                  <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                    Analyzing your meal...
                  </Text>
                </View>
              ) : scanResult && capturedImage ? (
                <ResultsScreen
                  result={scanResult}
                  imageUri={capturedImage}
                  remainingMacros={remainingMacros}
                  onRescan={() => navigation.replace("Camera")}
                  onClose={() => {
                    clearScanAnalysis();
                    navigation.popToTop();
                  }}
                  onSave={async () => {
                    try {
                      await saveCurrentScan();
                      clearScanAnalysis();
                      setSelectedDate(getTodayDateString());
                      navigation.popToTop();
                      Alert.alert("Saved!", "Scan saved to your meal log.");
                    } catch (error) {
                      const message =
                        error instanceof Error ? error.message : "Failed to save scan.";
                      Alert.alert("Save Failed", message);
                    }
                  }}
                />
              ) : (
                <View
                  style={[
                    styles.loadingContainer,
                    { backgroundColor: colors.background.secondary },
                  ]}
                >
                  <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                    No result to display.
                  </Text>
                </View>
              )
            }
          </Stack.Screen>

          <Stack.Screen
            name="ManualEntry"
            options={{ presentation: "modal" }}
          >
            {({ route, navigation }) => (
              <ManualEntryScreen
                initialEntry={route.params?.initialEntry}
                title={route.params?.mealId ? "Edit Meal" : "Manual Entry"}
                subtitle={
                  route.params?.mealId
                    ? "Update nutrition values for this meal."
                    : "Add nutrition details when scan results are missing."
                }
                saveLabel={route.params?.mealId ? "Save Changes" : "Save Entry"}
                onCancel={() => navigation.goBack()}
                onSave={async (entry) => {
                  try {
                    if (route.params?.mealId) {
                      await updateMeal(route.params.mealId, entry);
                    } else {
                      await addManualEntry(entry);
                    }
                    navigation.goBack();
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Could not save entry.";
                    Alert.alert("Save Failed", message);
                  }
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Settings" options={{ presentation: "modal" }}>
            {({ navigation }) => (
              <SettingsScreen
                user={{
                  id: authUser.id,
                  displayName: authUser.displayName,
                  email: authUser.email,
                  preferences,
                  createdAt: createdAt ?? Date.now(),
                }}
                onSave={updatePreferences}
                onClose={() => navigation.goBack()}
                onClearTodayData={async () => {
                  try {
                    const today = getTodayDateString();
                    const todayMeals = historyMeals.filter(
                      (meal) => (meal.date ?? today) === today
                    );
                    await Promise.all(todayMeals.map((meal) => deleteMeal(meal.id)));
                    Alert.alert("Cleared", "Today's meal data has been cleared.");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Could not clear today's data.";
                    Alert.alert("Error", message);
                  }
                }}
                onResetSettings={async () => {
                  try {
                    await updatePreferences({
                      goals: [],
                      priorities: {},
                      macroTargets: DEFAULT_SKIP_TARGETS,
                      darkMode: preferences.darkMode,
                      useMetric: preferences.useMetric,
                      tasteProfile: preferences.tasteProfile,
                    });
                    Alert.alert("Reset", "Settings have been reset to defaults.");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Could not reset settings.";
                    Alert.alert("Error", message);
                  }
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="MacroGoals" options={{ presentation: "modal" }}>
            {({ navigation }) => (
              <MacroGoalsScreen
                onSave={async (targets) => {
                  try {
                    await updatePreferences({
                      ...preferences,
                      macroTargets: targets,
                    });
                    navigation.replace("MainTabs");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Could not save macro goals.";
                    Alert.alert("Save Failed", message);
                  }
                }}
                onSkip={async () => {
                  try {
                    await updatePreferences({
                      ...preferences,
                      macroTargets: DEFAULT_SKIP_TARGETS,
                    });
                    navigation.replace("MainTabs");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Could not save macro goals.";
                    Alert.alert("Save Failed", message);
                  }
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  appWrap: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.md,
  },
  offlineBanner: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.md,
  },
  offlineText: {
    textAlign: "center",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default AppNavigator;

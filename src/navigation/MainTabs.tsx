import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import ProgressScreen from "../screens/ProgressScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { TabBar, TabKey } from "../components/TabBar";
import { MainTabParamList, RootStackParamList } from "./types";
import { useMeals } from "../contexts/MealContext";
import { useAuth } from "../contexts/AuthContext";

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabNameToKey = (name: keyof MainTabParamList): TabKey => {
  switch (name) {
    case "Home":
      return "home";
    case "Progress":
      return "progress";
    case "History":
      return "history";
    case "Profile":
      return "profile";
  }
};

const keyToTabName = (key: TabKey): keyof MainTabParamList => {
  switch (key) {
    case "home":
      return "Home";
    case "progress":
      return "Progress";
    case "history":
      return "History";
    case "profile":
      return "Profile";
  }
};

const ScreenBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

export const MainTabs: React.FC = () => {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const {
    selectedDate,
    setSelectedDate,
    todayTotals,
    macroTargets,
    remainingMacros,
    recentMeals,
    historyMeals,
    daysWithMeals,
    weeklySummary,
    streak,
    progressRange,
    setProgressRange,
    deletingMealIds,
    deleteMeal,
    refreshHistory,
    exportMealHistoryCsv,
    totalMealsLogged,
    totalScans,
    isApiHealthy,
  } = useMeals();
  const { authUser, signOut, createdAt } = useAuth();

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => {
        const activeTab = tabNameToKey(
          props.state.routes[props.state.index].name as keyof MainTabParamList
        );
        return (
          <TabBar
            activeTab={activeTab}
            onTabPress={(key) => props.navigation.navigate(keyToTabName(key))}
            onScanPress={() => rootNavigation.navigate("Camera")}
          />
        );
      }}
    >
      <Tab.Screen name="Home">
        {() => (
          <ScreenBoundary>
            <HomeScreen
              todayTotals={todayTotals}
              macroTargets={macroTargets}
              remainingMacros={remainingMacros}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              daysWithMeals={daysWithMeals}
              recentMeals={recentMeals}
              streak={streak}
              onDeleteMeal={deleteMeal}
              deletingMealIds={deletingMealIds}
              onMealPress={(meal) =>
                rootNavigation.navigate("ManualEntry", {
                  mealId: meal.id,
                  initialEntry: {
                    foodName: meal.foodName,
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fat: meal.fat,
                  },
                })
              }
              onQuickAdd={() => rootNavigation.navigate("QuickAdd")}
              onScanMenu={() => rootNavigation.navigate("Camera", { initialMode: "menu" })}
              onScanBarcode={() => rootNavigation.navigate("Camera", { initialMode: "packaged" })}
            />
          </ScreenBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen name="Progress">
        {() => (
          <ScreenBoundary>
            <ProgressScreen
              data={weeklySummary}
              macroTargets={macroTargets}
              range={progressRange}
              onRangeChange={setProgressRange}
            />
          </ScreenBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen name="History">
        {() => (
          <ScreenBoundary>
            <HistoryScreen
              meals={historyMeals}
              deletingMealIds={deletingMealIds}
              onManualEntry={() => rootNavigation.navigate("ManualEntry")}
              onDeleteMeal={deleteMeal}
              onRefresh={refreshHistory}
              onExportCsv={exportMealHistoryCsv}
              onMealPress={(meal) =>
                rootNavigation.navigate("ManualEntry", {
                  mealId: meal.id,
                  initialEntry: {
                    foodName: meal.foodName,
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fat: meal.fat,
                  },
                })
              }
            />
          </ScreenBoundary>
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile">
        {() => (
          <ScreenBoundary>
            <ProfileScreen
              displayName={authUser?.displayName ?? "Unknown"}
              email={authUser?.email ?? "Unknown"}
              createdAt={createdAt}
              totalMealsLogged={totalMealsLogged}
              totalScans={totalScans}
              apiHealthy={isApiHealthy}
              onOpenSettings={() => rootNavigation.navigate("Settings")}
              onSignOut={() => {
                void signOut();
              }}
            />
          </ScreenBoundary>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default MainTabs;

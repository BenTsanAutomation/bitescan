import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { analyzeFoodImage, checkApiHealth, imageToBase64 } from "../services/api";
import {
  DailyMacroSummary,
  FoodItem,
  MacroRemaining,
  MacroTargets,
  MacroTotals,
  RecentMeal,
  ScanResult,
  UserPreferences,
  UserStreak,
} from "../types";
import { buildMealsCsv, writeMealsCsvFile } from "../services/csvExport";
import { useAuth } from "./AuthContext";

type ManualEntryInput = {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

interface MealContextValue {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  macroTargets: MacroTargets;
  todayTotals: MacroTotals;
  remainingMacros: MacroRemaining | null;
  recentMeals: RecentMeal[];
  historyMeals: RecentMeal[];
  daysWithMeals: string[];
  weeklySummary: DailyMacroSummary[];
  streak: UserStreak | null;
  progressRange: 7 | 14 | 30;
  setProgressRange: (range: 7 | 14 | 30) => void;
  scanResult: ScanResult | null;
  capturedImage: string | null;
  isAnalyzing: boolean;
  isApiHealthy: boolean;
  deletingMealIds: string[];
  totalMealsLogged: number;
  totalScans: number;
  startScanAnalysis: (
    imageUri: string,
    preferences: UserPreferences,
    mode?: "food" | "menu"
  ) => Promise<void>;
  clearScanAnalysis: () => void;
  saveCurrentScan: () => Promise<void>;
  saveMenuItemFromCurrentScan: (item: FoodItem) => Promise<void>;
  addManualEntry: (entry: ManualEntryInput, date?: string) => Promise<void>;
  updateMeal: (id: string, entry: ManualEntryInput) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  exportMealHistoryCsv: () => Promise<{ fileUri: string; rowCount: number }>;
}

const DEFAULT_TARGETS: MacroTargets = {
  calories: 2000,
  protein: 150,
  carbs: 220,
  fat: 70,
};

const EMPTY_TOTALS: MacroTotals = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

const MealContext = createContext<MealContextValue | null>(null);

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateStamp = (): string => {
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

const toRecentMeals = (items: any[] | undefined): RecentMeal[] =>
  (items ?? []).map((meal) => ({
    id: String(meal.id),
    logId: String(meal.logId),
    scanId: meal.scanId ?? undefined,
    foodName: meal.foodName,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    timestamp: meal.timestamp,
    date: meal.date ?? undefined,
    imageUri: meal.imageUri ?? undefined,
  }));

export const MealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, preferences, authUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [progressRange, setProgressRange] = useState<7 | 14 | 30>(7);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isApiHealthy, setIsApiHealthy] = useState(false);
  const [deletingMealIds, setDeletingMealIds] = useState<string[]>([]);

  const ensureDailyLogMutation = useMutation(api.meals.getOrCreateDailyLog);
  const addMealMutation = useMutation(api.meals.addMealEntry);
  const updateMealMutation = useMutation(api.meals.updateMealEntry);
  const deleteMealMutation = useMutation(api.meals.deleteMealEntry);
  const saveScanMutation = useMutation(api.meals.saveScan);
  const upsertFavoriteMutation = useMutation(api.favorites.upsertFavorite);
  const recordActivityMutation = useMutation(api.meals.recordActivity);
  const generateUploadUrlMutation = useMutation(api.files.generateUploadUrl);

  const macroTargets = useMemo<MacroTargets>(
    () => ({
      calories: preferences.macroTargets?.calories ?? DEFAULT_TARGETS.calories,
      protein: preferences.macroTargets?.protein ?? DEFAULT_TARGETS.protein,
      carbs: preferences.macroTargets?.carbs ?? DEFAULT_TARGETS.carbs,
      fat: preferences.macroTargets?.fat ?? DEFAULT_TARGETS.fat,
    }),
    [preferences.macroTargets]
  );

  const weekDates = useMemo(() => getDateRange(7), []);
  const progressDates = useMemo(() => getDateRange(progressRange), [progressRange]);

  const todayTotals = useQuery(
    api.meals.getMacroTotalsForDate,
    token ? { token, date: selectedDate } : "skip"
  ) ?? EMPTY_TOTALS;

  const remainingMacros = useQuery(
    api.meals.getRemainingMacros,
    token ? { token, date: selectedDate } : "skip"
  ) as MacroRemaining | null | undefined;

  const recentMeals = toRecentMeals(
    useQuery(api.meals.getMealsForDate, token ? { token, date: selectedDate } : "skip")
  );

  const historyMeals = toRecentMeals(
    useQuery(api.meals.getMealHistory, token ? { token, days: 30 } : "skip")
  );

  const daysWithMeals =
    useQuery(
      api.meals.getMealDaysWithEntries,
      token ? { token, dates: weekDates } : "skip"
    ) ?? [];

  const weeklySummary =
    useQuery(
      api.meals.getWeeklyMacroSummary,
      token ? { token, dates: progressDates } : "skip"
    ) ?? [];

  const streakData = useQuery(api.meals.getStreak, token ? { token } : "skip");
  const totalMealsLogged = useQuery(api.meals.getTotalMealCount, token ? { token } : "skip") ?? 0;
  const totalScans = useQuery(api.meals.getScanCount, token ? { token } : "skip") ?? 0;

  const streak: UserStreak | null = useMemo(() => {
    if (!streakData) return null;
    return {
      userId: streakData.externalUserId,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      lastActiveDate: streakData.lastActiveDate ?? null,
    };
  }, [streakData]);

  useEffect(() => {
    if (!token) return;
    void ensureDailyLogMutation({
      token,
      date: getTodayDateString(),
      targetCalories: macroTargets.calories,
      targetProtein: macroTargets.protein,
      targetCarbs: macroTargets.carbs,
      targetFat: macroTargets.fat,
    });
  }, [ensureDailyLogMutation, macroTargets, token]);

  useEffect(() => {
    let mounted = true;
    async function healthCheck() {
      const healthy = await checkApiHealth();
      if (mounted) {
        setIsApiHealthy(healthy);
      }
    }
    void healthCheck();
    return () => {
      mounted = false;
    };
  }, []);

  const startScanAnalysis = useCallback(
    async (
      imageUri: string,
      userPreferences: UserPreferences,
      mode: "food" | "menu" = "food"
    ) => {
      setCapturedImage(imageUri);
      setIsAnalyzing(true);
      try {
        const base64 = await imageToBase64(imageUri);
        const result = await analyzeFoodImage(base64, userPreferences, mode);
        setScanResult(result);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const clearScanAnalysis = useCallback(() => {
    setCapturedImage(null);
    setScanResult(null);
    setIsAnalyzing(false);
  }, []);

  const ensureDailyLogForDate = useCallback(
    async (date: string) => {
      if (!token) throw new Error("Not authenticated");
      const log = await ensureDailyLogMutation({
        token,
        date,
        targetCalories: macroTargets.calories,
        targetProtein: macroTargets.protein,
        targetCarbs: macroTargets.carbs,
        targetFat: macroTargets.fat,
      });
      if (!log) {
        throw new Error("Failed to create daily log");
      }
      return log;
    },
    [ensureDailyLogMutation, macroTargets, token]
  );

  const uploadImageToStorage = useCallback(
    async (imageUri: string): Promise<Id<"_storage">> => {
      if (!token) throw new Error("Not authenticated");
      const uploadUrl = await generateUploadUrlMutation({ token });

      const imageResponse = await fetch(imageUri);
      const imageBlob = await imageResponse.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": imageBlob.type || "image/jpeg",
        },
        body: imageBlob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
      return storageId;
    },
    [generateUploadUrlMutation, token]
  );

  const saveCurrentScan = useCallback(async () => {
    if (!token) throw new Error("Not authenticated");
    if (!scanResult || !capturedImage) {
      throw new Error("No scan available");
    }

    const today = getTodayDateString();
    const log = await ensureDailyLogForDate(today);
    const storageId = await uploadImageToStorage(capturedImage);

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

    await saveScanMutation({
      token,
      scanId: scanResult.id,
      imageUri: "",
      storageId,
      resultJson: JSON.stringify(scanResult),
    });

    await addMealMutation({
      token,
      dailyLogId: log._id,
      scanId: scanResult.id,
      foodName: mealName,
      calories: scanResult.totalCalories,
      protein: macroTotals.protein,
      carbs: macroTotals.carbs,
      fat: macroTotals.fat,
      timestamp: Date.now(),
    });

    if (authUser?.id) {
      await Promise.all(
        scanResult.foods.map((food) =>
          upsertFavoriteMutation({
            externalUserId: authUser.id,
            foodName: food.name,
            calories: food.nutrition.calories,
            protein: food.nutrition.protein,
            carbs: food.nutrition.carbs,
            fat: food.nutrition.fat,
          })
        )
      );
    }

    await recordActivityMutation({ token, date: today });
    setSelectedDate(today);
  }, [
    authUser?.id,
    addMealMutation,
    capturedImage,
    ensureDailyLogForDate,
    recordActivityMutation,
    saveScanMutation,
    scanResult,
    token,
    upsertFavoriteMutation,
    uploadImageToStorage,
  ]);

  const saveMenuItemFromCurrentScan = useCallback(
    async (item: FoodItem) => {
      if (!token) throw new Error("Not authenticated");
      if (!scanResult) throw new Error("No scan available");

      const today = getTodayDateString();
      const log = await ensureDailyLogForDate(today);

      await addMealMutation({
        token,
        dailyLogId: log._id,
        foodName: item.name,
        calories: item.nutrition.calories,
        protein: item.nutrition.protein,
        carbs: item.nutrition.carbs,
        fat: item.nutrition.fat,
        timestamp: Date.now(),
      });

      if (authUser?.id) {
        await upsertFavoriteMutation({
          externalUserId: authUser.id,
          foodName: item.name,
          calories: item.nutrition.calories,
          protein: item.nutrition.protein,
          carbs: item.nutrition.carbs,
          fat: item.nutrition.fat,
        });
      }

      await recordActivityMutation({ token, date: today });
      setSelectedDate(today);
    },
    [
      addMealMutation,
      authUser?.id,
      ensureDailyLogForDate,
      recordActivityMutation,
      scanResult,
      token,
      upsertFavoriteMutation,
    ]
  );

  const addManualEntry = useCallback(
    async (entry: ManualEntryInput, date?: string) => {
      if (!token) throw new Error("Not authenticated");
      const targetDate = date ?? getTodayDateString();
      const log = await ensureDailyLogForDate(targetDate);

      await addMealMutation({
        token,
        dailyLogId: log._id,
        foodName: entry.foodName,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
        timestamp: Date.now(),
      });

      if (authUser?.id) {
        await upsertFavoriteMutation({
          externalUserId: authUser.id,
          foodName: entry.foodName,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
        });
      }

      await recordActivityMutation({
        token,
        date: targetDate,
      });

      setSelectedDate(targetDate);
    },
    [addMealMutation, authUser?.id, ensureDailyLogForDate, recordActivityMutation, token, upsertFavoriteMutation]
  );

  const updateMeal = useCallback(
    async (id: string, entry: ManualEntryInput) => {
      if (!token) throw new Error("Not authenticated");
      await updateMealMutation({
        token,
        id: id as Id<"mealEntries">,
        foodName: entry.foodName,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fat: entry.fat,
      });
    },
    [token, updateMealMutation]
  );

  const deleteMeal = useCallback(
    async (id: string) => {
      if (!token) throw new Error("Not authenticated");
      setDeletingMealIds((prev) => [...prev, id]);
      try {
        await deleteMealMutation({
          token,
          id: id as Id<"mealEntries">,
        });
      } finally {
        setDeletingMealIds((prev) => prev.filter((itemId) => itemId !== id));
      }
    },
    [deleteMealMutation, token]
  );

  const refreshHistory = useCallback(async () => {
    // Reactive Convex queries stay current automatically; keep pull-to-refresh UX.
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  const exportMealHistoryCsv = useCallback(async () => {
    const rows = [...historyMeals].sort((a, b) => b.timestamp - a.timestamp);
    if (rows.length === 0) {
      throw new Error("No meals available to export.");
    }

    const csv = buildMealsCsv(rows);
    const fileUri = await writeMealsCsvFile(csv, getDateStamp());
    return { fileUri, rowCount: rows.length };
  }, [historyMeals]);

  const value = useMemo<MealContextValue>(
    () => ({
      selectedDate,
      setSelectedDate,
      macroTargets,
      todayTotals,
      remainingMacros: remainingMacros ?? null,
      recentMeals,
      historyMeals,
      daysWithMeals,
      weeklySummary,
      streak,
      progressRange,
      setProgressRange,
      scanResult,
      capturedImage,
      isAnalyzing,
      isApiHealthy,
      deletingMealIds,
      totalMealsLogged,
      totalScans,
      startScanAnalysis,
      clearScanAnalysis,
      saveCurrentScan,
      saveMenuItemFromCurrentScan,
      addManualEntry,
      updateMeal,
      deleteMeal,
      refreshHistory,
      exportMealHistoryCsv,
    }),
    [
      addManualEntry,
      capturedImage,
      clearScanAnalysis,
      daysWithMeals,
      deletingMealIds,
      historyMeals,
      isAnalyzing,
      isApiHealthy,
      macroTargets,
      progressRange,
      recentMeals,
      refreshHistory,
      remainingMacros,
      saveCurrentScan,
      saveMenuItemFromCurrentScan,
      scanResult,
      selectedDate,
      startScanAnalysis,
      streak,
      todayTotals,
      totalMealsLogged,
      totalScans,
      updateMeal,
      weeklySummary,
      deleteMeal,
      exportMealHistoryCsv,
    ]
  );

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>;
};

export const useMeals = (): MealContextValue => {
  const context = useContext(MealContext);
  if (!context) {
    throw new Error("useMeals must be used within MealProvider");
  }
  return context;
};

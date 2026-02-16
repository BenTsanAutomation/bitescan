// Convex functions for daily logs, meal entries, scans, and streaks
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// DAILY LOGS
// ============================================================

export const getOrCreateDailyLog = mutation({
  args: {
    externalUserId: v.string(),
    date: v.string(),
    targetCalories: v.number(),
    targetProtein: v.number(),
    targetCarbs: v.number(),
    targetFat: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if log exists
    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("externalUserId", args.externalUserId).eq("date", args.date)
      )
      .first();

    if (existing) return existing;

    // Create new log
    const id = await ctx.db.insert("dailyLogs", {
      externalUserId: args.externalUserId,
      date: args.date,
      targetCalories: args.targetCalories,
      targetProtein: args.targetProtein,
      targetCarbs: args.targetCarbs,
      targetFat: args.targetFat,
    });

    return await ctx.db.get(id);
  },
});

export const getDailyLog = query({
  args: {
    externalUserId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("externalUserId", args.externalUserId).eq("date", args.date)
      )
      .first();
  },
});

// ============================================================
// MEAL ENTRIES
// ============================================================

export const addMealEntry = mutation({
  args: {
    dailyLogId: v.id("dailyLogs"),
    externalUserId: v.string(),
    scanId: v.optional(v.string()),
    foodName: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mealEntries", {
      dailyLogId: args.dailyLogId,
      externalUserId: args.externalUserId,
      scanId: args.scanId,
      foodName: args.foodName,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      timestamp: args.timestamp,
    });
  },
});

export const getMealsForDate = query({
  args: {
    externalUserId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("externalUserId", args.externalUserId).eq("date", args.date)
      )
      .first();

    if (!log) return [];

    const meals = await ctx.db
      .query("mealEntries")
      .withIndex("by_dailyLogId", (q) => q.eq("dailyLogId", log._id))
      .collect();

    // Get scan image URIs
    const results = await Promise.all(
      meals.map(async (meal) => {
        let imageUri: string | undefined;
        if (meal.scanId) {
          const scan = await ctx.db
            .query("scans")
            .withIndex("by_scanId", (q) => q.eq("scanId", meal.scanId!))
            .first();
          imageUri = scan?.imageUri;
        }
        return {
          id: meal._id,
          logId: meal.dailyLogId,
          scanId: meal.scanId,
          foodName: meal.foodName,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          timestamp: meal.timestamp,
          imageUri,
        };
      })
    );

    return results.sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const deleteMealEntry = mutation({
  args: { id: v.id("mealEntries") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ============================================================
// MACRO TOTALS
// ============================================================

export const getMacroTotalsForDate = query({
  args: {
    externalUserId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("externalUserId", args.externalUserId).eq("date", args.date)
      )
      .first();

    if (!log) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const meals = await ctx.db
      .query("mealEntries")
      .withIndex("by_dailyLogId", (q) => q.eq("dailyLogId", log._id))
      .collect();

    return meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },
});

export const getRemainingMacros = query({
  args: {
    externalUserId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("dailyLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("externalUserId", args.externalUserId).eq("date", args.date)
      )
      .first();

    if (!log) return null;

    const meals = await ctx.db
      .query("mealEntries")
      .withIndex("by_dailyLogId", (q) => q.eq("dailyLogId", log._id))
      .collect();

    const totals = meals.reduce(
      (acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        carbs: acc.carbs + meal.carbs,
        fat: acc.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      calories: log.targetCalories - totals.calories,
      protein: log.targetProtein - totals.protein,
      carbs: log.targetCarbs - totals.carbs,
      fat: log.targetFat - totals.fat,
      caloriesPct:
        log.targetCalories > 0
          ? (totals.calories / log.targetCalories) * 100
          : 0,
      proteinPct:
        log.targetProtein > 0
          ? (totals.protein / log.targetProtein) * 100
          : 0,
      carbsPct:
        log.targetCarbs > 0 ? (totals.carbs / log.targetCarbs) * 100 : 0,
      fatPct: log.targetFat > 0 ? (totals.fat / log.targetFat) * 100 : 0,
    };
  },
});

// ============================================================
// WEEKLY SUMMARY
// ============================================================

export const getWeeklyMacroSummary = query({
  args: {
    externalUserId: v.string(),
    dates: v.array(v.string()), // Array of YYYY-MM-DD strings for the week
  },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.dates.map(async (date) => {
        const log = await ctx.db
          .query("dailyLogs")
          .withIndex("by_user_date", (q) =>
            q.eq("externalUserId", args.externalUserId).eq("date", date)
          )
          .first();

        if (!log) {
          return { date, calories: 0, protein: 0, carbs: 0, fat: 0 };
        }

        const meals = await ctx.db
          .query("mealEntries")
          .withIndex("by_dailyLogId", (q) => q.eq("dailyLogId", log._id))
          .collect();

        const totals = meals.reduce(
          (acc, meal) => ({
            calories: acc.calories + meal.calories,
            protein: acc.protein + meal.protein,
            carbs: acc.carbs + meal.carbs,
            fat: acc.fat + meal.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        return { date, ...totals };
      })
    );

    return results;
  },
});

// ============================================================
// DAYS WITH MEALS
// ============================================================

export const getMealDaysWithEntries = query({
  args: {
    externalUserId: v.string(),
    dates: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const daysWithMeals: string[] = [];

    for (const date of args.dates) {
      const log = await ctx.db
        .query("dailyLogs")
        .withIndex("by_user_date", (q) =>
          q.eq("externalUserId", args.externalUserId).eq("date", date)
        )
        .first();

      if (log) {
        const meal = await ctx.db
          .query("mealEntries")
          .withIndex("by_dailyLogId", (q) => q.eq("dailyLogId", log._id))
          .first();

        if (meal) {
          daysWithMeals.push(date);
        }
      }
    }

    return daysWithMeals;
  },
});

// ============================================================
// SCANS
// ============================================================

export const saveScan = mutation({
  args: {
    externalUserId: v.string(),
    scanId: v.string(),
    imageUri: v.string(),
    resultJson: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("scans", {
      externalUserId: args.externalUserId,
      scanId: args.scanId,
      imageUri: args.imageUri,
      resultJson: args.resultJson,
    });

    // Update last scan time on profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", args.externalUserId)
      )
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { lastScanAt: Date.now() });
    }
  },
});

export const getScanHistory = query({
  args: {
    externalUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("scans")
      .withIndex("by_externalUserId", (q) =>
        q.eq("externalUserId", args.externalUserId)
      )
      .order("desc")
      .take(args.limit ?? 50);

    return scans;
  },
});

// ============================================================
// STREAKS
// ============================================================

export const getStreak = query({
  args: { externalUserId: v.string() },
  handler: async (ctx, args) => {
    const streak = await ctx.db
      .query("userStreaks")
      .withIndex("by_externalUserId", (q) =>
        q.eq("externalUserId", args.externalUserId)
      )
      .first();

    return (
      streak ?? {
        externalUserId: args.externalUserId,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: undefined,
      }
    );
  },
});

export const recordActivity = mutation({
  args: {
    externalUserId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const streak = await ctx.db
      .query("userStreaks")
      .withIndex("by_externalUserId", (q) =>
        q.eq("externalUserId", args.externalUserId)
      )
      .first();

    if (!streak) {
      await ctx.db.insert("userStreaks", {
        externalUserId: args.externalUserId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: args.date,
      });
      return;
    }

    if (streak.lastActiveDate === args.date) return;

    const isConsecutive = streak.lastActiveDate
      ? daysBetween(streak.lastActiveDate, args.date) === 1
      : false;

    const currentStreak = isConsecutive ? streak.currentStreak + 1 : 1;
    const longestStreak = Math.max(streak.longestStreak, currentStreak);

    await ctx.db.patch(streak._id, {
      currentStreak,
      longestStreak,
      lastActiveDate: args.date,
    });
  },
});

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

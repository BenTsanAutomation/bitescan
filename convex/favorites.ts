import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const normalizeFoodName = (name: string) => name.trim().toLowerCase();

export const upsertFavorite = mutation({
  args: {
    externalUserId: v.string(),
    foodName: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeFoodName(args.foodName);
    if (!normalized) {
      throw new Error("foodName is required");
    }

    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_food", (q) =>
        q.eq("externalUserId", args.externalUserId).eq("foodName", normalized)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        foodName: normalized,
        calories: args.calories,
        protein: args.protein,
        carbs: args.carbs,
        fat: args.fat,
        timesUsed: (existing.timesUsed ?? 0) + 1,
        lastUsedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("favorites", {
      externalUserId: args.externalUserId,
      foodName: normalized,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      timesUsed: 1,
      lastUsedAt: Date.now(),
    });
  },
});

export const removeFavorite = mutation({
  args: {
    externalUserId: v.string(),
    favoriteId: v.id("favorites"),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db.get(args.favoriteId);
    if (!favorite || favorite.externalUserId !== args.externalUserId) {
      throw new Error("Favorite not found or access denied");
    }
    await ctx.db.delete(args.favoriteId);
  },
});

export const listFavorites = query({
  args: {
    externalUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .withIndex("by_externalUserId", (q) =>
        q.eq("externalUserId", args.externalUserId)
      )
      .collect();

    return favorites
      .sort((a, b) => {
        if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
        return b.lastUsedAt - a.lastUsedAt;
      })
      .map((item) => ({
        id: item._id as Id<"favorites">,
        foodName: item.foodName,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        timesUsed: item.timesUsed,
        lastUsedAt: item.lastUsedAt,
      }));
  },
});

export const getRecentMeals = query({
  args: {
    externalUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const meals = await ctx.db
      .query("mealEntries")
      .withIndex("by_externalUserId", (q) =>
        q.eq("externalUserId", args.externalUserId)
      )
      .collect();

    const recentMeals = meals
      .filter((meal) => meal.timestamp >= sevenDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp);

    const byName = new Map<string, (typeof recentMeals)[number]>();
    for (const meal of recentMeals) {
      const key = normalizeFoodName(meal.foodName);
      if (!key || byName.has(key)) continue;
      byName.set(key, meal);
    }

    return Array.from(byName.values()).map((meal) => ({
      foodName: meal.foodName,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      timestamp: meal.timestamp,
    }));
  },
});

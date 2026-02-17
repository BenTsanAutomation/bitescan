import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles
  profiles: defineTable({
    // Uses Convex's built-in auth user ID (from Clerk/custom auth)
    externalId: v.string(), // auth provider user ID
    email: v.string(),
    displayName: v.string(),
    preferencesJson: v.string(), // JSON-encoded UserPreferences
    lastScanAt: v.optional(v.number()),
    emailVerified: v.boolean(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_email", ["email"]),

  // Auth credentials (local email/password auth)
  authCredentials: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    salt: v.string(),
    profileId: v.id("profiles"),
  }).index("by_email", ["email"]),

  // Auth sessions
  authSessions: defineTable({
    profileId: v.id("profiles"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_profileId", ["profileId"]),

  // Email verification tokens
  emailVerifications: defineTable({
    profileId: v.id("profiles"),
    email: v.string(),
    code: v.string(), // 6-digit code
    expiresAt: v.number(),
    used: v.boolean(),
  })
    .index("by_profileId", ["profileId"])
    .index("by_code", ["code"]),

  // Scans
  scans: defineTable({
    externalUserId: v.string(),
    imageUri: v.string(),
    resultJson: v.string(), // JSON-encoded ScanResult
    scanId: v.string(), // app-generated ID
  })
    .index("by_externalUserId", ["externalUserId"])
    .index("by_scanId", ["scanId"]),

  // Daily logs
  dailyLogs: defineTable({
    externalUserId: v.string(),
    date: v.string(), // YYYY-MM-DD
    targetCalories: v.number(),
    targetProtein: v.number(),
    targetCarbs: v.number(),
    targetFat: v.number(),
  })
    .index("by_user_date", ["externalUserId", "date"])
    .index("by_externalUserId", ["externalUserId"]),

  // Meal entries
  mealEntries: defineTable({
    dailyLogId: v.id("dailyLogs"),
    externalUserId: v.string(), // denormalized for direct queries
    scanId: v.optional(v.string()),
    foodName: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    timestamp: v.number(),
  })
    .index("by_dailyLogId", ["dailyLogId"])
    .index("by_externalUserId", ["externalUserId"])
    .index("by_timestamp", ["timestamp"]),

  // Rate limiting
  rateLimits: defineTable({
    key: v.string(), // e.g. "signin:user@example.com"
    attempts: v.number(),
    windowStart: v.number(), // timestamp
  }).index("by_key", ["key"]),

  // User streaks
  userStreaks: defineTable({
    externalUserId: v.string(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastActiveDate: v.optional(v.string()),
  }).index("by_externalUserId", ["externalUserId"]),
});

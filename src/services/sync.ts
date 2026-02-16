// BiteScan Sync Service — Bridges local SQLite ↔ Supabase cloud
// Strategy: SQLite is the source of truth for offline-first; sync pushes to cloud on save.
// On login, pull cloud data for anything not in local DB.

import { supabase } from './supabase';
import {
  getDb,
  updateUserPreferences,
} from './database';
import type {
  UserPreferences,
  DailyLog,
  MealEntry,
  UserStreak,
} from '../types';

/**
 * Push the user's profile/preferences to Supabase.
 */
export async function syncProfileToCloud(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      preferences_json: JSON.stringify(preferences),
      updated_at: Date.now(),
    })
    .eq('id', userId);

  if (error) console.error('Sync profile failed:', error.message);
}

/**
 * Pull profile from cloud and update local DB.
 */
export async function pullProfileFromCloud(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences_json, display_name')
    .eq('id', userId)
    .single();

  if (error || !data) return;

  try {
    const prefs = JSON.parse(data.preferences_json) as UserPreferences;
    await updateUserPreferences(userId, prefs);
  } catch {
    // Ignore parse errors — local DB stays as-is
  }
}

/**
 * Push a scan to Supabase.
 */
export async function syncScanToCloud(
  userId: string,
  scanId: string,
  imageUri: string,
  resultJson: string,
  createdAt: number
): Promise<void> {
  const { error } = await supabase.from('scans').upsert(
    {
      id: scanId,
      user_id: userId,
      image_uri: imageUri,
      result_json: resultJson,
      created_at: createdAt,
      synced_at: Date.now(),
    },
    { onConflict: 'id' }
  );

  if (error) console.error('Sync scan failed:', error.message);
}

/**
 * Push a daily log to Supabase.
 */
export async function syncDailyLogToCloud(
  log: DailyLog
): Promise<void> {
  const { error } = await supabase.from('daily_logs').upsert(
    {
      id: log.id,
      user_id: log.userId,
      date: log.date,
      target_calories: log.targetCalories,
      target_protein: log.targetProtein,
      target_carbs: log.targetCarbs,
      target_fat: log.targetFat,
      created_at: log.createdAt,
    },
    { onConflict: 'id' }
  );

  if (error) console.error('Sync daily log failed:', error.message);
}

/**
 * Push a meal entry to Supabase.
 */
export async function syncMealEntryToCloud(
  entry: MealEntry
): Promise<void> {
  const { error } = await supabase.from('meal_entries').upsert(
    {
      id: entry.id,
      log_id: entry.logId,
      scan_id: entry.scanId || null,
      food_name: entry.foodName,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
      timestamp: entry.timestamp,
    },
    { onConflict: 'id' }
  );

  if (error) console.error('Sync meal entry failed:', error.message);
}

/**
 * Push streak to Supabase.
 */
export async function syncStreakToCloud(streak: UserStreak): Promise<void> {
  const { error } = await supabase.from('user_streaks').upsert(
    {
      user_id: streak.userId,
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_active_date: streak.lastActiveDate,
    },
    { onConflict: 'user_id' }
  );

  if (error) console.error('Sync streak failed:', error.message);
}

/**
 * Delete a meal entry from Supabase.
 */
export async function deleteMealEntryFromCloud(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_entries')
    .delete()
    .eq('id', entryId);

  if (error) console.error('Delete meal entry from cloud failed:', error.message);
}

/**
 * Full pull: download all cloud data for this user into local SQLite.
 * Called on first login on a new device.
 */
export async function pullAllFromCloud(userId: string): Promise<{
  logs: number;
  meals: number;
  scans: number;
}> {
  let logCount = 0;
  let mealCount = 0;
  let scanCount = 0;

  try {
    // Pull profile
    await pullProfileFromCloud(userId);

    // Pull daily logs
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(90); // last 90 days

    if (logs) {
      const database = await getDb();
      for (const log of logs) {
        await database.runAsync(
          `INSERT OR IGNORE INTO daily_logs (id, user_id, date, target_calories, target_protein, target_carbs, target_fat, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          log.id, userId, log.date, log.target_calories, log.target_protein, log.target_carbs, log.target_fat, log.created_at
        );
        logCount++;
      }

      // Pull meal entries for those logs
      const logIds = logs.map((l: { id: string }) => l.id);
      if (logIds.length > 0) {
        const { data: meals } = await supabase
          .from('meal_entries')
          .select('*')
          .in('log_id', logIds);

        if (meals) {
          for (const meal of meals) {
            await database.runAsync(
              `INSERT OR IGNORE INTO meal_entries (id, log_id, scan_id, food_name, calories, protein, carbs, fat, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              meal.id, meal.log_id, meal.scan_id, meal.food_name, meal.calories, meal.protein, meal.carbs, meal.fat, meal.timestamp
            );
            mealCount++;
          }
        }
      }
    }

    // Pull scans (last 30)
    const { data: scans } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (scans) {
      const database = await getDb();
      for (const scan of scans) {
        await database.runAsync(
          `INSERT OR IGNORE INTO scans (id, user_id, image_uri, result_json, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          scan.id, userId, scan.image_uri, scan.result_json, scan.created_at
        );
        scanCount++;
      }
    }

    // Pull streak
    const { data: streak } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (streak) {
      const database = await getDb();
      await database.runAsync(
        `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           current_streak = MAX(excluded.current_streak, user_streaks.current_streak),
           longest_streak = MAX(excluded.longest_streak, user_streaks.longest_streak),
           last_active_date = CASE
             WHEN excluded.last_active_date > COALESCE(user_streaks.last_active_date, '')
             THEN excluded.last_active_date
             ELSE user_streaks.last_active_date
           END`,
        userId, streak.current_streak, streak.longest_streak, streak.last_active_date
      );
    }
  } catch (error) {
    console.error('Pull from cloud failed:', error);
  }

  return { logs: logCount, meals: mealCount, scans: scanCount };
}

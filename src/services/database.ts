// BiteScan Local Database (SQLite)
import * as SQLite from 'expo-sqlite';
import {
  DBUser,
  DBScan,
  User,
  ScanResult,
  UserPreferences,
  DailyLog,
  MealEntry,
  MacroTotals,
  MacroRemaining,
  DBDailyLog,
  DBMealEntry,
  MacroTargets,
  DBUserStreak,
  DailyMacroSummary,
  RecentMeal,
  UserStreak,
} from '../types';

const DB_NAME = 'bitescan.db';
const CLEANUP_DAYS = 30; // Auto-delete scans older than 30 days

let db: SQLite.SQLiteDatabase | null = null;

/** Get a database handle — opens the DB if not already open. */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Create tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      display_name TEXT,
      preferences_json TEXT NOT NULL DEFAULT '{"goals":[],"priorities":{}}',
      created_at INTEGER NOT NULL,
      last_scan_at INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      target_calories REAL NOT NULL,
      target_protein REAL NOT NULL,
      target_carbs REAL NOT NULL,
      target_fat REAL NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS meal_entries (
      id TEXT PRIMARY KEY,
      log_id TEXT NOT NULL,
      scan_id TEXT,
      food_name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL NOT NULL,
      carbs REAL NOT NULL,
      fat REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (log_id) REFERENCES daily_logs(id),
      FOREIGN KEY (scan_id) REFERENCES scans(id)
    );

    CREATE TABLE IF NOT EXISTS user_streaks (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
    CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);
    CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
    CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_meal_entries_log_id ON meal_entries(log_id);
    CREATE INDEX IF NOT EXISTS idx_meal_entries_timestamp ON meal_entries(timestamp);
    CREATE INDEX IF NOT EXISTS idx_meal_entries_scan_id ON meal_entries(scan_id);
    CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
  `);
  
  // Run cleanup on init
  await cleanupOldScans();
}

export async function cleanupOldScans(): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  
  const cutoffTime = Date.now() - (CLEANUP_DAYS * 24 * 60 * 60 * 1000);
  
  const result = await db.runAsync(
    'DELETE FROM scans WHERE created_at < ?',
    cutoffTime
  );
  
  console.log(`Cleaned up ${result.changes} old scans`);
  return result.changes;
}

// User Operations
export async function createUser(user: Partial<User>): Promise<User> {
  if (!db) throw new Error('Database not initialized');
  
  const id = user.id || generateId();
  const now = Date.now();
  
  const newUser: User = {
    id,
    email: user.email,
    displayName: user.displayName,
    preferences: user.preferences || { goals: [], priorities: {} },
    createdAt: now,
  };
  
  await db.runAsync(
    `INSERT INTO users (id, email, display_name, preferences_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    id,
    newUser.email || null,
    newUser.displayName || null,
    JSON.stringify(newUser.preferences),
    now
  );

  await db.runAsync(
    `INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
     VALUES (?, 0, 0, NULL)`,
    id
  );
  
  return newUser;
}

export async function getUser(id: string): Promise<User | null> {
  if (!db) throw new Error('Database not initialized');
  
  const row = await db.getFirstAsync<DBUser>(
    'SELECT * FROM users WHERE id = ?',
    id
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    email: row.email || undefined,
    displayName: row.display_name || undefined,
    preferences: JSON.parse(row.preferences_json),
    createdAt: row.created_at,
    lastScanAt: row.last_scan_at || undefined,
  };
}

export async function updateUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    'UPDATE users SET preferences_json = ? WHERE id = ?',
    JSON.stringify(preferences),
    userId
  );
}

export async function updateUserLastScan(userId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    'UPDATE users SET last_scan_at = ? WHERE id = ?',
    Date.now(),
    userId
  );
}

// Scan Operations
export async function saveScan(
  userId: string,
  imageUri: string,
  result: ScanResult
): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync(
    `INSERT INTO scans (id, user_id, image_uri, result_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    result.id,
    userId,
    imageUri,
    JSON.stringify(result),
    Date.now()
  );
  
  await updateUserLastScan(userId);
  await recordUserActivity(userId, getTodayDateString());
}

export async function getScanHistory(
  userId: string,
  limit: number = 50
): Promise<ScanResult[]> {
  if (!db) throw new Error('Database not initialized');
  
  const rows = await db.getAllAsync<DBScan>(
    'SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    userId,
    limit
  );
  
  return rows.map(row => JSON.parse(row.result_json));
}

export async function getScan(scanId: string): Promise<ScanResult | null> {
  if (!db) throw new Error('Database not initialized');
  
  const row = await db.getFirstAsync<DBScan>(
    'SELECT * FROM scans WHERE id = ?',
    scanId
  );
  
  if (!row) return null;
  return JSON.parse(row.result_json);
}

export async function deleteScan(scanId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');
  
  await db.runAsync('DELETE FROM scans WHERE id = ?', scanId);
}

export async function getStats(userId: string): Promise<{
  totalScans: number;
  avgCalories: number;
  avgGrade: string;
  topGoalMatch: number;
}> {
  if (!db) throw new Error('Database not initialized');
  
  const scans = await getScanHistory(userId, 100);
  
  if (scans.length === 0) {
    return { totalScans: 0, avgCalories: 0, avgGrade: '-', topGoalMatch: 0 };
  }
  
  const gradeToNum: Record<string, number> = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };
  const numToGrade = ['F', 'F', 'D', 'C', 'B', 'A', 'S'];
  
  const totalCalories = scans.reduce((sum, s) => sum + s.totalCalories, 0);
  const totalGradeNum = scans.reduce((sum, s) => sum + (gradeToNum[s.overallGrade] || 0), 0);
  const avgGradeNum = Math.round(totalGradeNum / scans.length);
  const topGoalMatch = Math.max(...scans.map(s => s.userGoalsMatch));
  
  return {
    totalScans: scans.length,
    avgCalories: Math.round(totalCalories / scans.length),
    avgGrade: numToGrade[avgGradeNum] || 'C',
    topGoalMatch,
  };
}

// Daily Log Operations
export async function getTodayLog(userId: string): Promise<DailyLog | null> {
  if (!db) throw new Error('Database not initialized');

  const today = getTodayDateString();
  const row = await db.getFirstAsync<DBDailyLog>(
    'SELECT * FROM daily_logs WHERE user_id = ? AND date = ?',
    userId,
    today
  );

  if (!row) return null;
  return mapDailyLog(row);
}

export async function getOrCreateTodayLog(userId: string): Promise<DailyLog> {
  const existing = await getTodayLog(userId);
  if (existing) return existing;

  const user = await getUser(userId);
  const targets: MacroTargets = {
    calories: user?.preferences.macroTargets?.calories ?? 0,
    protein: user?.preferences.macroTargets?.protein ?? 0,
    carbs: user?.preferences.macroTargets?.carbs ?? 0,
    fat: user?.preferences.macroTargets?.fat ?? 0,
  };

  try {
    return await createDailyLog(userId, targets);
  } catch (error) {
    const retry = await getTodayLog(userId);
    if (retry) return retry;
    throw error;
  }
}

export async function createDailyLog(userId: string, targets: MacroTargets): Promise<DailyLog> {
  if (!db) throw new Error('Database not initialized');

  const log: DailyLog = {
    id: generateId(),
    userId,
    date: getTodayDateString(),
    targetCalories: targets.calories,
    targetProtein: targets.protein,
    targetCarbs: targets.carbs,
    targetFat: targets.fat,
    createdAt: Date.now(),
  };

  await db.runAsync(
    `INSERT INTO daily_logs (
      id, user_id, date, target_calories, target_protein, target_carbs, target_fat, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    log.id,
    log.userId,
    log.date,
    log.targetCalories,
    log.targetProtein,
    log.targetCarbs,
    log.targetFat,
    log.createdAt
  );

  return log;
}

export async function addMealEntry(logId: string, meal: Omit<MealEntry, 'id'>): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT INTO meal_entries (
      id, log_id, scan_id, food_name, calories, protein, carbs, fat, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    generateId(),
    logId,
    meal.scanId || null,
    meal.foodName,
    meal.calories,
    meal.protein,
    meal.carbs,
    meal.fat,
    meal.timestamp
  );
}

export async function getTodayMeals(userId: string): Promise<MealEntry[]> {
  if (!db) throw new Error('Database not initialized');

  const todayLog = await getTodayLog(userId);
  if (!todayLog) return [];

  const rows = await db.getAllAsync<DBMealEntry>(
    'SELECT * FROM meal_entries WHERE log_id = ? ORDER BY timestamp DESC',
    todayLog.id
  );

  return rows.map(mapMealEntry);
}

export async function getMealsForDate(userId: string, date: string): Promise<RecentMeal[]> {
  if (!db) throw new Error('Database not initialized');

  const rows = await db.getAllAsync<{
    id: string;
    log_id: string;
    scan_id: string | null;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    timestamp: number;
    image_uri: string | null;
  }>(
    `SELECT
      me.id,
      me.log_id,
      me.scan_id,
      me.food_name,
      me.calories,
      me.protein,
      me.carbs,
      me.fat,
      me.timestamp,
      s.image_uri
     FROM meal_entries me
     INNER JOIN daily_logs dl ON me.log_id = dl.id
     LEFT JOIN scans s ON me.scan_id = s.id
     WHERE dl.user_id = ? AND dl.date = ?
     ORDER BY me.timestamp DESC`,
    userId,
    date
  );

  return rows.map((row) => ({
    id: row.id,
    logId: row.log_id,
    scanId: row.scan_id || undefined,
    foodName: row.food_name,
    calories: Number(row.calories),
    protein: Number(row.protein),
    carbs: Number(row.carbs),
    fat: Number(row.fat),
    timestamp: Number(row.timestamp),
    imageUri: row.image_uri || undefined,
  }));
}

export async function getMealDaysWithEntries(userId: string, days: number = 7): Promise<string[]> {
  if (!db) throw new Error('Database not initialized');

  const startDate = getDateStringDaysAgo(days - 1);
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT dl.date AS date
     FROM daily_logs dl
     INNER JOIN meal_entries me ON me.log_id = dl.id
     WHERE dl.user_id = ? AND dl.date >= ?
     ORDER BY dl.date ASC`,
    userId,
    startDate
  );

  return rows.map((row) => row.date);
}

export async function getWeeklyMacroSummary(userId: string, days: number = 7): Promise<DailyMacroSummary[]> {
  if (!db) throw new Error('Database not initialized');

  const startDate = getDateStringDaysAgo(days - 1);
  const rows = await db.getAllAsync<{
    date: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }>(
    `SELECT
      dl.date AS date,
      COALESCE(SUM(me.calories), 0) AS calories,
      COALESCE(SUM(me.protein), 0) AS protein,
      COALESCE(SUM(me.carbs), 0) AS carbs,
      COALESCE(SUM(me.fat), 0) AS fat
     FROM daily_logs dl
     LEFT JOIN meal_entries me ON me.log_id = dl.id
     WHERE dl.user_id = ? AND dl.date >= ?
     GROUP BY dl.date
     ORDER BY dl.date ASC`,
    userId,
    startDate
  );

  const byDate = new Map<string, DailyMacroSummary>();
  rows.forEach((row) => {
    byDate.set(row.date, {
      date: row.date,
      calories: Number(row.calories ?? 0),
      protein: Number(row.protein ?? 0),
      carbs: Number(row.carbs ?? 0),
      fat: Number(row.fat ?? 0),
    });
  });

  return getDateRange(days).map((date) => (
    byDate.get(date) || {
      date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  ));
}

export async function getMacroTotalsForDate(userId: string, date: string): Promise<MacroTotals> {
  if (!db) throw new Error('Database not initialized');

  const row = await db.getFirstAsync<{
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }>(
    `SELECT
      COALESCE(SUM(me.calories), 0) AS calories,
      COALESCE(SUM(me.protein), 0) AS protein,
      COALESCE(SUM(me.carbs), 0) AS carbs,
      COALESCE(SUM(me.fat), 0) AS fat
     FROM meal_entries me
     INNER JOIN daily_logs dl ON me.log_id = dl.id
     WHERE dl.user_id = ? AND dl.date = ?`,
    userId,
    date
  );

  return {
    calories: Number(row?.calories ?? 0),
    protein: Number(row?.protein ?? 0),
    carbs: Number(row?.carbs ?? 0),
    fat: Number(row?.fat ?? 0),
  };
}

export async function getTodayTotals(userId: string): Promise<MacroTotals> {
  return getMacroTotalsForDate(userId, getTodayDateString());
}

export async function getRemainingMacros(userId: string): Promise<MacroRemaining> {
  const log = await getOrCreateTodayLog(userId);
  const totals = await getTodayTotals(userId);

  return {
    calories: log.targetCalories - totals.calories,
    protein: log.targetProtein - totals.protein,
    carbs: log.targetCarbs - totals.carbs,
    fat: log.targetFat - totals.fat,
    caloriesPct: log.targetCalories > 0 ? (totals.calories / log.targetCalories) * 100 : 0,
    proteinPct: log.targetProtein > 0 ? (totals.protein / log.targetProtein) * 100 : 0,
    carbsPct: log.targetCarbs > 0 ? (totals.carbs / log.targetCarbs) * 100 : 0,
    fatPct: log.targetFat > 0 ? (totals.fat / log.targetFat) * 100 : 0,
  };
}

export async function deleteMealEntry(entryId: string): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync('DELETE FROM meal_entries WHERE id = ?', entryId);
}

export async function getUserStreak(userId: string): Promise<UserStreak> {
  if (!db) throw new Error('Database not initialized');

  await db.runAsync(
    `INSERT OR IGNORE INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
     VALUES (?, 0, 0, NULL)`,
    userId
  );

  const row = await db.getFirstAsync<DBUserStreak>(
    'SELECT * FROM user_streaks WHERE user_id = ?',
    userId
  );

  return {
    userId,
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    lastActiveDate: row?.last_active_date ?? null,
  };
}

export async function recordUserActivity(userId: string, date: string = getTodayDateString()): Promise<UserStreak> {
  if (!db) throw new Error('Database not initialized');

  const streak = await getUserStreak(userId);
  if (streak.lastActiveDate === date) {
    return streak;
  }

  const previousDate = streak.lastActiveDate;
  const isConsecutive = previousDate ? daysBetween(previousDate, date) === 1 : false;
  const currentStreak = isConsecutive ? streak.currentStreak + 1 : 1;
  const longestStreak = Math.max(streak.longestStreak, currentStreak);

  await db.runAsync(
    `UPDATE user_streaks
     SET current_streak = ?, longest_streak = ?, last_active_date = ?
     WHERE user_id = ?`,
    currentStreak,
    longestStreak,
    date,
    userId
  );

  return {
    userId,
    currentStreak,
    longestStreak,
    lastActiveDate: date,
  };
}

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function mapDailyLog(row: DBDailyLog): DailyLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    targetCalories: row.target_calories,
    targetProtein: row.target_protein,
    targetCarbs: row.target_carbs,
    targetFat: row.target_fat,
    createdAt: row.created_at,
  };
}

function mapMealEntry(row: DBMealEntry): MealEntry {
  return {
    id: row.id,
    logId: row.log_id,
    scanId: row.scan_id || undefined,
    foodName: row.food_name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    timestamp: row.timestamp,
  };
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateStringDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return formatDateKey(date);
}

function getDateRange(days: number): string[] {
  const range: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    range.push(getDateStringDaysAgo(i));
  }
  return range;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

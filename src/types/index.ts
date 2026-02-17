// BiteScan Types

export type HealthGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export type DietaryGoal =
  | 'protein'
  | 'low_calorie'
  | 'collagen'
  | 'fiber'
  | 'low_carb'
  | 'low_fat'
  | 'vitamins'
  | 'omega3'
  | 'antioxidants'
  | 'hydration';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface TasteProfile {
  likedFoods: string[];
  dislikedFoods: string[];
  cuisineAffinity: Record<string, number>;
}

export interface UserPreferences {
  goals: DietaryGoal[];
  priorities: Partial<Record<DietaryGoal, number>>; // 0-100 priority weight
  macroTargets?: MacroTargets;
  tasteProfile?: TasteProfile;
  useMetric?: boolean;
  darkMode?: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  cholesterol?: number; // mg
  vitamins?: Record<string, number>; // percentage of daily value
}

export interface MacroFitBreakdown {
  score: number;
  calorieImpactPct: number;
  proteinImpactPct: number;
  carbsImpactPct: number;
  fatImpactPct: number;
}

export interface TastePrediction {
  score: number;
  confidence: number;
  crowdScore: number;
}

export interface FoodItem {
  id: string;
  name: string;
  nameLocalized?: string; // Original language name
  cuisine?: string;
  portion: string; // "1 bowl", "2 pieces", etc.
  nutrition: NutritionInfo;
  grade: HealthGrade;
  gradeReason: string;
  confidence: number; // 0-100 AI confidence
  imageUri?: string;
  macroFit?: MacroFitBreakdown;
  taste?: TastePrediction;
}

export interface MealRecommendation {
  foodId: string;
  foodName: string;
  macroFitScore: number;
  tasteScore: number;
  combinedScore: number;
  reason: string;
}

export interface ScanResult {
  id: string;
  timestamp: number;
  imageUri: string;
  foods: FoodItem[];
  totalCalories: number;
  overallGrade: HealthGrade;
  recommendation: string;
  userGoalsMatch: number; // 0-100 how well it matches user goals
  mealRecommendations?: MealRecommendation[];
}

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  preferences: UserPreferences;
  createdAt: number;
  lastScanAt?: number;
}

export interface ScanHistory {
  id: string;
  userId: string;
  scanResult: ScanResult;
  savedAt: number;
}

// API Types
export interface AnalyzeFoodRequest {
  imageBase64: string;
  userPreferences: UserPreferences;
}

export interface AnalyzeFoodResponse {
  success: boolean;
  result?: ScanResult;
  error?: string;
}

// Daily tracking types
export interface DailyLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  createdAt: number;
}

export interface MealEntry {
  id: string;
  logId: string;
  scanId?: string; // nullable for manual entries
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
}

export interface RecentMeal extends MealEntry {
  imageUri?: string;
  date?: string;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroRemaining extends MacroTotals {
  caloriesPct: number; // percentage of target consumed
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

export interface DailyMacroSummary {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

import { FoodItem, MacroRemaining } from '../types';

export interface FitScore {
  overall: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  level: 'great' | 'good' | 'borderline' | 'over';
  bottleneck: 'calories' | 'protein' | 'carbs' | 'fat';
  tip: string;
}

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

const SCORE_WEIGHTS: Record<MacroKey, number> = {
  calories: 0.4,
  protein: 0.4,
  carbs: 0.1,
  fat: 0.1,
};

const MACROS: MacroKey[] = ['calories', 'protein', 'carbs', 'fat'];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const safePercentOfRemaining = (foodAmount: number, remainingAmount: number): number => {
  if (remainingAmount <= 0) return foodAmount > 0 ? 999 : 0;
  return (foodAmount / remainingAmount) * 100;
};

const percentToScore = (percent: number): number => {
  if (percent <= 100) return 100;
  return clamp(100 - (percent - 100), 0, 100);
};

const getLevel = (highestPct: number): FitScore['level'] => {
  if (highestPct < 80) return 'great';
  if (highestPct <= 100) return 'good';
  if (highestPct <= 120) return 'borderline';
  return 'over';
};

export function generateFitTip(
  food: FoodItem,
  remaining: MacroRemaining,
  bottleneck: string,
  level: string
): string {
  const tightMacro = bottleneck as MacroKey;

  if (level === 'great') {
    if (tightMacro === 'protein') {
      return `${food.name} is an excellent fit and supports your protein target efficiently.`;
    }
    return `${food.name} is an excellent fit with plenty of room left for later meals.`;
  }

  if (level === 'good') {
    if (tightMacro === 'calories') {
      return `Good fit overall. Calories are the tightest limit, so keep your next meal lighter.`;
    }
    return `Good fit overall. Watch ${tightMacro} in your next meal to stay balanced.`;
  }

  if (level === 'borderline') {
    if (tightMacro === 'carbs') {
      return `Borderline on carbs. Pair this with lower-carb foods for the rest of the day.`;
    }
    if (tightMacro === 'fat') {
      return `Borderline on fat. Favor lean protein and lower-fat choices next.`;
    }
    return `Borderline fit due to ${tightMacro}. A smaller portion would improve fit.`;
  }

  if (tightMacro === 'protein' && remaining.protein <= 0) {
    return `This likely pushes protein over your remaining target. Consider a smaller serving.`;
  }

  return `This likely puts you over on ${tightMacro}. Consider saving it for another meal.`;
}

export function calculateMacroFit(food: FoodItem, remaining: MacroRemaining): FitScore {
  const percentages: Record<MacroKey, number> = {
    calories: safePercentOfRemaining(food.nutrition.calories, remaining.calories),
    protein: safePercentOfRemaining(food.nutrition.protein, remaining.protein),
    carbs: safePercentOfRemaining(food.nutrition.carbs, remaining.carbs),
    fat: safePercentOfRemaining(food.nutrition.fat, remaining.fat),
  };

  let bottleneck: MacroKey = 'calories';
  let highestPct = percentages.calories;

  for (const macro of MACROS) {
    if (percentages[macro] > highestPct) {
      highestPct = percentages[macro];
      bottleneck = macro;
    }
  }

  const macroScores: Record<MacroKey, number> = {
    calories: percentToScore(percentages.calories),
    protein: percentToScore(percentages.protein),
    carbs: percentToScore(percentages.carbs),
    fat: percentToScore(percentages.fat),
  };

  const overall = Math.round(
    clamp(
      MACROS.reduce((sum, macro) => sum + macroScores[macro] * SCORE_WEIGHTS[macro], 0),
      0,
      100
    )
  );

  const level = getLevel(highestPct);

  return {
    overall,
    calories: Math.round(percentages.calories),
    protein: Math.round(percentages.protein),
    carbs: Math.round(percentages.carbs),
    fat: Math.round(percentages.fat),
    level,
    bottleneck,
    tip: generateFitTip(food, remaining, bottleneck, level),
  };
}

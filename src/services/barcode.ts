import { MacroTotals } from '../types';

const BARCODE_LOOKUP_TIMEOUT_MS = 10_000;
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2/product';

export interface BarcodeLookupResult {
  barcode: string;
  foodName: string;
  brandName?: string;
  nutrition: MacroTotals;
  source: 'open_food_facts';
}

type OpenFoodFactsNutriments = {
  [key: string]: number | string | undefined;
  'energy-kcal_100g'?: number;
  energy_kcal_100g?: number;
  'energy-kcal_serving'?: number;
  energy_kcal_serving?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
};

type OpenFoodFactsProduct = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: OpenFoodFactsNutriments;
};

type OpenFoodFactsResponse = {
  code?: string;
  status?: number;
  product?: OpenFoodFactsProduct;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const roundMacro = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 10) / 10);
};

const parseServingMultiplier = (servingSize?: string): number => {
  if (!servingSize) return 1;
  const grams = /(\d+(?:[.,]\d+)?)\s?(g|gram|grams)\b/i.exec(servingSize);
  if (!grams) return 1;
  const value = Number(grams[1].replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(0.25, Math.min(5, value / 100));
};

const deriveNutritionFromNutriments = (nutriments: OpenFoodFactsNutriments, servingSize?: string): MacroTotals => {
  const servingMultiplier = parseServingMultiplier(servingSize);
  const caloriesPerServing =
    toNumber(nutriments['energy-kcal_serving']) ??
    toNumber(nutriments.energy_kcal_serving) ??
    ((toNumber(nutriments['energy-kcal_100g']) ?? toNumber(nutriments.energy_kcal_100g) ?? 0) *
      servingMultiplier);
  const proteinPerServing =
    toNumber(nutriments.proteins_serving) ??
    ((toNumber(nutriments.proteins_100g) ?? 0) * servingMultiplier);
  const carbsPerServing =
    toNumber(nutriments.carbohydrates_serving) ??
    ((toNumber(nutriments.carbohydrates_100g) ?? 0) * servingMultiplier);
  const fatPerServing =
    toNumber(nutriments.fat_serving) ??
    ((toNumber(nutriments.fat_100g) ?? 0) * servingMultiplier);

  let calories = caloriesPerServing ?? 0;
  const protein = roundMacro(proteinPerServing ?? 0);
  const carbs = roundMacro(carbsPerServing ?? 0);
  const fat = roundMacro(fatPerServing ?? 0);

  if (calories <= 0) {
    calories = protein * 4 + carbs * 4 + fat * 9;
  }

  return {
    calories: Math.max(0, Math.round(calories)),
    protein,
    carbs,
    fat,
  };
};

const withTimeout = async <T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BARCODE_LOOKUP_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function lookupBarcodeFood(barcode: string): Promise<BarcodeLookupResult | null> {
  const cleanBarcode = barcode.trim();
  if (!/^\d{8,14}$/.test(cleanBarcode)) return null;

  const response = await withTimeout((signal) =>
    fetch(`${OPEN_FOOD_FACTS_API}/${cleanBarcode}.json`, { signal })
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as OpenFoodFactsResponse;
  if (payload.status !== 1 || !payload.product) return null;

  const product = payload.product;
  const foodName = (product.product_name || product.generic_name || '').trim();
  if (!foodName) return null;

  const nutrition = deriveNutritionFromNutriments(product.nutriments ?? {}, product.serving_size);
  if (nutrition.calories <= 0) return null;

  return {
    barcode: cleanBarcode,
    foodName,
    brandName: product.brands?.split(',')[0]?.trim() || undefined,
    nutrition,
    source: 'open_food_facts',
  };
}

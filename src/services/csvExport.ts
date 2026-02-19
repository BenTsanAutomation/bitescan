import * as FileSystem from 'expo-file-system/legacy';
import { RecentMeal } from '../types';

const escapeCsv = (value: string | number): string => {
  const normalized = String(value ?? '');
  if (!/[",\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const buildMealsCsv = (meals: RecentMeal[]): string => {
  const header = ['Date', 'Time', 'Meal', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Source'];
  const rows = meals.map((meal) => [
    meal.date ?? formatDate(meal.timestamp),
    formatTime(meal.timestamp),
    meal.foodName,
    Math.round(meal.calories),
    Math.round(meal.protein * 10) / 10,
    Math.round(meal.carbs * 10) / 10,
    Math.round(meal.fat * 10) / 10,
    meal.scanId ? 'Scan' : 'Manual',
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
};

export const writeMealsCsvFile = async (csv: string, dateStamp: string): Promise<string> => {
  const directory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!directory) throw new Error('No writable directory available on this device.');

  const fileUri = `${directory}bitescan-meal-history-${dateStamp}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
};

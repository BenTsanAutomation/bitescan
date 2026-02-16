// BiteScan Theme - Fresh Greens + Subway Yellows

export const colors = {
  // Primary - Fresh Greens
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // Main green
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Secondary - Subway Yellows
  secondary: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',  // Main yellow
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
  
  // Neutrals
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Backgrounds
  background: {
    primary: '#ffffff',
    secondary: '#f0fdf4',  // Light green tint
    card: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text
  text: {
    primary: '#171717',
    secondary: '#525252',
    tertiary: '#a3a3a3',
    inverse: '#ffffff',
  },
  
  // Grade Colors (S-tier system)
  grade: {
    S: '#22c55e',  // Bright green - Perfect
    A: '#86efac',  // Light green - Excellent
    B: '#facc15',  // Yellow - Good
    C: '#f59e0b',  // Orange - Okay
    D: '#f97316',  // Dark orange - Poor
    F: '#ef4444',  // Red - Bad
  },
};

export const gradients = {
  primary: ['#22c55e', '#16a34a'],
  secondary: ['#facc15', '#eab308'],
  card: ['#ffffff', '#f0fdf4'],
  hero: ['#22c55e', '#facc15'],
};

export default colors;

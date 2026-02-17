// BiteScan Theme - Fresh Greens + Subway Yellows

const palette = {
  primary: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
  },
  secondary: {
    50: "#fefce8",
    100: "#fef9c3",
    200: "#fef08a",
    300: "#fde047",
    400: "#facc15",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#854d0e",
    900: "#713f12",
  },
  neutral: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
  },
  grade: {
    S: "#22c55e",
    A: "#86efac",
    B: "#facc15",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444",
  },
} as const;

export const lightColors = {
  ...palette,
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  background: {
    primary: "#ffffff",
    secondary: "#f0fdf4",
    card: "#ffffff",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  text: {
    primary: "#171717",
    secondary: "#525252",
    tertiary: "#a3a3a3",
    inverse: "#ffffff",
  },
} as const;

export const darkColors = {
  ...palette,
  success: "#34d399",
  warning: "#fbbf24",
  error: "#f87171",
  info: "#60a5fa",
  background: {
    primary: "#0b1a12",
    secondary: "#102317",
    card: "#163321",
    overlay: "rgba(0, 0, 0, 0.6)",
  },
  text: {
    primary: "#f0fdf4",
    secondary: "#cce7d6",
    tertiary: "#84b09a",
    inverse: "#0b1a12",
  },
} as const;

export type ThemeColors = typeof lightColors | typeof darkColors;

export const gradients = {
  primary: ["#22c55e", "#16a34a"],
  secondary: ["#facc15", "#eab308"],
  card: ["#ffffff", "#f0fdf4"],
  hero: ["#22c55e", "#facc15"],
};

// Backwards-compatible default for modules that still import `colors`.
export const colors: ThemeColors = lightColors;

export default colors;

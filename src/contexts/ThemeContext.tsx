import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { darkColors, lightColors, ThemeColors } from "../theme";
import { useAuth } from "./AuthContext";

interface ThemeContextValue {
  isDarkMode: boolean;
  colors: ThemeColors;
  setDarkMode: (enabled: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences, updatePreferences } = useAuth();
  const [localDarkMode, setLocalDarkMode] = useState<boolean>(
    !!preferences.darkMode
  );

  useEffect(() => {
    setLocalDarkMode(!!preferences.darkMode);
  }, [preferences.darkMode]);

  const setDarkMode = useCallback(
    async (enabled: boolean) => {
      setLocalDarkMode(enabled);
      try {
        await updatePreferences({
          ...preferences,
          darkMode: enabled,
        });
      } catch (error) {
        setLocalDarkMode(!!preferences.darkMode);
        throw error;
      }
    },
    [preferences, updatePreferences]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDarkMode: localDarkMode,
      colors: localDarkMode ? darkColors : lightColors,
      setDarkMode,
    }),
    [localDarkMode, setDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
};

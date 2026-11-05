// src/theme/ThemeProvider.tsx

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AppState, useColorScheme, View, StyleSheet } from 'react-native';
import { LightPalette, ThemePalette, getAppColors } from './colors';
import { Typography } from './typography';
import { Dimensions } from './dimensions';
import { isDarkModeScheduled, useThemeStore, ThemeMode } from '../store/themeStore';

/**
 * KidsStream & KiddoTube Theme Provider
 * Supports:
 * - Dynamic Light / Dark mode via user selection in Menu
 * - System appearance following
 * - Automatic background & typography adaptation
 */

export interface KidsTheme {
  isNightMode: boolean;
  isDark: boolean;
  themeMode: ThemeMode;
  colors: ThemePalette;
  typography: typeof Typography;
  dimensions: typeof Dimensions;
}

interface ThemeContextValue {
  theme: KidsTheme;
  colors: ThemePalette;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  isNightMode?: boolean;
  followSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  isNightMode,
  followSystem = true,
}) => {
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const appearanceScheduleEnabled = useThemeStore((s) => s.appearanceScheduleEnabled);
  const darkModeStart = useThemeStore((s) => s.darkModeStart);
  const lightModeStart = useThemeStore((s) => s.lightModeStart);
  const [scheduleNow, setScheduleNow] = useState(() => new Date());

  useEffect(() => {
    const refreshSchedule = () => setScheduleNow(new Date());
    const timer = setInterval(refreshSchedule, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshSchedule();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const isDark = useMemo(() => {
    // 1. Force lock night mode
    if (isNightMode !== undefined) {
      return isNightMode;
    }
    if (appearanceScheduleEnabled) {
      return isDarkModeScheduled(scheduleNow, darkModeStart, lightModeStart);
    }
    // 2. User explicit selection from Menu
    if (themeMode === 'dark') {
      return true;
    }
    if (themeMode === 'light') {
      return false;
    }
    // 3. System mode
    if (followSystem && systemColorScheme === 'dark') {
      return true;
    }
    return false;
  }, [
    isNightMode,
    appearanceScheduleEnabled,
    darkModeStart,
    lightModeStart,
    scheduleNow,
    themeMode,
    followSystem,
    systemColorScheme,
  ]);

  const colors = useMemo(() => getAppColors(isDark), [isDark]);

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark');
  };

  const theme: KidsTheme = useMemo(
    () => ({
      isNightMode: isDark,
      isDark,
      themeMode,
      colors,
      typography: Typography,
      dimensions: Dimensions,
    }),
    [isDark, themeMode, colors]
  );

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, themeMode, setThemeMode, toggleTheme }}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export const useKidsTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if rendered outside provider during standalone tests
    const defaultDark = false;
    const defaultColors = LightPalette;
    return {
      theme: {
        isNightMode: defaultDark,
        isDark: defaultDark,
        themeMode: 'light',
        colors: defaultColors,
        typography: Typography,
        dimensions: Dimensions,
      },
      colors: defaultColors,
      isDark: defaultDark,
      themeMode: 'light',
      setThemeMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};

export const useColors = (): ThemePalette => {
  const { colors } = useKidsTheme();
  return colors;
};

export const useTypography = () => {
  const { theme } = useKidsTheme();
  return theme.typography;
};

export const useDimensions = () => {
  const { theme } = useKidsTheme();
  return theme.dimensions;
};
/**
 * Theme context — resolves the active palette from the user's setting and the
 * OS color scheme, exposes it via `useTheme()`.
 *
 * Usage in screens:
 *   const { colors, isDark } = useTheme();
 *   // ...colors.bg, colors.textPrimary, etc.
 *
 * The palette returned has the same shape as the legacy `Colors` constant in
 * `src/constants/theme.ts`, so existing styles can be migrated by swapping
 * `Colors.x` for `colors.x` without renaming keys.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type ThemePalette } from '../constants/theme';
import { useStore } from '../store/useStore';
import type { ThemeMode } from '../types';

interface ThemeValue {
  colors: ThemePalette;
  isDark: boolean;
  /** The user's stored preference (system | light | dark). */
  preference: ThemeMode;
}

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  isDark: false,
  preference: 'system',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // `useColorScheme()` re-renders when the OS theme changes, so 'system' mode
  // updates live without a relaunch.
  const systemScheme = useColorScheme();
  const preference = useStore((s) => s.settings.theme);

  const value = useMemo<ThemeValue>(() => {
    const resolved: 'light' | 'dark' =
      preference === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : preference;
    return {
      colors: resolved === 'dark' ? darkColors : lightColors,
      isDark: resolved === 'dark',
      preference,
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
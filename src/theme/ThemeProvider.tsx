import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppTheme,
  darkTheme,
  lightTheme,
  radius,
  shadows,
  spacing,
  typography,
} from './tokens';

export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';

/**
 * The app currently ships in light mode only, and the Auto / Light / Dark
 * pickers are hidden. Everything behind them still works: the preference is
 * still saved, and setting this to true brings dark mode and the pickers back.
 */
export const THEME_SWITCHING_ENABLED = false;

const STORAGE_KEY = '@personal_gym/theme_preference';

interface ThemeContextValue {
  theme: AppTheme;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (next: ThemePreference) => void;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('LIGHT');

  // Restore the saved preference before the first paint settles, so the app
  // does not flash the wrong theme.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'LIGHT' || saved === 'DARK' || saved === 'SYSTEM') {
          setPreferenceState(saved);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const isDark =
    THEME_SWITCHING_ENABLED &&
    (preference === 'DARK' || (preference === 'SYSTEM' && systemScheme !== 'light'));

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: isDark ? darkTheme : lightTheme,
      preference,
      isDark,
      setPreference,
      spacing,
      radius,
      typography,
      shadows,
    }),
    [isDark, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx;
}

/**
 * Re-themes a subtree, e.g. the content of a navy hero panel, so every
 * component inside picks colours that read on that surface.
 */
export function ThemeScope({ theme, children }: { theme: AppTheme; children: React.ReactNode }) {
  const parent = useTheme();
  const value = useMemo(
    () => ({ ...parent, theme, isDark: theme.mode === 'dark' }),
    [parent, theme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

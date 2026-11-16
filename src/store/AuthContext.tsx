import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getErrorMessage, setUnauthorizedHandler, tokenStore } from '@/services/api';
import { authApi, profileApi, settingsApi } from '@/services/endpoints';
import type { Profile, UserSettings } from '@/types/models';
import { useTheme } from '@/theme/ThemeProvider';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any | null;
  profile: Profile | null;
  settings: UserSettings | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  setProfile: (profile: Profile) => void;
  setSettings: (settings: UserSettings) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const { setPreference } = useTheme();

  const clearSession = useCallback(async () => {
    await tokenStore.clear();
    setIsAuthenticated(false);
    setUser(null);
    setProfile(null);
    setSettings(null);
  }, []);

  // When a refresh fails, the API layer calls this so the app returns to the
  // login screen instead of sitting on a broken session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
  }, [clearSession]);

  const loadSessionData = useCallback(async () => {
    const [me, prof, sett] = await Promise.all([
      authApi.me().catch(() => null),
      profileApi.get().catch(() => null),
      settingsApi.get().catch(() => null),
    ]);

    if (me) setUser(me);
    if (prof) setProfile(prof);
    if (sett) {
      setSettings(sett);
      setPreference(sett.theme);
    }
  }, [setPreference]);

  // Restore a saved session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.getAccess();
        if (!token) {
          setIsLoading(false);
          return;
        }
        const me = await authApi.me();
        setUser(me);
        setIsAuthenticated(true);
        await loadSessionData();
      } catch {
        await clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [clearSession, loadSessionData]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await authApi.login(email.trim().toLowerCase(), password);
        await tokenStore.save(result.accessToken, result.refreshToken);
        setUser(result.user);
        setIsAuthenticated(true);
        await loadSessionData();
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Could not sign in'));
      }
    },
    [loadSessionData],
  );

  const signOut = useCallback(async () => {
    const refreshToken = await tokenStore.getRefresh();
    // Revoking server-side is best-effort; the local session clears regardless.
    await authApi.logout(refreshToken || undefined).catch(() => undefined);
    // Signed-out phones should not keep nagging about meals.
    await clearReminders().catch(() => undefined);
    await clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const prof = await profileApi.get().catch(() => null);
    if (prof) setProfile(prof);
  }, []);

  const refreshSettings = useCallback(async () => {
    const sett = await settingsApi.get().catch(() => null);
    if (sett) {
      setSettings(sett);
      setPreference(sett.theme);
    }
  }, [setPreference]);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      profile,
      settings,
      signIn,
      signOut,
      refreshProfile,
      refreshSettings,
      setProfile,
      setSettings,
    }),
    [
      isLoading,
      isAuthenticated,
      user,
      profile,
      settings,
      signIn,
      signOut,
      refreshProfile,
      refreshSettings,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}

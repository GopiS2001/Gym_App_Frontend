import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** localhost or a private LAN address (10.x, 192.168.x, 172.16-31.x). */
function isLocalAddress(url: string) {
  return /\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url);
}

/**
 * Resolves the API base URL.
 *
 * A LAN IP written into .env goes stale every time the PC's Wi-Fi address
 * changes, so during development the address is taken from wherever the app
 * itself was loaded from — that is always the PC's current address:
 *  - web: the browser's own host (localhost:8081 → localhost:3000)
 *  - phone: the Expo dev server host the phone connected to
 * EXPO_PUBLIC_API_URL wins only when it names a real server (a domain or
 * public IP), e.g. a deployed backend.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && !isLocalAddress(explicit)) return explicit;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3000/api/v1`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants.expoGoConfig as any)?.debuggerHost ||
    (Constants.manifest2 as any)?.extra?.expoGo?.developer?.host;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000/api/v1`;
    }
  }

  // Android emulators reach the host machine through 10.0.2.2.
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api/v1';
  return explicit || 'http://localhost:3000/api/v1';
}

export const API_BASE_URL = resolveBaseUrl();

/** Origin of the API, e.g. `http://10.238.10.2:3000`. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

/**
 * Points a stored media URL at whichever host the API is actually on.
 *
 * Uploads are saved with an absolute URL built from the server's own
 * `PUBLIC_BASE_URL`. If that said `localhost`, the row is unusable from a
 * phone — `localhost` there is the phone itself. Rewriting the origin at
 * render time fixes existing rows without touching the database, and keeps
 * working when the machine's LAN address changes.
 *
 * Only `/uploads/...` paths are rewritten, so an external image or video URL
 * someone pastes in is left alone.
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  // A freshly picked local file, or an inline image — leave as-is.
  if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('content:')) {
    return url;
  }

  const absolute = /^https?:\/\/[^/]+(\/uploads\/.*)$/.exec(url);
  if (absolute) return `${API_ORIGIN}${absolute[1]}`;

  if (url.startsWith('/uploads/')) return `${API_ORIGIN}${url}`;

  return url;
}

const ACCESS_KEY = 'pg_access_token';
const REFRESH_KEY = 'pg_refresh_token';

/**
 * Token storage.
 *
 * SecureStore is the keychain-backed store used on iOS and Android. It has no
 * web implementation, and a device can also refuse it, so AsyncStorage is used
 * as a fallback — otherwise a failed write would silently sign the user out on
 * the very next request.
 */
const secureStoreUsable = Platform.OS !== 'web';

async function readToken(key: string): Promise<string | null> {
  if (secureStoreUsable) {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value !== null) return value;
    } catch {
      // fall through to AsyncStorage
    }
  }
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeToken(key: string, value: string): Promise<void> {
  if (secureStoreUsable) {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      // fall through to AsyncStorage
    }
  }
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Nothing else to try; the session will simply not survive a restart.
  }
}

async function removeToken(key: string): Promise<void> {
  if (secureStoreUsable) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  }
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const tokenStore = {
  getAccess: () => readToken(ACCESS_KEY),
  getRefresh: () => readToken(REFRESH_KEY),
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([
      writeToken(ACCESS_KEY, accessToken),
      writeToken(REFRESH_KEY, refreshToken),
    ]);
  },
  async clear() {
    await Promise.all([removeToken(ACCESS_KEY), removeToken(REFRESH_KEY)]);
  },
};

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp?: string;
}

// --- server wake-up ---------------------------------------------------------
// The backend runs on Render's free plan, which sleeps after 15 idle minutes
// and needs ~50s to start again. While it starts, requests fail fast or hang,
// so `wakeServer` polls /health until the server answers (up to ~90s). One
// shared promise covers every caller, so a burst of requests pings once.
const WAKE_LIMIT_MS = 90_000;
let wakePromise: Promise<boolean> | null = null;

async function pingHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${API_ORIGIN}/health`, { timeout: 15_000 });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * Resolves true once the server is up, false if it never answered.
 * `onWaiting` fires when the first quick ping fails, so the UI can say
 * "waking up" instead of looking frozen.
 */
let wakeIsSlow = false;
const waitingListeners = new Set<() => void>();

export function wakeServer(onWaiting?: () => void): Promise<boolean> {
  if (onWaiting) {
    // Joining a wake-up that is already slow: tell the caller right away.
    if (wakePromise && wakeIsSlow) onWaiting();
    else waitingListeners.add(onWaiting);
  }
  if (!wakePromise) {
    wakePromise = (async () => {
      const started = Date.now();
      if (await pingHealth()) return true;
      wakeIsSlow = true;
      waitingListeners.forEach((fn) => fn());
      while (Date.now() - started < WAKE_LIMIT_MS) {
        await new Promise((r) => setTimeout(r, 3_000));
        if (await pingHealth()) return true;
      }
      return false;
    })().finally(() => {
      wakePromise = null;
      wakeIsSlow = false;
      waitingListeners.clear();
    });
  }
  return wakePromise;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- refresh handling -------------------------------------------------------
// A single in-flight refresh is shared by every request that got a 401, so a
// burst of parallel calls does not each trigger their own rotation.
let refreshPromise: Promise<string | null> | null = null;
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return null;

  try {
    const res = await axios.post<ApiEnvelope<any>>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 },
    );
    const { accessToken, refreshToken: newRefresh } = res.data.data;
    await tokenStore.save(accessToken, newRefresh);
    return accessToken;
  } catch {
    await tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
      _woke?: boolean;
    };

    const isAuthCall = original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh');

    // No response at all: most likely the server is asleep. Wake it and retry
    // once. Only for reads and login, so a write that may have reached the
    // server is never sent twice.
    const method = (original?.method || 'get').toLowerCase();
    const safeToRetry = method === 'get' || original?.url?.includes('/auth/login');
    if (!error.response && original && !original._woke && safeToRetry) {
      original._woke = true;
      if (await wakeServer()) return api(original);
    }

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

/** Turns any failure into a sentence worth showing on screen. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const err = error as AxiosError<any>;

  if (err?.response?.data) {
    const data = err.response.data;
    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors[0];
    }
    if (typeof data.message === 'string') return data.message;
  }

  if (err?.code === 'ECONNABORTED') {
    return 'The server took too long to answer. Please try again in a moment.';
  }
  if (err?.message === 'Network Error') {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  if (err?.message) return err.message;

  return fallback;
}

/** Unwraps the API envelope so callers deal only with `data`. */
export async function request<T>(
  promise: Promise<{ data: ApiEnvelope<T> }>,
): Promise<T> {
  const res = await promise;
  return res.data.data;
}

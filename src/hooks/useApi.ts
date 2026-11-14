import { useCallback, useEffect, useRef, useState } from 'react';
// expo-router 58 uses its own navigation core (standard-navigation), so focus
// hooks must come from expo-router — importing them from @react-navigation
// resolves to a second, unconnected navigation tree.
import { useFocusEffect } from 'expo-router';
import { getErrorMessage } from '@/services/api';

interface UseApiOptions {
  /** Re-fetch every time the screen regains focus. */
  refetchOnFocus?: boolean;
  /** Skip the initial fetch until `enabled` turns true. */
  enabled?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>;
  setData: (value: T | null) => void;
}

/**
 * Small data-fetching hook.
 *
 * `loading` is only true for the first load, so pull-to-refresh does not blank
 * out a screen that already has content.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: any[] = [],
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { refetchOnFocus = false, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);

  const mounted = useRef(true);
  const hasLoaded = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) return;

      if (isRefresh) setRefreshing(true);
      else if (!hasLoaded.current) setLoading(true);

      try {
        const result = await fetcherRef.current();
        if (!mounted.current) return;
        setData(result);
        setError(null);
        hasLoaded.current = true;
      } catch (e) {
        if (!mounted.current) return;
        setError(getErrorMessage(e));
      } finally {
        if (!mounted.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus && hasLoaded.current) {
        run(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetchOnFocus, ...deps]),
  );

  return {
    data,
    error,
    loading,
    refreshing,
    refetch: () => run(false),
    refresh: () => run(true),
    setData,
  };
}

/** Wraps a mutating call with loading + error state and a success callback. */
export function useMutation<TArgs extends any[], TResult>(
  mutator: (...args: TArgs) => Promise<TResult>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  const mutate = useCallback(async (...args: TArgs): Promise<TResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutatorRef.current(...args);
      return result;
    } catch (e) {
      setError(getErrorMessage(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error, setError };
}

/** Debounces a value — used for search inputs so each keystroke is not a call. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

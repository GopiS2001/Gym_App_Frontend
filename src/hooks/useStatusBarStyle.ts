import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';

/**
 * Sets the status bar icons while this screen is focused: `light` over the
 * navy headers, `dark` over the light dashboard. Focus-based, so returning to
 * a screen restores its own style.
 */
export function useStatusBarStyle(style: 'light' | 'dark') {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
    }, [style]),
  );
}

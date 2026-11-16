import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import {
  getPermission,
  NOTIFICATIONS_SUPPORTED,
  requestPermission,
  type PermissionState,
} from '@/services/notifications';
import { refreshReminderSchedule } from '@/hooks/useReminderSync';

/**
 * Notification permission, re-checked when returning to the app (the user
 * may have just changed it in system settings).
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState | null>(null);

  const check = useCallback(async () => {
    if (!NOTIFICATIONS_SUPPORTED) return;
    const p = await getPermission().catch(() => null);
    setPermission(p);
  }, []);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, [check]);

  /** Asks for permission, or opens system settings when asking is no longer allowed. */
  const enable = useCallback(async () => {
    if (permission && permission.status === 'denied' && !permission.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    const p = await requestPermission();
    setPermission(p);
    if (p.status === 'granted') await refreshReminderSchedule({ force: true });
  }, [permission]);

  return { permission, enable, check, supported: NOTIFICATIONS_SUPPORTED };
}

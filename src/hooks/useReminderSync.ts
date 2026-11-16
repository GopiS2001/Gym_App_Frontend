import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { remindersApi } from '@/services/endpoints';
import {
  ACTION_SNOOZE,
  initNotifications,
  reminderDataOf,
  snooze,
  syncReminders,
  type SyncResult,
} from '@/services/notifications';
import { todayIso } from '@/utils/format';

let lastSync = 0;
let inFlight: Promise<SyncResult | null> | null = null;

/**
 * Fetches the saved reminders and rebuilds the phone's schedule from them.
 * Screens call this with `force` after a reminder or the workout schedule
 * changes; app start and returning to the app call it without.
 */
export function refreshReminderSchedule({ force = false } = {}): Promise<SyncResult | null> {
  if (!force && Date.now() - lastSync < 30_000) return Promise.resolve(null);
  if (inFlight && !force) return inFlight;
  const run = (async () => {
    try {
      const { items } = await remindersApi.list();
      const result = await syncReminders(items, { force });
      lastSync = Date.now();
      return result;
    } catch {
      // Offline or signed out: keep whatever is already scheduled.
      return null;
    } finally {
      inFlight = null;
    }
  })();
  inFlight = run;
  return run;
}

/**
 * Keeps reminders scheduled while signed in, and handles taps on them:
 * - tapping a reminder (or "Log meal") opens Food Intake for that meal
 * - "Snooze" shows it again after the reminder's snooze length
 */
export function useReminderSync(enabled: boolean) {
  const router = useRouter();
  const handled = useRef(new Set<string>());
  const lastResponse = Notifications.useLastNotificationResponse();

  // Schedule on sign-in and whenever the app comes back to the foreground
  // (which also catches timezone and clock changes made while away).
  useEffect(() => {
    if (!enabled) return;
    initNotifications().catch(() => undefined);
    refreshReminderSchedule({ force: true });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshReminderSchedule();
    });
    return () => sub.remove();
  }, [enabled]);

  // Covers both a cold start from a notification and taps while running.
  useEffect(() => {
    if (!enabled || !lastResponse) return;
    const data = reminderDataOf(lastResponse);
    if (!data) return;

    const key = `${lastResponse.notification.request.identifier}:${lastResponse.notification.date}:${lastResponse.actionIdentifier}`;
    if (handled.current.has(key)) return;
    handled.current.add(key);

    Notifications.dismissNotificationAsync(lastResponse.notification.request.identifier).catch(
      () => undefined,
    );

    if (lastResponse.actionIdentifier === ACTION_SNOOZE) {
      // If the app was closed, Expo reports the tap only on the next launch;
      // a snooze discovered hours later would arrive at a pointless time.
      const ageMs = Date.now() - lastResponse.notification.date;
      if (ageMs < 2 * 60 * 60 * 1000) snooze(data).catch(() => undefined);
      return;
    }

    if (data.mealType) {
      router.push({
        pathname: '/nutrition/add',
        params: { mealType: data.mealType, date: todayIso() },
      });
    } else {
      router.push('/(tabs)/nutrition');
    }
  }, [enabled, lastResponse, router]);
}

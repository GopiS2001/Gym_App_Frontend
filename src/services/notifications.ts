/**
 * Meal reminder notifications.
 *
 * Reminders are saved on the server; the phone schedules them as local
 * notifications, so nothing has to be sent from the server at reminder time.
 * `syncReminders` is the single place that touches the schedule: it rebuilds
 * the phone's notifications from the saved reminders, which also fixes
 * duplicates, edits, deletions, timezone changes and app reinstalls.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealReminder, WeekDayName } from '@/types/models';

/** Scheduled local notifications only exist in the Android / iOS app. */
export const NOTIFICATIONS_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

export const CHANNEL_ID = 'meal-reminders';
export const CATEGORY_ID = 'meal-reminder';
export const ACTION_SNOOZE = 'SNOOZE';
export const ACTION_LOG = 'LOG_MEAL';

const KIND_REMINDER = 'meal-reminder';
const KIND_SNOOZE = 'meal-reminder-snooze';
const STORE_KEY = 'meal-reminders.scheduled.v1';

/** iOS keeps at most 64 pending local notifications per app. */
const IOS_PENDING_LIMIT = 64;

/** Expo weekly triggers count weekdays from 1 = Sunday to 7 = Saturday. */
const EXPO_WEEKDAY: Record<WeekDayName, number> = {
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
  SATURDAY: 7,
};

export interface ReminderData {
  kind: typeof KIND_REMINDER | typeof KIND_SNOOZE;
  reminderId: string;
  reminderType: string;
  mealType: string | null;
  snoozeMinutes: number;
  title: string;
  body: string;
}

// Show reminders even when the app is open.
if (NOTIFICATIONS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let initialised: Promise<void> | null = null;

/** Android channel and the Snooze / Log meal buttons. Safe to call often. */
export function initNotifications(): Promise<void> {
  if (!initialised) {
    initialised = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Meal reminders',
          description: 'Meal, water and pre/post-workout reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
          lightColor: '#3ECF8E',
        });
      }
      await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
        {
          identifier: ACTION_SNOOZE,
          buttonTitle: 'Snooze',
          options: { opensAppToForeground: false },
        },
        {
          identifier: ACTION_LOG,
          buttonTitle: 'Log meal',
          options: { opensAppToForeground: true },
        },
      ]);
    })().catch((e) => {
      initialised = null;
      throw e;
    });
  }
  return initialised;
}

// ------------------------------------------------------------ permission

export type PermissionState = {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
};

export async function getPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  return {
    status: p.granted ? 'granted' : (p.status as PermissionState['status']),
    canAskAgain: p.canAskAgain,
  };
}

export async function requestPermission(): Promise<PermissionState> {
  await initNotifications();
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return {
    status: p.granted ? 'granted' : (p.status as PermissionState['status']),
    canAskAgain: p.canAskAgain,
  };
}

// --------------------------------------------------------------- syncing

export interface SyncResult {
  scheduled: number;
  /** Reminders that could not all be scheduled because of the iOS limit. */
  skipped: number;
  permission: PermissionState['status'];
  changed: boolean;
}

type Stored = { signature: string; ids: Record<string, string[]> };

function timezoneKey(): string {
  let zone = '';
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    // Older JS engines: the offset alone is enough to notice a change.
  }
  return `${zone}|${new Date().getTimezoneOffset()}`;
}

/** Everything that affects the schedule; equal signatures mean no work. */
function signatureFor(reminders: MealReminder[]): string {
  const parts = reminders
    .filter((r) => r.isEnabled)
    .map(
      (r) =>
        `${r.id}@${r.schedule.time}/${r.schedule.days.join('.')}/${r.title}/${r.message}/${r.snoozeMinutes}`,
    )
    .sort();
  return `${timezoneKey()}#${parts.join(';')}`;
}

async function readStored(): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/**
 * Makes the phone's scheduled notifications match `reminders` exactly:
 * one weekly notification per enabled reminder per day it fires.
 * Skips the work when nothing changed and every scheduled id is still there.
 */
export async function syncReminders(
  reminders: MealReminder[],
  { force = false } = {},
): Promise<SyncResult> {
  await initNotifications();
  const permission = (await getPermission()).status;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const ours = pending.filter(
    (n) => (n.content.data as Partial<ReminderData> | undefined)?.kind === KIND_REMINDER,
  );

  if (permission !== 'granted') {
    // Nothing should fire without permission; clear anything left behind.
    await Promise.all(
      ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    await AsyncStorage.removeItem(STORE_KEY).catch(() => undefined);
    return { scheduled: 0, skipped: 0, permission, changed: ours.length > 0 };
  }

  const signature = signatureFor(reminders);
  const stored = await readStored();
  const pendingIds = new Set(ours.map((n) => n.identifier));
  const storedIds = stored ? Object.values(stored.ids).flat() : [];
  const unchanged =
    !force &&
    stored?.signature === signature &&
    storedIds.length === ours.length &&
    storedIds.every((id) => pendingIds.has(id));
  if (unchanged) {
    return { scheduled: storedIds.length, skipped: 0, permission, changed: false };
  }

  // Rebuild: cancel every reminder notification we own, then schedule fresh.
  await Promise.all(
    ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const enabled = reminders.filter((r) => r.isEnabled);
  const otherPending = pending.length - ours.length;
  let budget =
    Platform.OS === 'ios' ? Math.max(0, IOS_PENDING_LIMIT - otherPending - 4) : Infinity;
  const ids: Record<string, string[]> = {};
  let skipped = 0;

  for (const r of enabled) {
    const [hour, minute] = r.schedule.time.split(':').map(Number);
    const days = r.schedule.days.length ? r.schedule.days : (Object.keys(EXPO_WEEKDAY) as WeekDayName[]);
    if (days.length > budget) {
      skipped += 1;
      continue;
    }
    const body = r.message || r.typeLabel;
    const data: ReminderData = {
      kind: KIND_REMINDER,
      reminderId: r.id,
      reminderType: r.reminderType,
      mealType: r.mealType,
      snoozeMinutes: r.snoozeMinutes,
      title: r.title,
      body,
    };
    ids[r.id] = [];
    for (const day of days) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body,
          data: data as unknown as Record<string, unknown>,
          sound: 'default',
          categoryIdentifier: CATEGORY_ID,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: EXPO_WEEKDAY[day],
          hour,
          minute,
          channelId: CHANNEL_ID,
        },
      });
      ids[r.id].push(id);
    }
    budget -= days.length;
  }

  await AsyncStorage.setItem(STORE_KEY, JSON.stringify({ signature, ids } satisfies Stored)).catch(
    () => undefined,
  );
  const scheduled = Object.values(ids).flat().length;
  return { scheduled, skipped, permission, changed: true };
}

/** Removes every reminder notification, e.g. on sign-out. */
export async function clearReminders(): Promise<void> {
  if (!NOTIFICATIONS_SUPPORTED) return;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => {
        const kind = (n.content.data as Partial<ReminderData> | undefined)?.kind;
        return kind === KIND_REMINDER || kind === KIND_SNOOZE;
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  await AsyncStorage.removeItem(STORE_KEY).catch(() => undefined);
}

/** A one-off notification a few seconds from now, to check the phone shows them. */
export async function sendTestNotification(): Promise<void> {
  await initNotifications();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test reminder',
      body: 'Meal reminders are working on this phone.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

/** Shows the same reminder again after its snooze length. */
export async function snooze(data: ReminderData): Promise<void> {
  const minutes = Math.max(1, data.snoozeMinutes || 10);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: data.title,
      body: data.body,
      data: { ...data, kind: KIND_SNOOZE } as unknown as Record<string, unknown>,
      sound: 'default',
      categoryIdentifier: CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: CHANNEL_ID,
    },
  });
}

export function reminderDataOf(
  response: Notifications.NotificationResponse,
): ReminderData | null {
  const data = response.notification.request.content.data as Partial<ReminderData> | undefined;
  if (data?.kind === KIND_REMINDER || data?.kind === KIND_SNOOZE) return data as ReminderData;
  return null;
}

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { remindersApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';
import { NotificationBanner } from '@/components/NotificationBanner';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { refreshReminderSchedule } from '@/hooks/useReminderSync';
import { sendTestNotification, type SyncResult } from '@/services/notifications';
import type { WeekDayName } from '@/types/models';
import { describeDays, formatClock, parseClock, WEEK_DAYS } from '@/utils/nutrition';

const LEAD_OPTIONS = [30, 45, 60, 90];
const DELAY_OPTIONS = [0, 15, 30, 60];
const DURATION_OPTIONS = [45, 60, 75, 90];

/** Notification permission, workout schedule, and checks for reminders. */
export default function ReminderSettingsScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const { permission, enable, supported } = useNotificationPermission();

  const schedule = useApi(() => remindersApi.workoutSchedule(), []);
  const [time, setTime] = useState('');
  const [followPlan, setFollowPlan] = useState(true);
  const [days, setDays] = useState<WeekDayName[]>([]);
  const [duration, setDuration] = useState(60);
  const [lead, setLead] = useState(60);
  const [delay, setDelay] = useState(30);
  const [timeError, setTimeError] = useState<string>();
  const [savedNote, setSavedNote] = useState<string>();
  const [sync, setSync] = useState<SyncResult | null>(null);

  useEffect(() => {
    const s = schedule.data;
    if (!s) return;
    setTime(s.workoutTime || '');
    setFollowPlan(!s.workoutDays);
    setDays(s.workoutDays || s.effectiveDays);
    setDuration(s.workoutDurationMin);
    setLead(s.preWorkoutLeadMin);
    setDelay(s.postWorkoutDelayMin);
  }, [schedule.data]);

  const save = useMutation(async () => {
    const result = await remindersApi.updateWorkoutSchedule({
      workoutTime: time.trim() ? parseClock(time) : null,
      workoutDays: followPlan ? null : days,
      workoutDurationMin: duration,
      preWorkoutLeadMin: lead,
      postWorkoutDelayMin: delay,
    });
    // Pre/post-workout reminders move with the schedule.
    setSync(await refreshReminderSchedule({ force: true }));
    return result;
  });

  const resync = useMutation(async () => {
    const r = await refreshReminderSchedule({ force: true });
    setSync(r);
    return r ?? true;
  });

  const handleSave = async () => {
    if (time.trim() && !parseClock(time)) {
      setTimeError('Use a time like 06:00 or 18:30');
      return;
    }
    if (!followPlan && !days.length) {
      setTimeError('Pick at least one workout day');
      return;
    }
    setTimeError(undefined);
    const result = await save.mutate();
    if (result) {
      setSavedNote('Saved. Linked reminders now follow this schedule.');
      schedule.refresh();
    }
  };

  const toggleDay = (d: WeekDayName) =>
    setDays((cur) => WEEK_DAYS.filter((x) => (x === d ? !cur.includes(d) : cur.includes(x))));

  if (schedule.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  const s = schedule.data;
  const parsed = parseClock(time);

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Reminder Settings" subtitle="Notifications and workout schedule" showBack />

      {/* Permission */}
      <NotificationBanner permission={permission} supported={supported} onEnable={enable} />
      {supported && permission?.status === 'granted' && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} style={{ marginRight: spacing.sm }} />
            <Txt variant="bodyStrong" style={{ flex: 1 }}>
              Notifications are on
            </Txt>
          </View>
          {sync && (
            <Txt variant="small" color={theme.textSecondary} style={{ marginBottom: spacing.md }}>
              {sync.scheduled} notification{sync.scheduled === 1 ? '' : 's'} scheduled on this phone
              {sync.skipped ? ` · ${sync.skipped} reminder(s) skipped: this phone allows only 64 at a time` : ''}.
            </Txt>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Re-sync now"
              variant="secondary"
              size="sm"
              icon="refresh"
              loading={resync.loading}
              onPress={() => resync.mutate()}
              style={{ flex: 1 }}
            />
            <Button
              title="Send a test"
              variant="secondary"
              size="sm"
              icon="notifications-outline"
              onPress={() => sendTestNotification()}
              style={{ flex: 1 }}
            />
          </View>
        </GlassCard>
      )}

      {/* Workout schedule */}
      <GlassCard variant="strong">
        <Txt variant="h4" style={{ marginBottom: 4 }}>
          Workout schedule
        </Txt>
        <Txt variant="small" color={theme.textSecondary} style={{ marginBottom: spacing.base }}>
          Pre- and post-workout reminders are timed from this, so they follow your real training
          days instead of a fixed clock time.
        </Txt>

        <Field
          label="WORKOUT START (24-HOUR)"
          value={time}
          onChangeText={(t) => {
            setTime(t);
            setTimeError(undefined);
            setSavedNote(undefined);
          }}
          placeholder="e.g. 18:00"
          keyboardType="numbers-and-punctuation"
          icon="time-outline"
          suffix={parsed ? formatClock(parsed) : undefined}
          error={timeError}
        />

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          WORKOUT DAYS
        </Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <Chip
            label="Follow my workout plan"
            selected={followPlan}
            onPress={() => setFollowPlan(true)}
          />
          <Chip label="Pick days" selected={!followPlan} onPress={() => setFollowPlan(false)} />
        </View>
        {followPlan ? (
          <Txt variant="small" color={theme.textSecondary} style={{ marginBottom: spacing.base }}>
            {s?.daysSource === 'PLAN'
              ? `From your active plan: ${describeDays(s.effectiveDays)}`
              : 'No active workout plan, so every day is used.'}
          </Txt>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
            {WEEK_DAYS.map((d) => (
              <Chip
                key={d}
                label={d.slice(0, 1) + d.slice(1, 3).toLowerCase()}
                selected={days.includes(d)}
                onPress={() => toggleDay(d)}
              />
            ))}
          </View>
        )}

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          WORKOUT LENGTH
        </Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          {DURATION_OPTIONS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={duration === m} onPress={() => setDuration(m)} />
          ))}
        </View>

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          PRE-WORKOUT REMINDER · MINUTES BEFORE
        </Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          {LEAD_OPTIONS.map((m) => (
            <Chip key={m} label={`${m}`} selected={lead === m} onPress={() => setLead(m)} />
          ))}
        </View>

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          POST-WORKOUT REMINDER · MINUTES AFTER IT ENDS
        </Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          {DELAY_OPTIONS.map((m) => (
            <Chip key={m} label={`${m}`} selected={delay === m} onPress={() => setDelay(m)} />
          ))}
        </View>

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}
        {savedNote && (
          <Txt variant="small" color={theme.success} style={{ marginBottom: spacing.md }}>
            {savedNote}
          </Txt>
        )}

        <Button
          title="Save schedule"
          icon="checkmark"
          fullWidth
          size="lg"
          loading={save.loading}
          onPress={handleSave}
        />
      </GlassCard>

      <Button
        title="Back to reminders"
        variant="ghost"
        fullWidth
        onPress={() => router.back()}
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

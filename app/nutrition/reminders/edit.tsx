import React, { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { remindersApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { refreshReminderSchedule } from '@/hooks/useReminderSync';
import type { ReminderType, WeekDayName, WorkoutLink } from '@/types/models';
import { describeDays, formatClock, parseClock, WEEK_DAYS } from '@/utils/nutrition';

const TYPES: { value: ReminderType; label: string; time: string; link?: WorkoutLink }[] = [
  { value: 'PRE_WORKOUT', label: 'Pre-Workout', time: '05:30', link: 'BEFORE' },
  { value: 'BREAKFAST', label: 'Breakfast', time: '07:30' },
  { value: 'POST_WORKOUT', label: 'Post-Workout', time: '07:00', link: 'AFTER' },
  { value: 'LUNCH', label: 'Lunch', time: '13:00' },
  { value: 'SNACK', label: 'Evening Snacks', time: '16:30' },
  { value: 'DINNER', label: 'Dinner', time: '20:00' },
  { value: 'BEFORE_BED', label: 'Before Bed', time: '22:00' },
  { value: 'WATER', label: 'Water', time: '11:00' },
  { value: 'CUSTOM', label: 'Custom', time: '09:00' },
];

const SNOOZE_OPTIONS = [5, 10, 15, 30];

const LINKS: { value: WorkoutLink; label: string }[] = [
  { value: 'NONE', label: 'Fixed time' },
  { value: 'BEFORE', label: 'Before workout' },
  { value: 'AFTER', label: 'After workout' },
];

/** Create or edit a meal reminder. */
export default function EditReminderScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [type, setType] = useState<ReminderType>('BREAKFAST');
  const [title, setTitle] = useState('Breakfast');
  const [titleTouched, setTitleTouched] = useState(false);
  const [time, setTime] = useState('07:30');
  const [days, setDays] = useState<WeekDayName[]>([]);
  const [message, setMessage] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [link, setLink] = useState<WorkoutLink>('NONE');
  const [snooze, setSnooze] = useState(10);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const existing = useApi(() => (id ? remindersApi.get(id) : Promise.resolve(null)), [id], {
    enabled: isEdit,
  });
  const meta = useApi(() => remindersApi.list(), []);

  useEffect(() => {
    const r = existing.data;
    if (!r) return;
    setType(r.reminderType);
    setTitle(r.title);
    setTitleTouched(true);
    setTime(r.reminderTime);
    setDays(r.repeatDays);
    setMessage(r.message || '');
    setEnabled(r.isEnabled);
    setLink(r.workoutLink);
    setSnooze(r.snoozeMinutes);
  }, [existing.data]);

  const pickType = (t: (typeof TYPES)[number]) => {
    setType(t.value);
    if (!titleTouched) setTitle(t.label);
    if (!isEdit) {
      setTime(t.time);
      setLink(t.link || 'NONE');
    }
  };

  // An empty list means every day, so tapping a day then turns just that one off.
  const toggleDay = (d: WeekDayName) =>
    setDays((cur) => {
      const all = cur.length ? cur : WEEK_DAYS;
      const next = all.includes(d) ? all.filter((x) => x !== d) : [...all, d];
      const ordered = WEEK_DAYS.filter((x) => next.includes(x));
      if (!ordered.length) return cur; // keep at least one day
      return ordered.length === 7 ? [] : ordered;
    });

  const save = useMutation(async () => {
    const payload = {
      title: title.trim(),
      reminderType: type,
      reminderTime: parseClock(time)!,
      repeatDays: days.length === 7 ? [] : days,
      message: message.trim(),
      isEnabled: enabled,
      workoutLink: link,
      snoozeMinutes: snooze,
    };
    const saved = isEdit
      ? await remindersApi.update(id!, payload)
      : await remindersApi.create(payload);
    await refreshReminderSchedule({ force: true });
    return saved;
  });

  const remove = useMutation(async () => {
    await remindersApi.remove(id!);
    await refreshReminderSchedule({ force: true });
    return true;
  });

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Give the reminder a title';
    if (!parseClock(time)) next.time = 'Use a time like 07:30 or 19:00';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (await save.mutate()) router.back();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete reminder',
      message: `Delete the "${title}" reminder?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (ok && (await remove.mutate())) router.back();
  };

  if (isEdit && existing.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  const w = meta.data?.workoutSchedule;
  const defaultMessage = meta.data?.types.find((t) => t.value === type)?.defaultMessage;
  const linked = link !== 'NONE';
  const linkedPreview =
    linked && w?.workoutTime
      ? `${link === 'BEFORE' ? w.preWorkoutLeadMin : w.workoutDurationMin + w.postWorkoutDelayMin} min ${link === 'BEFORE' ? 'before' : 'after the start of'} your ${formatClock(w.workoutTime)} workout · ${describeDays(w.effectiveDays)}`
      : null;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title={isEdit ? 'Edit Reminder' : 'New Reminder'} showBack />

      <GlassCard variant="strong">
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          TYPE
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
          {TYPES.map((t) => (
            <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => pickType(t)} />
          ))}
        </View>

        <Field
          label="TITLE *"
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            setTitleTouched(true);
            setErrors((p) => ({ ...p, title: undefined }));
          }}
          error={errors.title}
        />

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          WHEN
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
          {LINKS.map((l) => (
            <Chip key={l.value} label={l.label} selected={link === l.value} onPress={() => setLink(l.value)} />
          ))}
        </View>

        {linked && (
          <View style={{ marginBottom: spacing.base }}>
            <Txt variant="small" color={theme.textSecondary}>
              {linkedPreview ||
                'Follows your workout schedule once you set a workout time. Until then it uses the time below.'}
            </Txt>
            <Button
              title="Workout schedule"
              variant="ghost"
              size="sm"
              icon="barbell-outline"
              onPress={() => router.push('/nutrition/reminders/settings')}
              style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
            />
          </View>
        )}

        {(!linked || !w?.workoutTime) && (
          <>
            <Field
              label={linked ? 'FALLBACK TIME (24-HOUR)' : 'TIME (24-HOUR) *'}
              value={time}
              onChangeText={(t) => {
                setTime(t);
                setErrors((p) => ({ ...p, time: undefined }));
              }}
              placeholder="07:30"
              keyboardType="default"
              icon="time-outline"
              suffix={parseClock(time) ? formatClock(parseClock(time)) : undefined}
              error={errors.time}
            />

            <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
              REPEAT · {describeDays(days)}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
              {WEEK_DAYS.map((d) => (
                <Chip
                  key={d}
                  label={d.slice(0, 1) + d.slice(1, 3).toLowerCase()}
                  selected={days.length === 0 || days.includes(d)}
                  onPress={() => toggleDay(d)}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
              <Chip label="Every day" selected={days.length === 0} onPress={() => setDays([])} />
              <Chip
                label="Weekdays"
                onPress={() => setDays(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])}
              />
              <Chip label="Weekends" onPress={() => setDays(['SATURDAY', 'SUNDAY'])} />
            </View>
          </>
        )}

        <Field
          label="MESSAGE"
          value={message}
          onChangeText={setMessage}
          placeholder={defaultMessage || 'What the notification says'}
          multiline
        />

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          SNOOZE FOR
        </Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          {SNOOZE_OPTIONS.map((m) => (
            <Chip key={m} label={`${m} min`} selected={snooze === m} onPress={() => setSnooze(m)} />
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.base }}>
          <Txt variant="bodyStrong">Reminder on</Txt>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title={isEdit ? 'Save changes' : 'Create reminder'}
          icon="checkmark"
          fullWidth
          size="lg"
          loading={save.loading}
          onPress={handleSave}
        />

        {isEdit && (
          <View style={{ marginTop: spacing.md }}>
            <Button
              title="Delete reminder"
              variant="danger"
              icon="trash-outline"
              fullWidth
              loading={remove.loading}
              onPress={handleDelete}
            />
            {remove.error && (
              <Txt variant="small" color={theme.danger} style={{ marginTop: spacing.md }}>
                {remove.error}
              </Txt>
            )}
          </View>
        )}
      </GlassCard>
    </Screen>
  );
}

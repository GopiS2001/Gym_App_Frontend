import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { sleepApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Field,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { DateField } from '@/components/DateField';
import { BarChart } from '@/components/charts';
import { formatDate, formatRelativeDate, formatTime, todayIso } from '@/utils/format';

const QUALITIES = ['POOR', 'FAIR', 'GOOD', 'EXCELLENT'];

export default function LogSleepScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [date, setDate] = useState(todayIso());
  const [bedTime, setBedTime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const history = useApi(() => sleepApi.list({ limit: 20 }), [], { refetchOnFocus: true });
  const summary = useApi(() => sleepApi.summary(7), [], { refetchOnFocus: true });

  /**
   * Builds the two timestamps. A wake time at or before the bed time means the
   * person went to sleep the previous evening, so the start shifts back a day.
   */
  const buildTimes = () => {
    const [bedH, bedM] = bedTime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);

    const wake = new Date(`${date}T00:00:00`);
    wake.setHours(wakeH, wakeM, 0, 0);

    const bed = new Date(`${date}T00:00:00`);
    bed.setHours(bedH, bedM, 0, 0);
    if (bed.getTime() >= wake.getTime()) {
      bed.setDate(bed.getDate() - 1);
    }

    return { bed, wake };
  };

  const save = useMutation(() => {
    const { bed, wake } = buildTimes();
    return sleepApi.create({
      sleepStart: bed.toISOString(),
      sleepEnd: wake.toISOString(),
      sleepQuality: quality,
      loggedDate: date,
      notes: notes.trim() || undefined,
    });
  });

  const handleSave = async () => {
    // The pickers guarantee the format; only emptiness is still possible.
    const nextErrors: Record<string, string> = {};
    if (!date) nextErrors.date = 'Choose the wake-up date';
    if (!bedTime) nextErrors.bedTime = 'Choose a time';
    if (!wakeTime) nextErrors.wakeTime = 'Choose a time';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await save.mutate();
    if (result) {
      setNotes('');
      history.refresh();
      summary.refresh();
    }
  };

  const remove = (id: string) => {
    confirm({
      title: 'Delete entry',
      message: 'Remove this sleep record?',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await sleepApi.remove(id).catch(() => undefined);
      history.refresh();
      summary.refresh();
    });
  };

  const { bed, wake } = buildTimes();
  const previewMinutes = Math.max(0, Math.round((wake.getTime() - bed.getTime()) / 60000));

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Sleep" subtitle="Recovery is half the training" showBack />

      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <DateField
          label="WAKE-UP DATE"
          value={date}
          onChange={setDate}
          icon="calendar-outline"
          maximumDate={new Date()}
          error={errors.date}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <DateField
            label="WENT TO BED"
            value={bedTime}
            onChange={setBedTime}
            mode="time"
            icon="moon-outline"
            error={errors.bedTime}
            style={{ flex: 1 }}
          />
          <DateField
            label="WOKE UP"
            value={wakeTime}
            onChange={setWakeTime}
            mode="time"
            icon="sunny-outline"
            error={errors.wakeTime}
            style={{ flex: 1 }}
          />
        </View>

        <View
          style={{
            alignItems: 'center',
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            backgroundColor: theme.sleepSoft,
            marginBottom: spacing.base,
          }}
        >
          <Txt variant="caption" color={theme.textTertiary}>
            TOTAL SLEEP
          </Txt>
          <Txt variant="h2" color={theme.sleep}>
            {Math.floor(previewMinutes / 60)}h {previewMinutes % 60}m
          </Txt>
        </View>

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          QUALITY
        </Txt>
        <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
          {QUALITIES.map((q) => (
            <Chip
              key={q}
              label={q.charAt(0) + q.slice(1).toLowerCase()}
              selected={quality === q}
              color={theme.sleep}
              onPress={() => setQuality(q)}
            />
          ))}
        </View>

        <Field
          label="NOTES"
          value={notes}
          onChangeText={setNotes}
          placeholder="Woke up twice, room was warm…"
          multiline
        />

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title="Save sleep"
          icon="checkmark"
          fullWidth
          size="lg"
          loading={save.loading}
          onPress={handleSave}
        />
      </GlassCard>

      {summary.data && summary.data.nightsRecorded > 0 && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.base,
            }}
          >
            <Txt variant="h4">Last 7 Nights</Txt>
            <Txt variant="bodyStrong" color={theme.sleep}>
              {summary.data.averageHours}h avg
            </Txt>
          </View>

          <BarChart
            height={84}
            color={theme.sleep}
            highlightColor={theme.sleep}
            data={summary.data.points.map((p, i) => ({
              label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][
                new Date(`${p.date}T00:00:00.000Z`).getUTCDay()
              ],
              value: p.durationHours,
              highlight: i === summary.data!.points.length - 1,
            }))}
          />
        </GlassCard>
      )}

      <SectionHeader title="History" />

      {history.loading ? (
        <LoadingState />
      ) : !history.data?.items.length ? (
        <GlassCard>
          <EmptyState icon="moon-outline" title="No sleep recorded" />
        </GlassCard>
      ) : (
        history.data.items.map((log) => (
          <GlassCard key={log.id} style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.sleepSoft,
                }}
              >
                <Ionicons name="moon" size={18} color={theme.sleep} />
              </View>

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt variant="bodyStrong">{log.durationLabel}</Txt>
                  {log.sleepQuality && (
                    <Badge label={log.sleepQuality} color={theme.sleep} size="sm" />
                  )}
                </View>
                <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                  {formatRelativeDate(log.loggedDate)} · {formatTime(log.sleepStart)} →{' '}
                  {formatTime(log.sleepEnd)}
                </Txt>
              </View>

              <Pressable onPress={() => remove(log.id)} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={17} color={theme.textTertiary} />
              </Pressable>
            </View>
          </GlassCard>
        ))
      )}
    </Screen>
  );
}

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { progressApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Button,
  EmptyState,
  Field,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { DateField } from '@/components/DateField';
import { formatDate, formatRelativeDate, todayIso } from '@/utils/format';

export default function LogWeightScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [weightKg, setWeightKg] = useState('');
  const [recordedDate, setRecordedDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const history = useApi(
    () => progressApi.weightHistory({ limit: 30, sortOrder: 'desc' }),
    [],
    { refetchOnFocus: true },
  );

  const save = useMutation(() =>
    progressApi.addWeight({
      weightKg: parseFloat(weightKg),
      recordedDate,
      notes: notes.trim() || undefined,
    }),
  );

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    const value = parseFloat(weightKg);
    if (Number.isNaN(value)) nextErrors.weightKg = 'Enter your weight';
    else if (value < 20 || value > 500) nextErrors.weightKg = 'Enter a weight between 20 and 500 kg';
    if (!recordedDate) nextErrors.recordedDate = 'Choose a date';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await save.mutate();
    if (result) {
      setWeightKg('');
      setNotes('');
      history.refresh();
    }
  };

  const remove = (id: string) => {
    confirm({
      title: 'Delete entry',
      message: 'Remove this weight record?',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await progressApi.removeWeight(id).catch(() => undefined);
      history.refresh();
    });
  };

  const summary = history.data?.summary;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Log Weight" subtitle="One entry per day" showBack />

      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <Field
          label="WEIGHT"
          value={weightKg}
          onChangeText={(t) => {
            setWeightKg(t);
            setErrors((p) => ({ ...p, weightKg: undefined as any }));
          }}
          keyboardType="decimal-pad"
          placeholder="72.5"
          suffix="kg"
          icon="scale-outline"
          error={errors.weightKg}
        />

        {/* quick nudges around the last recorded weight */}
        {summary?.currentWeightKg != null && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
            {[-1, -0.5, 0, 0.5, 1].map((delta) => {
              const value = (summary.currentWeightKg! + delta).toFixed(1);
              return (
                <Pressable
                  key={delta}
                  onPress={() => setWeightKg(value)}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: spacing.sm + 1,
                    borderRadius: radius.sm,
                    alignItems: 'center',
                    backgroundColor: theme.surfaceMuted,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Txt variant="caption" color={theme.textSecondary}>
                    {value}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
        )}

        <DateField
          label="DATE"
          value={recordedDate}
          onChange={setRecordedDate}
          icon="calendar-outline"
          maximumDate={new Date()}
          error={errors.recordedDate}
        />

        <Field
          label="NOTES"
          value={notes}
          onChangeText={setNotes}
          placeholder="Morning, after waking up…"
          multiline
        />

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title="Save weight"
          icon="checkmark"
          fullWidth
          size="lg"
          loading={save.loading}
          onPress={handleSave}
        />
      </GlassCard>

      {summary && (
        <GlassCard variant="subtle" style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row' }}>
            <Stat label="Start" value={summary.startingWeightKg?.toFixed(1) ?? '--'} />
            <Stat label="Current" value={summary.currentWeightKg?.toFixed(1) ?? '--'} />
            <Stat label="Target" value={summary.targetWeightKg?.toFixed(1) ?? '--'} />
            <Stat
              label="Change"
              value={
                summary.totalChangeKg != null
                  ? `${summary.totalChangeKg >= 0 ? '+' : ''}${summary.totalChangeKg.toFixed(1)}`
                  : '--'
              }
            />
          </View>
        </GlassCard>
      )}

      <SectionHeader title="Recent Entries" />

      {history.loading ? (
        <LoadingState />
      ) : !history.data?.items.length ? (
        <GlassCard>
          <EmptyState icon="scale-outline" title="No entries yet" />
        </GlassCard>
      ) : (
        history.data.items.map((log, index) => {
          const previous = history.data!.items[index + 1];
          const delta = previous ? log.weightKg - previous.weightKg : null;

          return (
            <GlassCard key={log.id} style={{ marginBottom: spacing.base }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{log.weightKg.toFixed(1)} kg</Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {formatRelativeDate(log.recordedDate)} · {formatDate(log.recordedDate, 'medium')}
                  </Txt>
                  {log.notes ? (
                    <Txt variant="caption" color={theme.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>
                      {log.notes}
                    </Txt>
                  ) : null}
                </View>

                {delta !== null && delta !== 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: spacing.md }}>
                    <Ionicons
                      name={delta > 0 ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color={delta > 0 ? theme.primary : theme.hydration}
                    />
                    <Txt
                      variant="caption"
                      color={delta > 0 ? theme.primary : theme.hydration}
                      style={{ marginLeft: 2 }}
                    >
                      {Math.abs(delta).toFixed(1)}
                    </Txt>
                  </View>
                )}

                <Pressable onPress={() => remove(log.id)} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={17} color={theme.textTertiary} />
                </Pressable>
              </View>
            </GlassCard>
          );
        })
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="bodyStrong">{value}</Txt>
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

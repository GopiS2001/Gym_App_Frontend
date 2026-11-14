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
  ErrorState,
  Field,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import { DateField } from '@/components/DateField';
import { formatDate, formatRelativeDate, todayIso } from '@/utils/format';

const FIELDS: { key: string; label: string; unit: string }[] = [
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'waistCm', label: 'Waist', unit: 'cm' },
  { key: 'hipsCm', label: 'Hips', unit: 'cm' },
  { key: 'shouldersCm', label: 'Shoulders', unit: 'cm' },
  { key: 'neckCm', label: 'Neck', unit: 'cm' },
  { key: 'leftArmCm', label: 'Left Arm', unit: 'cm' },
  { key: 'rightArmCm', label: 'Right Arm', unit: 'cm' },
  { key: 'leftThighCm', label: 'Left Thigh', unit: 'cm' },
  { key: 'rightThighCm', label: 'Right Thigh', unit: 'cm' },
  { key: 'leftCalfCm', label: 'Left Calf', unit: 'cm' },
  { key: 'rightCalfCm', label: 'Right Calf', unit: 'cm' },
  { key: 'bodyFatPercentage', label: 'Body Fat', unit: '%' },
];

export default function MeasurementsScreen() {
  const { confirm, notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>({});
  const [recordedDate, setRecordedDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const history = useApi(
    () => progressApi.measurements({ limit: 30, sortOrder: 'desc' }),
    [],
    { refetchOnFocus: true },
  );

  const save = useMutation(async () => {
    const payload: any = { recordedDate, notes: notes.trim() || undefined };
    for (const field of FIELDS) {
      const raw = values[field.key];
      if (raw !== undefined && raw !== '') {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) payload[field.key] = parsed;
      }
    }
    // The API upserts by date, so adding and editing use the same call.
    return editingId
      ? progressApi.updateMeasurement(editingId, payload)
      : progressApi.addMeasurement(payload);
  });

  const handleSave = async () => {
    if (!recordedDate) {
      setDateError('Choose a date');
      return;
    }
    setDateError(null);

    const hasValue = FIELDS.some((f) => values[f.key] && values[f.key] !== '');
    if (!hasValue) {
      notify({
        title: 'Nothing to save',
        message: 'Fill in at least one measurement.',
        tone: 'info',
      });
      return;
    }

    const result = await save.mutate();
    if (result) {
      setValues({});
      setNotes('');
      setEditingId(null);
      history.refresh();
    }
  };

  const startEdit = (entry: any) => {
    const next: Record<string, string> = {};
    for (const field of FIELDS) {
      const value = entry[field.key];
      if (value !== null && value !== undefined) next[field.key] = String(value);
    }
    setValues(next);
    setRecordedDate(entry.recordedDate.slice(0, 10));
    setNotes(entry.notes || '');
    setEditingId(entry.id);
  };

  const remove = (id: string) => {
    confirm({
      title: 'Delete entry',
      message: 'Remove this measurement record?',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await progressApi.removeMeasurement(id).catch(() => undefined);
      if (editingId === id) {
        setEditingId(null);
        setValues({});
      }
      history.refresh();
    });
  };

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title="Measurements"
        subtitle={editingId ? 'Editing an existing entry' : 'Record your body measurements'}
        showBack
        right={
          editingId ? (
            <Pressable
              onPress={() => {
                setEditingId(null);
                setValues({});
                setNotes('');
                setRecordedDate(todayIso());
              }}
              hitSlop={8}
            >
              <Txt variant="caption" color={theme.primary}>
                New entry
              </Txt>
            </Pressable>
          ) : undefined
        }
      />

      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <DateField
          label="DATE"
          value={recordedDate}
          onChange={setRecordedDate}
          icon="calendar-outline"
          maximumDate={new Date()}
          error={dateError || undefined}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {FIELDS.map((field) => (
            <View key={field.key} style={{ width: '47%' }}>
              <Field
                label={field.label.toUpperCase()}
                value={values[field.key] || ''}
                onChangeText={(t) => setValues((p) => ({ ...p, [field.key]: t }))}
                keyboardType="decimal-pad"
                placeholder="—"
                suffix={field.unit}
              />
            </View>
          ))}
        </View>

        <Field
          label="NOTES"
          value={notes}
          onChangeText={setNotes}
          placeholder="Measured in the morning, relaxed…"
          multiline
        />

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title={editingId ? 'Update entry' : 'Save measurements'}
          icon="checkmark"
          fullWidth
          size="lg"
          loading={save.loading}
          onPress={handleSave}
        />
      </GlassCard>

      <SectionHeader title="History" />

      {history.loading ? (
        <LoadingState />
      ) : history.error ? (
        <ErrorState message={history.error} onRetry={history.refetch} />
      ) : !history.data?.items.length ? (
        <GlassCard>
          <EmptyState icon="resize-outline" title="No measurements recorded" />
        </GlassCard>
      ) : (
        history.data.items.map((entry: any) => {
          const filled = FIELDS.filter(
            (f) => entry[f.key] !== null && entry[f.key] !== undefined,
          );
          return (
            <GlassCard key={entry.id} style={{ marginBottom: spacing.base }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.md,
                }}
              >
                <View>
                  <Txt variant="bodyStrong">{formatDate(entry.recordedDate, 'medium')}</Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {formatRelativeDate(entry.recordedDate)} · {filled.length} values
                  </Txt>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Pressable onPress={() => startEdit(entry)} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="create-outline" size={17} color={theme.textSecondary} />
                  </Pressable>
                  <Pressable onPress={() => remove(entry.id)} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={17} color={theme.danger} />
                  </Pressable>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {filled.map((field) => (
                  <View
                    key={field.key}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      borderRadius: radius.xs,
                      backgroundColor: theme.surfaceMuted,
                    }}
                  >
                    <Txt variant="caption" color={theme.textTertiary} style={{ fontSize: 10 }}>
                      {field.label.toUpperCase()}
                    </Txt>
                    <Txt variant="small" style={{ fontWeight: '700' }}>
                      {entry[field.key]}
                      {field.unit}
                    </Txt>
                  </View>
                ))}
              </View>
            </GlassCard>
          );
        })
      )}
    </Screen>
  );
}

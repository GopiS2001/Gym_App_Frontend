import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { goalTypesApi, goalsApi, progressApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';
import { DateField, parseIsoDate, yearsAgo } from '@/components/DateField';
import { todayIso } from '@/utils/format';

export default function GoalFormScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const types = useApi(() => goalTypesApi.list(), [], { refetchOnFocus: true });
  const weight = useApi(() => progressApi.weightSummary(), []);
  const existing = useApi(() => (id ? goalsApi.get(id) : Promise.resolve(null)), [id], {
    enabled: isEdit,
  });

  const [goalTypeId, setGoalTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [startingWeight, setStartingWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const g = existing.data;
    if (!g) return;
    setGoalTypeId(g.goalTypeId);
    setTitle(g.title || '');
    setStartingWeight(g.startingWeightKg != null ? String(g.startingWeightKg) : '');
    setTargetWeight(g.targetWeightKg != null ? String(g.targetWeightKg) : '');
    setBodyFat(
      g.targetBodyFatPercentage != null ? String(g.targetBodyFatPercentage) : '',
    );
    setStartDate(g.startDate?.slice(0, 10) || todayIso());
    setTargetDate(g.targetDate?.slice(0, 10) || '');
    setNotes(g.notes || '');
  }, [existing.data]);

  // Pre-fill the starting weight from the latest logged value.
  useEffect(() => {
    if (!isEdit && !startingWeight && weight.data?.currentWeightKg) {
      setStartingWeight(String(weight.data.currentWeightKg));
    }
  }, [weight.data, startingWeight, isEdit]);

  // Goal types are rows now, so the first one is only known once they load.
  useEffect(() => {
    if (!goalTypeId && types.data?.items.length) {
      setGoalTypeId(types.data.items[0].id);
    }
  }, [types.data, goalTypeId]);

  const save = useMutation(async () => {
    const payload: any = {
      goalTypeId,
      title: title.trim() || undefined,
      startingWeightKg: startingWeight ? parseFloat(startingWeight) : undefined,
      targetWeightKg: targetWeight ? parseFloat(targetWeight) : undefined,
      targetBodyFatPercentage: bodyFat ? parseFloat(bodyFat) : undefined,
      startDate,
      targetDate: targetDate || undefined,
      notes: notes.trim() || undefined,
    };
    return isEdit ? goalsApi.update(id!, payload) : goalsApi.create(payload);
  });

  const handleSave = async () => {
    // The picker can only emit a well-formed date, so only the ordering
    // between the two dates still needs checking.
    const nextErrors: Record<string, string> = {};
    if (!goalTypeId) {
      nextErrors.goalTypeId = 'Choose a goal type';
    }
    if (!startDate) {
      nextErrors.startDate = 'Choose a start date';
    }
    if (targetDate && targetDate <= startDate) {
      nextErrors.targetDate = 'The target date must be after the start date';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await save.mutate();
    if (result) router.back();
  };

  if (isEdit && existing.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Goal' : 'New Goal'}
        subtitle="What are you training towards?"
        showBack
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        }}
      >
        <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 2 }}>
          GOAL TYPE
        </Txt>
        <Pressable
          onPress={() => router.push('/goals/types')}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="options-outline" size={13} color={theme.primary} />
          <Txt variant="caption" color={theme.primary} style={{ marginLeft: 4 }}>
            Manage
          </Txt>
        </Pressable>
      </View>
      {/* Chip carries its own marginRight, so only the row gap is needed here. */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: spacing.sm,
          marginBottom: spacing.base,
        }}
      >
        {(types.data?.items || []).map((t) => (
          <Chip
            key={t.id}
            label={t.name}
            selected={goalTypeId === t.id}
            onPress={() => setGoalTypeId(t.id)}
          />
        ))}
      </View>
      {errors.goalTypeId ? (
        <Txt variant="caption" color={theme.danger} style={{ marginTop: -spacing.sm, marginBottom: spacing.base, marginLeft: spacing.md }}>
          {errors.goalTypeId}
        </Txt>
      ) : null}

      <Field
        label="TITLE"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Lean bulk to 78 kg"
      />

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Field
          label="STARTING WEIGHT"
          value={startingWeight}
          onChangeText={setStartingWeight}
          keyboardType="decimal-pad"
          placeholder="72.0"
          suffix="kg"
          style={{ flex: 1 }}
        />
        <Field
          label="TARGET WEIGHT"
          value={targetWeight}
          onChangeText={setTargetWeight}
          keyboardType="decimal-pad"
          placeholder="78.0"
          suffix="kg"
          style={{ flex: 1 }}
        />
      </View>

      <Field
        label="TARGET BODY FAT (OPTIONAL)"
        value={bodyFat}
        onChangeText={setBodyFat}
        keyboardType="decimal-pad"
        placeholder="14"
        suffix="%"
      />

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <DateField
          label="START DATE"
          value={startDate}
          onChange={setStartDate}
          placeholder="Start"
          icon="calendar-outline"
          minimumDate={yearsAgo(5)}
          error={errors.startDate}
          style={{ flex: 1 }}
        />
        <DateField
          label="TARGET DATE"
          value={targetDate}
          onChange={setTargetDate}
          placeholder="Target"
          icon="flag-outline"
          clearable
          // A target before the start date is not a target.
          minimumDate={parseIsoDate(startDate) || undefined}
          error={errors.targetDate}
          style={{ flex: 1 }}
        />
      </View>

      <Field
        label="NOTES"
        value={notes}
        onChangeText={setNotes}
        placeholder="Approach, constraints, anything worth remembering"
        multiline
      />

      <GlassCard variant="subtle" style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Ionicons name="information-circle-outline" size={17} color={theme.textTertiary} />
          <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1, marginLeft: spacing.sm }}>
            A new goal becomes your active one. Any goal that was active is paused and kept in
            your history.
          </Txt>
        </View>
      </GlassCard>

      {save.error && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={17} color={theme.danger} />
            <Txt variant="small" color={theme.danger} style={{ flex: 1, marginLeft: spacing.sm }}>
              {save.error}
            </Txt>
          </View>
        </GlassCard>
      )}

      <Button
        title={isEdit ? 'Save changes' : 'Create goal'}
        icon="checkmark"
        size="lg"
        fullWidth
        loading={save.loading}
        onPress={handleSave}
      />
    </Screen>
  );
}

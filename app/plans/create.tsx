import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { plansApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';
import { DIFFICULTY_LABELS } from '@/utils/format';

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
];

export default function PlanFormScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const existing = useApi(
    () => (id ? plansApi.get(id) : Promise.resolve(null)),
    [id],
    { enabled: isEdit },
  );

  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [status, setStatus] = useState('ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setPlanName(p.planName || '');
    setDescription(p.description || '');
    setDifficulty(p.difficultyLevel || 'BEGINNER');
    setStatus(p.status === 'ARCHIVED' ? 'DRAFT' : p.status || 'ACTIVE');
  }, [existing.data]);

  const save = useMutation(async () => {
    const payload = {
      planName: planName.trim(),
      description: description.trim() || undefined,
      difficultyLevel: difficulty,
      status,
    };
    // An update without an `exercises` array leaves the schedule untouched.
    return isEdit ? plansApi.update(id!, payload) : plansApi.create(payload);
  });

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (planName.trim().length < 2) nextErrors.planName = 'Enter a name of at least 2 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await save.mutate();
    if (result) {
      if (isEdit) {
        router.back();
      } else {
        // Straight into the plan so the schedule can be filled in.
        router.replace(`/plans/${result.id}`);
      }
    }
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
        title={isEdit ? 'Edit Plan' : 'New Workout Plan'}
        subtitle={isEdit ? planName : 'Set it up, then add exercises per day'}
        showBack
      />

      <Field
        label="PLAN NAME *"
        value={planName}
        onChangeText={setPlanName}
        placeholder="e.g. Push Pull Legs"
        error={errors.planName}
      />

      <Field
        label="DESCRIPTION"
        value={description}
        onChangeText={setDescription}
        placeholder="What this plan is for and how it progresses"
        multiline
      />

      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
        DIFFICULTY
      </Txt>
      <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
        {DIFFICULTIES.map((level) => (
          <Chip
            key={level}
            label={DIFFICULTY_LABELS[level]}
            selected={difficulty === level}
            onPress={() => setDifficulty(level)}
          />
        ))}
      </View>

      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
        STATUS
      </Txt>
      <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
        {STATUSES.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={status === option.value}
            onPress={() => setStatus(option.value)}
          />
        ))}
      </View>

      {status === 'ACTIVE' && (
        <GlassCard variant="subtle" style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={17} color={theme.textTertiary} />
            <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1, marginLeft: spacing.sm }}>
              Only one plan can be active at a time. Any plan that is currently active will be
              archived automatically.
            </Txt>
          </View>
        </GlassCard>
      )}

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
        title={isEdit ? 'Save changes' : 'Create plan'}
        icon="checkmark"
        size="lg"
        fullWidth
        loading={save.loading}
        onPress={handleSave}
      />
    </Screen>
  );
}

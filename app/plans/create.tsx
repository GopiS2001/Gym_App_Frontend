import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { plansApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Field, LoadingState, Txt } from '@/components/ui';
import { FormSection, IconWell, Notice, OptionTile } from '@/components/premium';
import { DIFFICULTY_LABELS } from '@/utils/format';

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const STATUSES = [
  { value: 'ACTIVE', label: 'Active', caption: 'Shows on your home screen', icon: 'flash' as const },
  { value: 'DRAFT', label: 'Draft', caption: 'Keep building it first', icon: 'construct-outline' as const },
];

const DIFFICULTY_ICONS: Record<string, keyof typeof import('@expo/vector-icons').Ionicons.glyphMap> = {
  BEGINNER: 'leaf-outline',
  INTERMEDIATE: 'flame-outline',
  ADVANCED: 'trophy-outline',
};

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

      {/* Live preview of the plan card */}
      <GlassCard variant="hero" style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconWell icon="clipboard" color="#A9C3F0" size={48} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Txt variant="caption" color="#A9C3F0">
              {status === 'ACTIVE' ? 'ACTIVE PLAN' : 'DRAFT'}
            </Txt>
            <Txt variant="h3" numberOfLines={1} style={{ marginTop: 2 }}>
              {planName.trim() || 'Your new plan'}
            </Txt>
            <Txt variant="caption" color="#93A6C9" style={{ marginTop: 2 }}>
              {DIFFICULTY_LABELS[difficulty]} · add exercises day by day next
            </Txt>
          </View>
        </View>
      </GlassCard>

      <FormSection icon="create-outline" title="Plan details" subtitle="Name it and say what it's for">
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
          style={{ marginBottom: 0 }}
        />
      </FormSection>

      <FormSection icon="speedometer-outline" title="Difficulty" subtitle="How hard the sessions are">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {DIFFICULTIES.map((level) => (
            <OptionTile
              key={level}
              icon={DIFFICULTY_ICONS[level]}
              label={DIFFICULTY_LABELS[level]}
              selected={difficulty === level}
              onPress={() => setDifficulty(level)}
            />
          ))}
        </View>
      </FormSection>

      <FormSection icon="flag-outline" title="Status" subtitle="Active plans drive your daily workout">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {STATUSES.map((option) => (
            <OptionTile
              key={option.value}
              icon={option.icon}
              label={option.label}
              caption={option.caption}
              selected={status === option.value}
              onPress={() => setStatus(option.value)}
            />
          ))}
        </View>
        {status === 'ACTIVE' && (
          <Notice
            text="Only one plan can be active at a time. Any plan that is currently active will be archived automatically."
            style={{ marginTop: spacing.md, marginBottom: 0 }}
          />
        )}
      </FormSection>

      {save.error && <Notice tone="danger" text={save.error} />}

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

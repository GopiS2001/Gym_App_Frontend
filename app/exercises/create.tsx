import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { categoriesApi, exercisesApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';
import { FieldLabel, FormSection, Notice, OptionTile } from '@/components/premium';
import {
  ExerciseMediaEditor,
  MediaState,
  mediaBusy,
  mediaPayload,
  mediaStateFrom,
} from '@/components/ExerciseMediaEditor';
import { DIFFICULTY_LABELS } from '@/utils/format';

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

const DIFFICULTY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  BEGINNER: 'leaf-outline',
  INTERMEDIATE: 'flame-outline',
  ADVANCED: 'trophy-outline',
};

export default function ExerciseFormScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const categories = useApi(() => categoriesApi.list(), []);
  const existing = useApi(
    () => (id ? exercisesApi.get(id) : Promise.resolve(null)),
    [id],
    { enabled: isEdit },
  );

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [targetMuscle, setTargetMuscle] = useState('');
  const [secondary, setSecondary] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [media, setMedia] = useState<MediaState>(() => mediaStateFrom());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate the form once the record arrives.
  useEffect(() => {
    const e = existing.data;
    if (!e) return;
    setName(e.name || '');
    setCategoryId(e.categoryId || '');
    setTargetMuscle(e.targetMuscle || '');
    setSecondary(Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles.join(', ') : '');
    setEquipment(e.equipment || '');
    setDifficulty(e.difficultyLevel || 'BEGINNER');
    setDescription(e.description || '');
    setInstructions(e.instructions || '');
    setMedia(mediaStateFrom(e));
  }, [existing.data]);

  // Default to the first category for a new exercise.
  useEffect(() => {
    if (!isEdit && !categoryId && categories.data?.items.length) {
      setCategoryId(categories.data.items[0].id);
    }
  }, [categories.data, categoryId, isEdit]);

  const save = useMutation(async () => {
    const payload = {
      name: name.trim(),
      categoryId,
      targetMuscle: targetMuscle.trim() || undefined,
      secondaryMuscles: secondary
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      equipment: equipment.trim() || undefined,
      difficultyLevel: difficulty,
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      ...mediaPayload(media),
    };

    return isEdit ? exercisesApi.update(id!, payload) : exercisesApi.create(payload);
  });

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = 'Enter a name of at least 2 characters';
    if (!categoryId) nextErrors.categoryId = 'Choose a category';
    const link = media.videoLink.trim();
    if (media.videoMode === 'link' && link && !/^https?:\/\/\S+$/i.test(link)) {
      nextErrors.video = 'Enter a full link starting with https://';
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

  const uploading = mediaBusy(media);

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Exercise' : 'New Exercise'}
        subtitle={isEdit ? name : 'Add a movement to your library'}
        showBack
      />

      <ExerciseMediaEditor value={media} onChange={setMedia} videoError={errors.video} />

      <FormSection icon="barbell-outline" title="Basics" subtitle="Name, category and difficulty">
        <Field
          label="NAME *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Incline Dumbbell Press"
          error={errors.name}
        />

        <FieldLabel>CATEGORY *</FieldLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: errors.categoryId ? spacing.xs : spacing.base }}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          {(categories.data?.items || []).map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              color={c.colorHex || undefined}
              selected={categoryId === c.id}
              onPress={() => {
                setCategoryId(c.id);
                setErrors((p) => ({ ...p, categoryId: undefined as any }));
              }}
            />
          ))}
        </ScrollView>
        {!!errors.categoryId && (
          <Txt variant="caption" color={theme.danger} style={{ marginBottom: spacing.base }}>
            {errors.categoryId}
          </Txt>
        )}

        <FieldLabel>DIFFICULTY</FieldLabel>
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

      <FormSection icon="body-outline" title="Muscles & equipment" subtitle="What it works and what you need">
        <Field
          label="TARGET MUSCLE"
          value={targetMuscle}
          onChangeText={setTargetMuscle}
          placeholder="e.g. Upper Pectorals"
          icon="locate-outline"
        />

        <Field
          label="SECONDARY MUSCLES"
          value={secondary}
          onChangeText={setSecondary}
          placeholder="Comma separated, e.g. Triceps, Front Delts"
          icon="git-branch-outline"
        />

        <Field
          label="EQUIPMENT"
          value={equipment}
          onChangeText={setEquipment}
          placeholder="e.g. Dumbbell"
          icon="hardware-chip-outline"
          style={{ marginBottom: 0 }}
        />
      </FormSection>

      <FormSection icon="reader-outline" title="How to do it" subtitle="Notes for good form">
        <Field
          label="DESCRIPTION"
          value={description}
          onChangeText={setDescription}
          placeholder="What this movement is for"
          multiline
        />

        <Field
          label="INSTRUCTIONS"
          value={instructions}
          onChangeText={setInstructions}
          placeholder={'One step per line:\n1. Set the bench to 30 degrees\n2. ...'}
          multiline
          style={{ marginBottom: 0 }}
        />
      </FormSection>

      {!!save.error && <Notice tone="danger" text={save.error} />}

      <Button
        title={isEdit ? 'Save changes' : 'Create exercise'}
        icon="checkmark"
        size="lg"
        fullWidth
        loading={save.loading}
        disabled={uploading}
        onPress={handleSave}
      />
    </Screen>
  );
}

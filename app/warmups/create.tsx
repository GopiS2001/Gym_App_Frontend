import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { categoriesApi, warmupsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { Button, Chip, Field, IconButton, LoadingState, Txt } from '@/components/ui';
import { FieldLabel, FormSection, Notice } from '@/components/premium';
import { useConfirm } from '@/components/Dialog';
import {
  ExerciseMediaEditor,
  MediaState,
  mediaBusy,
  mediaPayload,
  mediaStateFrom,
} from '@/components/ExerciseMediaEditor';

/** Whole positive number from a text field, or null when left empty. */
function toCount(text: string): number | null | 'invalid' {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n > 0 ? n : 'invalid';
}

/**
 * Add or edit a warm-up. The category is optional: none means a general
 * warm-up that suits any session.
 */
export default function WarmupFormScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id, categoryId: presetCategory } = useLocalSearchParams<{
    id?: string;
    categoryId?: string;
  }>();
  const isEdit = !!id;

  const categories = useApi(() => categoriesApi.list(), []);
  const existing = useApi(
    () => (id ? warmupsApi.get(id) : Promise.resolve(null)),
    [id],
    { enabled: isEdit },
  );

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>(presetCategory || '');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [reps, setReps] = useState('');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<MediaState>(() => mediaStateFrom());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const w = existing.data;
    if (!w) return;
    setName(w.name);
    setCategoryId(w.categoryId || '');
    const total = w.durationSeconds || 0;
    setMinutes(total >= 60 ? String(Math.floor(total / 60)) : '');
    setSeconds(total % 60 ? String(total % 60) : '');
    setReps(w.reps ? String(w.reps) : '');
    setDescription(w.description || '');
    setMedia(mediaStateFrom(w));
  }, [existing.data]);

  const save = useMutation(async (payload: Record<string, any>) =>
    isEdit ? warmupsApi.update(id!, payload) : warmupsApi.create(payload),
  );
  const remove = useMutation(async () => {
    await warmupsApi.remove(id!);
    return true;
  });

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter a name of at least 2 characters';
    const m = toCount(minutes);
    const s = toCount(seconds);
    const r = toCount(reps);
    if (m === 'invalid' || s === 'invalid') next.duration = 'Use whole numbers for minutes and seconds';
    if (r === 'invalid') next.reps = 'Use a whole number';
    const link = media.videoLink.trim();
    if (media.videoMode === 'link' && link && !/^https?:\/\/\S+$/i.test(link)) {
      next.video = 'Enter a full link starting with https://';
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    const total = ((m as number | null) || 0) * 60 + ((s as number | null) || 0);
    const result = await save.mutate({
      name: name.trim(),
      categoryId: categoryId || null,
      durationSeconds: total || null,
      reps: r,
      description: description.trim() || null,
      ...mediaPayload(media),
    });
    if (result) router.back();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete warm-up',
      message: `Delete "${name || 'this warm-up'}"?`,
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

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Warm-up' : 'New Warm-up'}
        subtitle={isEdit ? name : 'A drill to do before training'}
        showBack
        right={
          isEdit ? (
            <IconButton icon="trash-outline" color={theme.danger} onPress={handleDelete} />
          ) : undefined
        }
      />

      <FormSection icon="images-outline" title="Photos & video" subtitle="Optional: show how it's done">
        <ExerciseMediaEditor
          value={media}
          onChange={setMedia}
          videoError={errors.video}
          folders={{ images: 'warmups', videos: 'warmup-videos' }}
        />
      </FormSection>

      <FormSection icon="flame-outline" title="Warm-up" subtitle="Name and the category it suits">
        <Field
          label="NAME *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Arm circles"
          error={errors.name}
        />

        <FieldLabel>CATEGORY (OPTIONAL)</FieldLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingVertical: 4 }}
        >
          <Chip
            label="General"
            icon="body-outline"
            selected={!categoryId}
            onPress={() => setCategoryId('')}
          />
          {(categories.data?.items || []).map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              color={c.colorHex || undefined}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}
            />
          ))}
        </ScrollView>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: spacing.xs, marginLeft: 2 }}>
          {categoryId ? 'Shown under this category.' : 'No category: a general warm-up for any day.'}
        </Txt>
      </FormSection>

      <FormSection icon="timer-outline" title="Amount" subtitle="Time, reps, or both. All optional">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Field
            label="MINUTES"
            value={minutes}
            onChangeText={setMinutes}
            placeholder="0"
            keyboardType="number-pad"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <Field
            label="SECONDS"
            value={seconds}
            onChangeText={setSeconds}
            placeholder="30"
            keyboardType="number-pad"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <Field
            label="REPS"
            value={reps}
            onChangeText={setReps}
            placeholder="15"
            keyboardType="number-pad"
            style={{ flex: 1, marginBottom: 0 }}
          />
        </View>
        {!!(errors.duration || errors.reps) && (
          <Txt variant="caption" color={theme.danger} style={{ marginTop: spacing.sm }}>
            {errors.duration || errors.reps}
          </Txt>
        )}
      </FormSection>

      <FormSection icon="reader-outline" title="Notes" subtitle="How to do it (optional)">
        <Field
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Small circles forward, then backward"
          multiline
          style={{ marginBottom: 0 }}
        />
      </FormSection>

      {!!(save.error || remove.error) && <Notice tone="danger" text={(save.error || remove.error)!} />}

      <Button
        title={isEdit ? 'Save changes' : 'Add warm-up'}
        icon="checkmark"
        size="lg"
        fullWidth
        loading={save.loading}
        disabled={mediaBusy(media)}
        onPress={handleSave}
      />
    </Screen>
  );
}

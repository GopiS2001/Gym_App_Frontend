import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced, useMutation } from '@/hooks/useApi';
import { categoriesApi, exercisesApi, plansApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, EmptyState, Field, LoadingState, Txt } from '@/components/ui';
import { WEEK_DAY_LABELS } from '@/utils/format';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function AddExerciseToPlanScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { planId, day } = useLocalSearchParams<{ planId: string; day?: string }>();

  const [selectedDay, setSelectedDay] = useState(day || 'MONDAY');
  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('12');
  const [weight, setWeight] = useState('');
  const [rest, setRest] = useState('60');

  const debouncedSearch = useDebounced(search, 350);

  const categories = useApi(() => categoriesApi.list(), []);
  const exercises = useApi(
    () =>
      exercisesApi.list({
        search: debouncedSearch || undefined,
        categorySlug: categorySlug || undefined,
        limit: 60,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    [debouncedSearch, categorySlug],
  );

  const add = useMutation(() =>
    plansApi.addExercise(planId, {
      exerciseId: selectedId,
      scheduledDay: selectedDay,
      targetSets: parseInt(sets, 10) || 3,
      targetReps: parseInt(reps, 10) || 12,
      targetWeightKg: weight ? parseFloat(weight) : undefined,
      restSeconds: parseInt(rest, 10) || 60,
    }),
  );

  const handleAdd = async () => {
    if (!selectedId) return;
    const result = await add.mutate();
    if (result) router.back();
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader title="Add to Plan" subtitle="Pick an exercise and set its targets" showBack />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
      >
        {DAYS.map((d) => (
          <Chip
            key={d}
            label={WEEK_DAY_LABELS[d]}
            selected={selectedDay === d}
            onPress={() => setSelectedDay(d)}
          />
        ))}
      </ScrollView>

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
      >
        <Chip label="All" selected={!categorySlug} onPress={() => setCategorySlug('')} />
        {(categories.data?.items || []).map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            color={c.colorHex || undefined}
            selected={categorySlug === c.slug}
            onPress={() => setCategorySlug(categorySlug === c.slug ? '' : c.slug)}
          />
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {exercises.loading ? (
          <LoadingState />
        ) : !exercises.data?.items.length ? (
          <GlassCard>
            <EmptyState icon="search-outline" title="No exercises found" />
          </GlassCard>
        ) : (
          exercises.data.items.map((exercise) => {
            const isSelected = selectedId === exercise.id;
            const accent = exercise.category?.colorHex || theme.primary;
            return (
              <Pressable
                key={exercise.id}
                onPress={() => setSelectedId(isSelected ? null : exercise.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  borderRadius: radius.lg,
                  backgroundColor: isSelected ? theme.primarySoft : theme.glass,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: isSelected ? theme.primary : theme.glassBorder,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    backgroundColor: theme.surfaceMuted,
                  }}
                >
                  {exercise.imageUrl ? (
                    <Image source={{ uri: exercise.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="barbell-outline" size={17} color={accent} />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {exercise.name}
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {exercise.category?.name} · {exercise.equipment || 'Bodyweight'}
                  </Txt>
                </View>

                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isSelected ? theme.primary : theme.textTertiary}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selectedId && (
        <GlassCard variant="strong" style={{ marginVertical: spacing.md }}>
          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            TARGETS FOR {WEEK_DAY_LABELS[selectedDay].toUpperCase()}
          </Txt>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field
              label="SETS"
              value={sets}
              onChangeText={setSets}
              keyboardType="number-pad"
              style={{ flex: 1, marginBottom: spacing.md }}
            />
            <Field
              label="REPS"
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              style={{ flex: 1, marginBottom: spacing.md }}
            />
            <Field
              label="WEIGHT"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="—"
              style={{ flex: 1, marginBottom: spacing.md }}
            />
            <Field
              label="REST"
              value={rest}
              onChangeText={setRest}
              keyboardType="number-pad"
              suffix="s"
              style={{ flex: 1, marginBottom: spacing.md }}
            />
          </View>

          {add.error && (
            <Txt variant="caption" color={theme.danger} style={{ marginBottom: spacing.sm }}>
              {add.error}
            </Txt>
          )}

          <Button
            title="Add to plan"
            icon="add"
            fullWidth
            loading={add.loading}
            onPress={handleAdd}
          />
        </GlassCard>
      )}
    </Screen>
  );
}

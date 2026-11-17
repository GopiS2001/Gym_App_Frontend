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
import { IconWell } from '@/components/premium';

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

      {/* Day picker: one 3D disc per weekday */}
      <GlassCard style={{ marginBottom: spacing.md }}>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          ADD TO · {WEEK_DAY_LABELS[selectedDay].toUpperCase()}
        </Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {DAYS.map((d) => {
            const on = selectedDay === d;
            return (
              <Pressable
                key={d}
                onPress={() => setSelectedDay(d)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={WEEK_DAY_LABELS[d]}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? theme.primary : theme.surfaceMuted,
                  boxShadow: on ? theme.elevation.button : undefined,
                  transform: pressed ? [{ scale: 0.92 }] : undefined,
                })}
              >
                <Txt variant="caption" color={on ? theme.onPrimary : theme.textSecondary}>
                  {WEEK_DAY_LABELS[d].slice(0, 2)}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

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
                  marginBottom: spacing.md,
                  marginHorizontal: 2,
                  borderRadius: radius.lg,
                  backgroundColor: isSelected ? theme.primarySoft : theme.card,
                  borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth * 2,
                  borderColor: isSelected ? theme.primary : theme.glassBorder,
                  boxShadow: pressed ? theme.elevation.pressed : theme.elevation.card,
                  transform: pressed ? [{ scale: 0.985 }] : undefined,
                })}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: `${accent}14`,
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

                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                  }}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'add'}
                    size={16}
                    color={isSelected ? theme.onPrimary : theme.textTertiary}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {selectedId && (
        <GlassCard variant="strong" style={{ marginVertical: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <IconWell icon="options-outline" size={34} />
            <View style={{ marginLeft: spacing.sm }}>
              <Txt variant="h4">Targets</Txt>
              <Txt variant="caption" color={theme.textTertiary}>
                For {WEEK_DAY_LABELS[selectedDay]}
              </Txt>
            </View>
          </View>

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

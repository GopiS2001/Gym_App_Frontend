import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced, useMutation } from '@/hooks/useApi';
import { categoriesApi, exercisesApi, plansApi, sessionsApi } from '@/services/endpoints';
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
import { WEEK_DAY_LABELS } from '@/utils/format';

const DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export default function StartWorkoutScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { planId, day } = useLocalSearchParams<{ planId?: string; day?: string }>();

  const isPlanMode = !!planId;
  const [selectedDay, setSelectedDay] = useState(
    day || DAYS[(new Date().getDay() + 6) % 7],
  );
  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');

  const debouncedSearch = useDebounced(search, 350);

  const plan = useApi(() => (planId ? plansApi.get(planId) : Promise.resolve(null)), [planId]);
  const categories = useApi(() => categoriesApi.list(), [], { enabled: !isPlanMode });
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
    { enabled: !isPlanMode },
  );

  const start = useMutation(async () => {
    const payload = isPlanMode
      ? { workoutPlanId: planId, scheduledDay: selectedDay }
      : {
          title: title.trim() || 'Free Workout',
          exerciseIds: selected,
        };
    return sessionsApi.start(payload);
  });

  const handleStart = async () => {
    const session = await start.mutate();
    if (session) {
      router.replace(`/workout/active?id=${session.id}`);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const daySchedule = plan.data?.schedule?.find((s) => s.day === selectedDay);

  return (
    <Screen withTabBar={false} scroll={!isPlanMode ? false : true}>
      <ScreenHeader
        title={isPlanMode ? 'Start Workout' : 'Free Workout'}
        subtitle={isPlanMode ? plan.data?.planName : 'Pick the exercises you want'}
        showBack
      />

      {start.error && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={17} color={theme.danger} />
            <Txt variant="small" color={theme.danger} style={{ flex: 1, marginLeft: spacing.sm }}>
              {start.error}
            </Txt>
          </View>
        </GlassCard>
      )}

      {isPlanMode ? (
        <>
          {plan.loading ? (
            <LoadingState />
          ) : (
            <>
              <SectionHeader title="Training day" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, marginBottom: spacing.base }}
              >
                {DAYS.map((d) => {
                  const entry = plan.data?.schedule?.find((s) => s.day === d);
                  return (
                    <Chip
                      key={d}
                      label={WEEK_DAY_LABELS[d]}
                      count={entry?.exerciseCount || undefined}
                      selected={selectedDay === d}
                      onPress={() => setSelectedDay(d)}
                    />
                  );
                })}
              </ScrollView>

              {!daySchedule || daySchedule.isRestDay ? (
                <GlassCard>
                  <EmptyState
                    icon="moon-outline"
                    title="Rest day"
                    message="No exercises are scheduled for this day in your plan."
                  />
                </GlassCard>
              ) : (
                <>
                  <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.primarySoft,
                        }}
                      >
                        <Ionicons name="barbell" size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.md }}>
                        <Txt variant="h4">
                          {daySchedule.muscleGroups.join(' + ') || daySchedule.dayLabel}
                        </Txt>
                        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                          {daySchedule.exerciseCount} exercises · ~
                          {daySchedule.estimatedMinutes} min
                        </Txt>
                      </View>
                    </View>
                  </GlassCard>

                  {daySchedule.exercises.map((pe, index) => (
                    <GlassCard key={pe.id} style={{ marginBottom: spacing.base }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: theme.surfaceMuted,
                          }}
                        >
                          <Txt variant="caption" color={theme.textSecondary}>
                            {index + 1}
                          </Txt>
                        </View>

                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: radius.sm,
                            overflow: 'hidden',
                            marginLeft: spacing.md,
                            backgroundColor: theme.surfaceMuted,
                          }}
                        >
                          {pe.exercise.imageUrl ? (
                            <Image
                              source={{ uri: pe.exercise.imageUrl }}
                              style={{ flex: 1 }}
                              contentFit="cover"
                            />
                          ) : (
                            <View
                              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Ionicons
                                name="barbell-outline"
                                size={18}
                                color={theme.textTertiary}
                              />
                            </View>
                          )}
                        </View>

                        <View style={{ flex: 1, marginLeft: spacing.md }}>
                          <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                            {pe.exercise.name}
                          </Txt>
                          <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                            {pe.targetSets} × {pe.targetReps}
                            {pe.targetWeightKg ? ` @ ${pe.targetWeightKg} kg` : ''} · {pe.restSeconds}s rest
                          </Txt>
                        </View>
                      </View>
                    </GlassCard>
                  ))}

                  <Button
                    title="Start this workout"
                    icon="play"
                    size="lg"
                    fullWidth
                    loading={start.loading}
                    style={{ marginTop: spacing.md }}
                    onPress={handleStart}
                  />
                </>
              )}
            </>
          )}
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <Field
            label="WORKOUT NAME"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Quick Push Session"
          />

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
                const isSelected = selected.includes(exercise.id);
                const accent = exercise.category?.colorHex || theme.primary;
                return (
                  <Pressable
                    key={exercise.id}
                    onPress={() => toggle(exercise.id)}
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
                        width: 44,
                        height: 44,
                        borderRadius: radius.sm,
                        overflow: 'hidden',
                        backgroundColor: theme.surfaceMuted,
                      }}
                    >
                      {exercise.imageUrl ? (
                        <Image
                          source={{ uri: exercise.imageUrl }}
                          style={{ flex: 1 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="barbell-outline" size={18} color={accent} />
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
                      name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={22}
                      color={isSelected ? theme.primary : theme.textTertiary}
                    />
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={{ paddingVertical: spacing.md }}>
            <Button
              title={
                selected.length
                  ? `Start with ${selected.length} exercise${selected.length === 1 ? '' : 's'}`
                  : 'Select at least one exercise'
              }
              icon="play"
              size="lg"
              fullWidth
              disabled={selected.length === 0}
              loading={start.loading}
              onPress={handleStart}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

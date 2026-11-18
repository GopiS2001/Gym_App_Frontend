import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced } from '@/hooks/useApi';
import { categoriesApi, exercisesApi, plansApi, sessionsApi, warmupsApi } from '@/services/endpoints';
import { useConfirm } from '@/components/Dialog';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { ActionRow, ActionTile, ArrowDisc, IconWell, SegmentedControl } from '@/components/premium';
import { BulkSelectBar, SelectCheck, useBulkDelete, useBulkSelect } from '@/components/BulkSelect';
import { DIFFICULTY_LABELS, WEEK_DAY_LABELS, formatMinutes, warmupAmount } from '@/utils/format';
import type { Exercise, Warmup, WorkoutCategory } from '@/types/models';

type TabKey = 'plans' | 'warmup' | 'library';

export default function WorkoutScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('plans');

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title="Workout"
        subtitle="Plans, warm-ups and your exercise library"
        right={
          <IconButton
            icon="add"
            color={theme.primary}
            onPress={() =>
              router.push(
                tab === 'plans' ? '/plans/create' : tab === 'warmup' ? '/warmups/create' : '/exercises/create',
              )
            }
          />
        }
      />

      <SegmentedControl<TabKey>
        options={[
          { value: 'plans', label: 'Plans', icon: 'clipboard-outline' },
          { value: 'warmup', label: 'Warm-up', icon: 'flame-outline' },
          { value: 'library', label: 'Exercises', icon: 'barbell-outline' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'plans' ? <PlansTab /> : tab === 'warmup' ? <WarmupTab /> : <LibraryTab />}
    </Screen>
  );
}

// ----------------------------------------------------------------- plans

function PlansTab() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<string>('');

  const plans = useApi(
    () => plansApi.list({ status: status || undefined, limit: 50 }),
    [status],
    { refetchOnFocus: true },
  );
  const active = useApi(() => sessionsApi.active(), [], { refetchOnFocus: true });

  const planItems = plans.data?.items || [];
  const selection = useBulkSelect(planItems.map((p) => p.id));
  const bulkDelete = useBulkDelete({
    selection,
    noun: ['plan', 'plans'],
    remove: (id) => plansApi.remove(id, { silent: true }),
    onDone: plans.refresh,
  });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {active.data && (
        <GlassCard
          variant="hero"
          style={{ marginBottom: spacing.base }}
          onPress={() => router.push(`/workout/active?id=${active.data!.id}`)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconWell icon="pulse" color="#A9C3F0" size={44} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Txt variant="caption" color="#A9C3F0">
                LIVE SESSION
              </Txt>
              <Txt variant="h4" numberOfLines={1} style={{ marginTop: 2 }}>
                {active.data.title}
              </Txt>
            </View>
            <ArrowDisc />
          </View>
        </GlassCard>
      )}

      <ActionRow>
        <ActionTile icon="flash-outline" label="Free workout" highlighted onPress={() => router.push('/workout/start')} />
        <ActionTile icon="add-circle-outline" label="New plan" onPress={() => router.push('/plans/create')} />
        <ActionTile icon="time-outline" label="History" onPress={() => router.push('/workout/history')} />
        <ActionTile icon="grid-outline" label="Categories" onPress={() => router.push('/exercises/categories')} />
      </ActionRow>

      <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
        {[
          { value: '', label: 'All' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'DRAFT', label: 'Drafts' },
          { value: 'ARCHIVED', label: 'Archived' },
        ].map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={status === option.value}
            onPress={() => setStatus(option.value)}
          />
        ))}
      </View>

      {!plans.loading && !plans.error && (
        <BulkSelectBar
          selection={selection}
          total={planItems.length}
          onDelete={bulkDelete.run}
          deleting={bulkDelete.deleting}
        />
      )}

      {plans.loading ? (
        <LoadingState />
      ) : plans.error ? (
        <ErrorState message={plans.error} onRetry={plans.refetch} />
      ) : !plans.data?.items.length ? (
        <GlassCard>
          <EmptyState
            icon="clipboard-outline"
            title="No plans yet"
            message="Build a weekly plan and your daily workout appears on the home screen."
            actionLabel="Create a plan"
            onAction={() => router.push('/plans/create')}
          />
        </GlassCard>
      ) : (
        plans.data.items.map((plan) => (
          <GlassCard
            key={plan.id}
            padded={false}
            style={{ marginBottom: spacing.base }}
            onPress={() =>
              selection.selecting ? selection.toggle(plan.id) : router.push(`/plans/${plan.id}`)
            }
          >
            <View style={{ height: 150 }}>
              {plan.coverImageUrl ? (
                <Image
                  source={{ uri: plan.coverImageUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={250}
                />
              ) : (
                <LinearGradient
                  colors={theme.primaryGradient}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <LinearGradient
                colors={['rgba(10,22,48,0.1)', 'rgba(10,22,48,0.92)']}
                style={StyleSheet.absoluteFill}
              />

              <View style={{ flex: 1, padding: spacing.base, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  {selection.selecting && (
                    <View style={{ marginRight: spacing.sm }}>
                      <SelectCheck checked={selection.isSelected(plan.id)} onImage />
                    </View>
                  )}
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                  <Badge
                    label={plan.status}
                    color={
                      plan.status === 'ACTIVE'
                        ? '#7EE2B8'
                        : plan.status === 'DRAFT'
                          ? '#FFD08A'
                          : '#C9D6EE'
                    }
                    icon={plan.status === 'ACTIVE' ? 'radio-button-on' : undefined}
                  />
                  <Badge label={DIFFICULTY_LABELS[plan.difficultyLevel] || ''} color="#FFFFFF" />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3" color="#FFFFFF" numberOfLines={1}>
                      {plan.planName}
                    </Txt>
                    <Txt variant="caption" color="rgba(255,255,255,0.75)" style={{ marginTop: 2 }}>
                      {plan.exerciseCount} exercises · {plan.trainingDays?.length ?? 0} training days
                    </Txt>
                  </View>
                  <ArrowDisc />
                </View>
              </View>
            </View>

            {plan.trainingDays && plan.trainingDays.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing.base,
                  paddingVertical: spacing.md,
                }}
              >
                {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map(
                  (day) => {
                    const trains = plan.trainingDays!.includes(day);
                    return (
                      <View
                        key={day}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: trains ? theme.primary : theme.surfaceMuted,
                          boxShadow: trains ? theme.elevation.button : [],
                        }}
                      >
                        <Txt
                          variant="caption"
                          color={trains ? theme.onPrimary : theme.textTertiary}
                        >
                          {WEEK_DAY_LABELS[day][0]}
                        </Txt>
                      </View>
                    );
                  },
                )}
              </View>
            )}
          </GlassCard>
        ))
      )}
    </ScrollView>
  );
}

// --------------------------------------------------------------- warm-up

function WarmupTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  // '' = all, 'none' = general (no category), otherwise a category id.
  const [categoryId, setCategoryId] = useState('');

  const categories = useApi(() => categoriesApi.list(), []);
  const warmups = useApi(
    () => warmupsApi.list({ categoryId: categoryId || undefined, limit: 200 }),
    [categoryId],
    { refetchOnFocus: true },
  );

  const openCreate = () =>
    router.push({
      pathname: '/warmups/create',
      params: categoryId && categoryId !== 'none' ? { categoryId } : {},
    });

  const handleDelete = async (w: Warmup) => {
    const ok = await confirm({
      title: 'Delete warm-up',
      message: `Delete "${w.name}"?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await warmupsApi.remove(w.id).catch(() => undefined);
    warmups.refresh();
  };

  const items = warmups.data?.items || [];
  const totalSeconds = items.reduce((sum, w) => sum + (w.durationSeconds || 0), 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
        contentContainerStyle={{ paddingRight: spacing.lg, paddingVertical: 4 }}
      >
        <Chip label="All" selected={!categoryId} onPress={() => setCategoryId('')} />
        <Chip
          label="General"
          icon="body-outline"
          selected={categoryId === 'none'}
          onPress={() => setCategoryId(categoryId === 'none' ? '' : 'none')}
        />
        {(categories.data?.items || []).map((c: WorkoutCategory) => (
          <Chip
            key={c.id}
            label={c.name}
            color={c.colorHex || undefined}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}
          />
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {warmups.loading ? (
          <LoadingState />
        ) : warmups.error ? (
          <ErrorState message={warmups.error} onRetry={warmups.refetch} />
        ) : !items.length ? (
          <GlassCard>
            <EmptyState
              icon="flame-outline"
              title="No warm-ups yet"
              message="Add the drills you do before training. Pick a category, or leave it empty for a general warm-up."
              actionLabel="Add a warm-up"
              onAction={openCreate}
            />
          </GlassCard>
        ) : (
          <>
            <GlassCard variant="hero" style={{ marginBottom: spacing.base }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconWell icon="flame" color="#A9C3F0" size={44} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="caption" color="#A9C3F0">
                    WARM-UP ROUTINE
                  </Txt>
                  <Txt variant="h4" style={{ marginTop: 2 }}>
                    {items.length} drill{items.length === 1 ? '' : 's'}
                    {totalSeconds ? ` · about ${Math.max(1, Math.round(totalSeconds / 60))} min` : ''}
                  </Txt>
                </View>
                <ArrowDisc icon="add" onPress={openCreate} />
              </View>
            </GlassCard>

            {items.map((w) => {
              const accent = w.category?.colorHex || theme.primary;
              const amount = warmupAmount(w);
              return (
                <GlassCard
                  key={w.id}
                  style={{ marginBottom: spacing.base }}
                  onPress={() => router.push(`/warmups/${w.id}`)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {w.imageUrl || w.backgroundImageUrl ? (
                      <View style={{ width: 62, height: 62, borderRadius: 18, overflow: 'hidden', backgroundColor: `${accent}14` }}>
                        <Image
                          source={{ uri: (w.imageUrl || w.backgroundImageUrl)! }}
                          style={{ flex: 1 }}
                          contentFit="cover"
                          transition={200}
                        />
                        {!!w.videoUrl && (
                          <View style={{ position: 'absolute', right: 4, bottom: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(10,22,48,0.7)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="play" size={11} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                    ) : (
                      <IconWell icon={w.videoUrl ? 'play-circle-outline' : w.category ? 'flame-outline' : 'body-outline'} color={accent} size={46} />
                    )}
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Txt variant="bodyStrong" numberOfLines={1}>
                        {w.name}
                      </Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                        <Badge
                          label={w.category?.name?.toUpperCase() || 'GENERAL'}
                          size="sm"
                          color={w.category ? accent : theme.textTertiary}
                        />
                        {!!amount && (
                          <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
                            {amount}
                          </Txt>
                        )}
                      </View>
                      {!!w.description && (
                        <Txt variant="caption" color={theme.textSecondary} numberOfLines={2} style={{ marginTop: 4 }}>
                          {w.description}
                        </Txt>
                      )}
                    </View>
                    <Pressable onPress={() => handleDelete(w)} hitSlop={10} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={19} color={theme.danger} />
                    </Pressable>
                  </View>
                </GlassCard>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// --------------------------------------------------------------- library

function LibraryTab() {
  const { theme, spacing } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [equipment, setEquipment] = useState('');
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounced(search, 350);

  const categories = useApi(() => categoriesApi.list(), []);
  const filters = useApi(() => exercisesApi.filters(), []);

  const exercises = useApi(
    () =>
      exercisesApi.list({
        search: debouncedSearch || undefined,
        categorySlug: categorySlug || undefined,
        difficultyLevel: difficulty || undefined,
        equipment: equipment || undefined,
        favouritesOnly: favouritesOnly || undefined,
        limit: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    [debouncedSearch, categorySlug, difficulty, equipment, favouritesOnly],
  );

  const activeFilterCount =
    (difficulty ? 1 : 0) + (equipment ? 1 : 0) + (favouritesOnly ? 1 : 0);

  const toggleFavourite = async (exercise: Exercise) => {
    await exercisesApi.toggleFavourite(exercise.id).catch(() => undefined);
    exercises.refresh();
  };

  return (
    <View style={{ flex: 1 }}>
      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises, muscles, equipment"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
        rightElement={
          <Pressable onPress={() => setShowFilters((v) => !v)} hitSlop={8}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="options-outline"
                size={19}
                color={activeFilterCount ? theme.primary : theme.textTertiary}
              />
              {activeFilterCount > 0 && (
                <View
                  style={{
                    width: 15,
                    height: 15,
                    borderRadius: 7.5,
                    backgroundColor: theme.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 3,
                  }}
                >
                  <Txt variant="caption" color={theme.onPrimary} style={{ fontSize: 10 }}>
                    {activeFilterCount}
                  </Txt>
                </View>
              )}
            </View>
          </Pressable>
        }
      />

      {/* category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
        contentContainerStyle={{ paddingRight: spacing.lg }}
      >
        <Chip label="All" selected={!categorySlug} onPress={() => setCategorySlug('')} />
        {(categories.data?.items || []).map((category: WorkoutCategory) => (
          <Chip
            key={category.id}
            label={category.name}
            count={category.exerciseCount}
            color={category.colorHex || undefined}
            selected={categorySlug === category.slug}
            onPress={() =>
              setCategorySlug(categorySlug === category.slug ? '' : category.slug)
            }
          />
        ))}
      </ScrollView>

      {showFilters && (
        <GlassCard style={{ marginBottom: spacing.base }} variant="subtle">
          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            DIFFICULTY
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <Chip label="Any" selected={!difficulty} onPress={() => setDifficulty('')} />
            {(filters.data?.difficultyLevels || []).map((level) => (
              <Chip
                key={level}
                label={DIFFICULTY_LABELS[level] || level}
                selected={difficulty === level}
                onPress={() => setDifficulty(difficulty === level ? '' : level)}
              />
            ))}
          </ScrollView>

          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            EQUIPMENT
          </Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
            <Chip label="Any" selected={!equipment} onPress={() => setEquipment('')} />
            {(filters.data?.equipment || []).map((item) => (
              <Chip
                key={item}
                label={item}
                selected={equipment === item}
                onPress={() => setEquipment(equipment === item ? '' : item)}
              />
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Chip
              label="Favourites only"
              icon="heart"
              selected={favouritesOnly}
              onPress={() => setFavouritesOnly((v) => !v)}
            />
            {activeFilterCount > 0 && (
              <Pressable
                onPress={() => {
                  setDifficulty('');
                  setEquipment('');
                  setFavouritesOnly(false);
                }}
                hitSlop={8}
              >
                <Txt variant="caption" color={theme.danger}>
                  Clear all
                </Txt>
              </Pressable>
            )}
          </View>
        </GlassCard>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {exercises.loading ? (
          <LoadingState />
        ) : exercises.error ? (
          <ErrorState message={exercises.error} onRetry={exercises.refetch} />
        ) : !exercises.data?.items.length ? (
          <GlassCard>
            <EmptyState
              icon="search-outline"
              title="No exercises found"
              message="Try a different search term or clear the filters."
              actionLabel="Create an exercise"
              onAction={() => router.push('/exercises/create')}
            />
          </GlassCard>
        ) : (
          <>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
              {exercises.data.meta.total} EXERCISE
              {exercises.data.meta.total === 1 ? '' : 'S'}
            </Txt>

            {exercises.data.items.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                onPress={() => router.push(`/exercises/${exercise.id}`)}
                onFavourite={() => toggleFavourite(exercise)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export function ExerciseRow({
  exercise,
  onPress,
  onFavourite,
  rightElement,
}: {
  exercise: Exercise;
  onPress?: () => void;
  onFavourite?: () => void;
  rightElement?: React.ReactNode;
}) {
  const { theme, spacing, radius } = useTheme();
  const accent = exercise.category?.colorHex || theme.primary;

  return (
    <GlassCard onPress={onPress} style={{ marginBottom: spacing.base }} padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: `${accent}14`,
          }}
        >
          {exercise.imageUrl ? (
            <Image
              source={{ uri: exercise.imageUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="barbell-outline" size={22} color={accent} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Txt variant="bodyStrong" numberOfLines={1}>
            {exercise.name}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 }}>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.xs,
                backgroundColor: `${accent}22`,
              }}
            >
              <Txt variant="caption" color={accent} style={{ fontSize: 10 }}>
                {exercise.category?.name?.toUpperCase() || 'OTHER'}
              </Txt>
            </View>
            {exercise.isCustom && <Badge label="CUSTOM" size="sm" color={theme.streak} />}
          </View>
          <Txt variant="caption" color={theme.textTertiary} numberOfLines={1} style={{ marginTop: 3 }}>
            {[exercise.targetMuscle, exercise.equipment].filter(Boolean).join(' · ') || '—'}
          </Txt>
        </View>

        {rightElement ??
          (onFavourite && (
            <Pressable onPress={onFavourite} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons
                name={exercise.isFavourite ? 'heart' : 'heart-outline'}
                size={20}
                color={exercise.isFavourite ? theme.danger : theme.textTertiary}
              />
            </Pressable>
          ))}
      </View>
    </GlassCard>
  );
}

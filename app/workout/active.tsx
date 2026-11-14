import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { sessionsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  ProgressBar,
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { ProgressRing } from '@/components/charts';
import { formatDuration } from '@/utils/format';
import type { SessionExercise, WorkoutSession } from '@/types/models';

export default function ActiveWorkoutScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // If no id is passed, fall back to whatever session the server says is open.
  const session = useApi<WorkoutSession | null>(
    () => (id ? sessionsApi.get(id) : sessionsApi.active()),
    [id],
  );

  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const data = session.data;

  // Elapsed time is derived from the server's startedAt, so it stays correct
  // across an app restart rather than resetting to zero.
  useEffect(() => {
    if (!data?.startedAt) return;
    const started = new Date(data.startedAt).getTime();

    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - started) / 1000)));
    tick();

    if (data.status !== 'IN_PROGRESS') return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [data?.startedAt, data?.status]);

  // Rest countdown
  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = setInterval(() => {
      setRestSeconds((s) => {
        if (s <= 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
            () => undefined,
          );
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [restSeconds]);

  useEffect(() => {
    if (data && !expandedId && data.exercises.length) {
      // Open the first exercise that still has sets left to do.
      const next =
        data.exercises.find(
          (e) => (e.completedSetCount ?? 0) < e.targetSets && e.status !== 'SKIPPED',
        ) || data.exercises[0];
      setExpandedId(next.id);
    }
  }, [data, expandedId]);

  const startRest = useCallback((seconds: number) => {
    setRestTotal(seconds);
    setRestSeconds(seconds);
  }, []);

  const recordSet = async (
    sessionExerciseId: string,
    reps: number,
    weightKg: number,
    restFor: number,
  ) => {
    if (!data) return;
    const updated = await sessionsApi
      .recordSet(data.id, { sessionExerciseId, reps, weightKg, completed: true })
      .catch(() => null);
    if (updated) {
      session.setData(updated);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      if (restFor > 0) startRest(restFor);
    }
  };

  const updateSet = async (setId: string, payload: any) => {
    if (!data) return;
    const updated = await sessionsApi.updateSet(data.id, setId, payload).catch(() => null);
    if (updated) session.setData(updated);
  };

  const deleteSet = async (setId: string) => {
    if (!data) return;
    const updated = await sessionsApi.deleteSet(data.id, setId).catch(() => null);
    if (updated) session.setData(updated);
  };

  const removeExercise = (rowId: string, name: string) => {
    if (!data) return;
    confirm({
      title: 'Remove exercise',
      message: `Remove "${name}" from this workout?`,
      tone: 'danger',
      confirmLabel: 'Remove',
    }).then(async (ok) => {
      if (!ok) return;
      const updated = await sessionsApi.removeExercise(data.id, rowId).catch(() => null);
      if (updated) session.setData(updated);
    });
  };

  const togglePause = async () => {
    if (!data) return;
    const updated =
      data.status === 'PAUSED'
        ? await sessionsApi.resume(data.id).catch(() => null)
        : await sessionsApi.pause(data.id).catch(() => null);
    if (updated) session.setData(updated);
  };

  const finish = () => {
    if (!data) return;
    const completedSets = data.completedSets ?? 0;

    if (completedSets === 0) {
      confirm({
        title: 'Nothing recorded',
        message: 'You have not logged any sets. Cancel this workout instead?',
        tone: 'danger',
        confirmLabel: 'Cancel workout',
        cancelLabel: 'Keep going',
      }).then(async (ok) => {
        if (!ok) return;
            await sessionsApi.cancel(data.id).catch(() => undefined);
            router.replace('/(tabs)');
      });
      return;
    }

    confirm({
      title: 'Finish workout',
      message: `Save ${completedSets} recorded sets?`,
      tone: 'warning',
      confirmLabel: 'Finish',
      cancelLabel: 'Not yet',
    }).then(async (ok) => {
      if (!ok) return;
      setSaving(true);
      const done = await sessionsApi
        .complete(data.id, { durationSeconds: elapsed })
        .catch(() => null);
      setSaving(false);
      if (done) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        router.replace(`/workout/summary?id=${done.id}`);
      }
    });
  };

  const cancel = () => {
    if (!data) return;
    confirm({
      title: 'Cancel workout',
      message: 'Everything recorded in this session will be discarded.',
      tone: 'danger',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep going',
    }).then(async (ok) => {
      if (!ok) return;
      await sessionsApi.cancel(data.id).catch(() => undefined);
      router.replace('/(tabs)');
    });
  };

  if (session.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState message="Loading workout" />
      </Screen>
    );
  }

  if (session.error || !data) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Workout" showBack onBack={() => router.replace('/(tabs)')} />
        <ErrorState
          message={session.error || 'No workout in progress.'}
          onRetry={session.refetch}
        />
        <Button
          title="Back to home"
          variant="glass"
          fullWidth
          onPress={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  }

  const isPaused = data.status === 'PAUSED';
  const isDone = data.status === 'COMPLETED' || data.status === 'CANCELLED';

  return (
    <>
      <Screen withTabBar={false}>
        <ScreenHeader
          title={data.title || 'Workout'}
          subtitle={`${data.completedSets ?? 0} of ${
            data.exercises.reduce((sum, e) => sum + e.targetSets, 0)
          } sets recorded`}
          showBack
          onBack={() => router.replace('/(tabs)')}
          right={
            <IconButton
              icon="close"
              color={theme.danger}
              onPress={cancel}
            />
          }
        />

        {/* ------------------------------------------------- timer card */}
        <GlassCard variant="strong" glowColor={isPaused ? undefined : theme.primary} style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ProgressRing
              percentage={data.completionPercentage || 0}
              size={92}
              strokeWidth={9}
            >
              <Txt variant="h4">{Math.round(data.completionPercentage || 0)}%</Txt>
            </ProgressRing>

            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <Txt variant="caption" color={theme.textTertiary}>
                ELAPSED
              </Txt>
              <Txt variant="numeric" style={{ marginVertical: 2 }}>
                {formatDuration(elapsed)}
              </Txt>
              <View style={{ flexDirection: 'row', gap: spacing.base }}>
                <View>
                  <Txt variant="caption" color={theme.textTertiary}>
                    VOLUME
                  </Txt>
                  <Txt variant="small" style={{ fontWeight: '700' }}>
                    {Math.round(data.totalVolumeKg)} kg
                  </Txt>
                </View>
                <View>
                  <Txt variant="caption" color={theme.textTertiary}>
                    REPS
                  </Txt>
                  <Txt variant="small" style={{ fontWeight: '700' }}>
                    {data.totalReps ?? 0}
                  </Txt>
                </View>
              </View>
            </View>

            {!isDone && (
              <IconButton
                icon={isPaused ? 'play' : 'pause'}
                color={isPaused ? theme.primary : theme.text}
                onPress={togglePause}
                size={46}
              />
            )}
          </View>

          {isPaused && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: spacing.md,
                padding: spacing.sm,
                borderRadius: radius.sm,
                backgroundColor: theme.streakSoft,
              }}
            >
              <Ionicons name="pause-circle" size={15} color={theme.streak} />
              <Txt variant="caption" color={theme.streak} style={{ marginLeft: 5 }}>
                Workout paused — tap play to resume
              </Txt>
            </View>
          )}
        </GlassCard>

        {/* ------------------------------------------------- exercises */}
        {data.exercises.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon="barbell-outline"
              title="No exercises"
              message="Add an exercise to start recording sets."
              actionLabel="Add exercise"
              onAction={() => router.push(`/workout/add-exercise?sessionId=${data.id}`)}
            />
          </GlassCard>
        ) : (
          data.exercises.map((exercise) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              expanded={expandedId === exercise.id}
              onToggle={() =>
                setExpandedId(expandedId === exercise.id ? null : exercise.id)
              }
              onRecordSet={recordSet}
              onUpdateSet={updateSet}
              onDeleteSet={deleteSet}
              onRemove={() => removeExercise(exercise.id, exercise.exercise.name)}
              onStartRest={startRest}
              readOnly={isDone}
            />
          ))
        )}

        <Button
          title="Add exercise"
          icon="add"
          variant="glass"
          fullWidth
          style={{ marginTop: spacing.sm, marginBottom: spacing.base }}
          onPress={() => router.push(`/workout/add-exercise?sessionId=${data.id}`)}
        />

        {!isDone && (
          <Button
            title="Finish workout"
            icon="checkmark-circle"
            fullWidth
            size="lg"
            loading={saving}
            onPress={finish}
          />
        )}
      </Screen>

      {/* ------------------------------------------------- rest overlay */}
      <RestTimerOverlay
        secondsLeft={restSeconds}
        total={restTotal}
        onSkip={() => setRestSeconds(0)}
        onAdd={(extra) => setRestSeconds((s) => s + extra)}
      />
    </>
  );
}

// ------------------------------------------------------------ exercise card

function ExerciseBlock({
  exercise,
  expanded,
  onToggle,
  onRecordSet,
  onUpdateSet,
  onDeleteSet,
  onRemove,
  onStartRest,
  readOnly,
}: {
  exercise: SessionExercise;
  expanded: boolean;
  onToggle: () => void;
  onRecordSet: (id: string, reps: number, weight: number, rest: number) => void;
  onUpdateSet: (setId: string, payload: any) => void;
  onDeleteSet: (setId: string) => void;
  onRemove: () => void;
  onStartRest: (seconds: number) => void;
  readOnly: boolean;
}) {
  const { theme, spacing, radius } = useTheme();

  const previous = exercise.previousPerformance;
  const completed = exercise.sets.filter((s) => s.completed);
  const nextSetNumber = completed.length + 1;

  // Seed the inputs from the last set of this session, else last time, else
  // the plan's targets.
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const seedReps = String(
    lastSet?.reps || previous?.sets?.[0]?.reps || exercise.targetReps || 10,
  );
  const seedWeight = String(
    lastSet?.weightKg ?? previous?.bestWeightKg ?? 0,
  );

  const [reps, setReps] = useState(seedReps);
  const [weight, setWeight] = useState(seedWeight);

  useEffect(() => {
    setReps(seedReps);
    setWeight(seedWeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.sets.length]);

  const isComplete = completed.length >= exercise.targetSets;
  const accent = exercise.exercise.category?.colorHex || theme.primary;

  const add = () => {
    const r = parseInt(reps, 10);
    const w = parseFloat(weight);
    if (Number.isNaN(r) || r < 0) return;
    onRecordSet(exercise.id, r, Number.isNaN(w) ? 0 : w, exercise.restSeconds);
  };

  return (
    <GlassCard
      style={{ marginBottom: spacing.base }}
      padded={false}
      variant={expanded ? 'strong' : 'default'}
    >
      {/* header */}
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.base,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.sm,
            overflow: 'hidden',
            backgroundColor: theme.surfaceMuted,
          }}
        >
          {exercise.exercise.imageUrl ? (
            <Image
              source={{ uri: exercise.exercise.imageUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="barbell-outline" size={20} color={accent} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Txt variant="bodyStrong" numberOfLines={1}>
            {exercise.exercise.name}
          </Txt>
          <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
            {completed.length} / {exercise.targetSets} sets · target {exercise.targetReps} reps
          </Txt>
        </View>

        {isComplete ? (
          <Ionicons name="checkmark-circle" size={22} color={theme.success} />
        ) : (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radius.pill,
              backgroundColor: `${accent}22`,
            }}
          >
            <Txt variant="caption" color={accent}>
              {exercise.targetSets - completed.length} left
            </Txt>
          </View>
        )}

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={17}
          color={theme.textTertiary}
          style={{ marginLeft: spacing.sm }}
        />
      </Pressable>

      <View style={{ paddingHorizontal: spacing.base }}>
        <ProgressBar
          value={(completed.length / Math.max(1, exercise.targetSets)) * 100}
          color={accent}
          height={4}
        />
      </View>

      {expanded && (
        <View style={{ padding: spacing.base }}>
          {/* last time */}
          {previous && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                borderRadius: radius.sm,
                backgroundColor: theme.surfaceMuted,
                marginBottom: spacing.md,
              }}
            >
              <Ionicons name="time-outline" size={15} color={theme.textTertiary} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Txt variant="caption" color={theme.textTertiary}>
                  LAST TIME
                </Txt>
                <Txt variant="small" style={{ marginTop: 1 }}>
                  {previous.sets.map((s) => `${s.reps}×${s.weightKg}kg`).join('  ·  ')}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt variant="caption" color={theme.textTertiary}>
                  BEST
                </Txt>
                <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }}>
                  {previous.bestWeightKg} kg
                </Txt>
              </View>
            </View>
          )}

          {/* recorded sets */}
          {exercise.sets.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: spacing.sm,
                  marginBottom: 6,
                }}
              >
                <Txt variant="caption" color={theme.textTertiary} style={{ width: 36 }}>
                  SET
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1 }}>
                  REPS
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1 }}>
                  WEIGHT
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} style={{ width: 60, textAlign: 'right' }}>
                  VOLUME
                </Txt>
                <View style={{ width: 28 }} />
              </View>

              {exercise.sets.map((set) => (
                <View
                  key={set.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.sm + 1,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.xs,
                    backgroundColor: set.completed ? `${accent}14` : 'transparent',
                    marginBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: set.completed ? accent : theme.surfaceMuted,
                      marginRight: 12,
                    }}
                  >
                    <Txt
                      variant="caption"
                      color={set.completed ? theme.onPrimary : theme.textTertiary}
                    >
                      {set.setNumber}
                    </Txt>
                  </View>

                  <Txt variant="small" style={{ flex: 1, fontWeight: '700' }}>
                    {set.reps}
                  </Txt>
                  <Txt variant="small" style={{ flex: 1, fontWeight: '700' }}>
                    {set.weightKg} kg
                  </Txt>
                  <Txt
                    variant="small"
                    color={theme.textTertiary}
                    style={{ width: 60, textAlign: 'right' }}
                  >
                    {Math.round(set.reps * set.weightKg)}
                  </Txt>

                  {!readOnly && (
                    <Pressable
                      onPress={() => onDeleteSet(set.id)}
                      hitSlop={8}
                      style={{ width: 28, alignItems: 'flex-end' }}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.textTertiary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* set entry */}
          {!readOnly && (
            <>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={`SET ${nextSetNumber} · REPS`}
                    value={reps}
                    onChangeText={setReps}
                    keyboardType="number-pad"
                    placeholder="12"
                    style={{ marginBottom: 0 }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="WEIGHT"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    suffix="kg"
                    style={{ marginBottom: 0 }}
                  />
                </View>
              </View>

              {/* quick weight adjust */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                {[-5, -2.5, 2.5, 5].map((step) => (
                  <Pressable
                    key={step}
                    onPress={() => {
                      const current = parseFloat(weight) || 0;
                      setWeight(String(Math.max(0, Math.round((current + step) * 10) / 10)));
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: spacing.sm + 1,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      backgroundColor: theme.surfaceMuted,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Txt variant="caption" color={theme.textSecondary}>
                      {step > 0 ? '+' : ''}
                      {step}
                    </Txt>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <Button
                  title={`Log set ${nextSetNumber}`}
                  icon="checkmark"
                  style={{ flex: 1 }}
                  onPress={add}
                />
                <Button
                  title={`${exercise.restSeconds}s`}
                  icon="timer-outline"
                  variant="glass"
                  onPress={() => onStartRest(exercise.restSeconds)}
                />
              </View>

              <Pressable
                onPress={onRemove}
                style={{ alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm }}
              >
                <Txt variant="caption" color={theme.danger}>
                  Remove this exercise
                </Txt>
              </Pressable>
            </>
          )}
        </View>
      )}
    </GlassCard>
  );
}

// -------------------------------------------------------------- rest timer

function RestTimerOverlay({
  secondsLeft,
  total,
  onSkip,
  onAdd,
}: {
  secondsLeft: number;
  total: number;
  onSkip: () => void;
  onAdd: (extra: number) => void;
}) {
  const { theme, spacing, radius } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [secondsLeft, pulse]);

  if (secondsLeft <= 0) return null;

  const percentage = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onSkip}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(5,8,11,0.92)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <Txt variant="overline" color={theme.textTertiary}>
          REST
        </Txt>

        <Animated.View style={{ transform: [{ scale: pulse }], marginVertical: spacing.xl }}>
          <ProgressRing
            percentage={percentage}
            size={210}
            strokeWidth={13}
            color={theme.primary}
            trackColor="rgba(255,255,255,0.09)"
          >
            <Txt variant="numericLarge" color="#FFFFFF">
              {secondsLeft}
            </Txt>
            <Txt variant="caption" color={theme.textTertiary}>
              seconds
            </Txt>
          </ProgressRing>
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          {[15, 30, 60].map((extra) => (
            <Pressable
              key={extra}
              onPress={() => onAdd(extra)}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: 'rgba(255,255,255,0.18)',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Txt variant="small" color="#FFFFFF" style={{ fontWeight: '700' }}>
                +{extra}s
              </Txt>
            </Pressable>
          ))}
        </View>

        <Button title="Skip rest" icon="play-forward" variant="glass" onPress={onSkip} />
      </View>
    </Modal>
  );
}

import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { sessionsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  ErrorState,
  IconButton,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { ProgressRing } from '@/components/charts';
import { formatDate, formatDuration, humanise } from '@/utils/format';

export default function WorkoutSummaryScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const session = useApi(() => sessionsApi.get(id), [id]);

  const remove = () => {
    confirm({
      title: 'Delete workout',
      message: 'This recorded session will be permanently removed.',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await sessionsApi.remove(id).catch(() => undefined);
      router.back();
    });
  };

  if (session.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  if (session.error || !session.data) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Workout" showBack />
        <ErrorState message={session.error || 'Not found'} onRetry={session.refetch} />
      </Screen>
    );
  }

  const s = session.data;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={s.title || 'Workout'}
        subtitle={formatDate(s.sessionDate, 'long')}
        showBack
        right={<IconButton icon="trash-outline" color={theme.danger} onPress={remove} />}
      />

      {/* ------------------------------------------------------ headline */}
      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base }}>
          <ProgressRing percentage={s.completionPercentage || 0} size={96} strokeWidth={10}>
            <Txt variant="h3">{Math.round(s.completionPercentage || 0)}%</Txt>
            <Txt variant="caption" color={theme.textTertiary}>
              done
            </Txt>
          </ProgressRing>

          <View style={{ flex: 1, marginLeft: spacing.lg }}>
            <Badge
              label={s.status}
              color={
                s.status === 'COMPLETED'
                  ? theme.success
                  : s.status === 'CANCELLED'
                    ? theme.danger
                    : theme.streak
              }
            />
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: spacing.sm }}>
              DURATION
            </Txt>
            <Txt variant="numeric">{formatDuration(s.durationSeconds)}</Txt>
            {s.muscleGroups && s.muscleGroups.length > 0 && (
              <Txt variant="caption" color={theme.primary} style={{ marginTop: 3 }}>
                {s.muscleGroups.join(' · ')}
              </Txt>
            )}
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            paddingTop: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.divider,
          }}
        >
          <Stat label="Exercises" value={s.completedExerciseCount ?? 0} />
          <Stat label="Sets" value={s.completedSets ?? 0} />
          <Stat label="Reps" value={s.totalReps ?? 0} />
          <Stat label="Volume" value={`${Math.round(s.totalVolumeKg)}kg`} />
        </View>

        {s.caloriesBurned > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.divider,
            }}
          >
            <Ionicons name="flame" size={15} color={theme.nutrition} />
            <Txt variant="small" color={theme.nutrition} style={{ marginLeft: 5, fontWeight: '700' }}>
              ~{s.caloriesBurned} kcal burned
            </Txt>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 5 }}>
              (estimate)
            </Txt>
          </View>
        )}
      </GlassCard>

      {/* ----------------------------------------------------- exercises */}
      <SectionHeader title="Exercises" />

      {s.exercises.map((se) => {
        const completed = se.sets.filter((x) => x.completed);
        const accent = se.exercise.category?.colorHex || theme.primary;
        const best = completed.reduce(
          (max, x) => (x.weightKg > (max?.weightKg ?? 0) ? x : max),
          completed[0],
        );

        return (
          <GlassCard key={se.id} style={{ marginBottom: spacing.base }} padded={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: radius.sm,
                  overflow: 'hidden',
                  backgroundColor: theme.surfaceMuted,
                }}
              >
                {se.exercise.imageUrl ? (
                  <Image
                    source={{ uri: se.exercise.imageUrl }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell-outline" size={19} color={accent} />
                  </View>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Txt variant="bodyStrong" numberOfLines={1}>
                  {se.exercise.name}
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                  {completed.length} sets · {Math.round(se.totalVolumeKg ?? 0)} kg volume
                </Txt>
              </View>

              {se.status === 'SKIPPED' ? (
                <Badge label="SKIPPED" color={theme.textTertiary} size="sm" />
              ) : best ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="small" color={accent} style={{ fontWeight: '800' }}>
                    {best.weightKg} kg
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary}>
                    best set
                  </Txt>
                </View>
              ) : null}
            </View>

            {completed.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.base,
                  paddingBottom: spacing.base,
                }}
              >
                {completed.map((set) => (
                  <View
                    key={set.id}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 6,
                      borderRadius: radius.sm,
                      backgroundColor: `${accent}18`,
                    }}
                  >
                    <Txt variant="caption" color={theme.textTertiary}>
                      SET {set.setNumber}
                    </Txt>
                    <Txt variant="small" style={{ fontWeight: '700', marginTop: 1 }}>
                      {set.reps} × {set.weightKg}kg
                    </Txt>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        );
      })}

      {s.notes ? (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: 4 }}>
            NOTES
          </Txt>
          <Txt variant="small">{s.notes}</Txt>
        </GlassCard>
      ) : null}

      <Button
        title="Back to home"
        icon="home-outline"
        variant="glass"
        fullWidth
        onPress={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="bodyStrong">{value}</Txt>
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

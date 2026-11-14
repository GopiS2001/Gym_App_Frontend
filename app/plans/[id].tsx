import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { plansApi } from '@/services/endpoints';
import { Screen } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { DIFFICULTY_LABELS, WEEK_DAY_LABELS } from '@/utils/format';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function PlanDetailScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const todayName = DAYS[(new Date().getDay() + 6) % 7];
  const [selectedDay, setSelectedDay] = useState(todayName);

  const plan = useApi(() => plansApi.get(id), [id], { refetchOnFocus: true });

  const activate = async () => {
    const updated = await plansApi.activate(id).catch(() => null);
    if (updated) plan.setData(updated);
  };

  const archive = async () => {
    const updated = await plansApi.archive(id).catch(() => null);
    if (updated) plan.setData(updated);
  };

  const duplicate = async () => {
    const copy = await plansApi.duplicate(id).catch(() => null);
    if (copy) router.replace(`/plans/${copy.id}`);
  };

  const remove = () => {
    confirm({
      title: 'Delete plan',
      message: 'This plan and its schedule will be removed.',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await plansApi.remove(id).catch(() => undefined);
      router.back();
    });
  };

  const removeExercise = (rowId: string, name: string) => {
    confirm({
      title: 'Remove exercise',
      message: `Remove "${name}" from this day?`,
      tone: 'danger',
      confirmLabel: 'Remove',
    }).then(async (ok) => {
      if (!ok) return;
      const updated = await plansApi.removeExercise(id, rowId).catch(() => null);
      if (updated) plan.setData(updated);
    });
  };

  if (plan.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  if (plan.error || !plan.data) {
    return (
      <Screen withTabBar={false}>
        <ErrorState message={plan.error || 'Not found'} onRetry={plan.refetch} />
      </Screen>
    );
  }

  const p = plan.data;
  const day = p.schedule?.find((s) => s.day === selectedDay);

  return (
    <Screen withTabBar={false} padded={false}>
      {/* --------------------------------------------------------- hero */}
      <View style={{ height: 210, marginBottom: spacing.base }}>
        {p.coverImageUrl ? (
          <Image
            source={{ uri: p.coverImageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <LinearGradient colors={theme.primaryGradient} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={['rgba(7,10,14,0.5)', 'rgba(7,10,14,0.25)', theme.background]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
          }}
        >
          <IconButton icon="chevron-back" color="#FFFFFF" onPress={() => router.back()} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton icon="copy-outline" color="#FFFFFF" onPress={duplicate} />
            <IconButton
              icon="create-outline"
              color="#FFFFFF"
              onPress={() => router.push(`/plans/create?id=${id}`)}
            />
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Badge
              label={p.status}
              color={
                p.status === 'ACTIVE' ? '#5CD9AE' : p.status === 'DRAFT' ? '#FFBF5E' : '#94A1B2'
              }
            />
            <Badge label={DIFFICULTY_LABELS[p.difficultyLevel] || ''} color="#FFFFFF" />
          </View>
          <Txt variant="h1" color="#FFFFFF" numberOfLines={2}>
            {p.planName}
          </Txt>
          <Txt variant="caption" color="rgba(255,255,255,0.72)" style={{ marginTop: 4 }}>
            {p.exerciseCount} exercises · {p.sessionCount ?? 0} sessions completed
          </Txt>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {p.description ? (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <Txt variant="small" color={theme.textSecondary} style={{ lineHeight: 21 }}>
              {p.description}
            </Txt>
          </GlassCard>
        ) : null}

        {p.status !== 'ACTIVE' ? (
          <Button
            title="Make this my active plan"
            icon="checkmark-circle"
            fullWidth
            style={{ marginBottom: spacing.base }}
            onPress={activate}
          />
        ) : (
          <Button
            title="Start today's workout"
            icon="play"
            fullWidth
            style={{ marginBottom: spacing.base }}
            onPress={() => router.push(`/workout/start?planId=${id}&day=${todayName}`)}
          />
        )}

        {/* ------------------------------------------------- day picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: spacing.base }}
        >
          {DAYS.map((d) => {
            const entry = p.schedule?.find((s) => s.day === d);
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

        {/* ---------------------------------------------- day schedule */}
        {!day || day.isRestDay ? (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <EmptyState
              icon="moon-outline"
              title="Rest day"
              message={`Nothing scheduled for ${WEEK_DAY_LABELS[selectedDay]}.`}
              actionLabel="Add an exercise"
              onAction={() => router.push(`/plans/add-exercise?planId=${id}&day=${selectedDay}`)}
            />
          </GlassCard>
        ) : (
          <>
            <GlassCard variant="subtle" style={{ marginBottom: spacing.base }}>
              <View style={{ flexDirection: 'row' }}>
                <Summary label="Exercises" value={day.exerciseCount} />
                <Summary label="Est. time" value={`${day.estimatedMinutes}m`} />
                <Summary
                  label="Sets"
                  value={day.exercises.reduce((sum, e) => sum + e.targetSets, 0)}
                />
              </View>
              {day.muscleGroups.length > 0 && (
                <Txt
                  variant="caption"
                  color={theme.primary}
                  align="center"
                  style={{ marginTop: spacing.sm }}
                >
                  {day.muscleGroups.join(' · ')}
                </Txt>
              )}
            </GlassCard>

            {day.exercises.map((pe, index) => {
              const accent = pe.exercise.category?.colorHex || theme.primary;
              return (
                <GlassCard key={pe.id} style={{ marginBottom: spacing.base }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.surfaceMuted,
                      }}
                    >
                      <Txt variant="caption" color={theme.textSecondary}>
                        {index + 1}
                      </Txt>
                    </View>

                    <Pressable
                      onPress={() => router.push(`/exercises/${pe.exerciseId}`)}
                      style={{
                        width: 46,
                        height: 46,
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
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="barbell-outline" size={18} color={accent} />
                        </View>
                      )}
                    </Pressable>

                    <Pressable
                      style={{ flex: 1, marginLeft: spacing.md }}
                      onPress={() => router.push(`/exercises/${pe.exerciseId}`)}
                    >
                      <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                        {pe.exercise.name}
                      </Txt>
                      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                        {pe.targetSets} × {pe.targetReps}
                        {pe.targetWeightKg ? ` @ ${pe.targetWeightKg}kg` : ''} · {pe.restSeconds}s
                      </Txt>
                    </Pressable>

                    <Pressable
                      onPress={() => removeExercise(pe.id, pe.exercise.name)}
                      hitSlop={8}
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="close-circle-outline" size={19} color={theme.textTertiary} />
                    </Pressable>
                  </View>
                </GlassCard>
              );
            })}

            <Button
              title={`Add exercise to ${WEEK_DAY_LABELS[selectedDay]}`}
              icon="add"
              variant="glass"
              fullWidth
              style={{ marginBottom: spacing.base }}
              onPress={() => router.push(`/plans/add-exercise?planId=${id}&day=${selectedDay}`)}
            />
          </>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xxl }}>
          {p.status === 'ACTIVE' && (
            <Button
              title="Archive"
              icon="archive-outline"
              variant="glass"
              style={{ flex: 1 }}
              onPress={archive}
            />
          )}
          <Button
            title="Delete plan"
            icon="trash-outline"
            variant="glass"
            style={{ flex: 1 }}
            onPress={remove}
          />
        </View>
      </View>
    </Screen>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
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

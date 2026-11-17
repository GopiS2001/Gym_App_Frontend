import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/AuthContext';
import { useApi } from '@/hooks/useApi';
import { analyticsApi, waterApi } from '@/services/endpoints';
import { Screen } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { heroTheme } from '@/theme/tokens';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { ActivityRings, BarChart, ProgressRing } from '@/components/charts';
import { formatDate, formatRelativeDate } from '@/utils/format';

const { width: SCREEN_W } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();

  const dashboard = useApi(() => analyticsApi.dashboard(), [], { refetchOnFocus: true });

  const addWater = async (amountMl: number) => {
    await waterApi.add(amountMl).catch(() => undefined);
    dashboard.refresh();
  };

  if (dashboard.loading) {
    return (
      <Screen>
        <LoadingState message="Loading your dashboard" />
      </Screen>
    );
  }

  if (dashboard.error || !dashboard.data) {
    return (
      <Screen>
        <ErrorState message={dashboard.error || 'No data'} onRetry={dashboard.refetch} />
      </Screen>
    );
  }

  const d = dashboard.data;
  const avatar = d.profile?.profileImageUrl || profile?.profileImageUrl;

  return (
    <Screen refreshing={dashboard.refreshing} onRefresh={dashboard.refresh}>
      {/* ------------------------------------------------------- greeting */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <Pressable onPress={() => router.push('/(tabs)/profile')}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: theme.primary,
              backgroundColor: theme.surfaceMuted,
            }}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={22} color={theme.textTertiary} />
              </View>
            )}
          </View>
        </Pressable>

        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Txt variant="small" color={theme.textTertiary}>
            {d.greeting}
          </Txt>
          <Txt variant="h3" numberOfLines={1}>
            {d.profile?.fullName || 'Athlete'}
          </Txt>
        </View>

        {d.totals.currentStreak > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: 7,
              borderRadius: radius.pill,
              backgroundColor: theme.streakSoft,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: `${theme.streak}44`,
            }}
          >
            <Ionicons name="flame" size={14} color={theme.streak} />
            <Txt variant="caption" color={theme.streak} style={{ marginLeft: 4 }}>
              {d.totals.currentStreak} DAY
            </Txt>
          </View>
        )}
      </View>

      {/* --------------------------------------------- resume live session */}
      {d.activeSession && (
        <GlassCard
          variant="strong"
          glowColor={theme.primary}
          style={{ marginBottom: spacing.base }}
          onPress={() => router.push(`/workout/active?id=${d.activeSession!.id}`)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primarySoft,
              }}
            >
              <Ionicons name="play" size={19} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Badge label="IN PROGRESS" color={theme.primary} size="sm" />
              <Txt variant="bodyStrong" style={{ marginTop: 3 }} numberOfLines={1}>
                {d.activeSession.title || 'Workout'}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          </View>
        </GlassCard>
      )}

      {/* -------------------------------------------------- today's rings */}
      <GlassCard variant="hero" style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.base }}>
          <View>
            <Txt variant="h4">Today's Progress</Txt>
            <Txt variant="caption" color={heroTheme.textTertiary} style={{ marginTop: 2 }}>
              {formatDate(d.todaysProgress.date, 'long')}
            </Txt>
          </View>
          <Badge
            label={d.todaysProgress.workoutCompleted ? 'TRAINED' : 'PENDING'}
            color={d.todaysProgress.workoutCompleted ? heroTheme.success : heroTheme.textTertiary}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ position: 'relative' }}>
            <ActivityRings
              size={118}
              strokeWidth={11}
              gap={4}
              rings={[
                {
                  percentage: d.todaysProgress.workoutCompleted ? 100 : 0,
                  color: heroTheme.primary,
                },
                {
                  percentage: Math.min(
                    100,
                    (d.todaysProgress.caloriesConsumed / Math.max(1, d.todaysProgress.calorieTarget)) * 100,
                  ),
                  color: heroTheme.nutrition,
                },
                { percentage: d.todaysProgress.waterPercentage, color: heroTheme.hydration },
              ]}
            />
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt variant="h3">{d.todaysProgress.overallPercentage}%</Txt>
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: spacing.lg, gap: spacing.md }}>
            <MetricRow
              color={heroTheme.primary}
              icon="barbell"
              label="Workout"
              value={
                d.todaysProgress.workoutMinutes > 0
                  ? `${d.todaysProgress.workoutMinutes} min`
                  : 'Not yet'
              }
            />
            <MetricRow
              color={heroTheme.nutrition}
              icon="flame"
              label="Calories"
              value={`${Math.round(d.todaysProgress.caloriesConsumed)} / ${d.todaysProgress.calorieTarget}`}
            />
            <MetricRow
              color={heroTheme.hydration}
              icon="water"
              label="Water"
              value={`${(d.todaysProgress.waterMl / 1000).toFixed(1)} / ${(
                d.todaysProgress.waterTargetMl / 1000
              ).toFixed(1)} L`}
            />
          </View>
        </View>
      </GlassCard>

      {/* ---------------------------------------------- today's workout */}
      {d.todaysWorkout && !d.todaysWorkout.isRestDay ? (
        <GlassCard padded={false} style={{ marginBottom: spacing.base }} variant="strong">
          <View style={{ height: 136 }}>
            {d.todaysWorkout.exercises[0]?.imageUrl ? (
              <Image
                source={{ uri: d.todaysWorkout.exercises[0].imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <LinearGradient colors={theme.primaryGradient} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient
              colors={['rgba(7,10,14,0.15)', 'rgba(7,10,14,0.88)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={{ flex: 1, padding: spacing.base, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Badge
                  label={`TODAY · ${d.todaysWorkout.day.slice(0, 3)}`}
                  color="#FFFFFF"
                />
                {d.todaysWorkout.alreadyCompleted && (
                  <Badge label="DONE" icon="checkmark-circle" color="#5CD9AE" />
                )}
              </View>

              <View>
                <Txt variant="h3" color="#FFFFFF" numberOfLines={1}>
                  {d.todaysWorkout.muscleGroups.join(' + ') || d.todaysWorkout.planName}
                </Txt>
                <View style={{ flexDirection: 'row', marginTop: 5, gap: spacing.base }}>
                  <InlineStat icon="list" text={`${d.todaysWorkout.exerciseCount} exercises`} />
                  <InlineStat icon="time-outline" text={`~${d.todaysWorkout.estimatedMinutes} min`} />
                </View>
              </View>
            </View>
          </View>

          <View style={{ padding: spacing.base }}>
            <Button
              title={
                d.activeSession
                  ? 'Resume workout'
                  : d.todaysWorkout.alreadyCompleted
                    ? 'Train again'
                    : 'Start workout'
              }
              icon="play"
              fullWidth
              onPress={() =>
                d.activeSession
                  ? router.push(`/workout/active?id=${d.activeSession!.id}`)
                  : router.push(
                      `/workout/start?planId=${d.todaysWorkout!.planId}&day=${d.todaysWorkout!.day}`,
                    )
              }
            />
          </View>
        </GlassCard>
      ) : (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.sleepSoft,
              }}
            >
              <Ionicons name="moon" size={21} color={theme.sleep} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Txt variant="h4">
                {d.todaysWorkout ? 'Rest day' : 'No active plan'}
              </Txt>
              <Txt variant="small" color={theme.textTertiary} style={{ marginTop: 2 }}>
                {d.todaysWorkout
                  ? 'Recovery is part of the programme.'
                  : 'Create a plan to see your daily workout.'}
              </Txt>
            </View>
          </View>
          <Button
            title={d.todaysWorkout ? 'Free workout' : 'Create a plan'}
            variant="glass"
            size="sm"
            fullWidth
            icon={d.todaysWorkout ? 'flash' : 'add'}
            style={{ marginTop: spacing.md }}
            onPress={() =>
              d.todaysWorkout ? router.push('/workout/start') : router.push('/plans/create')
            }
          />
        </GlassCard>
      )}

      {/* --------------------------------------------------- weekly bars */}
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: spacing.base,
          }}
        >
          <View>
            <Txt variant="h4">Weekly Activity</Txt>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
              {d.weeklySummary.workoutCount} of {d.weeklySummary.target} workouts
            </Txt>
          </View>
          <ProgressRing
            percentage={d.weeklySummary.completionPercentage}
            size={50}
            strokeWidth={5}
          >
            <Txt variant="caption" color={theme.primary}>
              {Math.round(d.weeklySummary.completionPercentage)}%
            </Txt>
          </ProgressRing>
        </View>

        <BarChart
          height={96}
          data={d.weeklySummary.activity.map((a) => ({
            label: a.label,
            value: a.durationMinutes,
            highlight: a.isToday,
          }))}
        />

        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.base,
            paddingTop: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.divider,
          }}
        >
          <MiniStat label="Minutes" value={d.weeklySummary.totalMinutes} />
          <MiniStat label="Volume" value={`${Math.round(d.weeklySummary.totalVolumeKg)} kg`} />
          <MiniStat label="Calories" value={d.weeklySummary.caloriesBurned} />
        </View>
      </GlassCard>

      {/* ---------------------------------------------------- weight card */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.base }}>
        <GlassCard style={{ flex: 1 }} onPress={() => router.push('/(tabs)/progress')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="scale-outline" size={15} color={theme.primary} />
            <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 5 }}>
              WEIGHT
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Txt variant="numeric">{d.weight.currentKg?.toFixed(1) ?? '--'}</Txt>
            <Txt variant="small" color={theme.textTertiary} style={{ marginLeft: 3 }}>
              kg
            </Txt>
          </View>
          {d.weight.changeKg !== null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Ionicons
                name={d.weight.changeKg >= 0 ? 'arrow-up' : 'arrow-down'}
                size={11}
                color={theme.primary}
              />
              <Txt variant="caption" color={theme.primary} style={{ marginLeft: 2 }}>
                {Math.abs(d.weight.changeKg).toFixed(1)} kg total
              </Txt>
            </View>
          )}
        </GlassCard>

        <GlassCard style={{ flex: 1 }} onPress={() => router.push('/(tabs)/progress')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="body-outline" size={15} color={theme.streak} />
            <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 5 }}>
              BMI
            </Txt>
          </View>
          <Txt variant="numeric">{d.weight.bmi?.toFixed(1) ?? '--'}</Txt>
          <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 3 }}>
            {d.weight.bmiCategory || 'Add height & weight'}
          </Txt>
        </GlassCard>
      </View>

      {/* ------------------------------------------------------ goal card */}
      {d.activeGoal && (
        <GlassCard style={{ marginBottom: spacing.base }} onPress={() => router.push('/goals')}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="flag" size={15} color={theme.primary} />
              <Txt variant="h4" style={{ marginLeft: 6 }} numberOfLines={1}>
                {d.activeGoal.title || d.activeGoal.goalTypeLabel}
              </Txt>
            </View>
            <Txt variant="bodyStrong" color={theme.primary}>
              {Math.round(d.activeGoal.progressPercentage || 0)}%
            </Txt>
          </View>

          <ProgressBar value={d.activeGoal.progressPercentage || 0} showGlow />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            <Txt variant="caption" color={theme.textTertiary}>
              {d.activeGoal.startingWeightKg?.toFixed(1)} kg start
            </Txt>
            {d.activeGoal.daysRemaining !== null && d.activeGoal.daysRemaining !== undefined && (
              <Txt variant="caption" color={theme.textTertiary}>
                {d.activeGoal.daysRemaining > 0
                  ? `${d.activeGoal.daysRemaining} days left`
                  : 'Target date passed'}
              </Txt>
            )}
            <Txt variant="caption" color={theme.primary}>
              {d.activeGoal.targetWeightKg?.toFixed(1)} kg goal
            </Txt>
          </View>
        </GlassCard>
      )}

      {/* --------------------------------------------------- quick water */}
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="water" size={16} color={theme.hydration} />
            <Txt variant="h4" style={{ marginLeft: 6 }}>
              Hydration
            </Txt>
          </View>
          <Txt variant="bodyStrong" color={theme.hydration}>
            {(d.todaysProgress.waterMl / 1000).toFixed(2)} L
          </Txt>
        </View>

        <ProgressBar value={d.todaysProgress.waterPercentage} color={theme.hydration} showGlow />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          {[250, 500, 750].map((ml) => (
            <Pressable
              key={ml}
              onPress={() => addWater(ml)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                alignItems: 'center',
                backgroundColor: theme.hydrationSoft,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: `${theme.hydration}33`,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Txt variant="small" color={theme.hydration} style={{ fontWeight: '700' }}>
                +{ml} ml
              </Txt>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {/* ------------------------------------------------ recent activity */}
      <SectionHeader
        title="Recent Workouts"
        actionLabel="See all"
        onAction={() => router.push('/workout/history')}
      />

      {d.recentActivity.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="barbell-outline"
            title="No workouts yet"
            message="Start your first session and it will show up here."
          />
        </GlassCard>
      ) : (
        d.recentActivity.map((session) => (
          <GlassCard
            key={session.id}
            style={{ marginBottom: spacing.base }}
            onPress={() => router.push(`/workout/summary?id=${session.id}`)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  overflow: 'hidden',
                  backgroundColor: theme.surfaceMuted,
                }}
              >
                {session.coverImageUrl ? (
                  <Image
                    source={{ uri: session.coverImageUrl }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="barbell" size={20} color={theme.primary} />
                  </View>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Txt variant="bodyStrong" numberOfLines={1}>
                  {session.title || 'Workout'}
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                  {formatRelativeDate(session.sessionDate)} · {session.durationMinutes} min ·{' '}
                  {Math.round(session.totalVolumeKg)} kg
                </Txt>
              </View>

              <Ionicons name="chevron-forward" size={17} color={theme.textTertiary} />
            </View>
          </GlassCard>
        ))
      )}
    </Screen>
  );
}

// ------------------------------------------------------------- small parts

function MetricRow({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: color,
          marginRight: 8,
        }}
      />
      <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="small" style={{ fontWeight: '700' }}>
        {value}
      </Txt>
    </View>
  );
}

function InlineStat({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.75)" />
      <Txt variant="caption" color="rgba(255,255,255,0.75)" style={{ marginLeft: 4 }}>
        {text}
      </Txt>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
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

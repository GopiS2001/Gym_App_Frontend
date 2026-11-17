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
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
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
  // The dashboard has a light top (no navy header), so dark status icons.
  useStatusBarStyle('dark');
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
          marginTop: spacing.xs,
        }}
      >
        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: '#FFFFFF',
              backgroundColor: theme.primarySoft,
              boxShadow: theme.elevation.card,
            }}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="h4" color={theme.primary}>
                  {initials(d.profile?.fullName)}
                </Txt>
              </View>
            )}
          </View>
        </Pressable>

        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Txt variant="small" color={theme.textTertiary}>
            {d.greeting},
          </Txt>
          <Txt variant="h2" numberOfLines={1}>
            {d.profile?.fullName || 'Athlete'}
          </Txt>
        </View>

        {d.totals.currentStreak > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              height: 36,
              borderRadius: radius.pill,
              backgroundColor: theme.card,
              boxShadow: theme.elevation.card,
              marginRight: spacing.sm,
            }}
          >
            <Ionicons name="flame" size={14} color={theme.streak} />
            <Txt variant="caption" color={theme.text} style={{ marginLeft: 4 }}>
              {d.totals.currentStreak}
            </Txt>
          </View>
        )}
        <IconButton
          icon="notifications-outline"
          color={theme.primary}
          onPress={() => router.push('/nutrition/reminders')}
        />
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

      {/* --------------------------------------------------- quick access */}
      <GlassCard style={{ marginBottom: spacing.base }}>
        <Txt variant="h4" style={{ marginBottom: spacing.md }}>
          Quick Access
        </Txt>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <QuickAction
            icon="barbell-outline"
            label="Workout"
            highlighted
            onPress={() =>
              d.activeSession
                ? router.push(`/workout/active?id=${d.activeSession.id}`)
                : router.push('/workout/start')
            }
          />
          <QuickAction icon="restaurant-outline" label="Log meal" onPress={() => router.push('/nutrition/add')} />
          <QuickAction icon="scale-outline" label="Weight" onPress={() => router.push('/progress/log-weight')} />
          <QuickAction icon="moon-outline" label="Sleep" onPress={() => router.push('/progress/log-sleep')} />
        </View>
      </GlassCard>

      {/* ------------------------------------------------ health overview */}
      <GlassCard
        variant="tint"
        style={{ marginBottom: spacing.base }}
        onPress={() => router.push('/(tabs)/progress')}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.md,
          }}
        >
          <Txt variant="h4">Health Overview</Txt>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: 5,
              borderRadius: radius.pill,
              backgroundColor: theme.card,
              boxShadow: theme.elevation.card,
            }}
          >
            <Txt variant="caption" color={theme.text}>
              Today
            </Txt>
            <Ionicons name="chevron-forward" size={11} color={theme.textTertiary} style={{ marginLeft: 2 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <HealthStat
            label="Weight"
            value={d.weight.currentKg?.toFixed(1) ?? '--'}
            unit="kg"
            icon="scale-outline"
            note={
              d.weight.changeKg !== null
                ? `${d.weight.changeKg > 0 ? '+' : ''}${d.weight.changeKg.toFixed(1)} kg`
                : undefined
            }
          />
          <HealthStat
            label="BMI"
            value={d.weight.bmi?.toFixed(1) ?? '--'}
            unit={d.weight.bmiCategory || 'index'}
            icon="body-outline"
            divider
          />
          <HealthStat
            label="Sleep"
            value={d.lastSleep ? d.lastSleep.durationHours.toFixed(1) : '--'}
            unit="hours"
            icon="moon-outline"
            divider
          />
        </View>
      </GlassCard>

      {/* ---------------------------------------------- today's workout */}
      {d.todaysWorkout && !d.todaysWorkout.isRestDay ? (
        <GlassCard padded={false} style={{ marginBottom: spacing.base }} variant="strong">
          <View style={{ height: 170 }}>
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
              colors={['rgba(10,22,48,0.05)', 'rgba(10,22,48,0.9)']}
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
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3" color="#FFFFFF" numberOfLines={1}>
                      {d.todaysWorkout.muscleGroups.join(' + ') || d.todaysWorkout.planName}
                    </Txt>
                    <View style={{ flexDirection: 'row', marginTop: 5, gap: spacing.base }}>
                      <InlineStat icon="list" text={`${d.todaysWorkout.exerciseCount} exercises`} />
                      <InlineStat icon="time-outline" text={`~${d.todaysWorkout.estimatedMinutes} min`} />
                    </View>
                  </View>
                  <Pressable
                    onPress={() => router.push(`/plans/${d.todaysWorkout!.planId}`)}
                    accessibilityRole="button"
                    accessibilityLabel="Open workout plan"
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0px 6px 14px rgba(0,0,0,0.3)',
                      transform: pressed ? [{ scale: 0.92 }] : [{ scale: 1 }],
                    })}
                  >
                    <Ionicons name="arrow-forward" size={18} color={theme.primary} />
                  </Pressable>
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
                borderRadius: radius.pill,
                alignItems: 'center',
                backgroundColor: theme.hydrationSoft,
                boxShadow: pressed
                  ? 'inset 0px 2px 4px rgba(15,31,61,0.12)'
                  : `0px 6px 12px -6px ${theme.hydration}88, inset 0px 1px 0px rgba(255,255,255,0.9)`,
                transform: pressed ? [{ scale: 0.96 }] : [{ scale: 1 }],
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

function initials(name?: string | null) {
  const parts = (name || 'A').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A';
}

/** Round icon tile from the reference's "Quick Access" row. */
function QuickAction({
  icon,
  label,
  onPress,
  highlighted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  highlighted?: boolean;
}) {
  const { theme, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        alignItems: 'center',
        width: 72,
        transform: pressed ? [{ scale: 0.94 }] : [{ scale: 1 }],
      })}
    >
      {({ pressed }) => (
        <>
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 29,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: highlighted ? theme.primarySoft : theme.card,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: highlighted ? '#CCDCF6' : theme.glassBorder,
              boxShadow: pressed ? theme.elevation.pressed : theme.elevation.card,
            }}
          >
            <Ionicons name={icon} size={23} color={theme.primary} />
          </View>
          <Txt
            variant="caption"
            color={theme.textSecondary}
            align="center"
            numberOfLines={1}
            style={{ marginTop: spacing.sm }}
          >
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

/** One column of the pale-blue "Health Overview" card. */
function HealthStat({
  label,
  value,
  unit,
  icon,
  note,
  divider = false,
}: {
  label: string;
  value: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  note?: string;
  divider?: boolean;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingLeft: divider ? spacing.md : 0,
        marginLeft: divider ? spacing.md : 0,
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: 'rgba(15,31,61,0.08)',
      }}
    >
      <Txt variant="caption" color={theme.textSecondary}>
        {label}
      </Txt>
      <Txt variant="numeric" style={{ fontSize: 24, lineHeight: 30, marginTop: 4 }}>
        {value}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <Txt variant="caption" color={theme.textTertiary} numberOfLines={1} style={{ flex: 1 }}>
          {note || unit}
        </Txt>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.card,
          }}
        >
          <Ionicons name={icon} size={12} color={theme.primary} />
        </View>
      </View>
    </View>
  );
}

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

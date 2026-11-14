import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { analyticsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { BarChart, ChartLegend, DonutChart, LineChart } from '@/components/charts';
import { formatMinutes, formatVolume } from '@/utils/format';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 40 - 32;

export default function AnalyticsScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [days, setDays] = useState(30);
  const [monthOffset, setMonthOffset] = useState(0);

  const monthParam = (() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
  })();

  const workouts = useApi(() => analyticsApi.workouts(days), [days], {
    refetchOnFocus: true,
  });
  const monthly = useApi(() => analyticsApi.monthly(monthParam), [monthParam]);
  const strength = useApi(() => analyticsApi.strength(undefined, 8), []);

  if (workouts.loading) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Analytics" showBack />
        <LoadingState message="Crunching your numbers" />
      </Screen>
    );
  }

  if (workouts.error || !workouts.data) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Analytics" showBack />
        <ErrorState message={workouts.error || 'No data'} onRetry={workouts.refetch} />
      </Screen>
    );
  }

  const w = workouts.data;
  const m = monthly.data;

  const palette = [
    theme.primary,
    theme.hydration,
    theme.streak,
    theme.nutrition,
    theme.sleep,
    theme.textTertiary,
  ];

  return (
    <Screen
      withTabBar={false}
      refreshing={workouts.refreshing}
      onRefresh={() => {
        workouts.refresh();
        monthly.refresh();
        strength.refresh();
      }}
    >
      <ScreenHeader title="Analytics" subtitle="Reports across your training" showBack />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.base }}
      >
        {[7, 30, 90, 180].map((d) => (
          <Chip
            key={d}
            label={`${d} days`}
            selected={days === d}
            onPress={() => setDays(d)}
          />
        ))}
      </ScrollView>

      {/* ----------------------------------------------------- totals */}
      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <Txt variant="h4" style={{ marginBottom: spacing.base }}>
          Training Totals
        </Txt>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <Tile
            label="Sessions"
            value={w.totals.sessionCount}
            icon="barbell"
            color={theme.primary}
          />
          <Tile
            label="Total time"
            value={formatMinutes(w.totals.totalMinutes)}
            icon="time"
            color={theme.hydration}
          />
          <Tile
            label="Volume"
            value={formatVolume(w.totals.totalVolumeKg)}
            icon="layers"
            color={theme.streak}
          />
          <Tile
            label="Sets"
            value={w.totals.totalSets}
            icon="repeat"
            color={theme.sleep}
          />
          <Tile
            label="Avg session"
            value={`${w.totals.averageMinutes}m`}
            icon="speedometer"
            color={theme.nutrition}
          />
          <Tile
            label="Calories"
            value={w.totals.caloriesBurned}
            icon="flame"
            color={theme.danger}
          />
        </View>
      </GlassCard>

      {/* ------------------------------------------------ volume trend */}
      <GlassCard style={{ marginBottom: spacing.base }}>
        <Txt variant="h4" style={{ marginBottom: spacing.sm }}>
          Volume Over Time
        </Txt>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.base }}>
          Total weight moved per day
        </Txt>

        <LineChart
          points={w.points.map((p) => ({ date: p.date, value: p.volumeKg }))}
          width={CHART_W}
          height={170}
          color={theme.primary}
          showDots={w.points.length <= 40}
        />
      </GlassCard>

      {/* --------------------------------------------- muscle balance */}
      {w.muscleDistribution.length > 0 && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <Txt variant="h4" style={{ marginBottom: spacing.base }}>
            Muscle Group Balance
          </Txt>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <DonutChart
              size={132}
              strokeWidth={20}
              centerValue={`${w.muscleDistribution.length}`}
              centerLabel="groups"
              segments={w.muscleDistribution.slice(0, 6).map((d, i) => ({
                label: d.name,
                value: d.count,
                color: palette[i],
              }))}
            />
            <View style={{ flex: 1, marginLeft: spacing.lg }}>
              <ChartLegend
                items={w.muscleDistribution.slice(0, 6).map((d, i) => ({
                  label: d.name,
                  color: palette[i],
                  value: `${d.percentage}%`,
                }))}
              />
            </View>
          </View>
        </GlassCard>
      )}

      {/* ------------------------------------------ session frequency */}
      <GlassCard style={{ marginBottom: spacing.base }}>
        <Txt variant="h4" style={{ marginBottom: spacing.base }}>
          Session Frequency
        </Txt>
        <BarChart
          height={100}
          color={theme.hydration}
          data={w.points.slice(-14).map((p) => ({
            label: p.date.slice(8),
            value: p.durationMinutes,
          }))}
        />
        <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginTop: spacing.sm }}>
          Minutes trained, last 14 days
        </Txt>
      </GlassCard>

      {/* --------------------------------------------- monthly report */}
      <SectionHeader title="Monthly Report" />

      <GlassCard style={{ marginBottom: spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.base,
          }}
        >
          <Pressable onPress={() => setMonthOffset((v) => v - 1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={19} color={theme.textSecondary} />
          </Pressable>
          <Txt variant="h4">{m?.monthLabel || monthParam}</Txt>
          <Pressable
            onPress={() => setMonthOffset((v) => Math.min(0, v + 1))}
            hitSlop={10}
            disabled={monthOffset >= 0}
          >
            <Ionicons
              name="chevron-forward"
              size={19}
              color={monthOffset >= 0 ? theme.border : theme.textSecondary}
            />
          </Pressable>
        </View>

        {monthly.loading ? (
          <LoadingState />
        ) : !m ? (
          <EmptyState icon="calendar-outline" title="No data for this month" />
        ) : (
          <>
            <ReportRow
              icon="barbell"
              color={theme.primary}
              label="Workouts"
              value={`${m.workouts.count}`}
              detail={`${formatMinutes(m.workouts.totalMinutes)} · ${formatVolume(
                m.workouts.totalVolumeKg,
              )} · ${m.workouts.totalSets} sets`}
            />
            <ReportRow
              icon="scale"
              color={theme.hydration}
              label="Body weight"
              value={
                m.body.changeKg != null
                  ? `${m.body.changeKg >= 0 ? '+' : ''}${m.body.changeKg.toFixed(1)} kg`
                  : '--'
              }
              detail={
                m.body.startWeightKg != null
                  ? `${m.body.startWeightKg} → ${m.body.endWeightKg} kg · ${m.body.entriesLogged} entries`
                  : 'No weight logged'
              }
            />
            <ReportRow
              icon="nutrition"
              color={theme.nutrition}
              label="Nutrition"
              value={`${m.nutrition.averageDailyCalories} kcal`}
              detail={`${m.nutrition.daysLogged} days logged · ${m.nutrition.averageDailyProteinG}g protein avg`}
            />
            <ReportRow
              icon="water"
              color={theme.hydration}
              label="Hydration"
              value={`${(m.hydration.totalMl / 1000).toFixed(1)} L`}
              detail={`${m.hydration.daysLogged} days logged`}
            />
            <ReportRow
              icon="moon"
              color={theme.sleep}
              label="Sleep"
              value={`${m.sleep.averageHours}h`}
              detail={`${m.sleep.nightsLogged} nights recorded`}
            />
            <ReportRow
              icon="calendar"
              color={theme.streak}
              label="Attendance"
              value={`${m.attendance.consistencyPercentage}%`}
              detail={`${m.attendance.daysAttended} of ${m.attendance.daysInMonth} days`}
              last
            />

            {m.workouts.mostTrained.length > 0 && (
              <View
                style={{
                  marginTop: spacing.base,
                  paddingTop: spacing.base,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.divider,
                }}
              >
                <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
                  MOST TRAINED
                </Txt>
                {m.workouts.mostTrained.map((item, index) => (
                  <View
                    key={item.name}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                  >
                    <Txt variant="caption" color={theme.textTertiary} style={{ width: 18 }}>
                      {index + 1}
                    </Txt>
                    <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>
                      {item.name}
                    </Txt>
                    <Txt variant="caption" color={theme.primary}>
                      {item.count}×
                    </Txt>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </GlassCard>

      {/* ------------------------------------------- personal records */}
      <SectionHeader title="Strength Records" />
      {!strength.data?.personalRecords?.length ? (
        <GlassCard>
          <EmptyState icon="trophy-outline" title="No records yet" />
        </GlassCard>
      ) : (
        <GlassCard padded={false} style={{ marginBottom: spacing.base }}>
          {strength.data.personalRecords.map((pr, index) => (
            <Pressable
              key={pr.exerciseId}
              onPress={() => router.push(`/exercises/${pr.exerciseId}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.base,
                borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: theme.divider,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: index < 3 ? theme.streakSoft : theme.surfaceMuted,
                }}
              >
                <Txt
                  variant="caption"
                  color={index < 3 ? theme.streak : theme.textTertiary}
                >
                  {index + 1}
                </Txt>
              </View>

              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                  {pr.exerciseName}
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                  {pr.categoryName} · {pr.reps} reps · {pr.achievedOn}
                </Txt>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Txt variant="bodyStrong" color={theme.streak}>
                  {pr.maxWeightKg} kg
                </Txt>
                <Txt variant="caption" color={theme.textTertiary}>
                  ~{pr.estimatedOneRepMaxKg} 1RM
                </Txt>
              </View>
            </Pressable>
          ))}
        </GlassCard>
      )}

      <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginBottom: spacing.lg }}>
        One-rep-max and calorie figures are estimates derived from your logged data.
      </Txt>
    </Screen>
  );
}

function Tile({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  const { theme, spacing, radius } = useTheme();
  return (
    <View
      style={{
        width: '47%',
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: theme.surfaceMuted,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
        <Ionicons name={icon} size={13} color={color} />
        <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 4 }} numberOfLines={1}>
          {label}
        </Txt>
      </View>
      <Txt variant="h4">{value}</Txt>
    </View>
  );
}

function ReportRow({
  icon,
  color,
  label,
  value,
  detail,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  detail: string;
  last?: boolean;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.divider,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}22`,
        }}
      >
        <Ionicons name={icon} size={15} color={color} />
      </View>

      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Txt variant="small" style={{ fontWeight: '700' }}>
          {label}
        </Txt>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }} numberOfLines={1}>
          {detail}
        </Txt>
      </View>

      <Txt variant="bodyStrong" color={color}>
        {value}
      </Txt>
    </View>
  );
}

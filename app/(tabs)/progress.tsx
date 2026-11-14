import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { analyticsApi, progressApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ProgressBar,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { ChartLegend, DonutChart, LineChart } from '@/components/charts';
import { formatDate, formatRelativeDate, formatVolume } from '@/utils/format';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 40 - 32;

type Range = 30 | 90 | 180 | 365;

export default function ProgressScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const [range, setRange] = useState<Range>(90);
  // Real width of the measurement grid; the window width read at module load
  // is wrong on web, which made 3 tiles not fit and left the right column empty.
  const [measureW, setMeasureW] = useState(CHART_W);

  const weight = useApi(() => progressApi.weightChart(range), [range], {
    refetchOnFocus: true,
  });
  const summary = useApi(() => progressApi.weightSummary(), [], { refetchOnFocus: true });
  const measurements = useApi(() => progressApi.measurementSummary(), [], {
    refetchOnFocus: true,
  });
  const photos = useApi(() => progressApi.photos({ limit: 6 }), [], {
    refetchOnFocus: true,
  });
  const stats = useApi(() => analyticsApi.workouts(range > 90 ? 90 : range), [range]);
  const records = useApi(() => analyticsApi.strength(undefined, 5), []);

  const loading = weight.loading || summary.loading;

  const refreshAll = () => {
    weight.refresh();
    summary.refresh();
    measurements.refresh();
    photos.refresh();
    stats.refresh();
    records.refresh();
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Progress" />
        <LoadingState message="Loading your progress" />
      </Screen>
    );
  }

  if (weight.error) {
    return (
      <Screen>
        <ScreenHeader title="Progress" />
        <ErrorState message={weight.error} onRetry={weight.refetch} />
      </Screen>
    );
  }

  const s = summary.data;

  return (
    <Screen refreshing={weight.refreshing} onRefresh={refreshAll}>
      <ScreenHeader
        title="Progress"
        subtitle="Body, strength and transformation"
        right={
          <IconButton
            icon="add"
            color={theme.primary}
            onPress={() => router.push('/progress/log-weight')}
          />
        }
      />

      {/* ----------------------------------------------- weight headline */}
      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: spacing.base,
          }}
        >
          <View>
            <Txt variant="caption" color={theme.textTertiary}>
              CURRENT WEIGHT
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
              <Txt variant="numericLarge">{s?.currentWeightKg?.toFixed(1) ?? '--'}</Txt>
              <Txt variant="h4" color={theme.textTertiary} style={{ marginLeft: 5 }}>
                kg
              </Txt>
            </View>
            {s?.totalChangeKg !== null && s?.totalChangeKg !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Ionicons
                  name={s.totalChangeKg >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={theme.primary}
                />
                <Txt variant="small" color={theme.primary} style={{ marginLeft: 4, fontWeight: '700' }}>
                  {s.totalChangeKg >= 0 ? '+' : ''}
                  {s.totalChangeKg.toFixed(1)} kg overall
                </Txt>
              </View>
            )}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            {s?.targetWeightKg != null && (
              <>
                <Txt variant="caption" color={theme.textTertiary}>
                  TARGET
                </Txt>
                <Txt variant="h3" color={theme.streak} style={{ marginTop: 3 }}>
                  {s.targetWeightKg.toFixed(1)}
                </Txt>
                {s.remainingToTargetKg != null && (
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {Math.abs(s.remainingToTargetKg).toFixed(1)} kg to go
                  </Txt>
                )}
              </>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
          {([30, 90, 180, 365] as Range[]).map((r) => (
            <Chip
              key={r}
              label={r === 365 ? '1Y' : `${r}D`}
              selected={range === r}
              onPress={() => setRange(r)}
            />
          ))}
        </View>

        <LineChart
          points={weight.data?.points || []}
          width={CHART_W}
          height={180}
          targetValue={weight.data?.targetWeightKg}
          color={theme.primary}
        />

        <View
          style={{
            flexDirection: 'row',
            marginTop: spacing.md,
            paddingTop: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.divider,
          }}
        >
          <Stat label="Start" value={`${s?.startingWeightKg?.toFixed(1) ?? '--'}`} />
          <Stat
            label="7 days"
            value={
              s?.weeklyChangeKg != null
                ? `${s.weeklyChangeKg >= 0 ? '+' : ''}${s.weeklyChangeKg.toFixed(1)}`
                : '--'
            }
          />
          <Stat
            label="30 days"
            value={
              s?.monthlyChangeKg != null
                ? `${s.monthlyChangeKg >= 0 ? '+' : ''}${s.monthlyChangeKg.toFixed(1)}`
                : '--'
            }
          />
          <Stat label="Entries" value={s?.entryCount ?? 0} />
        </View>

        <Button
          title="Log today's weight"
          icon="add-circle-outline"
          variant="glass"
          size="sm"
          fullWidth
          style={{ marginTop: spacing.md }}
          onPress={() => router.push('/progress/log-weight')}
        />
      </GlassCard>

      {/* -------------------------------------------------- measurements */}
      <SectionHeader
        title="Body Measurements"
        actionLabel="Manage"
        onAction={() => router.push('/progress/measurements')}
      />

      {measurements.data?.latest ? (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.md }}>
            LAST UPDATED {formatDate(measurements.data.recordedDate, 'medium').toUpperCase()}
          </Txt>

          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - measureW) > 0.5) setMeasureW(w);
            }}
          >
            {(measurements.data.changes || []).slice(0, 6).map((m: any) => (
              <View
                key={m.field}
                style={{
                  width: Math.floor((measureW - spacing.md * 2) / 3),
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: theme.surfaceMuted,
                }}
              >
                <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
                  {m.label}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
                  <Txt variant="h4">{m.current}</Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 2 }}>
                    {m.unit}
                  </Txt>
                </View>
                {m.change != null && m.change !== 0 && (
                  <Txt
                    variant="caption"
                    color={m.change > 0 ? theme.primary : theme.hydration}
                    style={{ marginTop: 2 }}
                  >
                    {m.change > 0 ? '+' : ''}
                    {m.change}
                  </Txt>
                )}
              </View>
            ))}
          </View>
        </GlassCard>
      ) : (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <EmptyState
            icon="resize-outline"
            title="No measurements yet"
            message="Record chest, waist and arms to see how your shape changes."
            actionLabel="Add measurements"
            onAction={() => router.push('/progress/measurements')}
          />
        </GlassCard>
      )}

      {/* -------------------------------------------- transformation */}
      <SectionHeader
        title="Transformation"
        actionLabel="View all"
        onAction={() => router.push('/progress/photos')}
      />

      {photos.data?.items.length ? (
        <GlassCard style={{ marginBottom: spacing.base }} padded={false}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
          >
            {photos.data.items.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => router.push('/progress/photos')}
                style={{ width: 108 }}
              >
                <View
                  style={{
                    height: 144,
                    borderRadius: radius.md,
                    overflow: 'hidden',
                    backgroundColor: theme.surfaceMuted,
                  }}
                >
                  <Image
                    source={{ uri: photo.photoUrl }}
                    style={{ flex: 1 }}
                    contentFit="cover"
                    transition={250}
                  />
                </View>
                <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 5 }}>
                  {formatDate(photo.capturedDate, 'dayMonth')}
                </Txt>
                {photo.weightKg != null && (
                  <Txt variant="caption" color={theme.text}>
                    {photo.weightKg.toFixed(1)} kg
                  </Txt>
                )}
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ padding: spacing.md, paddingTop: 0 }}>
            <Button
              title="Compare photos"
              icon="git-compare-outline"
              variant="glass"
              size="sm"
              fullWidth
              onPress={() => router.push('/progress/photos')}
            />
          </View>
        </GlassCard>
      ) : (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <EmptyState
            icon="camera-outline"
            title="No progress photos"
            message="Dated photos make change obvious when the scale is slow."
            actionLabel="Add a photo"
            onAction={() => router.push('/progress/photos')}
          />
        </GlassCard>
      )}

      {/* ---------------------------------------------- muscle balance */}
      {stats.data && stats.data.muscleDistribution.length > 0 && (
        <>
          <SectionHeader title="Training Split" />
          <GlassCard style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DonutChart
                size={128}
                strokeWidth={19}
                centerValue={`${stats.data.totals.sessionCount}`}
                centerLabel="sessions"
                segments={stats.data.muscleDistribution.slice(0, 6).map((m, i) => ({
                  label: m.name,
                  value: m.count,
                  color: [
                    theme.primary,
                    theme.hydration,
                    theme.streak,
                    theme.nutrition,
                    theme.sleep,
                    theme.textTertiary,
                  ][i],
                }))}
              />
              <View style={{ flex: 1, marginLeft: spacing.lg }}>
                <ChartLegend
                  items={stats.data.muscleDistribution.slice(0, 6).map((m, i) => ({
                    label: m.name,
                    color: [
                      theme.primary,
                      theme.hydration,
                      theme.streak,
                      theme.nutrition,
                      theme.sleep,
                      theme.textTertiary,
                    ][i],
                    value: `${m.percentage}%`,
                  }))}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                marginTop: spacing.base,
                paddingTop: spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.divider,
              }}
            >
              <Stat label="Volume" value={formatVolume(stats.data.totals.totalVolumeKg)} />
              <Stat label="Sets" value={stats.data.totals.totalSets} />
              <Stat label="Avg time" value={`${stats.data.totals.averageMinutes}m`} />
            </View>
          </GlassCard>
        </>
      )}

      {/* ------------------------------------------- personal records */}
      <SectionHeader title="Personal Records" />
      {records.data?.personalRecords?.length ? (
        <>
          {records.data.personalRecords.map((pr) => (
            <GlassCard
              key={pr.exerciseId}
              style={{ marginBottom: spacing.base }}
              onPress={() => router.push(`/exercises/${pr.exerciseId}`)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    backgroundColor: theme.surfaceMuted,
                  }}
                >
                  {pr.imageUrl ? (
                    <Image source={{ uri: pr.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="trophy" size={18} color={theme.streak} />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {pr.exerciseName}
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {pr.reps} reps · {formatRelativeDate(pr.achievedOn)}
                  </Txt>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Txt variant="h4" color={theme.streak}>
                    {pr.maxWeightKg} kg
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary}>
                    ~{pr.estimatedOneRepMaxKg} 1RM
                  </Txt>
                </View>
              </View>
            </GlassCard>
          ))}
          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.base }}>
            One-rep-max values are estimates calculated from your logged sets.
          </Txt>
        </>
      ) : (
        <GlassCard>
          <EmptyState
            icon="trophy-outline"
            title="No records yet"
            message="Complete a few workouts and your best lifts appear here."
          />
        </GlassCard>
      )}
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

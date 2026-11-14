import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced } from '@/hooks/useApi';
import { analyticsApi, sessionsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Txt,
} from '@/components/ui';
import { formatDate, formatMinutes, formatRelativeDate, formatVolume } from '@/utils/format';

const RANGES = [
  { label: 'All time', days: 0 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

export default function WorkoutHistoryScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [rangeDays, setRangeDays] = useState(0);
  const [status, setStatus] = useState('COMPLETED');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search, 350);

  const fromDate = (() => {
    if (!rangeDays) return undefined;
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  })();

  const sessions = useApi(
    () =>
      sessionsApi.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        fromDate,
        page,
        limit: 20,
        sortBy: 'sessionDate',
        sortOrder: 'desc',
      }),
    [debouncedSearch, status, fromDate, page],
    { refetchOnFocus: true },
  );

  const stats = useApi(() => analyticsApi.workouts(rangeDays || 365), [rangeDays]);

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader title="Workout History" subtitle="Every session you have recorded" showBack />

      <Field
        value={search}
        onChangeText={(t) => {
          setSearch(t);
          setPage(1);
        }}
        placeholder="Search by workout or exercise"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.sm }}
      >
        {RANGES.map((r) => (
          <Chip
            key={r.label}
            label={r.label}
            selected={rangeDays === r.days}
            onPress={() => {
              setRangeDays(r.days);
              setPage(1);
            }}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
      >
        {[
          { value: 'COMPLETED', label: 'Completed' },
          { value: '', label: 'All' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ].map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={status === option.value}
            onPress={() => {
              setStatus(option.value);
              setPage(1);
            }}
          />
        ))}
      </ScrollView>

      {stats.data && stats.data.totals.sessionCount > 0 && (
        <GlassCard variant="subtle" style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row' }}>
            <Summary label="Sessions" value={stats.data.totals.sessionCount} />
            <Summary label="Time" value={formatMinutes(stats.data.totals.totalMinutes)} />
            <Summary label="Volume" value={formatVolume(stats.data.totals.totalVolumeKg)} />
            <Summary label="Sets" value={stats.data.totals.totalSets} />
          </View>
        </GlassCard>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {sessions.loading ? (
          <LoadingState />
        ) : sessions.error ? (
          <ErrorState message={sessions.error} onRetry={sessions.refetch} />
        ) : !sessions.data?.items.length ? (
          <GlassCard>
            <EmptyState
              icon="time-outline"
              title="No workouts found"
              message="Try a different filter, or start a session to build your history."
              actionLabel="Start a workout"
              onAction={() => router.push('/workout/start')}
            />
          </GlassCard>
        ) : (
          <>
            {sessions.data.items.map((s) => (
              <GlassCard
                key={s.id}
                style={{ marginBottom: spacing.base }}
                onPress={() => router.push(`/workout/summary?id=${s.id}`)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.primarySoft,
                    }}
                  >
                    <Txt variant="caption" color={theme.primary}>
                      {formatDate(s.sessionDate, 'dayMonth').split(' ')[1]}
                    </Txt>
                    <Txt variant="bodyStrong" color={theme.primary}>
                      {formatDate(s.sessionDate, 'dayMonth').split(' ')[0]}
                    </Txt>
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Txt variant="bodyStrong" numberOfLines={1}>
                      {s.title || 'Workout'}
                    </Txt>
                    <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                      {formatRelativeDate(s.sessionDate)} · {s.durationMinutes} min ·{' '}
                      {s.completedSets ?? 0} sets
                    </Txt>
                    {s.muscleGroups && s.muscleGroups.length > 0 && (
                      <Txt variant="caption" color={theme.primary} numberOfLines={1} style={{ marginTop: 2 }}>
                        {s.muscleGroups.join(' · ')}
                      </Txt>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Txt variant="small" style={{ fontWeight: '800' }}>
                      {formatVolume(s.totalVolumeKg)}
                    </Txt>
                    {s.status !== 'COMPLETED' && (
                      <Badge label={s.status} color={theme.textTertiary} size="sm" />
                    )}
                  </View>
                </View>
              </GlassCard>
            ))}

            {/* pagination */}
            {sessions.data.meta.totalPages > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.base,
                }}
              >
                <Button
                  title="Previous"
                  icon="chevron-back"
                  variant="glass"
                  size="sm"
                  disabled={!sessions.data.meta.hasPreviousPage}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Txt variant="caption" color={theme.textTertiary}>
                  Page {sessions.data.meta.page} of {sessions.data.meta.totalPages}
                </Txt>
                <Button
                  title="Next"
                  iconRight="chevron-forward"
                  variant="glass"
                  size="sm"
                  disabled={!sessions.data.meta.hasNextPage}
                  onPress={() => setPage((p) => p + 1)}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
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

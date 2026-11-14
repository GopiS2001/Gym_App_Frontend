import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { attendanceApi, sleepApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
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
import { BarChart } from '@/components/charts';
import { formatDate, formatMinutes, formatTime } from '@/utils/format';
import type { AttendanceCalendarDay } from '@/types/models';

// Fallback until the grid reports its real width via onLayout.
const DEFAULT_GRID_W = Dimensions.get('window').width - 40 - 32;

const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<AttendanceCalendarDay | null>(null);
  // Measure the grid itself: the window width read at module load is wrong on
  // web (and after rotation), which made 7 cells overflow and pushed Saturday
  // onto the next row.
  const [gridW, setGridW] = useState(DEFAULT_GRID_W);
  const CELL = Math.floor(gridW / 7);

  const monthParam = (() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`;
  })();

  const calendar = useApi(() => attendanceApi.calendar(monthParam), [monthParam], {
    refetchOnFocus: true,
  });
  const stats = useApi(() => attendanceApi.stats(), [], { refetchOnFocus: true });
  const sleep = useApi(() => sleepApi.summary(7), [], { refetchOnFocus: true });
  const today = useApi(() => attendanceApi.today(), [], { refetchOnFocus: true });

  const refreshAll = () => {
    calendar.refresh();
    stats.refresh();
    sleep.refresh();
    today.refresh();
  };

  const checkIn = async () => {
    await attendanceApi.checkIn().catch(() => undefined);
    refreshAll();
  };

  const checkOut = async () => {
    await attendanceApi.checkOut().catch(() => undefined);
    refreshAll();
  };

  if (calendar.loading) {
    return (
      <Screen>
        <ScreenHeader title="Calendar" />
        <LoadingState message="Loading your attendance" />
      </Screen>
    );
  }

  if (calendar.error || !calendar.data) {
    return (
      <Screen>
        <ScreenHeader title="Calendar" />
        <ErrorState message={calendar.error || 'No data'} onRetry={calendar.refetch} />
      </Screen>
    );
  }

  const c = calendar.data;
  // Leading blanks so the first day lands on the right weekday column.
  const leadingBlanks = Array.from({ length: c.firstWeekDay }, (_, i) => i);

  return (
    <Screen refreshing={calendar.refreshing} onRefresh={refreshAll}>
      <ScreenHeader title="Calendar" subtitle="Gym attendance and recovery" />

      {/* -------------------------------------------------- check in/out */}
      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: today.data?.checkedIn ? theme.primarySoft : theme.surfaceMuted,
            }}
          >
            <Ionicons
              name={today.data?.checkedIn ? 'checkmark-circle' : 'location-outline'}
              size={21}
              color={today.data?.checkedIn ? theme.primary : theme.textTertiary}
            />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Txt variant="h4">
              {today.data?.checkedOut
                ? 'Session logged'
                : today.data?.checkedIn
                  ? 'Checked in'
                  : 'Not at the gym yet'}
            </Txt>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
              {today.data?.record
                ? `In at ${formatTime(today.data.record.checkInAt)}${
                    today.data.record.checkOutAt
                      ? ` · out at ${formatTime(today.data.record.checkOutAt)}`
                      : ''
                  }`
                : 'Check in when you arrive'}
            </Txt>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Button
            title="Check in"
            icon="log-in-outline"
            variant={today.data?.checkedIn ? 'glass' : 'primary'}
            size="sm"
            style={{ flex: 1 }}
            onPress={checkIn}
          />
          <Button
            title="Check out"
            icon="log-out-outline"
            variant={today.data?.checkedIn && !today.data?.checkedOut ? 'primary' : 'glass'}
            size="sm"
            style={{ flex: 1 }}
            disabled={!today.data?.checkedIn}
            onPress={checkOut}
          />
        </View>
      </GlassCard>

      {/* ----------------------------------------------------- streaks */}
      {stats.data && (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.base }}>
          <GlassCard style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Ionicons name="flame" size={15} color={theme.streak} />
              <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 4 }}>
                STREAK
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Txt variant="numeric">{stats.data.currentStreak}</Txt>
              <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 3 }}>
                days
              </Txt>
            </View>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 3 }}>
              Best {stats.data.longestStreak} days
            </Txt>
          </GlassCard>

          <GlassCard style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Ionicons name="calendar" size={15} color={theme.primary} />
              <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 4 }}>
                THIS MONTH
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Txt variant="numeric">{stats.data.thisMonthVisits}</Txt>
              <Txt variant="caption" color={theme.textTertiary} style={{ marginLeft: 3 }}>
                visits
              </Txt>
            </View>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 3 }}>
              {formatMinutes(stats.data.totalMinutes)} total
            </Txt>
          </GlassCard>
        </View>
      )}

      {/* ---------------------------------------------------- month grid */}
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.base,
          }}
        >
          <Pressable onPress={() => setMonthOffset((m) => m - 1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            <Txt variant="h4">
              {c.monthLabel} {c.year}
            </Txt>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
              {c.summary.attendedDays} days · {c.summary.consistencyPercentage}% consistent
            </Txt>
          </View>

          <Pressable
            onPress={() => setMonthOffset((m) => Math.min(0, m + 1))}
            hitSlop={10}
            disabled={monthOffset >= 0}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={monthOffset >= 0 ? theme.border : theme.textSecondary}
            />
          </Pressable>
        </View>

        <View
          style={{ flexDirection: 'row', marginBottom: spacing.sm }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - gridW) > 0.5) setGridW(w);
          }}
        >
          {WEEK_LABELS.map((label, i) => (
            <View key={i} style={{ width: CELL, alignItems: 'center' }}>
              <Txt variant="caption" color={theme.textTertiary}>
                {label}
              </Txt>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {leadingBlanks.map((i) => (
            <View key={`blank-${i}`} style={{ width: CELL, height: CELL }} />
          ))}

          {c.days.map((day) => {
            const isSelected = selected?.date === day.date;
            const bg =
              day.status === 'WORKOUT'
                ? theme.primary
                : day.status === 'VISIT'
                  ? theme.primarySoft
                  : 'transparent';
            const fg =
              day.status === 'WORKOUT'
                ? theme.onPrimary
                : day.status === 'VISIT'
                  ? theme.primary
                  : day.isFuture
                    ? theme.textTertiary
                    : theme.textSecondary;

            return (
              <Pressable
                key={day.date}
                onPress={() => setSelected(isSelected ? null : day)}
                style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: CELL - 7,
                    height: CELL - 7,
                    borderRadius: (CELL - 7) / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bg,
                    borderWidth: day.isToday || isSelected ? 1.75 : 0,
                    borderColor: isSelected ? theme.text : theme.primary,
                    opacity: day.isFuture ? 0.45 : 1,
                  }}
                >
                  <Txt
                    variant="small"
                    color={fg}
                    style={{ fontWeight: day.isToday ? '800' : '600' }}
                  >
                    {day.dayOfMonth}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* legend */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: spacing.base,
            marginTop: spacing.base,
            paddingTop: spacing.md,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.divider,
          }}
        >
          <Legend color={theme.primary} label="Workout" />
          <Legend color={theme.primarySoft} label="Visit" />
          <Legend color={theme.surfaceMuted} label="Rest" />
        </View>
      </GlassCard>

      {/* ------------------------------------------------- selected day */}
      {selected && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.md,
            }}
          >
            <Txt variant="h4">{formatDate(selected.date, 'long')}</Txt>
            <Badge
              label={selected.status}
              color={
                selected.status === 'WORKOUT'
                  ? theme.primary
                  : selected.status === 'VISIT'
                    ? theme.hydration
                    : theme.textTertiary
              }
            />
          </View>

          {selected.sessions.length > 0 ? (
            selected.sessions.map((session: any) => (
              <Pressable
                key={session.id}
                onPress={() => router.push(`/workout/summary?id=${session.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons name="barbell" size={17} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Txt variant="small" style={{ fontWeight: '700' }}>
                    {session.title || 'Workout'}
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary}>
                    {Math.round(session.durationSeconds / 60)} min ·{' '}
                    {Math.round(session.totalVolumeKg)} kg volume
                  </Txt>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
              </Pressable>
            ))
          ) : (
            <Txt variant="small" color={theme.textTertiary}>
              {selected.attended
                ? `Gym visit of ${formatMinutes(selected.durationMinutes)}, no workout recorded.`
                : selected.isFuture
                  ? 'Upcoming day.'
                  : 'Rest day — nothing recorded.'}
            </Txt>
          )}
        </GlassCard>
      )}

      {/* ------------------------------------------------------- sleep */}
      <SectionHeader
        title="Sleep & Recovery"
        actionLabel="Log sleep"
        onAction={() => router.push('/progress/log-sleep')}
      />

      {sleep.data && sleep.data.nightsRecorded > 0 ? (
        <GlassCard>
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
                AVERAGE SLEEP
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
                <Txt variant="numeric" color={theme.sleep}>
                  {sleep.data.averageHours}
                </Txt>
                <Txt variant="small" color={theme.textTertiary} style={{ marginLeft: 3 }}>
                  hours
                </Txt>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="caption" color={theme.textTertiary}>
                LAST NIGHT
              </Txt>
              <Txt variant="h4" style={{ marginTop: 3 }}>
                {sleep.data.lastNight?.durationLabel || '--'}
              </Txt>
              {sleep.data.lastNight?.sleepQuality && (
                <Badge label={sleep.data.lastNight.sleepQuality} color={theme.sleep} size="sm" />
              )}
            </View>
          </View>

          <BarChart
            height={78}
            color={theme.sleep}
            highlightColor={theme.sleep}
            data={sleep.data.points.map((p, i) => ({
              label: WEEK_LABELS[new Date(`${p.date}T00:00:00.000Z`).getUTCDay()],
              value: p.durationHours,
              highlight: i === sleep.data!.points.length - 1,
            }))}
          />
        </GlassCard>
      ) : (
        <GlassCard>
          <EmptyState
            icon="moon-outline"
            title="No sleep recorded"
            message="Log your sleep to see how recovery tracks against training."
            actionLabel="Log sleep"
            onAction={() => router.push('/progress/log-sleep')}
          />
        </GlassCard>
      )}
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 9,
          height: 9,
          borderRadius: 4.5,
          backgroundColor: color,
          marginRight: 5,
        }}
      />
      <Txt variant="caption" color={theme.textTertiary}>
        {label}
      </Txt>
    </View>
  );
}

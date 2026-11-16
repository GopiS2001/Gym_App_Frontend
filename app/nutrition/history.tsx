import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { nutritionApi } from '@/services/endpoints';
import { getErrorMessage } from '@/services/api';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { BarChart } from '@/components/charts';
import { Chip, EmptyState, ErrorState, LoadingState, StatTile, Txt } from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import type { FoodLog } from '@/types/models';
import { formatDate, formatTime, todayIso } from '@/utils/format';
import { MEAL_LABELS, MEAL_TYPES, shiftIsoDate } from '@/utils/nutrition';

const RANGES = [
  { days: 7, label: 'Week' },
  { days: 30, label: 'Month' },
];

/** Past food intake: totals per day, with meal filter and edit / delete. */
export default function NutritionHistoryScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const { confirm, notify } = useDialog();
  const [days, setDays] = useState(7);
  const [meal, setMeal] = useState<string | null>(null);

  const today = todayIso();
  const fromDate = shiftIsoDate(today, -(days - 1));

  const summary = useApi(() => nutritionApi.history(days, today), [days, today], {
    refetchOnFocus: true,
  });
  const entries = useApi(
    () =>
      nutritionApi.list({
        fromDate,
        toDate: today,
        mealType: meal || undefined,
        limit: 200,
        sortBy: 'consumedAt',
        sortOrder: 'desc',
      }),
    [fromDate, today, meal],
    { refetchOnFocus: true },
  );

  // Entries grouped by day, newest day first.
  const byDay = useMemo(() => {
    const groups = new Map<string, FoodLog[]>();
    for (const e of entries.data?.items || []) {
      const key = String(e.loggedDate).slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries.data]);

  const remove = (e: FoodLog) =>
    confirm({
      title: 'Delete entry',
      message: `Remove "${e.foodName}" from ${formatDate(`${String(e.loggedDate).slice(0, 10)}T12:00:00`, 'dayMonth')}?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      try {
        await nutritionApi.remove(e.id);
      } catch (err) {
        await notify({ title: 'Could not delete', message: getErrorMessage(err), tone: 'danger' });
      }
      entries.refresh();
      summary.refresh();
    });

  const s = summary.data;
  const truncated = (entries.data?.meta?.total || 0) > (entries.data?.items.length || 0);

  return (
    <Screen
      withTabBar={false}
      refreshing={entries.refreshing}
      onRefresh={() => {
        entries.refresh();
        summary.refresh();
      }}
    >
      <ScreenHeader title="Intake History" subtitle="What you ate, day by day" showBack />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
        {RANGES.map((r) => (
          <Chip
            key={r.days}
            label={r.label}
            selected={days === r.days}
            onPress={() => setDays(r.days)}
          />
        ))}
      </View>

      {summary.loading ? (
        <LoadingState />
      ) : summary.error || !s ? (
        <ErrorState message={summary.error || 'No data'} onRetry={summary.refetch} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
            <StatTile label="Avg calories" value={`${Math.round(s.averageCalories)}`} unit="kcal" icon="flame" color={theme.nutrition} />
            <StatTile label="Avg protein" value={`${Math.round(s.averageProteinG)}`} unit="g" icon="barbell" color={theme.primary} />
            <StatTile label="Days logged" value={`${s.daysLogged}/${s.rangeDays}`} icon="calendar" color={theme.sleep} />
          </View>

          <GlassCard style={{ marginBottom: spacing.base }}>
            <Txt variant="h4" style={{ marginBottom: spacing.base }}>
              Calories per day
            </Txt>
            <BarChart
              height={110}
              color={theme.nutrition}
              data={s.points.map((p, i) => {
                const d = new Date(`${p.date}T00:00:00.000Z`);
                return {
                  label:
                    days <= 7
                      ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getUTCDay()]
                      : i % 5 === 0 || i === s.points.length - 1
                        ? String(d.getUTCDate())
                        : '',
                  value: p.calories,
                  highlight: i === s.points.length - 1,
                };
              })}
            />
          </GlassCard>
        </>
      )}

      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
        FILTER BY MEAL
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.base }}>
        <Chip label="All" selected={!meal} onPress={() => setMeal(null)} />
        {MEAL_TYPES.map((m) => (
          <Chip
            key={m.value}
            label={m.label}
            selected={meal === m.value}
            onPress={() => setMeal(meal === m.value ? null : m.value)}
          />
        ))}
      </View>

      {entries.loading ? (
        <LoadingState />
      ) : entries.error ? (
        <ErrorState message={entries.error} onRetry={entries.refetch} />
      ) : byDay.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="calendar-outline"
            title="Nothing logged"
            message={meal ? `No ${MEAL_LABELS[meal]} entries in this range.` : 'No food logged in this range.'}
          />
        </GlassCard>
      ) : (
        byDay.map(([day, items]) => {
          const total = items.reduce((sum, e) => sum + e.calories, 0);
          const protein = items.reduce((sum, e) => sum + e.proteinG, 0);
          return (
            <GlassCard key={day} padded={false} style={{ marginBottom: spacing.base }}>
              <Pressable
                onPress={() => router.push({ pathname: '/(tabs)/nutrition', params: { date: day } })}
                accessibilityRole="button"
                accessibilityLabel={`Open ${day}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.base,
                  paddingBottom: spacing.sm,
                }}
              >
                <View>
                  <Txt variant="h4">
                    {day === today ? 'Today' : formatDate(`${day}T12:00:00`, 'long')}
                  </Txt>
                  <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                    {Math.round(protein)} g protein · {items.length} item{items.length === 1 ? '' : 's'}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt variant="bodyStrong" color={theme.nutrition}>
                    {Math.round(total)} kcal
                  </Txt>
                  <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} style={{ marginLeft: 4 }} />
                </View>
              </Pressable>

              {items.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => router.push(`/nutrition/add?id=${e.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.base,
                    paddingVertical: spacing.md,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.divider,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                      {e.foodName}
                    </Txt>
                    <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                      {MEAL_LABELS[e.mealType] || e.mealTypeLabel} · {e.quantity} {e.quantityUnit} · {formatTime(e.consumedAt)}
                    </Txt>
                  </View>
                  <Txt variant="small" style={{ fontWeight: '700' }}>
                    {Math.round(e.calories)}
                  </Txt>
                  <Pressable
                    onPress={() => remove(e)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${e.foodName}`}
                    style={{ marginLeft: spacing.md, padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </Pressable>
                </Pressable>
              ))}
            </GlassCard>
          );
        })
      )}

      {truncated && (
        <Txt variant="caption" color={theme.textTertiary} align="center">
          Showing the latest 200 entries in this range.
        </Txt>
      )}
    </Screen>
  );
}

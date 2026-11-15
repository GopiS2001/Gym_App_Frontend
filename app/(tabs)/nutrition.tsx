import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi } from '@/hooks/useApi';
import { nutritionApi, waterApi } from '@/services/endpoints';
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
import { useDialog } from '@/components/Dialog';
import { getErrorMessage } from '@/services/api';
import { ActivityRings, BarChart, ProgressRing } from '@/components/charts';
import { formatTime, todayIso } from '@/utils/format';

const { width: SCREEN_W } = Dimensions.get('window');

export default function NutritionScreen() {
  const { confirm, notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const [date] = useState(todayIso());

  const daily = useApi(() => nutritionApi.daily(date), [date], { refetchOnFocus: true });
  const water = useApi(() => waterApi.daily(date), [date], { refetchOnFocus: true });
  const history = useApi(() => nutritionApi.history(7), [], { refetchOnFocus: true });

  const refreshAll = () => {
    daily.refresh();
    water.refresh();
    history.refresh();
  };

  const addWater = async (ml: number) => {
    await waterApi.add(ml).catch(() => undefined);
    water.refresh();
  };

  const undoWater = async () => {
    await waterApi.undo(date).catch(() => undefined);
    water.refresh();
  };

  const deleteFood = (id: string, name: string) => {
    confirm({
      title: 'Delete entry',
      message: `Remove "${name}" from today?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      try {
        await nutritionApi.remove(id);
      } catch (e) {
        await notify({
          title: 'Could not delete',
          message: getErrorMessage(e),
          tone: 'danger',
        });
      }
      daily.refresh();
      history.refresh();
    });
  };

  if (daily.loading) {
    return (
      <Screen>
        <ScreenHeader title="Nutrition" />
        <LoadingState message="Loading today's nutrition" />
      </Screen>
    );
  }

  if (daily.error || !daily.data) {
    return (
      <Screen>
        <ScreenHeader title="Nutrition" />
        <ErrorState message={daily.error || 'No data'} onRetry={daily.refetch} />
      </Screen>
    );
  }

  const n = daily.data;

  return (
    <Screen refreshing={daily.refreshing} onRefresh={refreshAll}>
      <ScreenHeader
        title="Nutrition"
        subtitle="Calories, macros and hydration"
        right={
          <IconButton
            icon="add"
            color={theme.primary}
            onPress={() => router.push('/nutrition/add')}
          />
        }
      />

      {/* --------------------------------------------------- calorie ring */}
      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ProgressRing
            percentage={n.progress.calories}
            size={124}
            strokeWidth={12}
            color={theme.nutrition}
          >
            <Txt variant="h2">{Math.round(n.totals.calories)}</Txt>
            <Txt variant="caption" color={theme.textTertiary}>
              of {n.targets.calories}
            </Txt>
          </ProgressRing>

          <View style={{ flex: 1, marginLeft: spacing.lg }}>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
              CALORIES REMAINING
            </Txt>
            <Txt
              variant="h2"
              color={n.remaining.calories >= 0 ? theme.primary : theme.danger}
              style={{ marginBottom: spacing.md }}
            >
              {Math.round(Math.abs(n.remaining.calories))}
              {n.remaining.calories < 0 ? ' over' : ''}
            </Txt>

            <MacroRow
              label="Protein"
              value={n.totals.proteinG}
              target={n.targets.proteinG}
              percentage={n.progress.proteinG}
              color={theme.primary}
            />
            <MacroRow
              label="Carbs"
              value={n.totals.carbsG}
              target={n.targets.carbsG}
              percentage={n.progress.carbsG}
              color={theme.streak}
            />
            <MacroRow
              label="Fat"
              value={n.totals.fatG}
              target={n.targets.fatG}
              percentage={n.progress.fatG}
              color={theme.sleep}
            />
          </View>
        </View>
      </GlassCard>

      {/* ------------------------------------------------------ hydration */}
      {water.data && (
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
              <Ionicons name="water" size={17} color={theme.hydration} />
              <Txt variant="h4" style={{ marginLeft: 6 }}>
                Water
              </Txt>
              {water.data.goalReached && (
                <Badge label="GOAL MET" color={theme.success} size="sm" />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Txt variant="h3" color={theme.hydration}>
                {water.data.totalLitres.toFixed(2)}
              </Txt>
              <Txt variant="small" color={theme.textTertiary}>
                {' '}
                / {(water.data.targetMl / 1000).toFixed(1)} L
              </Txt>
            </View>
          </View>

          <ProgressBar
            value={water.data.progressPercentage}
            color={theme.hydration}
            height={10}
            showGlow
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            {water.data.quickAddOptions.slice(0, 4).map((ml) => (
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
                <Txt variant="caption" color={theme.hydration} style={{ fontWeight: '800' }}>
                  +{ml}
                </Txt>
              </Pressable>
            ))}
            <Pressable
              onPress={undoWater}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.surfaceMuted,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="arrow-undo" size={15} color={theme.textTertiary} />
            </Pressable>
          </View>

          <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: spacing.sm }}>
            {water.data.glassesCount} entries today
          </Txt>
        </GlassCard>
      )}

      {/* ------------------------------------------------ weekly history */}
      {history.data && history.data.points.length > 0 && (
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
              <Txt variant="h4">Last 7 Days</Txt>
              <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                {history.data.averageCalories} kcal average
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="bodyStrong" color={theme.primary}>
                {history.data.averageProteinG}g
              </Txt>
              <Txt variant="caption" color={theme.textTertiary}>
                avg protein
              </Txt>
            </View>
          </View>

          <BarChart
            height={92}
            color={theme.nutrition}
            data={history.data.points.map((p, i) => ({
              label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][
                new Date(`${p.date}T00:00:00.000Z`).getUTCDay()
              ],
              value: p.calories,
              highlight: i === history.data!.points.length - 1,
            }))}
          />
        </GlassCard>
      )}

      {/* ----------------------------------------------------- meal list */}
      <SectionHeader
        title="Today's Meals"
        actionLabel="Add food"
        onAction={() => router.push('/nutrition/add')}
      />

      {n.entryCount === 0 ? (
        <GlassCard>
          <EmptyState
            icon="restaurant-outline"
            title="Nothing logged today"
            message="Add your first meal to start tracking calories and macros."
            actionLabel="Add food"
            onAction={() => router.push('/nutrition/add')}
          />
        </GlassCard>
      ) : (
        n.meals
          .filter((meal) => meal.itemCount > 0)
          .map((meal) => (
            <GlassCard key={meal.mealType} style={{ marginBottom: spacing.base }} padded={false}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing.base,
                  paddingBottom: spacing.sm,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.nutritionSoft,
                      marginRight: spacing.sm,
                    }}
                  >
                    <Ionicons name={mealIcon(meal.mealType)} size={15} color={theme.nutrition} />
                  </View>
                  <Txt variant="h4">{meal.label}</Txt>
                </View>
                <Txt variant="bodyStrong" color={theme.nutrition}>
                  {Math.round(meal.calories)} kcal
                </Txt>
              </View>

              {meal.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  onLongPress={() => deleteFood(item.id, item.foodName)}
                  onPress={() => router.push(`/nutrition/add?id=${item.id}`)}
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
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                      backgroundColor: theme.surfaceMuted,
                    }}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="fast-food-outline" size={17} color={theme.textTertiary} />
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                      {item.foodName}
                    </Txt>
                    <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                      P {Math.round(item.proteinG)}g · C {Math.round(item.carbsG)}g · F{' '}
                      {Math.round(item.fatG)}g · {formatTime(item.consumedAt)}
                    </Txt>
                  </View>

                  <Txt variant="small" style={{ fontWeight: '700' }}>
                    {Math.round(item.calories)}
                  </Txt>

                  <Pressable
                    onPress={() => deleteFood(item.id, item.foodName)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.foodName}`}
                    style={({ pressed }) => ({
                      marginLeft: spacing.md,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed ? 'rgba(255,107,114,0.25)' : 'rgba(255,107,114,0.12)',
                    })}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </Pressable>
                </Pressable>
              ))}
            </GlassCard>
          ))
      )}

      <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginTop: spacing.sm }}>
        Tap an item to edit · Tap the bin to delete
      </Txt>
    </Screen>
  );
}

function MacroRow({
  label,
  value,
  target,
  percentage,
  color,
}: {
  label: string;
  value: number;
  target: number;
  percentage: number;
  color: string;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Txt variant="caption" color={theme.textTertiary}>
          {label}
        </Txt>
        <Txt variant="caption" color={theme.text}>
          {Math.round(value)}/{target}g
        </Txt>
      </View>
      <ProgressBar value={percentage} color={color} height={5} />
    </View>
  );
}

function mealIcon(mealType: string): keyof typeof Ionicons.glyphMap {
  switch (mealType) {
    case 'BREAKFAST':
      return 'sunny-outline';
    case 'LUNCH':
      return 'restaurant-outline';
    case 'DINNER':
      return 'moon-outline';
    case 'PRE_WORKOUT':
      return 'flash-outline';
    case 'POST_WORKOUT':
      return 'barbell-outline';
    default:
      return 'cafe-outline';
  }
}

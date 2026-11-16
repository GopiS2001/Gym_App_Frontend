import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { remindersApi } from '@/services/endpoints';
import { getErrorMessage } from '@/services/api';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Badge, Button, EmptyState, ErrorState, IconButton, LoadingState, SectionHeader, Txt } from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import { NotificationBanner } from '@/components/NotificationBanner';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { refreshReminderSchedule } from '@/hooks/useReminderSync';
import type { MealReminder } from '@/types/models';
import { describeDays, formatClock } from '@/utils/nutrition';

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PRE_WORKOUT: 'flash-outline',
  BREAKFAST: 'sunny-outline',
  POST_WORKOUT: 'barbell-outline',
  LUNCH: 'restaurant-outline',
  SNACK: 'cafe-outline',
  DINNER: 'moon-outline',
  BEFORE_BED: 'bed-outline',
  WATER: 'water-outline',
  CUSTOM: 'alarm-outline',
};

/** Meal reminders: list, on/off switches, and the workout schedule they follow. */
export default function MealRemindersScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { notify } = useDialog();
  const { permission, enable, supported } = useNotificationPermission();
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = useApi(() => remindersApi.list(), [], { refetchOnFocus: true });
  const samples = useMutation(() => remindersApi.addSamples());

  const toggle = async (r: MealReminder, next: boolean) => {
    setBusyId(r.id);
    try {
      await remindersApi.toggle(r.id, next);
      await list.refresh();
      await refreshReminderSchedule({ force: true });
    } catch (e) {
      await notify({ title: 'Could not update', message: getErrorMessage(e), tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  const addSamples = async () => {
    const result = await samples.mutate();
    if (result) {
      await list.refresh();
      await refreshReminderSchedule({ force: true });
    }
  };

  if (list.loading) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Meal Reminders" showBack />
        <LoadingState message="Loading reminders" />
      </Screen>
    );
  }
  if (list.error || !list.data) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Meal Reminders" showBack />
        <ErrorState message={list.error || 'No data'} onRetry={list.refetch} />
      </Screen>
    );
  }

  const { items, workoutSchedule: w } = list.data;
  const needsWorkoutTime = items.some((r) => r.isEnabled && r.schedule.needsWorkoutTime);

  return (
    <Screen withTabBar={false} refreshing={list.refreshing} onRefresh={list.refresh}>
      <ScreenHeader
        title="Meal Reminders"
        subtitle="Optional nudges to eat and log"
        showBack
        right={
          <IconButton
            icon="add"
            color={theme.primary}
            onPress={() => router.push('/nutrition/reminders/edit')}
          />
        }
      />

      <NotificationBanner permission={permission} supported={supported} onEnable={enable} />

      {/* Workout schedule that pre/post-workout reminders follow */}
      <GlassCard
        style={{ marginBottom: spacing.base }}
        onPress={() => router.push('/nutrition/reminders/settings')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="barbell-outline" size={20} color={theme.primary} style={{ marginRight: spacing.md }} />
          <View style={{ flex: 1 }}>
            <Txt variant="bodyStrong">
              {w.workoutTime ? `Workout at ${formatClock(w.workoutTime)}` : 'Set your workout time'}
            </Txt>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
              {describeDays(w.effectiveDays)}
              {w.daysSource === 'PLAN' ? ' · from your workout plan' : ''}
              {w.workoutTime ? ` · ${w.workoutDurationMin} min` : ' · used by pre/post-workout reminders'}
            </Txt>
          </View>
          <Ionicons name="settings-outline" size={18} color={theme.textTertiary} />
        </View>
      </GlassCard>

      {needsWorkoutTime && (
        <View
          style={{
            flexDirection: 'row',
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: theme.streakSoft,
            marginBottom: spacing.base,
          }}
        >
          <Ionicons name="information-circle-outline" size={16} color={theme.streak} />
          <Txt variant="caption" color={theme.streak} style={{ flex: 1, marginLeft: spacing.sm }}>
            Pre/post-workout reminders use their own time until you set your workout time.
          </Txt>
        </View>
      )}

      <SectionHeader title="Reminders" actionLabel="New" onAction={() => router.push('/nutrition/reminders/edit')} />

      {items.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="alarm-outline"
            title="No reminders yet"
            message="Start from a sample day of meal reminders and change any of them, or make your own."
            actionLabel="Add sample reminders"
            onAction={addSamples}
          />
          {samples.error && (
            <Txt variant="small" color={theme.danger} align="center">
              {samples.error}
            </Txt>
          )}
        </GlassCard>
      ) : (
        <GlassCard padded={false}>
          {items.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => router.push({ pathname: '/nutrition/reminders/edit', params: { id: r.id } })}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.base,
                borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                borderTopColor: theme.divider,
                opacity: pressed ? 0.6 : r.isEnabled ? 1 : 0.55,
              })}
            >
              <Ionicons
                name={TYPE_ICON[r.reminderType] || 'alarm-outline'}
                size={20}
                color={theme.nutrition}
                style={{ marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Txt variant="h4">{formatClock(r.schedule.time)}</Txt>
                  <Txt variant="small" style={{ marginLeft: spacing.sm, fontWeight: '700' }} numberOfLines={1}>
                    {r.title}
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 6 }}>
                  <Txt variant="caption" color={theme.textTertiary}>
                    {describeDays(r.schedule.days)}
                  </Txt>
                  {r.schedule.basedOnWorkout && (
                    <Badge
                      label={r.workoutLink === 'BEFORE' ? 'BEFORE WORKOUT' : 'AFTER WORKOUT'}
                      color={theme.primary}
                      size="sm"
                    />
                  )}
                </View>
              </View>
              <Switch
                value={r.isEnabled}
                disabled={busyId === r.id}
                onValueChange={(v) => toggle(r, v)}
                trackColor={{ false: theme.border, true: theme.primary }}
                accessibilityLabel={`${r.title} reminder ${r.isEnabled ? 'on' : 'off'}`}
              />
            </Pressable>
          ))}
        </GlassCard>
      )}

      {items.length > 0 && items.length < 7 && (
        <Button
          title="Add missing sample reminders"
          variant="ghost"
          icon="sparkles-outline"
          fullWidth
          loading={samples.loading}
          onPress={addSamples}
          style={{ marginTop: spacing.md }}
        />
      )}

      <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginTop: spacing.base }}>
        Sample times are a starting point, not dietary advice. Change them to suit your day.
      </Txt>
    </Screen>
  );
}

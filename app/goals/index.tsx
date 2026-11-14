import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced } from '@/hooks/useApi';
import { goalsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  ProgressBar,
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { formatDate } from '@/utils/format';
import type { FitnessGoal } from '@/types/models';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PAUSED', label: 'Paused' },
];

export default function GoalsScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebounced(search, 350);

  const goals = useApi(
    () =>
      goalsApi.list({
        search: debouncedSearch || undefined,
        status: status || undefined,
        limit: 50,
      }),
    [debouncedSearch, status],
    { refetchOnFocus: true },
  );

  const complete = async (goal: FitnessGoal) => {
    await goalsApi.complete(goal.id).catch(() => undefined);
    goals.refresh();
  };

  const activate = async (goal: FitnessGoal) => {
    await goalsApi.activate(goal.id).catch(() => undefined);
    goals.refresh();
  };

  const remove = (goal: FitnessGoal) => {
    confirm({
      title: 'Delete goal',
      message: `Remove "${goal.title || goal.goalTypeLabel}"?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await goalsApi.remove(goal.id).catch(() => undefined);
      goals.refresh();
    });
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader
        title="Fitness Goals"
        subtitle="One active goal at a time"
        showBack
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton
              icon="pricetags-outline"
              onPress={() => router.push('/goals/types')}
            />
            <IconButton
              icon="add"
              color={theme.primary}
              onPress={() => router.push('/goals/create')}
            />
          </View>
        }
      />

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search goals"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
      >
        {STATUS_FILTERS.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={status === option.value}
            onPress={() => setStatus(option.value)}
          />
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {goals.loading ? (
          <LoadingState />
        ) : goals.error ? (
          <ErrorState message={goals.error} onRetry={goals.refetch} />
        ) : !goals.data?.items.length ? (
          <GlassCard>
            <EmptyState
              icon="flag-outline"
              title="No goals yet"
              message="Set a target weight and date so the app can track how far along you are."
              actionLabel="Create a goal"
              onAction={() => router.push('/goals/create')}
            />
          </GlassCard>
        ) : (
          goals.data.items.map((goal) => {
            const isActive = goal.status === 'ACTIVE';
            const statusColor =
              goal.status === 'ACTIVE'
                ? theme.primary
                : goal.status === 'COMPLETED'
                  ? theme.success
                  : theme.textTertiary;

            return (
              <GlassCard
                key={goal.id}
                variant={isActive ? 'strong' : 'default'}
                glowColor={isActive ? theme.primary : undefined}
                style={{ marginBottom: spacing.base }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Badge label={goal.status} color={statusColor} />
                    <Txt variant="h4" style={{ marginTop: 5 }} numberOfLines={1}>
                      {goal.title || goal.goalTypeLabel}
                    </Txt>
                    <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                      {goal.goalTypeLabel} · started {formatDate(goal.startDate, 'medium')}
                    </Txt>
                  </View>

                  <Pressable onPress={() => remove(goal)} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={17} color={theme.textTertiary} />
                  </Pressable>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1 }}>
                    PROGRESS
                  </Txt>
                  <Txt variant="bodyStrong" color={statusColor}>
                    {Math.round(goal.progressPercentage || 0)}%
                  </Txt>
                </View>

                <ProgressBar
                  value={goal.progressPercentage || 0}
                  color={statusColor}
                  showGlow={isActive}
                />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: spacing.sm,
                  }}
                >
                  <Txt variant="caption" color={theme.textTertiary}>
                    {goal.startingWeightKg?.toFixed(1) ?? '--'} kg
                  </Txt>
                  <Txt variant="caption" color={theme.text}>
                    now {goal.currentWeightKg?.toFixed(1) ?? '--'} kg
                  </Txt>
                  <Txt variant="caption" color={statusColor}>
                    {goal.targetWeightKg?.toFixed(1) ?? '--'} kg
                  </Txt>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.divider,
                  }}
                >
                  <Mini
                    label="Changed"
                    value={
                      goal.changedKg != null
                        ? `${goal.changedKg >= 0 ? '+' : ''}${goal.changedKg.toFixed(1)}kg`
                        : '--'
                    }
                  />
                  <Mini
                    label="Remaining"
                    value={goal.remainingKg != null ? `${goal.remainingKg.toFixed(1)}kg` : '--'}
                  />
                  <Mini
                    label={goal.isOverdue ? 'Overdue' : 'Days left'}
                    value={
                      goal.daysRemaining != null ? `${Math.abs(goal.daysRemaining)}` : '--'
                    }
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                  {!isActive && goal.status !== 'COMPLETED' && (
                    <Button
                      title="Make active"
                      size="sm"
                      variant="glass"
                      style={{ flex: 1 }}
                      onPress={() => activate(goal)}
                    />
                  )}
                  {goal.status !== 'COMPLETED' && (
                    <Button
                      title="Mark complete"
                      icon="checkmark"
                      size="sm"
                      variant={isActive ? 'primary' : 'glass'}
                      style={{ flex: 1 }}
                      onPress={() => complete(goal)}
                    />
                  )}
                  <Button
                    title="Edit"
                    size="sm"
                    variant="glass"
                    style={{ flex: 1 }}
                    onPress={() => router.push(`/goals/create?id=${goal.id}`)}
                  />
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="small" style={{ fontWeight: '700' }}>
        {value}
      </Txt>
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

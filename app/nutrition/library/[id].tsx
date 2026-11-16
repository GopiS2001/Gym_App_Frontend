import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { foodsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Badge, Button, ErrorState, IconButton, LoadingState, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { servingLabel } from '@/utils/nutrition';

/** Food details: nutrition per serving, with log / edit / remove. */
export default function FoodDetailsScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();

  const food = useApi(() => foodsApi.get(id), [id], { refetchOnFocus: true });
  const remove = useMutation(async () => {
    await foodsApi.remove(id);
    return true;
  });

  if (food.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (food.error || !food.data) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Food" showBack />
        <ErrorState message={food.error || 'Food not found'} onRetry={food.refetch} />
      </Screen>
    );
  }

  const f = food.data;
  const rows: [string, string][] = [
    ['Calories', `${f.calories} kcal`],
    ['Protein', `${f.proteinG} g`],
    ['Carbohydrates', `${f.carbsG} g`],
    ['Fat', `${f.fatG} g`],
    ...(f.fibreG != null ? ([['Fibre', `${f.fibreG} g`]] as [string, string][]) : []),
  ];

  const handleRemove = async () => {
    const ok = await confirm({
      title: 'Remove from library',
      message: `Remove "${f.name}"? Meals you already logged with it are kept.`,
      tone: 'danger',
      confirmLabel: 'Remove',
    });
    if (ok && (await remove.mutate())) router.back();
  };

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={f.name}
        subtitle={f.category || 'Food Library'}
        showBack
        right={
          <IconButton
            icon="create-outline"
            onPress={() => router.push({ pathname: '/nutrition/library/edit', params: { id: f.id } })}
          />
        }
      />

      {!f.isActive && (
        <View style={{ marginBottom: spacing.base }}>
          <Badge label="REMOVED FROM LIBRARY" color={theme.danger} />
        </View>
      )}

      <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
        <Txt variant="caption" color={theme.textTertiary}>
          PER {servingLabel(f.servingSize, f.servingUnit).toUpperCase()}
        </Txt>
        <Txt variant="h1" color={theme.nutrition} style={{ marginTop: 4, marginBottom: spacing.base }}>
          {Math.round(f.calories)} kcal
        </Txt>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: theme.divider,
            }}
          >
            <Txt variant="small" color={theme.textSecondary}>
              {label}
            </Txt>
            <Txt variant="small" style={{ fontWeight: '700' }}>
              {value}
            </Txt>
          </View>
        ))}
        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: spacing.md }}>
          Values are estimates. {f.isCustom ? 'Added by you.' : 'From the built-in library.'}
        </Txt>
      </GlassCard>

      {f.isActive && (
        <Button
          title="Log this food"
          icon="add"
          fullWidth
          size="lg"
          onPress={() => router.push({ pathname: '/nutrition/add', params: { foodId: f.id } })}
          style={{ marginBottom: spacing.md }}
        />
      )}
      <Button
        title="Edit food"
        variant="secondary"
        icon="create-outline"
        fullWidth
        onPress={() => router.push({ pathname: '/nutrition/library/edit', params: { id: f.id } })}
        style={{ marginBottom: spacing.md }}
      />
      {f.isActive && (
        <Button
          title="Remove from library"
          variant="danger"
          icon="trash-outline"
          fullWidth
          loading={remove.loading}
          onPress={handleRemove}
        />
      )}
      {remove.error && (
        <Txt variant="small" color={theme.danger} style={{ marginTop: spacing.md }}>
          {remove.error}
        </Txt>
      )}
    </Screen>
  );
}

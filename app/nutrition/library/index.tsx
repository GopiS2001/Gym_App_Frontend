import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced } from '@/hooks/useApi';
import { foodsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Chip, EmptyState, ErrorState, Field, IconButton, LoadingState, Txt } from '@/components/ui';
import { servingLabel } from '@/utils/nutrition';

/** Food Library: the master list of foods and their nutrition per serving. */
export default function FoodLibraryScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const debounced = useDebounced(search, 300);

  const categories = useApi(() => foodsApi.categories(), [], { refetchOnFocus: true });
  const foods = useApi(
    () => foodsApi.list({ search: debounced || undefined, category: category || undefined, limit: 200 }),
    [debounced, category],
    { refetchOnFocus: true },
  );

  const items = foods.data?.items || [];

  return (
    <Screen
      withTabBar={false}
      refreshing={foods.refreshing}
      onRefresh={() => {
        foods.refresh();
        categories.refresh();
      }}
    >
      <ScreenHeader
        title="Food Library"
        subtitle="Nutrition per serving"
        showBack
        right={
          <IconButton
            icon="add"
            color={theme.primary}
            onPress={() => router.push('/nutrition/library/edit')}
          />
        }
      />

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search foods"
        icon="search"
        autoCapitalize="none"
      />

      {!!categories.data?.items.length && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: spacing.base }}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          <Chip label="All" selected={!category} onPress={() => setCategory(null)} />
          {categories.data.items.map((c) => (
            <Chip
              key={c.name}
              label={c.name}
              count={c.count}
              selected={category === c.name}
              onPress={() => setCategory(category === c.name ? null : c.name)}
            />
          ))}
        </ScrollView>
      )}

      {foods.loading ? (
        <LoadingState message="Loading foods" />
      ) : foods.error ? (
        <ErrorState message={foods.error} onRetry={foods.refetch} />
      ) : items.length === 0 ? (
        <GlassCard>
          <EmptyState
            icon="nutrition-outline"
            title={debounced ? `No food called "${debounced}"` : 'No foods yet'}
            message="Add foods with their calories and macros per serving."
            actionLabel="Add food"
            onAction={() =>
              router.push({ pathname: '/nutrition/library/edit', params: { name: debounced } })
            }
          />
        </GlassCard>
      ) : (
        <GlassCard padded={false}>
          {items.map((f, i) => (
            <Pressable
              key={f.id}
              onPress={() => router.push(`/nutrition/library/${f.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.base,
                borderTopWidth: i ? StyleSheet.hairlineWidth : 0,
                borderTopColor: theme.divider,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
                    {f.name}
                  </Txt>
                  {f.isCustom && (
                    <Ionicons
                      name="person-outline"
                      size={12}
                      color={theme.textTertiary}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
                <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                  {servingLabel(f.servingSize, f.servingUnit)}
                  {f.category ? ` · ${f.category}` : ''} · P {f.proteinG}g
                </Txt>
              </View>
              <Txt variant="small" color={theme.nutrition} style={{ fontWeight: '700' }}>
                {Math.round(f.calories)} kcal
              </Txt>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textTertiary}
                style={{ marginLeft: spacing.sm }}
              />
            </Pressable>
          ))}
        </GlassCard>
      )}

      <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginTop: spacing.base }}>
        Values are estimates. Editing a food never changes what you already logged.
      </Txt>
    </Screen>
  );
}

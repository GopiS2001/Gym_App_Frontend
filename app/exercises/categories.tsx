import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced, useMutation } from '@/hooks/useApi';
import { categoriesApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Txt,
} from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import type { WorkoutCategory } from '@/types/models';

const SWATCHES = [
  '#34D399',
  '#60A5FA',
  '#FBBF24',
  '#F472B6',
  '#A78BFA',
  '#FB923C',
  '#2DD4BF',
  '#F87171',
  '#818CF8',
  '#94A3B8',
];

export default function CategoriesScreen() {
  const { confirm, notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<WorkoutCategory | null>(null);
  const [showForm, setShowForm] = useState(false);

  const debouncedSearch = useDebounced(search, 350);
  const categories = useApi(
    () => categoriesApi.list({ search: debouncedSearch || undefined }),
    [debouncedSearch],
    { refetchOnFocus: true },
  );

  const remove = (category: WorkoutCategory) => {
    confirm({
      title: 'Delete category',
      message: `Remove "${category.name}"?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      try {
        await categoriesApi.remove(category.id);
        categories.refresh();
      } catch (e: any) {
        notify({
          title: 'Cannot delete',
          message: e?.response?.data?.message ||
            'This category still holds exercises. Move or delete them first.',
          tone: 'info',
        });
      }
    });
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader
        title="Categories"
        subtitle="Muscle groups in your library"
        showBack
        right={
          <IconButton
            icon="add"
            color={theme.primary}
            onPress={() => {
              setEditing(null);
              setShowForm(true);
            }}
          />
        }
      />

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search categories"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {categories.loading ? (
          <LoadingState />
        ) : categories.error ? (
          <ErrorState message={categories.error} onRetry={categories.refetch} />
        ) : !categories.data?.items.length ? (
          <GlassCard>
            <EmptyState icon="grid-outline" title="No categories found" />
          </GlassCard>
        ) : (
          categories.data.items.map((category) => {
            const accent = category.colorHex || theme.primary;
            return (
              <GlassCard key={category.id} style={{ marginBottom: spacing.base }} padded={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
                  <View
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                      backgroundColor: `${accent}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {category.imageUrl ? (
                      <Image
                        source={{ uri: category.imageUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="barbell" size={21} color={accent} />
                    )}
                  </View>

                  <Pressable
                    style={{ flex: 1, marginLeft: spacing.md }}
                    onPress={() =>
                      router.push(`/(tabs)/workout`)
                    }
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Txt variant="bodyStrong" numberOfLines={1}>
                        {category.name}
                      </Txt>
                      {category.isCustom && <Badge label="CUSTOM" color={theme.streak} size="sm" />}
                    </View>
                    <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
                      {category.exerciseCount ?? 0} exercises
                    </Txt>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setEditing(category);
                      setShowForm(true);
                    }}
                    hitSlop={8}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                  </Pressable>

                  <Pressable onPress={() => remove(category)} hitSlop={8} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      <CategoryFormModal
        visible={showForm}
        category={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          categories.refresh();
        }}
      />
    </Screen>
  );
}

function CategoryFormModal({
  visible,
  category,
  onClose,
  onSaved,
}: {
  visible: boolean;
  category: WorkoutCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme, spacing, radius } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    setName(category?.name || '');
    setDescription(category?.description || '');
    setColor(category?.colorHex || SWATCHES[0]);
    setError(null);
  }, [visible, category]);

  const save = useMutation(async () => {
    const payload = { name: name.trim(), description: description.trim(), colorHex: color };
    return category
      ? categoriesApi.update(category.id, payload)
      : categoriesApi.create(payload);
  });

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError('Enter a name of at least 2 characters');
      return;
    }
    const result = await save.mutate();
    if (result) onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5,8,11,0.78)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <View
          style={{
            backgroundColor: theme.cardElevated,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
            borderTopWidth: StyleSheet.hairlineWidth * 2,
            borderTopColor: theme.glassBorder,
          }}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              alignSelf: 'center',
              marginBottom: spacing.lg,
            }}
          />

          <Txt variant="h3" style={{ marginBottom: spacing.lg }}>
            {category ? 'Edit category' : 'New category'}
          </Txt>

          <Field
            label="NAME"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="e.g. Forearms"
            error={error || undefined}
          />

          <Field
            label="DESCRIPTION"
            value={description}
            onChangeText={setDescription}
            placeholder="What this group covers"
            multiline
          />

          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            COLOUR
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg }}>
            {SWATCHES.map((swatch) => (
              <Pressable
                key={swatch}
                onPress={() => setColor(swatch)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: swatch,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: color === swatch ? 3 : 0,
                  borderColor: theme.text,
                }}
              >
                {color === swatch && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </Pressable>
            ))}
          </View>

          {save.error && (
            <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
              {save.error}
            </Txt>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Cancel" variant="glass" style={{ flex: 1 }} onPress={onClose} />
            <Button
              title={category ? 'Save' : 'Create'}
              style={{ flex: 1 }}
              loading={save.loading}
              onPress={handleSave}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

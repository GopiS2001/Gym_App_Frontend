import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced, useMutation } from '@/hooks/useApi';
import { goalTypesApi } from '@/services/endpoints';
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
  Txt,
} from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import type { GoalType } from '@/types/models';

const SWATCHES = [
  '#34D399', '#60A5FA', '#FBBF24', '#F472B6', '#A78BFA',
  '#FB923C', '#2DD4BF', '#F87171', '#818CF8', '#94A3B8',
];

const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'barbell', 'trending-up', 'trending-down', 'flame', 'fitness',
  'body', 'heart', 'flag', 'trophy', 'speedometer',
];

export default function GoalTypesScreen() {
  const confirm = useConfirm();
  const { theme, spacing, radius } = useTheme();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<GoalType | null>(null);
  const [showForm, setShowForm] = useState(false);

  const debouncedSearch = useDebounced(search, 350);

  const types = useApi(
    () =>
      goalTypesApi.list({
        search: debouncedSearch || undefined,
        includeInactive: showArchived || undefined,
      }),
    [debouncedSearch, showArchived],
    { refetchOnFocus: true },
  );

  const remove = (type: GoalType) => {
    const inUse = (type.goalCount ?? 0) > 0;
    confirm({
      title: inUse ? 'Archive goal type' : 'Delete goal type',
      message: inUse
        ? `${type.goalCount} goal(s) use "${type.name}". It will be archived so your history stays readable, and hidden from the picker.`
        : `Remove "${type.name}"?`,
      tone: 'danger',
      confirmLabel: inUse ? 'Archive' : 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
        await goalTypesApi.remove(type.id).catch(() => undefined);
        types.refresh();
    });
  };

  const restore = async (type: GoalType) => {
    await goalTypesApi.restore(type.id).catch(() => undefined);
    types.refresh();
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader
        title="Goal Types"
        subtitle="Muscle gain, weight loss and your own"
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
        placeholder="Search goal types"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <Chip
          label="Active"
          selected={!showArchived}
          onPress={() => setShowArchived(false)}
        />
        <Chip
          label="Include archived"
          icon="archive-outline"
          selected={showArchived}
          onPress={() => setShowArchived(true)}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {types.loading ? (
          <LoadingState />
        ) : types.error ? (
          <ErrorState message={types.error} onRetry={types.refetch} />
        ) : !types.data?.items.length ? (
          <GlassCard>
            <EmptyState
              icon="flag-outline"
              title="No goal types found"
              actionLabel="Create one"
              onAction={() => {
                setEditing(null);
                setShowForm(true);
              }}
            />
          </GlassCard>
        ) : (
          types.data.items.map((type) => {
            const accent = type.colorHex || theme.primary;
            return (
              <GlassCard
                key={type.id}
                style={{ marginBottom: spacing.base, opacity: type.isActive ? 1 : 0.55 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${accent}22`,
                    }}
                  >
                    <Ionicons
                      name={(type.iconName as any) || 'flag'}
                      size={20}
                      color={accent}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Txt variant="bodyStrong" numberOfLines={1}>
                        {type.name}
                      </Txt>
                      {type.isCustom && (
                        <Badge label="CUSTOM" color={theme.streak} size="sm" />
                      )}
                      {!type.isActive && (
                        <Badge label="ARCHIVED" color={theme.textTertiary} size="sm" />
                      )}
                    </View>
                    <Txt
                      variant="caption"
                      color={theme.textTertiary}
                      numberOfLines={1}
                      style={{ marginTop: 2 }}
                    >
                      {type.goalCount
                        ? `${type.goalCount} goal${type.goalCount === 1 ? '' : 's'}`
                        : 'Not used yet'}
                      {type.description ? ` · ${type.description}` : ''}
                    </Txt>
                  </View>

                  {type.isActive ? (
                    <>
                      <Pressable
                        onPress={() => {
                          setEditing(type);
                          setShowForm(true);
                        }}
                        hitSlop={8}
                        style={{ padding: 6 }}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                      <Pressable onPress={() => remove(type)} hitSlop={8} style={{ padding: 6 }}>
                        <Ionicons name="trash-outline" size={18} color={theme.danger} />
                      </Pressable>
                    </>
                  ) : (
                    <Pressable onPress={() => restore(type)} hitSlop={8} style={{ padding: 6 }}>
                      <Ionicons name="refresh" size={18} color={theme.primary} />
                    </Pressable>
                  )}
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      <GoalTypeFormModal
        visible={showForm}
        goalType={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          types.refresh();
        }}
      />
    </Screen>
  );
}

function GoalTypeFormModal({
  visible,
  goalType,
  onClose,
  onSaved,
}: {
  visible: boolean;
  goalType: GoalType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme, spacing, radius } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [icon, setIcon] = useState<string>('flag');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(goalType?.name || '');
    setDescription(goalType?.description || '');
    setColor(goalType?.colorHex || SWATCHES[0]);
    setIcon(goalType?.iconName || 'flag');
    setError(null);
  }, [visible, goalType]);

  const save = useMutation(async () => {
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      colorHex: color,
      iconName: icon,
    };
    return goalType
      ? goalTypesApi.update(goalType.id, payload)
      : goalTypesApi.create(payload);
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

        <ScrollView
          style={{
            maxHeight: '88%',
            backgroundColor: theme.cardElevated,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
          }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
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
            {goalType ? 'Edit goal type' : 'New goal type'}
          </Txt>

          {/* live preview */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: theme.surfaceMuted,
              marginBottom: spacing.lg,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${color}22`,
              }}
            >
              <Ionicons name={icon as any} size={19} color={color} />
            </View>
            <Txt variant="bodyStrong" style={{ marginLeft: spacing.md }} numberOfLines={1}>
              {name.trim() || 'Your goal type'}
            </Txt>
          </View>

          <Field
            label="NAME"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            placeholder="e.g. Powerlifting Peak"
            error={error || undefined}
          />

          <Field
            label="DESCRIPTION"
            value={description}
            onChangeText={setDescription}
            placeholder="What this goal is for"
            multiline
          />

          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            ICON
          </Txt>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              rowGap: spacing.sm,
              columnGap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            {ICONS.map((name_) => (
              <Pressable
                key={name_}
                onPress={() => setIcon(name_)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: icon === name_ ? `${color}22` : theme.surfaceMuted,
                  borderWidth: icon === name_ ? 2 : 0,
                  borderColor: color,
                }}
              >
                <Ionicons
                  name={name_}
                  size={19}
                  color={icon === name_ ? color : theme.textTertiary}
                />
              </Pressable>
            ))}
          </View>

          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            COLOUR
          </Txt>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              rowGap: spacing.md,
              columnGap: spacing.md,
              marginBottom: spacing.lg,
            }}
          >
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
              title={goalType ? 'Save' : 'Create'}
              style={{ flex: 1 }}
              loading={save.loading}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

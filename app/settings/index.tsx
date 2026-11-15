import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/AuthContext';
import { useApi, useMutation } from '@/hooks/useApi';
import { authApi, profileApi, settingsApi } from '@/services/endpoints';
import { API_BASE_URL } from '@/services/api';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Button,
  Chip,
  ErrorState,
  Field,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useDialog } from '@/components/Dialog';

export default function SettingsScreen() {
  const { confirm, notify } = useDialog();
  const { theme, spacing, radius, setPreference } = useTheme();
  const router = useRouter();
  const { refreshSettings } = useAuth();

  const settings = useApi(() => settingsApi.get(), [], { refetchOnFocus: true });

  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (settings.data) setDraft(settings.data as any);
  }, [settings.data]);

  const save = useMutation(async (payload: any) => settingsApi.update(payload));

  const patch = async (payload: Record<string, any>) => {
    setDraft((d) => ({ ...d, ...payload }));
    const result = await save.mutate(payload);
    if (result) {
      settings.setData(result);
      if (payload.theme) setPreference(payload.theme);
      refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    }
  };

  const saveNumbers = async () => {
    const payload = {
      dailyWaterTargetMl: parseInt(String(draft.dailyWaterTargetMl), 10),
      dailyCalorieTarget: parseInt(String(draft.dailyCalorieTarget), 10),
      dailyProteinTargetG: parseInt(String(draft.dailyProteinTargetG), 10),
      dailyCarbsTargetG: parseInt(String(draft.dailyCarbsTargetG), 10),
      dailyFatTargetG: parseInt(String(draft.dailyFatTargetG), 10),
      weeklyWorkoutTarget: parseInt(String(draft.weeklyWorkoutTarget), 10),
      defaultRestSeconds: parseInt(String(draft.defaultRestSeconds), 10),
    };
    await patch(payload);
  };

  const exportData = async () => {
    const data = await profileApi.exportData().catch(() => null);
    if (!data) {
      await notify({
        title: 'Export failed',
        message: 'Could not build your export. Try again.',
        tone: 'danger',
        icon: 'cloud-offline-outline',
      });
      return;
    }

    await notify({
      title: 'Export ready',
      message: 'Your data was assembled from the server.',
      tone: 'success',
      icon: 'download-outline',
      details: [
        `${data.workoutSessions?.length ?? 0} workouts`,
        `${data.weightLogs?.length ?? 0} weight entries`,
        `${data.foodLogs?.length ?? 0} food entries`,
        `${data.progressPhotos?.length ?? 0} photos`,
        'Returned by GET /users/export — call it from any HTTP client to save a JSON backup.',
      ],
    });
  };

  const deleteAllData = async () => {
    // Two steps on purpose: this is the most destructive action in the app.
    const first = await confirm({
      title: 'Delete all tracked data',
      message:
        'Your account and exercise library stay, but everything you have recorded goes.',
      tone: 'danger',
      confirmLabel: 'Delete everything',
      details: [
        'Every workout and recorded set',
        'Weight entries and body measurements',
        'Progress photos',
        'Meals, water and sleep records',
      ],
    });
    if (!first) return;

    const second = await confirm({
      title: 'Are you certain?',
      message: 'There is no way to recover this data.',
      tone: 'danger',
      icon: 'warning-outline',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'Keep my data',
    });
    if (!second) return;

    const result = await profileApi.deleteAllData().catch(() => null);
    await notify({
      title: result ? 'Data deleted' : 'Delete failed',
      message: result
        ? 'All tracked records have been removed.'
        : 'Nothing was deleted. Try again.',
      tone: result ? 'success' : 'danger',
    });
  };

  if (settings.loading) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Settings" showBack />
        <LoadingState />
      </Screen>
    );
  }

  if (settings.error) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Settings" showBack />
        <ErrorState message={settings.error} onRetry={settings.refetch} />
      </Screen>
    );
  }

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title="Settings"
        subtitle="Targets, units and preferences"
        showBack
        right={
          saved ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={15} color={theme.success} />
              <Txt variant="caption" color={theme.success} style={{ marginLeft: 3 }}>
                Saved
              </Txt>
            </View>
          ) : undefined
        }
      />

      {/* ------------------------------------------------------- theme */}
      <SectionHeader title="Appearance" icon="color-palette-outline" />
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row' }}>
          {(['SYSTEM', 'LIGHT', 'DARK'] as const).map((mode) => (
            <Chip
              key={mode}
              label={mode === 'SYSTEM' ? 'Auto' : mode === 'LIGHT' ? 'Light' : 'Dark'}
              selected={draft.theme === mode}
              onPress={() => patch({ theme: mode })}
            />
          ))}
        </View>
      </GlassCard>

      {/* ------------------------------------------------------- units */}
      <SectionHeader title="Units" icon="swap-horizontal-outline" />
      <GlassCard style={{ marginBottom: spacing.base }}>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          WEIGHT
        </Txt>
        <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
          {(['KG', 'LB'] as const).map((unit) => (
            <Chip
              key={unit}
              label={unit === 'KG' ? 'Kilograms' : 'Pounds'}
              selected={draft.weightUnit === unit}
              onPress={() => patch({ weightUnit: unit })}
            />
          ))}
        </View>

        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
          HEIGHT
        </Txt>
        <View style={{ flexDirection: 'row' }}>
          {(['CM', 'FT'] as const).map((unit) => (
            <Chip
              key={unit}
              label={unit === 'CM' ? 'Centimetres' : 'Feet & inches'}
              selected={draft.heightUnit === unit}
              onPress={() => patch({ heightUnit: unit })}
            />
          ))}
        </View>
      </GlassCard>

      {/* ----------------------------------------------------- targets */}
      <SectionHeader title="Daily Targets" icon="flag-outline" />
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="CALORIES"
            value={String(draft.dailyCalorieTarget ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, dailyCalorieTarget: t }))}
            keyboardType="number-pad"
            suffix="kcal"
            style={{ flex: 1 }}
          />
          <Field
            label="WATER"
            value={String(draft.dailyWaterTargetMl ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, dailyWaterTargetMl: t }))}
            keyboardType="number-pad"
            suffix="ml"
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="PROTEIN"
            value={String(draft.dailyProteinTargetG ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, dailyProteinTargetG: t }))}
            keyboardType="number-pad"
            suffix="g"
            style={{ flex: 1 }}
          />
          <Field
            label="CARBS"
            value={String(draft.dailyCarbsTargetG ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, dailyCarbsTargetG: t }))}
            keyboardType="number-pad"
            suffix="g"
            style={{ flex: 1 }}
          />
          <Field
            label="FAT"
            value={String(draft.dailyFatTargetG ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, dailyFatTargetG: t }))}
            keyboardType="number-pad"
            suffix="g"
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Field
            label="WORKOUTS PER WEEK"
            value={String(draft.weeklyWorkoutTarget ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, weeklyWorkoutTarget: t }))}
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
          <Field
            label="DEFAULT REST"
            value={String(draft.defaultRestSeconds ?? '')}
            onChangeText={(t) => setDraft((d) => ({ ...d, defaultRestSeconds: t }))}
            keyboardType="number-pad"
            suffix="s"
            style={{ flex: 1 }}
          />
        </View>

        {save.error && (
          <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
            {save.error}
          </Txt>
        )}

        <Button
          title="Save targets"
          icon="checkmark"
          fullWidth
          loading={save.loading}
          onPress={saveNumbers}
        />
      </GlassCard>

      {/* ----------------------------------------------- notifications */}
      <SectionHeader title="Reminders" icon="notifications-outline" />
      <GlassCard padded={false} style={{ marginBottom: spacing.base }}>
        <ToggleRow
          label="Notifications"
          description="Master switch for all reminders"
          value={!!draft.notificationEnabled}
          onChange={(v) => patch({ notificationEnabled: v })}
        />
        <ToggleRow
          label="Workout reminders"
          description="Nudge when a training day has no session yet"
          value={!!draft.workoutReminderEnabled}
          onChange={(v) => patch({ workoutReminderEnabled: v })}
          disabled={!draft.notificationEnabled}
        />
        <ToggleRow
          label="Water reminders"
          description="Periodic prompts to drink"
          value={!!draft.waterReminderEnabled}
          onChange={(v) => patch({ waterReminderEnabled: v })}
          disabled={!draft.notificationEnabled}
          last
        />
      </GlassCard>

      {/* ---------------------------------------------------- account */}
      <SectionHeader title="Account" icon="shield-outline" />
      <GlassCard padded={false} style={{ marginBottom: spacing.base }}>
        <MenuRow
          icon="person-outline"
          label="Edit profile"
          onPress={() => router.push('/settings/edit-profile')}
        />
        <MenuRow
          icon="key-outline"
          label="Change password"
          onPress={() => setShowPassword((v) => !v)}
        />
        <MenuRow icon="download-outline" label="Export my data" onPress={exportData} />
        <MenuRow
          icon="trash-outline"
          label="Delete all tracked data"
          danger
          onPress={deleteAllData}
          last
        />
      </GlassCard>

      {showPassword && <ChangePasswordCard onDone={() => setShowPassword(false)} />}

      {/* --------------------------------------------------- about */}
      <GlassCard variant="subtle" style={{ marginBottom: spacing.xxl }}>
        <Txt variant="caption" color={theme.textTertiary}>
          CONNECTED TO
        </Txt>
        <Txt variant="small" style={{ marginTop: 2 }} numberOfLines={1}>
          {API_BASE_URL}
        </Txt>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: spacing.sm }}>
          Personal Gym v1.0.0 · Private single-user account
        </Txt>
      </GlassCard>
    </Screen>
  );
}

function ChangePasswordCard({ onDone }: { onDone: () => void }) {
  const { theme, spacing } = useTheme();
  const { notify } = useDialog();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const change = useMutation(() => authApi.changePassword(current, next));

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!current) nextErrors.current = 'Enter your current password';
    if (next.length < 6) nextErrors.next = 'Use at least 6 characters';
    if (next !== confirm) nextErrors.confirm = 'The passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await change.mutate();
    if (result) {
      await notify({
        title: 'Password changed',
        message: 'Other sessions were signed out. Use your new password next time.',
        tone: 'success',
        icon: 'key-outline',
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone();
    }
  };

  return (
    <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
      <Txt variant="h4" style={{ marginBottom: spacing.base }}>
        Change password
      </Txt>

      <Field
        label="CURRENT PASSWORD"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
        icon="lock-closed-outline"
        error={errors.current}
      />
      <Field
        label="NEW PASSWORD"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoCapitalize="none"
        icon="key-outline"
        error={errors.next}
      />
      <Field
        label="CONFIRM NEW PASSWORD"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        icon="checkmark-circle-outline"
        error={errors.confirm}
      />

      {change.error && (
        <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
          {change.error}
        </Txt>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Button title="Cancel" variant="glass" style={{ flex: 1 }} onPress={onDone} />
        <Button
          title="Update"
          style={{ flex: 1 }}
          loading={change.loading}
          onPress={submit}
        />
      </View>
    </GlassCard>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
  last = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.divider,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Txt variant="small" style={{ fontWeight: '700' }}>
          {label}
        </Txt>
        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
          {description}
        </Txt>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  danger = false,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { theme, spacing } = useTheme();
  const color = danger ? theme.danger : theme.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.base,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.divider,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: danger ? theme.dangerSoft : theme.surfaceMuted,
        }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Txt
        variant="body"
        color={danger ? theme.danger : theme.text}
        style={{ flex: 1, marginLeft: spacing.md, fontWeight: '600' }}
      >
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={17} color={theme.textTertiary} />
    </Pressable>
  );
}

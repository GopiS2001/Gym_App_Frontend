import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/AuthContext';
import { useApi } from '@/hooks/useApi';
import { analyticsApi, attendanceApi, profileApi } from '@/services/endpoints';
import { Screen } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Badge, Button, LoadingState, SectionHeader, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { formatDate, formatMinutes, formatVolume, humanise } from '@/utils/format';

export default function ProfileScreen() {
  const { theme, spacing, radius, preference, setPreference } = useTheme();
  const router = useRouter();
  const { signOut, user, refreshProfile } = useAuth();
  const confirm = useConfirm();

  const profile = useApi(() => profileApi.get(), [], { refetchOnFocus: true });
  const stats = useApi(() => analyticsApi.workouts(365), [], { refetchOnFocus: true });
  const attendance = useApi(() => attendanceApi.stats(), [], { refetchOnFocus: true });

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need your password to sign back in. Nothing you have recorded is lost.',
      icon: 'log-out-outline',
      tone: 'warning',
      confirmLabel: 'Sign out',
    });
    if (ok) signOut();
  };

  if (profile.loading) {
    return (
      <Screen>
        <LoadingState message="Loading your profile" />
      </Screen>
    );
  }

  const p = profile.data;

  return (
    <Screen
      refreshing={profile.refreshing}
      onRefresh={() => {
        profile.refresh();
        stats.refresh();
        attendance.refresh();
        refreshProfile();
      }}
    >
      {/* ---------------------------------------------------- hero card */}
      <GlassCard variant="strong" style={{ marginBottom: spacing.base }} padded={false}>
        <LinearGradient
          colors={[`${theme.primary}2E`, 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }}
        />

        <View style={{ alignItems: 'center', padding: spacing.lg }}>
          <Pressable onPress={() => router.push('/settings/edit-profile')}>
            <View
              style={{
                width: 92,
                height: 92,
                borderRadius: 30,
                overflow: 'hidden',
                borderWidth: 2.5,
                borderColor: theme.primary,
                backgroundColor: theme.surfaceMuted,
              }}
            >
              {p?.profileImageUrl ? (
                <Image source={{ uri: p.profileImageUrl }} style={{ flex: 1 }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={38} color={theme.textTertiary} />
                </View>
              )}
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primary,
                borderWidth: 2.5,
                borderColor: theme.background,
              }}
            >
              <Ionicons name="pencil" size={12} color={theme.onPrimary} />
            </View>
          </Pressable>

          <Txt variant="h2" style={{ marginTop: spacing.md }}>
            {p?.fullName || 'Athlete'}
          </Txt>
          <Txt variant="small" color={theme.textTertiary} style={{ marginTop: 2 }}>
            {p?.email || user?.email}
          </Txt>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Badge
              label={humanise(p?.experienceLevel) || 'Beginner'}
              icon="fitness"
              color={theme.primary}
            />
            {p?.membershipDays != null && (
              <Badge label={`${p.membershipDays} days in`} icon="calendar" color={theme.streak} />
            )}
          </View>

          {/* body metrics strip */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: spacing.lg,
              paddingTop: spacing.base,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.divider,
              alignSelf: 'stretch',
            }}
          >
            <Metric label="Height" value={p?.heightCm ? `${p.heightCm}` : '--'} unit="cm" />
            <Metric
              label="Weight"
              value={p?.currentWeightKg ? `${p.currentWeightKg}` : '--'}
              unit="kg"
            />
            <Metric label="BMI" value={p?.bmi ? `${p.bmi}` : '--'} unit={p?.bmiCategory || ''} />
            <Metric label="Age" value={p?.age ? `${p.age}` : '--'} unit="yrs" />
          </View>
        </View>
      </GlassCard>

      {/* ------------------------------------------------- lifetime stats */}
      <SectionHeader title="All-Time" />
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        <StatCard
          icon="barbell"
          label="Workouts"
          value={stats.data?.totals.sessionCount ?? 0}
          color={theme.primary}
        />
        <StatCard
          icon="time"
          label="Training"
          value={formatMinutes(stats.data?.totals.totalMinutes)}
          color={theme.hydration}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.base }}>
        <StatCard
          icon="layers"
          label="Volume"
          value={formatVolume(stats.data?.totals.totalVolumeKg)}
          color={theme.streak}
        />
        <StatCard
          icon="flame"
          label="Best streak"
          value={`${attendance.data?.longestStreak ?? 0}d`}
          color={theme.nutrition}
        />
      </View>

      {/* ------------------------------------------------------- theme */}
      <SectionHeader title="Appearance" />
      <GlassCard style={{ marginBottom: spacing.base }}>
        <View
          style={{
            flexDirection: 'row',
            padding: 4,
            borderRadius: radius.pill,
            backgroundColor: theme.surfaceMuted,
          }}
        >
          {(['SYSTEM', 'LIGHT', 'DARK'] as const).map((mode) => {
            const active = preference === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setPreference(mode)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.sm + 2,
                  borderRadius: radius.pill,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
              >
                <Ionicons
                  name={
                    mode === 'SYSTEM'
                      ? 'phone-portrait-outline'
                      : mode === 'LIGHT'
                        ? 'sunny-outline'
                        : 'moon-outline'
                  }
                  size={14}
                  color={active ? theme.onPrimary : theme.textSecondary}
                />
                <Txt
                  variant="caption"
                  color={active ? theme.onPrimary : theme.textSecondary}
                  style={{ marginLeft: 5 }}
                >
                  {mode === 'SYSTEM' ? 'Auto' : mode === 'LIGHT' ? 'Light' : 'Dark'}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      {/* -------------------------------------------------------- menu */}
      <SectionHeader title="Manage" />
      <GlassCard padded={false} style={{ marginBottom: spacing.base }}>
        <MenuRow
          icon="person-outline"
          label="Edit profile"
          onPress={() => router.push('/settings/edit-profile')}
        />
        <MenuRow icon="flag-outline" label="Fitness goals" onPress={() => router.push('/goals')} />
        <MenuRow
          icon="pricetags-outline"
          label="Goal types"
          onPress={() => router.push('/goals/types')}
        />
        <MenuRow
          icon="clipboard-outline"
          label="Workout plans"
          onPress={() => router.push('/(tabs)/workout')}
        />
        <MenuRow
          icon="list-outline"
          label="Workout history"
          onPress={() => router.push('/workout/history')}
        />
        <MenuRow
          icon="grid-outline"
          label="Exercise categories"
          onPress={() => router.push('/exercises/categories')}
        />
        <MenuRow
          icon="stats-chart-outline"
          label="Reports & analytics"
          onPress={() => router.push('/progress/analytics')}
        />
        <MenuRow
          icon="settings-outline"
          label="Settings & targets"
          onPress={() => router.push('/settings')}
          last
        />
      </GlassCard>

      <Button
        title="Sign out"
        icon="log-out-outline"
        variant="glass"
        fullWidth
        onPress={handleSignOut}
        style={{ marginBottom: spacing.md }}
      />

      <Txt variant="caption" color={theme.textTertiary} align="center">
        Personal Gym · v1.0.0
      </Txt>
    </Screen>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="h4">{value}</Txt>
      {unit ? (
        <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
          {unit}
        </Txt>
      ) : null}
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1, opacity: 0.7 }}>
        {label}
      </Txt>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  const { theme, spacing } = useTheme();
  return (
    <GlassCard style={{ flex: 1 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}22`,
          marginBottom: spacing.sm,
        }}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Txt variant="h3">{value}</Txt>
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </GlassCard>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { theme, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.base,
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
          backgroundColor: theme.surfaceMuted,
        }}
      >
        <Ionicons name={icon} size={16} color={theme.textSecondary} />
      </View>
      <Txt variant="body" style={{ flex: 1, marginLeft: spacing.md, fontWeight: '600' }}>
        {label}
      </Txt>
      <Ionicons name="chevron-forward" size={17} color={theme.textTertiary} />
    </Pressable>
  );
}

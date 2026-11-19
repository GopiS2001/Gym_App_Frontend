import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { THEME_SWITCHING_ENABLED, useTheme } from '@/theme/ThemeProvider';
import { heroTheme } from '@/theme/tokens';
import { ActionRow, ActionTile, IconWell } from '@/components/premium';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
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
  useStatusBarStyle('dark');
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
      <GlassCard variant="hero" style={{ marginBottom: spacing.base }} padded={false}>
        <LinearGradient
          colors={[`${heroTheme.primary}2E`, 'transparent']}
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
                borderColor: heroTheme.primary,
                backgroundColor: heroTheme.surfaceMuted,
              }}
            >
              {p?.profileImageUrl ? (
                <Image source={{ uri: p.profileImageUrl }} style={{ flex: 1 }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={38} color={heroTheme.textTertiary} />
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
                backgroundColor: heroTheme.primary,
                borderWidth: 2.5,
                borderColor: '#16294D',
              }}
            >
              <Ionicons name="pencil" size={12} color={heroTheme.onPrimary} />
            </View>
          </Pressable>

          <Txt variant="h2" style={{ marginTop: spacing.md }}>
            {p?.fullName || 'Athlete'}
          </Txt>
          <Txt variant="small" color={heroTheme.textTertiary} style={{ marginTop: 2 }}>
            {p?.email || user?.email}
          </Txt>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <Badge
              label={humanise(p?.experienceLevel) || 'Beginner'}
              icon="fitness"
              color={heroTheme.primary}
            />
            {p?.membershipDays != null && (
              <Badge label={`${p.membershipDays} days in`} icon="calendar" color={heroTheme.streak} />
            )}
          </View>

          {/* body metrics strip */}
          <View
            style={{
              flexDirection: 'row',
              marginTop: spacing.lg,
              paddingTop: spacing.base,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: heroTheme.divider,
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

      {/* ------------------------------------------------- quick actions */}
      <ActionRow>
        <ActionTile icon="person-outline" label="Edit profile" highlighted onPress={() => router.push('/settings/edit-profile')} />
        <ActionTile icon="flag-outline" label="Goals" onPress={() => router.push('/goals')} />
        <ActionTile icon="stats-chart-outline" label="Reports" onPress={() => router.push('/progress/analytics')} />
        <ActionTile icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
      </ActionRow>

      {/* ------------------------------------------------- lifetime stats */}
      <SectionHeader title="All-Time" />
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        <StatCard
          icon="barbell"
          label="Workouts"
          value={stats.data?.totals?.sessionCount ?? 0}
          color={theme.primary}
        />
        <StatCard
          icon="time"
          label="Training"
          value={formatMinutes(stats.data?.totals?.totalMinutes)}
          color={theme.hydration}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.base }}>
        <StatCard
          icon="layers"
          label="Volume"
          value={formatVolume(stats.data?.totals?.totalVolumeKg)}
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
      {/* Hidden while the app is light-only; see THEME_SWITCHING_ENABLED. */}
      {THEME_SWITCHING_ENABLED && (
      <>
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
      </>
      )}

      {/* -------------------------------------------------------- menu */}
      <SectionHeader title="More" />
      <GlassCard padded={false} style={{ marginBottom: spacing.base }}>
        <MenuRow
          icon="pricetags-outline"
          label="Goal types"
          caption="Weight loss, muscle gain and more"
          color={theme.sleep}
          onPress={() => router.push('/goals/types')}
        />
        <MenuRow
          icon="clipboard-outline"
          label="Workout plans"
          caption="Your weekly training schedule"
          color={theme.primary}
          onPress={() => router.push('/(tabs)/workout')}
        />
        <MenuRow
          icon="time-outline"
          label="Workout history"
          caption="Every session you've logged"
          color={theme.hydration}
          onPress={() => router.push('/workout/history')}
        />
        <MenuRow
          icon="grid-outline"
          label="Exercise categories"
          caption="Organise your exercise library"
          color={theme.streak}
          onPress={() => router.push('/exercises/categories')}
        />
        <MenuRow
          icon="alarm-outline"
          label="Meal reminders"
          caption="Nudges to eat and log"
          color={theme.nutrition}
          onPress={() => router.push('/nutrition/reminders')}
        />
        <MenuRow
          icon="musical-notes-outline"
          label="Music"
          caption="Songs, movies and covers"
          color={theme.primary}
          onPress={() => router.push('/music')}
          last
        />
      </GlassCard>

      <Pressable
        onPress={handleSignOut}
        accessibilityRole="button"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: 52,
          borderRadius: radius.pill,
          backgroundColor: theme.card,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.glassBorder,
          boxShadow: pressed ? theme.elevation.pressed : theme.elevation.card,
          marginBottom: spacing.md,
        })}
      >
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <Txt variant="bodyStrong" color={theme.danger} style={{ marginLeft: spacing.sm }}>
          Sign out
        </Txt>
      </Pressable>

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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <IconWell icon={icon} color={color} size={38} filled />
      </View>
      <Txt variant="h2">{value}</Txt>
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </GlassCard>
  );
}

function MenuRow({
  icon,
  label,
  caption,
  color,
  onPress,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption?: string;
  color?: string;
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
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.divider,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <IconWell icon={icon} color={color || theme.primary} size={40} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Txt variant="body" style={{ fontWeight: '700' }}>
          {label}
        </Txt>
        {caption && (
          <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
            {caption}
          </Txt>
        )}
      </View>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.surfaceMuted,
        }}
      >
        <Ionicons name="chevron-forward" size={15} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { GlassCard } from '@/components/Glass';
import { Button, Txt } from '@/components/ui';
import type { PermissionState } from '@/services/notifications';

/**
 * Explains why notifications help and how to turn them on. Shows nothing
 * once permission is granted. Food Intake keeps working either way.
 */
export function NotificationBanner({
  permission,
  supported,
  onEnable,
}: {
  permission: PermissionState | null;
  supported: boolean;
  onEnable: () => void;
}) {
  const { theme, spacing } = useTheme();

  if (!supported) {
    return (
      <GlassCard style={{ marginBottom: spacing.base }}>
        <Txt variant="small" color={theme.textSecondary}>
          Reminders are delivered by the Android / iOS app. You can still set them up here.
        </Txt>
      </GlassCard>
    );
  }
  if (!permission || permission.status === 'granted') return null;

  const blocked = permission.status === 'denied' && !permission.canAskAgain;

  return (
    <GlassCard style={{ marginBottom: spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
        <Ionicons
          name={blocked ? 'notifications-off-outline' : 'notifications-outline'}
          size={20}
          color={blocked ? theme.danger : theme.warning}
          style={{ marginRight: spacing.sm, marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong">
            {blocked ? 'Notifications are turned off' : 'Turn on notifications'}
          </Txt>
          <Txt variant="small" color={theme.textSecondary} style={{ marginTop: 4 }}>
            {blocked
              ? 'Your reminders are saved but will not alert you. Open Settings → Notifications for Personal Gym and allow them.'
              : 'Reminders nudge you at meal times and around your workout, so logging is easier to keep up. You can turn any reminder off later.'}
          </Txt>
        </View>
      </View>
      <Button
        title={blocked ? 'Open settings' : 'Allow notifications'}
        icon={blocked ? 'settings-outline' : 'notifications'}
        fullWidth
        onPress={onEnable}
      />
    </GlassCard>
  );
}

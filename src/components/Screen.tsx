import React from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { GlowOrb, ScreenGradient } from './Glass';
import { Txt } from './ui';
import { useTabBarSpace } from './TabBar';


/**
 * Standard screen frame: gradient backdrop, soft colour orbs, safe-area
 * padding and optional pull-to-refresh.
 */
export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  withTabBar = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  withTabBar?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { theme, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarSpace = useTabBarSpace();

  const body = (
    <View
      style={[
        // Without a scroll view the content must claim the remaining height.
        // A child ScrollView with `flex: 1` measures against this view, and on
        // Android an auto-height parent collapses it to nothing — the screen
        // renders blank. Web's flexbox is more forgiving, which is why this
        // only shows up on device.
        scroll ? null : { flex: 1 },
        padded ? { paddingHorizontal: spacing.lg } : null,
        {
          paddingBottom: withTabBar
            ? // Clears the floating tab bar plus the gap beneath it.
              tabBarSpace
            : insets.bottom + spacing.lg,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    // overflow: hidden clips the glow orbs, which sit partly off-screen. On
    // web, unclipped they made the page wider than the viewport, so mobile
    // browsers zoomed out and scrolling panned the app, exposing white strips.
    <View style={{ flex: 1, backgroundColor: theme.background, overflow: 'hidden' }}>
      <ScreenGradient>
        {/* Ambient colour behind the glass. */}
        <GlowOrb color={theme.primary} size={300} opacity={0.1} style={{ top: -120, right: -90 }} />
        <GlowOrb color={theme.hydration} size={260} opacity={0.07} style={{ top: 260, left: -120 }} />

        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: insets.top + spacing.sm }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                  colors={[theme.primary]}
                  progressBackgroundColor={theme.card}
                />
              ) : undefined
            }
          >
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, paddingTop: insets.top + spacing.sm }}>{body}</View>
        )}
      </ScreenGradient>
    </View>
  );
}

/** Title row with an optional back button and trailing action. */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        minHeight: 44,
      }}
    >
      {showBack && (
        <Pressable
          onPress={() => (onBack ? onBack() : router.back())}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.glassStrong,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: theme.glassBorder,
            marginRight: spacing.md,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>
      )}

      <View style={{ flex: 1 }}>
        <Txt variant="h2" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle && (
          <Txt variant="small" color={theme.textTertiary} numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </Txt>
        )}
      </View>

      {right}
    </View>
  );
}

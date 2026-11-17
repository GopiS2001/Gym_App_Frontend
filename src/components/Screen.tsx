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
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';
import { heroTheme } from '@/theme/tokens';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
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
        <GlowOrb
          color={theme.mode === 'dark' ? theme.primary : '#A9C3F0'}
          size={320}
          opacity={theme.mode === 'dark' ? 0.1 : 0.22}
          style={{ top: -140, right: -110 }}
        />
        <GlowOrb
          color={theme.mode === 'dark' ? theme.hydration : '#CCDCF6'}
          size={260}
          opacity={theme.mode === 'dark' ? 0.07 : 0.3}
          style={{ top: 300, left: -140 }}
        />

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

/**
 * Page header: a deep-navy banner that runs edge to edge under the status
 * bar with rounded bottom corners, a white title, a light-blue subtitle and a
 * frosted back button. Trailing actions keep the light theme, so the usual
 * icon buttons show as white 3D discs on the navy.
 *
 * It must be the first child of a padded `Screen` (it bleeds out over the
 * Screen's side and top padding).
 */
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
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useStatusBarStyle('light');

  return (
    <View
      style={{
        marginHorizontal: -spacing.lg,
        marginTop: -(insets.top + spacing.sm),
        marginBottom: spacing.lg,
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
        boxShadow: theme.elevation.raised,
      }}
    >
      <LinearGradient
        colors={HEADER_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft light blooms give the banner volume. */}
      <View pointerEvents="none" style={[styles.bloom, { top: -110, right: -70 }]} />
      <View
        pointerEvents="none"
        style={[styles.bloom, { width: 140, height: 140, borderRadius: 70, bottom: -80, left: -40 }]}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        <ThemeScope theme={heroTheme}>
          {showBack && (
            <Pressable
              onPress={() => (onBack ? onBack() : router.back())}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: 'rgba(255,255,255,0.2)',
                boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.22)',
                transform: pressed ? [{ scale: 0.94 }] : [{ scale: 1 }],
                marginRight: spacing.md,
              })}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
          )}

          <View style={{ flex: 1 }}>
            <Txt variant="h1" color="#FFFFFF" numberOfLines={1}>
              {title}
            </Txt>
            {subtitle && (
              <Txt variant="small" color="#A9C3F0" numberOfLines={1} style={{ marginTop: 2 }}>
                {subtitle}
              </Txt>
            )}
          </View>
        </ThemeScope>

        {right && <View style={{ marginLeft: spacing.sm }}>{right}</View>}
      </View>
    </View>
  );
}

const HEADER_GRADIENT = ['#2B4A80', '#16294D', '#0A1630'] as const;

const styles = StyleSheet.create({
  bloom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(169,195,240,0.08)',
  },
});

import React from 'react';
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';
import { heroTheme } from '@/theme/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /**
   * `strong` reads as a raised panel, `subtle` as an inline well, `hero` as
   * a deep-navy feature panel whose content is re-themed light-on-navy, and
   * `tint` a pale-blue panel for grouped stats.
   */
  variant?: 'default' | 'strong' | 'subtle' | 'outline' | 'hero' | 'tint';
  radius?: number;
  padded?: boolean;
  onPress?: () => void;
  /** Adds a coloured glow beneath the card. */
  glowColor?: string;
  noBorder?: boolean;
}

/**
 * The app's primary surface: a solid card lifted off the backdrop by layered
 * shadows (see `theme.elevation`), so it reads as a physical, 3D tile. Pressing
 * it sinks it towards the page.
 *
 * In dark mode (currently switched off) the translucent glass look returns,
 * with blur on iOS.
 */
export function GlassCard({
  children,
  style,
  intensity,
  variant = 'default',
  radius: radiusProp,
  padded = true,
  onPress,
  glowColor,
  noBorder = false,
}: GlassCardProps) {
  const { theme, radius, spacing } = useTheme();
  const isHero = variant === 'hero';
  const isTint = variant === 'tint';
  const dark = theme.mode === 'dark';

  const fill =
    variant === 'strong'
      ? theme.glassStrong
      : variant === 'subtle'
        ? theme.surfaceMuted
        : variant === 'outline' || isHero || isTint
          ? 'transparent'
          : theme.glass;

  const cardRadius = radiusProp ?? radius.xl;
  const useBlur = dark && !isHero && !isTint && Platform.OS === 'ios' && variant !== 'outline';
  const flat = variant === 'subtle' || variant === 'outline';

  const shadow = flat
    ? undefined
    : glowColor
      ? `0px 14px 30px -10px ${withAlpha(glowColor, 0.45)}, 0px 1px 2px rgba(15,31,61,0.06)`
      : isHero || variant === 'strong'
        ? theme.elevation.raised
        : theme.elevation.card;

  const containerStyle: ViewStyle = {
    borderRadius: cardRadius,
    borderWidth: noBorder || isHero ? 0 : StyleSheet.hairlineWidth * 2,
    borderColor: variant === 'subtle' ? theme.divider : theme.glassBorder,
    backgroundColor: useBlur ? 'transparent' : fill,
    boxShadow: shadow,
  };

  // The shadow lives on the outer view; the inner view clips the content to
  // the rounded corners (clipping on the outer view would cut the shadow off).
  const inner = (
    <View style={{ borderRadius: cardRadius, overflow: 'hidden' }}>
      {isHero && (
        <>
          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* A soft light bloom in the corner gives the panel volume. */}
          <View pointerEvents="none" style={styles.heroBloom} />
        </>
      )}
      {isTint && (
        <LinearGradient
          colors={dark ? [theme.glassStrong, theme.glass] : TINT_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {useBlur && (
        <BlurView
          intensity={intensity ?? theme.blurIntensity}
          tint={theme.blurTint}
          style={StyleSheet.absoluteFill}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
        </BlurView>
      )}
      <View style={padded ? { padding: spacing.base } : undefined}>
        {isHero ? <ThemeScope theme={heroTheme}>{children}</ThemeScope> : children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && {
            transform: [{ scale: 0.98 }, { translateY: 1 }],
            boxShadow: flat ? undefined : theme.elevation.pressed,
          },
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{inner}</View>;
}

const HERO_GRADIENT = ['#2B4A80', '#16294D', '#0A1630'] as const;
const TINT_GRADIENT = ['#EEF3FD', '#DCE7F8'] as const;

/** `#RRGGBB` plus an alpha; other colour formats are returned unchanged. */
function withAlpha(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${a}`;
}

/** Full-bleed gradient backdrop that every screen sits on. */
export function ScreenGradient({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.backgroundGradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
}

/** Soft coloured orb used to tint the backdrop behind glass panels. */
export function GlowOrb({
  color,
  size = 260,
  style,
  opacity = 0.35,
}: {
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  opacity?: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          // A large blur radius on a shadow is the cheapest way to get a soft
          // glow without pulling in a blur surface per orb.
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: size / 2.2,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  heroBloom: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(169,195,240,0.07)',
  },
});

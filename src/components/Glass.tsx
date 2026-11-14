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
import { useTheme } from '@/theme/ThemeProvider';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** `strong` reads as a raised panel, `subtle` as an inline chip. */
  variant?: 'default' | 'strong' | 'subtle' | 'outline';
  radius?: number;
  padded?: boolean;
  onPress?: () => void;
  /** Adds a coloured glow beneath the card. */
  glowColor?: string;
  noBorder?: boolean;
}

/**
 * The app's primary surface.
 *
 * Blur is genuinely expensive on low-end Android, so there it falls back to a
 * translucent fill that reads the same at a glance while staying smooth.
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
  const { theme, radius, spacing, shadows } = useTheme();

  const fill =
    variant === 'strong'
      ? theme.glassStrong
      : variant === 'subtle'
        ? theme.surfaceMuted
        : variant === 'outline'
          ? 'transparent'
          : theme.glass;

  const cardRadius = radiusProp ?? radius.xl;
  const useBlur = Platform.OS === 'ios' && variant !== 'outline';

  const containerStyle: StyleProp<ViewStyle> = [
    {
      borderRadius: cardRadius,
      overflow: 'hidden',
      borderWidth: noBorder ? 0 : StyleSheet.hairlineWidth * 2,
      borderColor: variant === 'subtle' ? theme.divider : theme.glassBorder,
      backgroundColor: useBlur ? 'transparent' : fill,
    },
    cardShadow(glowColor, shadows),
    style,
  ];

  const inner = (
    <>
      {useBlur && (
        <BlurView
          intensity={intensity ?? theme.blurIntensity}
          tint={theme.blurTint}
          style={StyleSheet.absoluteFill}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
        </BlurView>
      )}
      {/* A one-pixel light edge along the top sells the glass. */}
      {variant !== 'outline' && !noBorder && (
        <LinearGradient
          colors={[theme.glassHighlight, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topHighlight}
          pointerEvents="none"
        />
      )}
      <View style={padded ? { padding: spacing.base } : undefined}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] },
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{inner}</View>;
}

/**
 * Android `elevation` paints its shadow beneath the view, so it shows through
 * a translucent glass fill as a grey slab with a lighter inner rectangle (how
 * visible depends on the OEM's shadow renderer). `boxShadow` is drawn only
 * outside the border box, so it stays invisible through the fill.
 */
function cardShadow(
  glowColor: string | undefined,
  shadows: ReturnType<typeof useTheme>['shadows'],
): ViewStyle {
  if (Platform.OS !== 'android') {
    return glowColor ? shadows.glow(glowColor) : shadows.md;
  }
  const color =
    glowColor && /^#[0-9a-f]{6}$/i.test(glowColor) ? `${glowColor}73` : glowColor;
  return {
    elevation: 0,
    boxShadow: color ? `0px 8px 20px ${color}` : '0px 8px 20px rgba(0,0,0,0.14)',
  };
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
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.6,
  },
});

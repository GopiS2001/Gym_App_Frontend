/**
 * Premium building blocks shared by the redesigned pages: round icon wells and
 * quick-action tiles (as on the dashboard), a 3D segmented switch, titled form
 * sections, big selectable option tiles, and tinted notes.
 */
import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { GlassCard } from './Glass';
import { Txt } from './ui';

type IconName = keyof typeof Ionicons.glyphMap;

// ------------------------------------------------------------------ icon well

/** A round pale well holding an icon (the reference's icon circles). */
export function IconWell({
  icon,
  color,
  size = 40,
  filled = false,
}: {
  icon: IconName;
  color?: string;
  size?: number;
  /** Solid accent disc with a white icon, for emphasis. */
  filled?: boolean;
}) {
  const { theme } = useTheme();
  const accent = color || theme.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? accent : `${accent}1A`,
        boxShadow: filled ? `0px 6px 14px -6px ${accent}aa, inset 0px 1px 0px rgba(255,255,255,0.25)` : undefined,
      }}
    >
      <Ionicons name={icon} size={size * 0.47} color={filled ? '#FFFFFF' : accent} />
    </View>
  );
}

// ---------------------------------------------------------------- action tile

/** Round 3D icon button with a label underneath. */
export function ActionTile({
  icon,
  label,
  onPress,
  color,
  highlighted = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  highlighted?: boolean;
}) {
  const { theme, spacing } = useTheme();
  const accent = color || theme.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        alignItems: 'center',
        flex: 1,
        transform: pressed ? [{ scale: 0.94 }] : undefined,
      })}
    >
      {({ pressed }) => (
        <>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: highlighted ? `${accent}1F` : theme.card,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: highlighted ? `${accent}33` : theme.glassBorder,
              boxShadow: pressed ? theme.elevation.pressed : theme.elevation.card,
            }}
          >
            <Ionicons name={icon} size={22} color={accent} />
          </View>
          <Txt
            variant="caption"
            color={theme.textSecondary}
            align="center"
            numberOfLines={1}
            style={{ marginTop: spacing.sm }}
          >
            {label}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

/** A white card holding a row of ActionTiles, optionally titled. */
export function ActionRow({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useTheme();
  return (
    <GlassCard style={[{ marginBottom: spacing.base }, style]}>
      {title && (
        <Txt variant="h4" style={{ marginBottom: spacing.md }}>
          {title}
        </Txt>
      )}
      <View style={{ flexDirection: 'row' }}>{children}</View>
    </GlassCard>
  );
}

// ------------------------------------------------------------ segmented switch

/** Raised white track with a navy 3D pill on the selected option. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          padding: 5,
          borderRadius: radius.pill,
          backgroundColor: theme.card,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.glassBorder,
          boxShadow: theme.elevation.card,
          marginBottom: spacing.base,
        },
        style,
      ]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.sm + 3,
              borderRadius: radius.pill,
              backgroundColor: active ? theme.primary : 'transparent',
              boxShadow: active ? theme.elevation.button : undefined,
            }}
          >
            {o.icon && (
              <Ionicons
                name={o.icon}
                size={15}
                color={active ? theme.onPrimary : theme.textTertiary}
                style={{ marginRight: 6 }}
              />
            )}
            <Txt
              variant="small"
              color={active ? theme.onPrimary : theme.textSecondary}
              style={{ fontWeight: '700' }}
            >
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// --------------------------------------------------------------- form section

/** A titled white card grouping related form fields. */
export function FormSection({
  icon,
  title,
  subtitle,
  children,
  color,
  style,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, spacing } = useTheme();
  return (
    <GlassCard style={[{ marginBottom: spacing.base }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base }}>
        <IconWell icon={icon} color={color} size={38} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Txt variant="h4">{title}</Txt>
          {subtitle && (
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
              {subtitle}
            </Txt>
          )}
        </View>
      </View>
      {children}
    </GlassCard>
  );
}

/** Small uppercase label above a group of controls inside a section. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  const { theme, spacing } = useTheme();
  return (
    <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
      {children}
    </Txt>
  );
}

// ---------------------------------------------------------------- option tile

/**
 * A big selectable tile: icon, label and an optional line of help. Selected
 * tiles turn navy with a white icon, like a pressed 3D key.
 */
export function OptionTile({
  icon,
  label,
  caption,
  selected,
  onPress,
  color,
}: {
  icon: IconName;
  label: string;
  caption?: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const { theme, spacing, radius } = useTheme();
  const accent = color || theme.primary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: selected ? accent : theme.card,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: selected ? accent : theme.glassBorder,
        boxShadow: selected
          ? `0px 12px 22px -10px ${accent}cc, inset 0px 1px 0px rgba(255,255,255,0.2)`
          : pressed
            ? theme.elevation.pressed
            : theme.elevation.card,
        transform: pressed ? [{ scale: 0.97 }] : undefined,
      })}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? 'rgba(255,255,255,0.18)' : `${accent}1A`,
          marginBottom: spacing.sm,
        }}
      >
        <Ionicons name={icon} size={17} color={selected ? '#FFFFFF' : accent} />
      </View>
      <Txt variant="bodyStrong" color={selected ? '#FFFFFF' : theme.text} numberOfLines={1}>
        {label}
      </Txt>
      {caption && (
        <Txt
          variant="caption"
          color={selected ? 'rgba(255,255,255,0.75)' : theme.textTertiary}
          style={{ marginTop: 2 }}
          numberOfLines={2}
        >
          {caption}
        </Txt>
      )}
      {selected && (
        <View style={{ position: 'absolute', top: spacing.sm, right: spacing.sm }}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------- notes

/** A soft tinted note: help text, a warning, or an error. */
export function Notice({
  text,
  tone = 'info',
  icon,
  style,
}: {
  text: string;
  tone?: 'info' | 'danger' | 'success' | 'warning';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, spacing, radius } = useTheme();
  const colors = {
    info: [theme.primary, theme.primarySoft],
    danger: [theme.danger, theme.dangerSoft],
    success: [theme.success, `${theme.success}1A`],
    warning: [theme.streak, theme.streakSoft],
  } as const;
  const [fg, bg] = colors[tone];
  const fallback: IconName =
    tone === 'danger' ? 'alert-circle' : tone === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: bg,
          marginBottom: spacing.base,
        },
        style,
      ]}
    >
      <Ionicons name={icon || fallback} size={17} color={fg} style={{ marginTop: 1 }} />
      <Txt variant="small" color={tone === 'info' ? theme.textSecondary : fg} style={{ flex: 1, marginLeft: spacing.sm }}>
        {text}
      </Txt>
    </View>
  );
}

// ------------------------------------------------------------- arrow disc

/** The white round arrow button from the reference's image cards. */
export function ArrowDisc({ onPress, size = 38, icon = 'arrow-forward' }: { onPress?: () => void; size?: number; icon?: IconName }) {
  const { theme } = useTheme();
  const disc = (pressed = false) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 6px 14px rgba(10,22,48,0.28)',
        transform: pressed ? [{ scale: 0.92 }] : undefined,
      }}
    >
      <Ionicons name={icon} size={size * 0.45} color={theme.primary} />
    </View>
  );
  if (!onPress) return disc();
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button">
      {({ pressed }) => disc(pressed)}
    </Pressable>
  );
}

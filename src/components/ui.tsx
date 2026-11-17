import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { GlassCard } from './Glass';

/**
 * Cap on Android/iOS system font size. Uncapped, a phone set to "Large" or
 * "Huge" text grows every label past the fixed-size layouts (web ignores the
 * setting, so it looked fine there). 1.15 still honours a modest bump.
 */
export const MAX_FONT_SCALE = 1.15;

// --------------------------------------------------------------- typography

type TypeVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodyStrong'
  | 'small'
  | 'caption'
  | 'overline'
  | 'numeric'
  | 'numericLarge';

export function Txt({
  children,
  variant = 'body',
  color,
  style,
  numberOfLines,
  align,
}: {
  children: React.ReactNode;
  variant?: TypeVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: 'left' | 'center' | 'right';
}) {
  const { theme, typography } = useTheme();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      numberOfLines={numberOfLines}
      style={[
        typography[variant] as TextStyle,
        { color: color || theme.text },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ------------------------------------------------------------------ button

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { theme, radius, spacing } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const heights = { sm: 40, md: 52, lg: 58 };
  // Button text is 16 in the type scale; `sm` steps down for compact rows.
  const fontSizes = { sm: 14, md: 16, lg: 16 };
  const paddings = { sm: spacing.base, md: spacing.xl, lg: spacing.xl };

  const isDisabled = disabled || loading;

  const press = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  const handlePress = () => {
    if (isDisabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    onPress();
  };

  const textColor =
    variant === 'primary'
      ? theme.onPrimary
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'secondary'
          ? theme.primary
          : theme.text;

  const content = (
    <View style={styles.btnRow}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 19}
              color={textColor}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={{
              color: textColor,
              fontSize: fontSizes[size],
              fontWeight: '700',
              letterSpacing: 0.2,
            }}
          >
            {title}
          </Text>
          {iconRight && (
            <Ionicons
              name={iconRight}
              size={size === 'sm' ? 16 : 19}
              color={textColor}
              style={{ marginLeft: spacing.sm }}
            />
          )}
        </>
      )}
    </View>
  );

  const base: ViewStyle = {
    height: heights[size],
    paddingHorizontal: paddings[size],
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.5 : 1,
    ...(fullWidth ? { alignSelf: 'stretch' } : {}),
  };

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { alignSelf: 'stretch' }, style]}>
        <Pressable
          onPress={handlePress}
          onPressIn={() => press(0.96)}
          onPressOut={() => press(1)}
          disabled={isDisabled}
        >
          <LinearGradient
            colors={theme.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[base, { boxShadow: theme.elevation.button }]}
          >
            {/* Light across the top half makes the pill look rounded. */}
            <LinearGradient
              colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '55%',
                borderTopLeftRadius: radius.pill,
                borderTopRightRadius: radius.pill,
              }}
              pointerEvents="none"
            />
            {content}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  const backgrounds: Record<string, ViewStyle> = {
    secondary: { backgroundColor: theme.primarySoft },
    ghost: { backgroundColor: 'transparent' },
    danger: {
      backgroundColor: theme.danger,
      boxShadow: `0px 10px 20px -8px ${theme.danger}99, inset 0px 1px 0px rgba(255,255,255,0.22)`,
    },
    glass: {
      backgroundColor: theme.glassStrong,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: theme.glassBorder,
      boxShadow: theme.elevation.card,
    },
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, fullWidth && { alignSelf: 'stretch' }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => press(0.96)}
        onPressOut={() => press(1)}
        disabled={isDisabled}
        style={[base, backgrounds[variant]]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------------- input

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'email-address' | 'number-pad' | 'url';
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  rightElement?: React.ReactNode;
  suffix?: string;
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  icon,
  error,
  multiline = false,
  autoCapitalize = 'sentences',
  rightElement,
  suffix,
  editable = true,
  style,
  onSubmitEditing,
}: FieldProps) {
  const { theme, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const [hidden, setHidden] = React.useState(!!secureTextEntry);

  return (
    <View style={[{ marginBottom: spacing.base }, style]}>
      {label && (
        <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
          {label}
        </Txt>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: theme.inputBackground,
          borderRadius: multiline ? radius.md : radius.pill,
          boxShadow: focused ? `0px 0px 0px 3px ${theme.primarySoft}` : 'inset 0px 1px 2px rgba(15,31,61,0.06)',
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: error
            ? theme.danger
            : focused
              ? theme.primary
              : theme.inputBorder,
          paddingHorizontal: spacing.base,
          minHeight: multiline ? 96 : 52,
          paddingVertical: multiline ? spacing.md : 0,
          opacity: editable ? 1 : 0.6,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? theme.primary : theme.textTertiary}
            style={{ marginRight: spacing.md, marginTop: multiline ? 3 : 0 }}
          />
        )}
        <TextInput
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            color: theme.text,
            fontSize: typography.body.fontSize,
            fontWeight: '600',
            paddingVertical: multiline ? 0 : 14,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {suffix && (
          <Txt variant="small" color={theme.textTertiary} style={{ marginLeft: spacing.sm }}>
            {suffix}
          </Txt>
        )}
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={19}
              color={theme.textTertiary}
            />
          </Pressable>
        )}
        {rightElement}
      </View>
      {error ? (
        <Txt variant="caption" color={theme.danger} style={{ marginTop: spacing.xs, marginLeft: spacing.md }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}

// -------------------------------------------------------------------- chip

export function Chip({
  label,
  selected = false,
  onPress,
  color,
  icon,
  count,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
}) {
  const { theme, radius, spacing } = useTheme();
  const accent = color || theme.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm + 1,
        borderRadius: radius.pill,
        backgroundColor: selected ? accent : theme.card,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: selected ? accent : theme.glassBorder,
        boxShadow: selected
          ? `0px 6px 14px -6px ${accent}aa, inset 0px 1px 0px rgba(255,255,255,0.18)`
          : '0px 1px 2px rgba(15,31,61,0.06), 0px 4px 10px -4px rgba(15,31,61,0.10)',
        marginRight: spacing.sm,
        opacity: pressed ? 0.75 : 1,
        transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
      })}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? theme.onPrimary : theme.textSecondary}
          style={{ marginRight: 5 }}
        />
      )}
      <Text
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: selected ? theme.onPrimary : theme.textSecondary,
        }}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View
          style={{
            marginLeft: 6,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: radius.pill,
            backgroundColor: selected ? 'rgba(0,0,0,0.18)' : theme.border,
          }}
        >
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={{
              fontSize: 10,
              fontWeight: '800',
              color: selected ? theme.onPrimary : theme.textTertiary,
            }}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xs }}
    >
      {children}
    </ScrollView>
  );
}

// ------------------------------------------------------------ progress bar

export function ProgressBar({
  value,
  color,
  height = 8,
  showGlow = false,
  trackColor,
}: {
  value: number;
  color?: string;
  height?: number;
  showGlow?: boolean;
  trackColor?: string;
}) {
  const { theme, radius } = useTheme();
  const accent = color || theme.primary;
  const width = useRef(new Animated.Value(0)).current;
  const pct = Math.max(0, Math.min(100, value || 0));

  useEffect(() => {
    Animated.timing(width, {
      toValue: pct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, width]);

  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: trackColor || theme.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radius.pill,
          width: width.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
          backgroundColor: accent,
          ...(showGlow
            ? {
                shadowColor: accent,
                shadowOpacity: 0.8,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
              }
            : {}),
        }}
      />
    </View>
  );
}

// ------------------------------------------------------------- stat pieces

export function StatTile({
  label,
  value,
  unit,
  icon,
  color,
  onPress,
  trend,
  style,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
  trend?: { value: number; isGood?: boolean };
  style?: StyleProp<ViewStyle>;
}) {
  const { theme, spacing } = useTheme();
  const accent = color || theme.primary;

  return (
    <GlassCard onPress={onPress} style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        {icon && (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${accent}1A`,
              marginRight: spacing.sm,
            }}
          >
            <Ionicons name={icon} size={17} color={accent} />
          </View>
        )}
        <Txt variant="caption" color={theme.textTertiary} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Txt variant="numeric" color={theme.text}>
          {value}
        </Txt>
        {unit && (
          <Txt variant="small" color={theme.textTertiary} style={{ marginLeft: 4 }}>
            {unit}
          </Txt>
        )}
      </View>

      {trend && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
          <Ionicons
            name={trend.value >= 0 ? 'trending-up' : 'trending-down'}
            size={13}
            color={
              trend.isGood === undefined
                ? theme.textTertiary
                : trend.isGood
                  ? theme.success
                  : theme.danger
            }
          />
          <Txt
            variant="caption"
            color={
              trend.isGood === undefined
                ? theme.textTertiary
                : trend.isGood
                  ? theme.success
                  : theme.danger
            }
            style={{ marginLeft: 3 }}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value}
          </Txt>
        </View>
      )}
    </GlassCard>
  );
}

// ------------------------------------------------------------ state views

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.primarySoft,
          marginBottom: spacing.base,
        }}
      >
        <Ionicons name={icon} size={32} color={theme.primary} />
      </View>
      <Txt variant="h4" align="center" style={{ marginBottom: spacing.xs }}>
        {title}
      </Txt>
      {!!message && (
        <Txt variant="small" color={theme.textTertiary} align="center" style={{ maxWidth: 280 }}>
          {message}
        </Txt>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: spacing.lg }} size="sm" />
      )}
    </View>
  );
}

export function LoadingState({ message }: { message?: string }) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.huge }}>
      <ActivityIndicator size="large" color={theme.primary} />
      {!!message && (
        <Txt variant="small" color={theme.textTertiary} style={{ marginTop: spacing.md }}>
          {message}
        </Txt>
      )}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.dangerSoft,
          marginBottom: spacing.base,
        }}
      >
        <Ionicons name="cloud-offline-outline" size={28} color={theme.danger} />
      </View>
      <Txt variant="h4" align="center" style={{ marginBottom: spacing.xs }}>
        Could not load
      </Txt>
      <Txt variant="small" color={theme.textTertiary} align="center" style={{ maxWidth: 300 }}>
        {message}
      </Txt>
      {onRetry && (
        <Button
          title="Try again"
          icon="refresh"
          variant="glass"
          onPress={onRetry}
          style={{ marginTop: spacing.lg }}
          size="sm"
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------- section

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
        marginTop: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {icon && (
          <Ionicons name={icon} size={17} color={theme.primary} style={{ marginRight: spacing.sm }} />
        )}
        {/* Section heading (18) sits a step above a card title (16). */}
        <Txt variant="h3" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt variant="caption" color={theme.primary}>
            {actionLabel}
          </Txt>
          <Ionicons name="chevron-forward" size={13} color={theme.primary} />
        </Pressable>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ badge

export function Badge({
  label,
  color,
  icon,
  size = 'md',
}: {
  label: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
}) {
  const { theme, radius } = useTheme();
  const accent = color || theme.primary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: size === 'sm' ? 7 : 9,
        paddingVertical: size === 'sm' ? 2.5 : 4,
        borderRadius: radius.pill,
        backgroundColor: `${accent}22`,
      }}
    >
      {icon && <Ionicons name={icon} size={size === 'sm' ? 10 : 12} color={accent} style={{ marginRight: 3 }} />}
      <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ fontSize: size === 'sm' ? 10 : 11, fontWeight: '800', color: accent, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}

// --------------------------------------------------------------- icon btn

export function IconButton({
  icon,
  onPress,
  color,
  size = 42,
  variant = 'glass',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  variant?: 'glass' | 'solid' | 'plain';
}) {
  const { theme } = useTheme();
  const accent = color || theme.text;
  // A white icon sits on a photo or a navy panel: use frosted glass there,
  // since a white disc would hide it.
  const onImage = variant === 'glass' && /^(#fff|#ffffff|white)$/i.test(accent);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: onImage
          ? 'rgba(10,22,48,0.32)'
          : variant === 'glass'
            ? theme.glassStrong
            : variant === 'solid'
              ? `${accent}1A`
              : 'transparent',
        borderWidth: variant === 'glass' ? StyleSheet.hairlineWidth * 2 : 0,
        borderColor: onImage ? 'rgba(255,255,255,0.28)' : theme.glassBorder,
        boxShadow: onImage
          ? 'inset 0px 1px 0px rgba(255,255,255,0.22)'
          : variant === 'glass'
            ? pressed
              ? theme.elevation.pressed
              : theme.elevation.card
            : [],
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
      })}
    >
      <Ionicons name={icon} size={size * 0.44} color={accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

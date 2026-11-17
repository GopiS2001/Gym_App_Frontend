import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { onToast, type ToastItem, type ToastTone } from '@/services/toast';
import { Txt } from './ui';

export { showToast } from '@/services/toast';

const ICONS: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  danger: 'alert-circle',
  info: 'information-circle',
};

const VISIBLE_MS = 2200;

// A plain module-level emitter, so non-React code (the API client) can raise
// a toast without needing a hook.
let nextId = 1;
const listeners = new Set<(t: ToastItem) => void>();

export function showToast(message: string, tone: ToastTone = 'success') {
  const item = { id: nextId++, message, tone };
  listeners.forEach((fn) => fn(item));
}

/**
 * Renders the current toast above everything else. Mount once, near the root.
 * A new toast replaces the one on screen, so a burst of saves never stacks up.
 */
export function ToastHost() {
  const { theme, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => finished && setToast(null));
  };

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(t);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
      timer.current = setTimeout(hide, VISIBLE_MS);
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!toast) return null;

  const color =
    toast.tone === 'danger' ? theme.danger : toast.tone === 'info' ? theme.primary : theme.success;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: spacing.base,
          right: spacing.base,
          top: insets.top + spacing.sm,
          alignItems: 'center',
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
          ],
        }}
      >
        <Pressable
          onPress={hide}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            maxWidth: 480,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.base,
            borderRadius: radius.lg,
            backgroundColor: theme.card,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: color,
            shadowColor: theme.shadowColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Ionicons name={ICONS[toast.tone]} size={20} color={color} style={{ marginRight: spacing.sm }} />
          <Txt variant="bodyStrong" style={{ flexShrink: 1 }}>
            {toast.message}
          </Txt>
        </Pressable>
      </Animated.View>
    </View>
  );
}

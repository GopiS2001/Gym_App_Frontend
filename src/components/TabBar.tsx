import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useTheme } from '@/theme/ThemeProvider';

/** Height of the floating bar itself (excluding the gap below it). */
export const TAB_BAR_HEIGHT = 66;
const SIDE_GAP = 14;
const PILL_W = 46;
const PILL_H = 32;

/** Distance from the bottom of the window to the bottom of the bar. */
export function tabBarBottomGap(insets: EdgeInsets) {
  return Math.max(insets.bottom, 10) + (Platform.OS === 'android' ? 6 : 0);
}

/** How much scroll content must leave free so the last item clears the bar. */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + tabBarBottomGap(insets) + 16;
}

const SPRING = { damping: 18, stiffness: 190, mass: 0.7 };

/**
 * Floating glass tab bar: a rounded panel lifted off the screen edge, with a
 * gradient pill that springs between tabs behind the active icon.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [slotW, setSlotW] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const pillX = useSharedValue(0);

  // Slide the pill to the focused slot whenever the tab or the width changes.
  useEffect(() => {
    if (!slotW) return;
    const target = state.index * slotW + (slotW - PILL_W) / 2;
    pillX.value = pillX.value === 0 ? target : withSpring(target, SPRING);
  }, [state.index, slotW, pillX]);

  // The bar floats over content, so hide it rather than ride the keyboard up.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  if (keyboardOpen) return null;

  const dark = theme.mode === 'dark';
  const fill = dark ? 'rgba(16,22,29,0.94)' : 'rgba(255,255,255,0.95)';

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: tabBarBottomGap(insets) }]}
    >
      <View
        style={[
          styles.bar,
          {
            borderColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(14,26,28,0.06)',
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : fill,
            boxShadow: dark
              ? '0px 14px 32px rgba(0,0,0,0.55)'
              : '0px 14px 32px rgba(15,40,35,0.16)',
          },
        ]}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint={theme.blurTint} style={StyleSheet.absoluteFill}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.tabBarBackground }]} />
          </BlurView>
        )}

        {/* Light catching the top edge. */}
        <LinearGradient
          colors={[dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,1)', 'transparent']}
          style={styles.sheen}
          pointerEvents="none"
        />

        <View
          style={styles.row}
          onLayout={(e) => setSlotW(e.nativeEvent.layout.width / state.routes.length)}
        >
          {slotW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                pillStyle,
                { boxShadow: `0px 6px 14px ${theme.primary}59` },
              ]}
            >
              <LinearGradient
                colors={theme.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = index === state.index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : (options.title ?? route.name);

            const onPress = () => {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
                navigateToTab(route.key);
              }
            };

            return (
              <TabItem
                key={route.key}
                label={label}
                focused={focused}
                onPress={onPress}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                icon={options.tabBarIcon?.({
                  focused,
                  color: focused ? theme.onPrimary : theme.tabBarInactive,
                  size: 21,
                })}
                activeColor={theme.primary}
                inactiveColor={theme.tabBarInactive}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function TabItem({
  label,
  focused,
  onPress,
  onLongPress,
  icon,
  activeColor,
  inactiveColor,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
  activeColor: string;
  inactiveColor: string;
}) {
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    lift.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, lift]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + lift.value * 0.06 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
    >
      <Animated.View style={[styles.iconBox, iconStyle]}>{icon}</Animated.View>
      <Animated.Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: focused ? activeColor : inactiveColor,
            fontWeight: focused ? '800' : '600',
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SIDE_GAP,
    right: SIDE_GAP,
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    paddingTop: 7,
  },
  iconBox: {
    height: PILL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 10.5,
    letterSpacing: 0.15,
  },
});

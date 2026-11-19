/**
 * Building blocks for the music screens: artwork, a draggable seek bar,
 * transport buttons, an animated "now playing" equalizer and the navy
 * mini-player. Colours come from the theme, so inside a navy hero scope
 * (ThemeScope + heroTheme) everything turns light-on-navy automatically.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';
import { heroTheme } from '@/theme/tokens';
import { AppImage } from '@/components/AppImage';
import { Txt } from '@/components/ui';
import { formatTime, useMusicPlayer } from '@/store/MusicPlayer';

type IconName = keyof typeof Ionicons.glyphMap;

const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
};

// -------------------------------------------------------------- artwork

/** Square cover image, or a navy gradient with a note when there is none. */
export function Artwork({
  uri,
  size,
  radius = 16,
  iconSize,
}: {
  uri?: string | null;
  size: number | '100%';
  radius?: number;
  iconSize?: number;
}) {
  const box = { width: size, height: size, borderRadius: radius, overflow: 'hidden' as const };
  if (uri) return <AppImage source={uri} style={box} contentFit="cover" transition={250} />;
  return (
    <View style={[box, { alignItems: 'center', justifyContent: 'center' }]}>
      <LinearGradient
        colors={['#2B4A80', '#16294D', '#0A1630']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons
        name="musical-notes"
        size={iconSize ?? (typeof size === 'number' ? size * 0.42 : 72)}
        color="#A9C3F0"
      />
    </View>
  );
}

// ------------------------------------------------------------ equalizer

/** Three bouncing bars shown next to the song that is playing. */
export function EqualizerBars({
  playing,
  color,
  height = 14,
}: {
  playing: boolean;
  color?: string;
  height?: number;
}) {
  const { theme } = useTheme();
  const bars = useRef([0, 1, 2].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    if (!playing) {
      bars.forEach((b) => b.setValue(0.35));
      return;
    }
    const loops = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, {
            toValue: 1,
            duration: 320 + i * 110,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(b, {
            toValue: 0.25,
            duration: 300 + i * 90,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, bars]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 2 }}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            height,
            borderRadius: 2,
            backgroundColor: color || theme.primary,
            transform: [{ translateY: height / 2 }, { scaleY: b }, { translateY: -height / 2 }],
          }}
        />
      ))}
    </View>
  );
}

// ------------------------------------------------------------- seek bar

/**
 * Progress bar you can tap or drag to seek. While dragging it shows the drag
 * position and only seeks on release, so the audio doesn't stutter.
 */
export function SeekBar() {
  const { theme, spacing } = useTheme();
  const { position, duration, seek } = useMusicPlayer();
  const width = useRef(1);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const ratioFrom = (e: GestureResponderEvent) =>
    Math.min(1, Math.max(0, e.nativeEvent.locationX / width.current));

  const ratio = dragRatio ?? (duration > 0 ? Math.min(1, position / duration) : 0);
  const shown = dragRatio != null ? dragRatio * duration : position;
  const dragging = dragRatio != null;

  return (
    <View>
      <View
        onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
        onStartShouldSetResponder={() => duration > 0}
        onMoveShouldSetResponder={() => duration > 0}
        onResponderGrant={(e) => setDragRatio(ratioFrom(e))}
        onResponderMove={(e) => setDragRatio(ratioFrom(e))}
        onResponderRelease={(e) => {
          seek(ratioFrom(e) * duration);
          setDragRatio(null);
        }}
        onResponderTerminate={() => setDragRatio(null)}
        style={{ height: 30, justifyContent: 'center' }}
      >
        <View
          pointerEvents="none"
          style={{
            height: dragging ? 7 : 5,
            borderRadius: 4,
            backgroundColor: theme.border,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={theme.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: `${ratio * 100}%`, height: '100%' }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${ratio * 100}%`,
            marginLeft: dragging ? -10 : -7,
            width: dragging ? 20 : 14,
            height: dragging ? 20 : 14,
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            boxShadow: `0px 0px 0px 4px ${theme.primarySoft}, 0px 4px 10px rgba(10,22,48,0.35)`,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <Txt variant="caption" color={theme.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
          {formatTime(shown)}
        </Txt>
        <Txt variant="caption" color={theme.textTertiary} style={{ fontVariant: ['tabular-nums'] }}>
          {duration > 0 ? `-${formatTime(Math.max(0, duration - shown))}` : '0:00'}
        </Txt>
      </View>
    </View>
  );
}

// ------------------------------------------------------------- buttons

/** Transport icon button; `active` adds an accent and a small dot underneath. */
export function ControlButton({
  icon,
  onPress,
  size = 26,
  active = false,
  label,
  badge,
}: {
  icon: IconName;
  onPress: () => void;
  size?: number;
  active?: boolean;
  label: string;
  badge?: string;
}) {
  const { theme } = useTheme();
  const box = size + 22;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      style={({ pressed }) => ({
        width: box,
        height: box,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.9 : 1 }],
      })}
    >
      <Ionicons name={icon} size={size} color={active ? theme.primary : theme.textSecondary} />
      {!!badge && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary,
          }}
        >
          <Txt variant="caption" color={theme.onPrimary} style={{ fontSize: 9, fontWeight: '800', lineHeight: 12 }}>
            {badge}
          </Txt>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: active ? theme.primary : 'transparent',
        }}
      />
    </Pressable>
  );
}

/** The big round play / pause button with a soft glow. */
export function PlayButton({ size = 78 }: { size?: number }) {
  const { playing, buffering, togglePlay } = useMusicPlayer();
  return (
    <Pressable
      onPress={() => {
        tap();
        togglePlay();
      }}
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause' : 'Play'}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        boxShadow: pressed
          ? '0px 4px 10px rgba(0,0,0,0.3)'
          : '0px 16px 34px -8px rgba(169,195,240,0.75), 0px 6px 14px rgba(0,0,0,0.35), inset 0px -3px 0px rgba(10,22,48,0.12)',
        transform: [{ scale: pressed ? 0.93 : 1 }],
      })}
    >
      {buffering ? (
        <ActivityIndicator color="#16294D" />
      ) : (
        <Ionicons
          name={playing ? 'pause' : 'play'}
          size={size * 0.42}
          color="#16294D"
          // The play triangle looks off-centre without a nudge.
          style={{ marginLeft: playing ? 0 : size * 0.05 }}
        />
      )}
    </Pressable>
  );
}

/** Frosted round button for use on dark / image backgrounds. */
export function FrostedButton({
  icon,
  onPress,
  label,
  tone = 'default',
  size = 42,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'danger';
  size?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'danger' ? 'rgba(255,107,114,0.18)' : 'rgba(255,255,255,0.12)',
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: tone === 'danger' ? 'rgba(255,107,114,0.4)' : 'rgba(255,255,255,0.2)',
        boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.22)',
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <Ionicons name={icon} size={size * 0.45} color={tone === 'danger' ? '#FF8F94' : '#FFFFFF'} />
    </Pressable>
  );
}

// ----------------------------------------------------------- mini player

/** Navy "now playing" bar: tap to open the full player. */
export function MiniPlayer() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { current, playing, buffering, position, duration, togglePlay, next } = useMusicPlayer();
  if (!current) return null;

  return (
    <Pressable
      onPress={() => router.push('/music/player')}
      style={({ pressed }) => ({
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0px 18px 36px -12px rgba(10,22,48,0.6), 0px 2px 6px rgba(10,22,48,0.2)',
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <LinearGradient
        colors={['#2B4A80', '#16294D', '#0A1630']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ThemeScope theme={heroTheme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm, paddingRight: spacing.xs }}>
          <View style={{ boxShadow: '0px 6px 14px rgba(0,0,0,0.35)', borderRadius: 14 }}>
            <Artwork uri={current.imageUrl} size={48} radius={14} />
          </View>
          <View style={{ flex: 1, marginHorizontal: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <EqualizerBars playing={playing} height={11} color="#A9C3F0" />
              <Txt variant="caption" color="#93A6C9" style={{ marginLeft: 6, letterSpacing: 0.8 }}>
                {playing ? 'NOW PLAYING' : 'PAUSED'}
              </Txt>
            </View>
            <Txt variant="small" color="#FFFFFF" style={{ fontWeight: '700', marginTop: 1 }} numberOfLines={1}>
              {current.songName}
            </Txt>
            <Txt variant="caption" color="#C9D6EE" numberOfLines={1}>
              {current.movieTitle}
            </Txt>
          </View>
          <Pressable
            onPress={() => {
              tap();
              togglePlay();
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            style={({ pressed }) => ({
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              transform: [{ scale: pressed ? 0.9 : 1 }],
            })}
          >
            {buffering ? (
              <ActivityIndicator color="#16294D" size="small" />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={19} color="#16294D" style={{ marginLeft: playing ? 0 : 2 }} />
            )}
          </Pressable>
          <ControlButton icon="play-skip-forward" size={20} label="Next" onPress={next} />
        </View>
        <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <View
            style={{
              width: `${duration > 0 ? Math.min(100, (position / duration) * 100) : 0}%`,
              height: '100%',
              backgroundColor: '#A9C3F0',
            }}
          />
        </View>
      </ThemeScope>
    </Pressable>
  );
}

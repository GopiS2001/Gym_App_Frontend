import React, { useRef, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { AppImage } from '@/components/AppImage';
import { Txt } from '@/components/ui';
import { formatTime, useMusicPlayer } from '@/store/MusicPlayer';

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

  const ratio = dragRatio ?? (duration > 0 ? position / duration : 0);
  const shown = dragRatio != null ? dragRatio * duration : position;

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
        style={{ height: 28, justifyContent: 'center' }}
      >
        <View
          pointerEvents="none"
          style={{ height: 5, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}
        >
          <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: theme.primary }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: `${ratio * 100}%`,
            marginLeft: -8,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: theme.primary,
            borderWidth: 3,
            borderColor: '#FFFFFF',
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs }}>
        <Txt variant="caption" color={theme.textTertiary}>
          {formatTime(shown)}
        </Txt>
        <Txt variant="caption" color={theme.textTertiary}>
          {formatTime(duration)}
        </Txt>
      </View>
    </View>
  );
}

/** Round icon button used by the transport controls. */
export function ControlButton({
  icon,
  onPress,
  size = 26,
  active = false,
  primary = false,
  label,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  active?: boolean;
  primary?: boolean;
  label: string;
  badge?: string;
}) {
  const { theme } = useTheme();
  const box = primary ? 72 : size + 22;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={8}
      style={({ pressed }) => ({
        width: box,
        height: box,
        borderRadius: box / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? theme.primary : active ? theme.primarySoft : 'transparent',
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Ionicons
        name={icon}
        size={primary ? 34 : size}
        color={primary ? '#FFFFFF' : active ? theme.primary : theme.textSecondary}
      />
      {!!badge && (
        <Txt
          variant="caption"
          color={theme.primary}
          style={{ position: 'absolute', bottom: 4, right: 6, fontSize: 9, fontWeight: '800' }}
        >
          {badge}
        </Txt>
      )}
    </Pressable>
  );
}

/** Compact "now playing" bar: tap to open the full player. */
export function MiniPlayer() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { current, playing, buffering, position, duration, togglePlay, next } = useMusicPlayer();
  if (!current) return null;

  return (
    <Pressable
      onPress={() => router.push('/music/player')}
      style={({ pressed }) => ({
        borderRadius: radius.lg,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.glassBorder,
        boxShadow: theme.elevation.card,
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.sm }}>
        {current.imageUrl ? (
          <AppImage source={current.imageUrl} style={{ width: 44, height: 44, borderRadius: radius.sm }} contentFit="cover" />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primarySoft,
            }}
          >
            <Ionicons name="musical-notes" size={20} color={theme.primary} />
          </View>
        )}
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <Txt variant="small" style={{ fontWeight: '700' }} numberOfLines={1}>
            {current.songName}
          </Txt>
          <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
            {current.movieTitle}
          </Txt>
        </View>
        {buffering ? (
          <View style={{ width: 44, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <ControlButton icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onPress={togglePlay} />
        )}
        <ControlButton icon="play-skip-forward" size={22} label="Next" onPress={next} />
      </View>
      <View style={{ height: 3, backgroundColor: theme.border }}>
        <View
          style={{
            width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
            height: '100%',
            backgroundColor: theme.primary,
          }}
        />
      </View>
    </Pressable>
  );
}

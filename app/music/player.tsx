import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeScope, useTheme } from '@/theme/ThemeProvider';
import { heroTheme } from '@/theme/tokens';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { songsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { AppImage } from '@/components/AppImage';
import { EmptyState, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import {
  Artwork,
  ControlButton,
  EqualizerBars,
  FrostedButton,
  PlayButton,
  SeekBar,
} from '@/components/MusicControls';
import { useMusicPlayer } from '@/store/MusicPlayer';

/**
 * Full-screen player on deep navy, with the song's picture blurred behind it:
 * artwork, seek bar, transport, shuffle / repeat, edit / delete and the queue.
 */
export default function PlayerScreen() {
  const router = useRouter();
  const music = useMusicPlayer();

  if (!music.current) {
    return (
      <Screen withTabBar={false}>
        <ScreenHeader title="Now Playing" showBack />
        <EmptyState
          icon="musical-notes-outline"
          title="Nothing playing"
          message="Pick a song from your music list to start."
          actionLabel="Open music"
          onAction={() => router.replace('/music')}
        />
      </Screen>
    );
  }

  return (
    <ThemeScope theme={heroTheme}>
      <PlayerBody />
    </ThemeScope>
  );
}

function PlayerBody() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const music = useMusicPlayer();
  const current = music.current!;
  useStatusBarStyle('light');

  // The cover eases back a little while paused, like a record lifting off.
  const scale = useRef(new Animated.Value(music.playing ? 1 : 0.88)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: music.playing ? 1 : 0.88,
      useNativeDriver: true,
      speed: 12,
      bounciness: 6,
    }).start();
  }, [music.playing, scale]);

  const art = Math.min(width - spacing.xl * 2, 380);
  const index = music.upNext.findIndex((s) => s.id === current.id);
  const queueAfter = music.upNext.slice(index + 1);

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete song',
      message: `Remove "${current.songName}" (${current.movieTitle}) from your music?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const id = current.id;
    const deleted = await songsApi.remove(id).then(() => true).catch(() => false);
    if (!deleted) return;
    const wasLast = music.upNext.length <= 1;
    music.removeSong(id);
    if (wasLast) router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0A1630' }}>
      {/* ------------------------------------------------ backdrop */}
      <LinearGradient
        colors={['#2B4A80', '#16294D', '#0A1630']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {!!current.imageUrl && (
        <AppImage
          source={current.imageUrl}
          style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
          contentFit="cover"
          blurRadius={60}
          transition={400}
        />
      )}
      <LinearGradient
        colors={['rgba(10,22,48,0.35)', 'rgba(10,22,48,0.65)', '#0A1630']}
        locations={[0, 0.5, 0.9]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.xxl,
          paddingHorizontal: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------- top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
          <FrostedButton icon="chevron-down" label="Close player" onPress={() => router.back()} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="caption" color={theme.textTertiary} style={{ letterSpacing: 1.6 }}>
              PLAYING FROM
            </Txt>
            <Txt variant="small" style={{ fontWeight: '700', marginTop: 1 }}>
              My Music{music.shuffle ? ' · Shuffle' : ''}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <FrostedButton
              icon="create-outline"
              label="Edit song"
              onPress={() => router.push({ pathname: '/music/edit', params: { id: current.id } })}
            />
            <FrostedButton icon="trash-outline" label="Delete song" tone="danger" onPress={handleDelete} />
          </View>
        </View>

        {/* ---------------------------------------------- artwork */}
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <Animated.View
            style={{
              borderRadius: 30,
              boxShadow: '0px 30px 60px -18px rgba(0,0,0,0.75), 0px 0px 0px 1px rgba(255,255,255,0.08)',
              transform: [{ scale }],
            }}
          >
            <Artwork uri={current.imageUrl} size={art} radius={30} />
          </Animated.View>
        </View>

        {/* ---------------------------------------------- title */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.base }}>
          <View style={{ flex: 1 }}>
            <Txt variant="h1" numberOfLines={2}>
              {current.songName}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Ionicons name="film-outline" size={15} color={theme.primary} />
              <Txt variant="body" color={theme.textSecondary} style={{ marginLeft: 6, flex: 1 }} numberOfLines={1}>
                {current.movieTitle}
              </Txt>
            </View>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: 'rgba(255,255,255,0.14)',
              marginLeft: spacing.md,
              marginBottom: 4,
            }}
          >
            <Txt variant="caption" color={theme.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>
              {index + 1} / {music.upNext.length}
            </Txt>
          </View>
        </View>

        {/* ---------------------------------------------- seek + controls */}
        <SeekBar />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: spacing.lg,
            marginBottom: spacing.xxl,
          }}
        >
          <ControlButton
            icon="shuffle"
            label={music.shuffle ? 'Shuffle on' : 'Shuffle off'}
            active={music.shuffle}
            onPress={music.toggleShuffle}
          />
          <ControlButton icon="play-skip-back" size={34} label="Previous" onPress={music.previous} />
          <PlayButton />
          <ControlButton icon="play-skip-forward" size={34} label="Next" onPress={music.next} />
          <ControlButton
            icon="repeat"
            label={`Repeat ${music.repeat}`}
            active={music.repeat !== 'off'}
            badge={music.repeat === 'one' ? '1' : undefined}
            onPress={music.cycleRepeat}
          />
        </View>

        {/* ---------------------------------------------- up next */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Txt variant="h4" style={{ flex: 1 }}>
            Up next
          </Txt>
          <Txt variant="caption" color={theme.textTertiary}>
            {queueAfter.length ? `${queueAfter.length} song${queueAfter.length > 1 ? 's' : ''}` : ''}
          </Txt>
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* The current song heads the list. */}
          <QueueRow
            song={current}
            playing={music.playing}
            isCurrent
            last={!queueAfter.length}
            onPress={music.togglePlay}
          />
          {queueAfter.map((song, i) => (
            <QueueRow
              key={song.id}
              song={song}
              last={i === queueAfter.length - 1}
              onPress={() => music.jumpTo(song.id)}
            />
          ))}
          {!queueAfter.length && (
            <Txt
              variant="small"
              color={theme.textTertiary}
              align="center"
              style={{ paddingVertical: spacing.base, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }}
            >
              {music.repeat === 'all' ? 'The list starts again after this song.' : 'This is the last song.'}
            </Txt>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function QueueRow({
  song,
  onPress,
  isCurrent = false,
  playing = false,
  last = false,
}: {
  song: { id: string; songName: string; movieTitle: string; imageUrl?: string | null };
  onPress: () => void;
  isCurrent?: boolean;
  playing?: boolean;
  last?: boolean;
}) {
  const { theme, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: isCurrent ? 'rgba(169,195,240,0.12)' : pressed ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: theme.divider,
      })}
    >
      <Artwork uri={song.imageUrl} size={44} radius={12} />
      <View style={{ flex: 1, marginHorizontal: spacing.md }}>
        <Txt
          variant="small"
          color={isCurrent ? theme.primary : theme.text}
          style={{ fontWeight: '700' }}
          numberOfLines={1}
        >
          {song.songName}
        </Txt>
        <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
          {song.movieTitle}
        </Txt>
      </View>
      {isCurrent ? (
        <EqualizerBars playing={playing} />
      ) : (
        <Ionicons name="play-circle-outline" size={24} color={theme.textTertiary} />
      )}
    </Pressable>
  );
}

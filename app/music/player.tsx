import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { AppImage } from '@/components/AppImage';
import { EmptyState, Txt } from '@/components/ui';
import { ControlButton, SeekBar } from '@/components/MusicControls';
import { useMusicPlayer } from '@/store/MusicPlayer';

/** Full-screen player: artwork, seek bar, transport, shuffle/repeat and the queue. */
export default function PlayerScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const music = useMusicPlayer();
  const { current } = music;

  if (!current) {
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

  const currentIdx = music.upNext.findIndex((s) => s.id === current.id);
  const queueAfter = music.upNext.slice(currentIdx + 1);

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Now Playing" subtitle={music.shuffle ? 'Shuffle on' : undefined} showBack />

      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <View
          style={{
            width: '86%',
            aspectRatio: 1,
            borderRadius: radius.xl,
            overflow: 'hidden',
            backgroundColor: theme.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.elevation.card,
          }}
        >
          {current.imageUrl ? (
            <AppImage source={current.imageUrl} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <Ionicons name="musical-notes" size={96} color={theme.primary} />
          )}
        </View>
      </View>

      <Txt variant="h2" align="center" numberOfLines={2}>
        {current.songName}
      </Txt>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.xs }}>
        <Ionicons name="film-outline" size={14} color={theme.textTertiary} />
        <Txt variant="body" color={theme.textTertiary} style={{ marginLeft: 4 }} numberOfLines={1}>
          {current.movieTitle}
        </Txt>
      </View>

      <View style={{ marginTop: spacing.lg }}>
        <SeekBar />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: spacing.base,
          marginBottom: spacing.xl,
        }}
      >
        <ControlButton
          icon="shuffle"
          label={music.shuffle ? 'Shuffle on' : 'Shuffle off'}
          active={music.shuffle}
          onPress={music.toggleShuffle}
        />
        <ControlButton icon="play-skip-back" size={30} label="Previous" onPress={music.previous} />
        {music.buffering ? (
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primary,
            }}
          >
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : (
          <ControlButton
            primary
            icon={music.playing ? 'pause' : 'play'}
            label={music.playing ? 'Pause' : 'Play'}
            onPress={music.togglePlay}
          />
        )}
        <ControlButton icon="play-skip-forward" size={30} label="Next" onPress={music.next} />
        <ControlButton
          icon="repeat"
          label={`Repeat ${music.repeat}`}
          active={music.repeat !== 'off'}
          badge={music.repeat === 'one' ? '1' : undefined}
          onPress={music.cycleRepeat}
        />
      </View>

      {queueAfter.length > 0 && (
        <GlassCard padded={false} style={{ marginBottom: spacing.xxl }}>
          <Txt variant="caption" color={theme.textTertiary} style={{ padding: spacing.base, paddingBottom: spacing.xs }}>
            UP NEXT
          </Txt>
          {queueAfter.map((song) => (
            <Pressable
              key={song.id}
              onPress={() => music.jumpTo(song.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="musical-note-outline" size={16} color={theme.textTertiary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Txt variant="small" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {song.songName}
                </Txt>
                <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
                  {song.movieTitle}
                </Txt>
              </View>
            </Pressable>
          ))}
        </GlassCard>
      )}
    </Screen>
  );
}

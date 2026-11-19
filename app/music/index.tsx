import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced } from '@/hooks/useApi';
import { songsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Badge, Button, EmptyState, ErrorState, Field, IconButton, LoadingState, Txt } from '@/components/ui';
import { IconWell, RowAction } from '@/components/premium';
import { Artwork, EqualizerBars, MiniPlayer } from '@/components/MusicControls';
import { useConfirm } from '@/components/Dialog';
import { useMusicPlayer } from '@/store/MusicPlayer';
import type { Song } from '@/types/models';

/** Music: the workout playlist. Tap a song to play it; edit and delete on each row. */
export default function MusicScreen() {
  const { theme, spacing } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const music = useMusicPlayer();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);

  const songs = useApi(
    () => songsApi.list({ search: debounced || undefined, limit: 200 }),
    [debounced],
    { refetchOnFocus: true },
  );
  const items = songs.data?.items || [];
  const playable = items.filter((s) => !!s.audioUrl);
  const total = songs.data?.meta.total ?? items.length;

  const openEditor = (song?: Song) =>
    router.push(song ? { pathname: '/music/edit', params: { id: song.id } } : '/music/edit');

  const play = (song: Song) => {
    if (!song.audioUrl) {
      openEditor(song);
      return;
    }
    if (music.current?.id !== song.id) music.playQueue(items, song.id);
    router.push('/music/player');
  };

  const playAll = (shuffle: boolean) => {
    music.playQueue(items, undefined, { shuffle });
    router.push('/music/player');
  };

  const remove = async (song: Song) => {
    const ok = await confirm({
      title: 'Delete song',
      message: `Remove "${song.songName}" (${song.movieTitle}) from your music?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const deleted = await songsApi.remove(song.id).then(() => true).catch(() => false);
    if (deleted) music.removeSong(song.id);
    songs.refresh();
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader
        title="Music"
        subtitle={total ? `${total} song${total === 1 ? '' : 's'} in your playlist` : 'Your workout playlist'}
        showBack
        right={<IconButton icon="add" color={theme.primary} onPress={() => openEditor()} />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* -------------------------------------------- playlist hero */}
        {items.length > 0 && !debounced && (
          <GlassCard variant="hero" style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.base }}>
              <CoverStack songs={items} />
              <View style={{ flex: 1, marginLeft: spacing.base }}>
                <Txt variant="caption" color={theme.textTertiary} style={{ letterSpacing: 1.4 }}>
                  WORKOUT PLAYLIST
                </Txt>
                <Txt variant="h3" style={{ marginTop: 2 }}>
                  My Music
                </Txt>
                <Txt variant="small" color={theme.textSecondary} style={{ marginTop: 2 }}>
                  {playable.length} of {items.length} ready to play
                </Txt>
              </View>
            </View>
            {playable.length > 0 ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Play all" icon="play" style={{ flex: 1 }} onPress={() => playAll(false)} />
                <Button title="Shuffle" icon="shuffle" variant="glass" style={{ flex: 1 }} onPress={() => playAll(true)} />
              </View>
            ) : (
              <Txt variant="small" color={theme.textSecondary}>
                Add an audio file to a song to start playing.
              </Txt>
            )}
          </GlassCard>
        )}

        <Field
          value={search}
          onChangeText={setSearch}
          placeholder="Search by song or movie"
          icon="search"
          autoCapitalize="none"
          style={{ marginBottom: spacing.md }}
        />

        {items.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, marginLeft: 2 }}>
            <Txt variant="caption" color={theme.textTertiary} style={{ flex: 1, letterSpacing: 1.2 }}>
              {debounced ? 'RESULTS' : 'ALL SONGS'}
            </Txt>
            <Txt variant="caption" color={theme.textTertiary}>
              {items.length}
            </Txt>
          </View>
        )}

        {songs.loading && !songs.data ? (
          <LoadingState />
        ) : songs.error ? (
          <ErrorState message={songs.error} onRetry={songs.refetch} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="musical-notes-outline"
            title={debounced ? 'No matching songs' : 'No songs yet'}
            message={
              debounced
                ? 'Try a different song or movie name.'
                : 'Add the songs that get you moving, with the movie they are from.'
            }
            actionLabel={debounced ? undefined : 'Add song'}
            onAction={debounced ? undefined : () => openEditor()}
          />
        ) : (
          items.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              index={i}
              isCurrent={music.current?.id === song.id}
              playing={music.playing}
              onPlay={() => play(song)}
              onEdit={() => openEditor(song)}
              onDelete={() => remove(song)}
            />
          ))
        )}
      </ScrollView>

      {!!music.current && (
        <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
          <MiniPlayer />
        </View>
      )}
    </Screen>
  );
}

/** Up to three covers fanned out, like a stack of records. */
function CoverStack({ songs }: { songs: Song[] }) {
  const covers = songs.filter((s) => s.imageUrl).slice(0, 3);
  if (!covers.length) return <IconWell icon="musical-notes" size={64} filled />;
  return (
    <View style={{ width: 64 + (covers.length - 1) * 12, height: 64 }}>
      {covers
        .slice()
        .reverse()
        .map((s, i, arr) => {
          const depth = arr.length - 1 - i; // 0 = front
          return (
            <View
              key={s.id}
              style={{
                position: 'absolute',
                left: depth * 12,
                top: depth * 3,
                transform: [{ scale: 1 - depth * 0.1 }],
                opacity: 1 - depth * 0.25,
                borderRadius: 16,
                boxShadow: '0px 8px 18px rgba(0,0,0,0.4)',
              }}
            >
              <Artwork uri={s.imageUrl} size={64} radius={16} />
            </View>
          );
        })}
    </View>
  );
}

function SongRow({
  song,
  index,
  isCurrent,
  playing,
  onPlay,
  onEdit,
  onDelete,
}: {
  song: Song;
  index: number;
  isCurrent: boolean;
  playing: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { theme, spacing } = useTheme();
  const hasAudio = !!song.audioUrl;

  return (
    <GlassCard
      onPress={onPlay}
      variant={isCurrent ? 'tint' : 'default'}
      padded={false}
      style={{
        marginBottom: spacing.md,
        borderWidth: isCurrent ? 1.5 : StyleSheet.hairlineWidth * 2,
        borderColor: isCurrent ? theme.primary : theme.glassBorder,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.md }}>
        {/* cover with a play / equalizer badge */}
        <View style={{ borderRadius: 18, boxShadow: '0px 8px 16px -6px rgba(15,31,61,0.35)' }}>
          <Artwork uri={song.imageUrl} size={64} radius={18} iconSize={26} />
          {isCurrent ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(10,22,48,0.5)',
                },
              ]}
            >
              <EqualizerBars playing={playing} color="#FFFFFF" height={18} />
            </View>
          ) : hasAudio ? (
            <View
              style={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                boxShadow: '0px 4px 10px rgba(10,22,48,0.3)',
              }}
            >
              <Ionicons name="play" size={12} color={theme.primary} style={{ marginLeft: 2 }} />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, marginLeft: spacing.md, marginRight: spacing.sm }}>
          <Txt variant="caption" color={theme.textTertiary} style={{ fontVariant: ['tabular-nums'] }}>
            {String(index + 1).padStart(2, '0')}
            {isCurrent ? (playing ? '  ·  NOW PLAYING' : '  ·  PAUSED') : ''}
          </Txt>
          <Txt
            variant="body"
            color={isCurrent ? theme.primary : theme.text}
            style={{ fontWeight: '700', marginTop: 1 }}
            numberOfLines={1}
          >
            {song.songName}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name="film-outline" size={13} color={theme.textTertiary} />
            <Txt variant="small" color={theme.textTertiary} style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
              {song.movieTitle}
            </Txt>
          </View>
          {!hasAudio && (
            <View style={{ marginTop: 5 }}>
              <Badge label="NO AUDIO" icon="alert-circle-outline" color={theme.streak} size="sm" />
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <RowAction icon="create-outline" label={`Edit ${song.songName}`} onPress={onEdit} />
          <RowAction icon="trash-outline" tone="danger" label={`Delete ${song.songName}`} onPress={onDelete} />
        </View>
      </View>
    </GlassCard>
  );
}

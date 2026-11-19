import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useDebounced } from '@/hooks/useApi';
import { songsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { AppImage } from '@/components/AppImage';
import { Button, EmptyState, ErrorState, Field, IconButton, LoadingState, Txt } from '@/components/ui';
import { MiniPlayer } from '@/components/MusicControls';
import { useConfirm } from '@/components/Dialog';
import { useMusicPlayer } from '@/store/MusicPlayer';
import type { Song } from '@/types/models';

/** Music: the user's workout songs. Tap one to play; the pencil edits it. */
export default function MusicScreen() {
  const { theme, spacing, radius } = useTheme();
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

  const openEditor = (song?: Song) =>
    router.push(song ? { pathname: '/music/edit', params: { id: song.id } } : '/music/edit');

  const play = (song: Song) => {
    if (!song.audioUrl) {
      openEditor(song);
      return;
    }
    if (music.current?.id === song.id) {
      router.push('/music/player');
      return;
    }
    music.playQueue(items, song.id);
    router.push('/music/player');
  };

  const playAll = (shuffle: boolean) => {
    music.playQueue(items, undefined, { shuffle });
    router.push('/music/player');
  };

  const remove = async (song: Song) => {
    const ok = await confirm({
      title: 'Delete song',
      message: `Remove "${song.songName}" from ${song.movieTitle}?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await songsApi.remove(song.id).catch(() => undefined);
    songs.refresh();
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader
        title="Music"
        subtitle="Your workout songs"
        showBack
        right={<IconButton icon="add" color={theme.primary} onPress={() => openEditor()} />}
      />

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search by song or movie"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      {playable.length > 0 && (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <Button title="Play all" icon="play" style={{ flex: 1 }} onPress={() => playAll(false)} />
          <Button title="Shuffle" icon="shuffle" variant="glass" style={{ flex: 1 }} onPress={() => playAll(true)} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
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
          items.map((song) => {
            const isCurrent = music.current?.id === song.id;
            return (
              <Pressable
                key={song.id}
                onPress={() => play(song)}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <GlassCard
                  style={{
                    marginBottom: spacing.md,
                    borderWidth: isCurrent ? 1.5 : 0,
                    borderColor: theme.primary,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View>
                      {song.imageUrl ? (
                        <AppImage
                          source={song.imageUrl}
                          style={{ width: 60, height: 60, borderRadius: radius.md }}
                          contentFit="cover"
                        />
                      ) : (
                        <View
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: radius.md,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: theme.primarySoft,
                          }}
                        >
                          <Ionicons name="musical-notes" size={26} color={theme.primary} />
                        </View>
                      )}
                      {isCurrent && (
                        <View
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: radius.md,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                          }}
                        >
                          <Ionicons name={music.playing ? 'volume-high' : 'pause'} size={22} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Txt
                        variant="body"
                        color={isCurrent ? theme.primary : theme.text}
                        style={{ fontWeight: '700' }}
                        numberOfLines={1}
                      >
                        {song.songName}
                      </Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="film-outline" size={13} color={theme.textTertiary} />
                        <Txt
                          variant="small"
                          color={theme.textTertiary}
                          style={{ marginLeft: 4, flex: 1 }}
                          numberOfLines={1}
                        >
                          {song.movieTitle}
                        </Txt>
                      </View>
                      {!song.audioUrl && (
                        <Txt variant="caption" color={theme.streak} style={{ marginTop: 2 }}>
                          No audio file · tap to add one
                        </Txt>
                      )}
                    </View>

                    <IconButton
                      icon="create-outline"
                      variant="plain"
                      size={36}
                      color={theme.textSecondary}
                      onPress={() => openEditor(song)}
                    />
                    <IconButton
                      icon="trash-outline"
                      variant="plain"
                      size={36}
                      color={theme.danger}
                      onPress={() => remove(song)}
                    />
                  </View>
                </GlassCard>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {!!music.current && (
        <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>
          <MiniPlayer />
        </View>
      )}
    </Screen>
  );
}

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
import { EmptyState, ErrorState, Field, IconButton, LoadingState, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import type { Song } from '@/types/models';

/** Music: the user's list of workout songs, each with its movie and a cover. */
export default function MusicScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search, 300);

  const songs = useApi(
    () => songsApi.list({ search: debounced || undefined, limit: 200 }),
    [debounced],
    { refetchOnFocus: true },
  );
  const items = songs.data?.items || [];

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
        right={
          <IconButton icon="add" color={theme.primary} onPress={() => router.push('/music/edit')} />
        }
      />

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Search by song or movie"
        icon="search"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

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
            onAction={debounced ? undefined : () => router.push('/music/edit')}
          />
        ) : (
          items.map((song) => (
            <Pressable
              key={song.id}
              onPress={() => router.push({ pathname: '/music/edit', params: { id: song.id } })}
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <GlassCard style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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

                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Txt variant="body" style={{ fontWeight: '700' }} numberOfLines={1}>
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
                  </View>

                  <IconButton
                    icon="create-outline"
                    variant="plain"
                    size={36}
                    color={theme.textSecondary}
                    onPress={() => router.push({ pathname: '/music/edit', params: { id: song.id } })}
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
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

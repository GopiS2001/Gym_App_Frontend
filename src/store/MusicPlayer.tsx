/**
 * App-wide music player.
 *
 * One audio player lives here, above the navigator, so a song keeps playing
 * while the user moves between screens (logging a workout, for example).
 * Screens read the current song and drive playback through `useMusicPlayer`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { resolveMediaUrl } from '@/services/api';
import { useAuth } from '@/store/AuthContext';
import type { Song } from '@/types/models';

export type RepeatMode = 'off' | 'all' | 'one';

/**
 * Background playback and lock-screen controls need the native service that
 * the expo-audio config plugin adds at build time. Expo Go is a prebuilt app
 * without it (and web has no lock screen), so there every call to those APIs
 * just logs "Failed to start the expo-audio playback service". In those
 * environments music plays while the app is open and those extras are skipped.
 */
const LOCK_SCREEN_SUPPORTED =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

interface MusicPlayerValue {
  /** The song loaded in the player, or null when nothing is queued. */
  current: Song | null;
  /** The queue in play order (shuffled order when shuffle is on). */
  upNext: Song[];
  playing: boolean;
  buffering: boolean;
  /** Seconds. */
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Replaces the queue with `songs` and starts at `startId` (or the first). */
  playQueue: (songs: Song[], startId?: string, opts?: { shuffle?: boolean }) => void;
  /** Plays a song already in the queue, keeping the queue and shuffle as they are. */
  jumpTo: (songId: string) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  stop: () => void;
  /** Call after a song is edited so the queue shows the new details. */
  updateSong: (song: Song) => void;
  /** Call after a song is deleted; if it was playing, the next one starts. */
  removeSong: (songId: string) => void;
}

const MusicPlayerContext = createContext<MusicPlayerValue | null>(null);

/** Fisher–Yates shuffle of the indices 0..n-1, with `first` moved to the front. */
function shuffledOrder(n: number, first: number): number[] {
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first >= 0 ? [first, ...rest] : rest;
}

function naturalOrder(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const { isAuthenticated } = useAuth();

  const [queue, setQueue] = useState<Song[]>([]);
  /** Indices into `queue`, in the order they will play. */
  const [order, setOrder] = useState<number[]>([]);
  /** Position within `order` of the song now loaded. */
  const [cursor, setCursor] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');

  const current = cursor >= 0 && order[cursor] !== undefined ? queue[order[cursor]] ?? null : null;

  // Keep playing with the screen locked and through the silent switch.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: LOCK_SCREEN_SUPPORTED,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  /** Loads `song` into the player and, unless told otherwise, starts it. */
  const load = useCallback(
    (song: Song, autoplay = true) => {
      const uri = resolveMediaUrl(song.audioUrl);
      if (!uri) return;
      player.replace({ uri });
      if (autoplay) player.play();
      try {
        player.setActiveForLockScreen(true, {
          title: song.songName,
          artist: song.movieTitle,
          artworkUrl: resolveMediaUrl(song.imageUrl),
        });
      } catch {
        // Lock-screen controls are not available on every platform (web).
      }
    },
    [player],
  );

  const goTo = useCallback(
    (nextCursor: number, nextOrder = order, nextQueue = queue) => {
      const song = nextQueue[nextOrder[nextCursor]];
      if (!song) return;
      setCursor(nextCursor);
      load(song);
    },
    [load, order, queue],
  );

  const playQueue = useCallback<MusicPlayerValue['playQueue']>(
    (songs, startId, opts) => {
      const playable = songs.filter((s) => !!s.audioUrl);
      if (!playable.length) return;

      const wantShuffle = opts?.shuffle ?? shuffle;
      const startIndex = startId ? playable.findIndex((s) => s.id === startId) : -1;
      const nextOrder = wantShuffle
        ? shuffledOrder(playable.length, startIndex >= 0 ? startIndex : Math.floor(Math.random() * playable.length))
        : naturalOrder(playable.length);
      const nextCursor = wantShuffle ? 0 : Math.max(0, startIndex);

      setShuffle(wantShuffle);
      setQueue(playable);
      setOrder(nextOrder);
      goTo(nextCursor, nextOrder, playable);
    },
    [goTo, shuffle],
  );

  const jumpTo = useCallback(
    (songId: string) => {
      const at = order.findIndex((i) => queue[i]?.id === songId);
      if (at >= 0) goTo(at);
    },
    [goTo, order, queue],
  );

  const next = useCallback(() => {
    if (!order.length) return;
    if (cursor + 1 < order.length) goTo(cursor + 1);
    else if (repeat !== 'off') goTo(0);
    else {
      // End of the queue: stop on the last song, rewound.
      player.pause();
      player.seekTo(0).catch(() => undefined);
    }
  }, [cursor, goTo, order.length, player, repeat]);

  const previous = useCallback(() => {
    if (!order.length) return;
    // Like most players: a few seconds in, "previous" restarts the song.
    if (status.currentTime > 3 || (cursor === 0 && repeat === 'off')) {
      player.seekTo(0).catch(() => undefined);
      return;
    }
    goTo(cursor > 0 ? cursor - 1 : order.length - 1);
  }, [cursor, goTo, order.length, player, repeat, status.currentTime]);

  const togglePlay = useCallback(() => {
    if (!current) return;
    if (status.playing) {
      player.pause();
    } else {
      // A finished song sits at its end; start it again from the top.
      if (status.duration > 0 && status.currentTime >= status.duration - 0.5) {
        player.seekTo(0).catch(() => undefined);
      }
      player.play();
    }
  }, [current, player, status.currentTime, status.duration, status.playing]);

  const seek = useCallback(
    (seconds: number) => {
      player.seekTo(Math.max(0, seconds)).catch(() => undefined);
    },
    [player],
  );

  const toggleShuffle = useCallback(() => {
    const currentIndex = order[cursor];
    if (!shuffle) {
      // Keep the current song playing and shuffle everything after it.
      const nextOrder = shuffledOrder(queue.length, currentIndex ?? -1);
      setOrder(nextOrder);
      setCursor(currentIndex !== undefined ? 0 : -1);
    } else {
      setOrder(naturalOrder(queue.length));
      setCursor(currentIndex ?? -1);
    }
    setShuffle((s) => !s);
  }, [cursor, order, queue.length, shuffle]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  const stop = useCallback(() => {
    player.pause();
    try {
      player.clearLockScreenControls?.();
    } catch {
      // Not supported on this platform.
    }
    setQueue([]);
    setOrder([]);
    setCursor(-1);
  }, [player]);

  const updateSong = useCallback(
    (song: Song) => {
      const old = queue.find((s) => s.id === song.id);
      if (!old) return;
      if (!song.audioUrl) {
        // It can no longer play: take it out of the queue.
        // (removeSong is declared below; defer to the next tick.)
        setTimeout(() => removeRef.current(song.id), 0);
        return;
      }
      setQueue((q) => q.map((s) => (s.id === song.id ? song : s)));
      if (current?.id === song.id && old.audioUrl !== song.audioUrl) {
        load(song, status.playing);
      } else if (current?.id === song.id) {
        try {
          player.updateLockScreenMetadata({
            title: song.songName,
            artist: song.movieTitle,
            artworkUrl: resolveMediaUrl(song.imageUrl),
          });
        } catch {
          // Not supported on this platform.
        }
      }
    },
    [current?.id, load, player, queue, status.playing],
  );

  const removeSong = useCallback(
    (songId: string) => {
      const qi = queue.findIndex((s) => s.id === songId);
      if (qi < 0) return;

      const nextQueue = queue.filter((_, i) => i !== qi);
      const nextOrder = order.filter((i) => i !== qi).map((i) => (i > qi ? i - 1 : i));
      if (!nextOrder.length) {
        stop();
        return;
      }

      const wasCurrent = order[cursor] === qi;
      setQueue(nextQueue);
      setOrder(nextOrder);

      if (wasCurrent) {
        // The following song slides into this slot; wrap to the start at the end.
        const nextCursor = cursor < nextOrder.length ? cursor : 0;
        setCursor(nextCursor);
        load(nextQueue[nextOrder[nextCursor]], status.playing);
      } else {
        const currentQi = order[cursor];
        const shifted = currentQi > qi ? currentQi - 1 : currentQi;
        setCursor(nextOrder.indexOf(shifted));
      }
    },
    [cursor, load, order, queue, status.playing, stop],
  );
  const removeRef = useRef(removeSong);
  removeRef.current = removeSong;

  // Advance when a song ends. A ref guards against handling one finish twice.
  const handledFinish = useRef(false);
  useEffect(() => {
    if (!status.didJustFinish) {
      handledFinish.current = false;
      return;
    }
    if (handledFinish.current) return;
    handledFinish.current = true;

    if (repeat === 'one') {
      player.seekTo(0).catch(() => undefined);
      player.play();
    } else {
      next();
    }
  }, [status.didJustFinish, repeat, next, player]);

  // Signing out stops the music.
  useEffect(() => {
    if (!isAuthenticated && queue.length) stop();
  }, [isAuthenticated, queue.length, stop]);

  const upNext = useMemo(() => order.map((i) => queue[i]).filter(Boolean), [order, queue]);

  const value: MusicPlayerValue = {
    current,
    upNext,
    playing: status.playing,
    buffering: status.isBuffering && !status.isLoaded,
    position: status.currentTime || 0,
    duration: status.duration || 0,
    shuffle,
    repeat,
    playQueue,
    jumpTo,
    togglePlay,
    next,
    previous,
    seek,
    toggleShuffle,
    cycleRepeat,
    stop,
    updateSong,
    removeSong,
  };

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

export function useMusicPlayer(): MusicPlayerValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be used inside MusicPlayerProvider');
  return ctx;
}

/** 83 -> "1:23". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

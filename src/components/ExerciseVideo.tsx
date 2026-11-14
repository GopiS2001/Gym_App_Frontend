import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { resolveMediaUrl } from '@/services/api';
import { useTheme } from '@/theme/ThemeProvider';
import { Txt } from '@/components/ui';

type Kind =
  | { type: 'file'; uri: string }
  | { type: 'embed'; uri: string; provider: 'YouTube' | 'Vimeo'; aspect: number }
  | { type: 'link'; uri: string };

/** Works out how a stored video URL can be played inline. */
export function classifyVideo(raw: string): Kind {
  const url = resolveMediaUrl(raw) || raw;

  const yt =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i.exec(url);
  if (yt) {
    return {
      type: 'embed',
      provider: 'YouTube',
      // Shorts are filmed upright.
      aspect: /\/shorts\//i.test(url) ? 9 / 16 : 16 / 9,
      uri: `https://www.youtube-nocookie.com/embed/${yt[1]}?playsinline=1&rel=0&modestbranding=1`,
    };
  }

  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url);
  if (vimeo) {
    return {
      type: 'embed',
      provider: 'Vimeo',
      aspect: 16 / 9,
      uri: `https://player.vimeo.com/video/${vimeo[1]}?playsinline=1`,
    };
  }

  // Our own uploads, or any direct link to a video file.
  if (/\/uploads\//.test(url) || /\.(mp4|m4v|mov|webm|3gp|mkv)(\?|#|$)/i.test(url)) {
    return { type: 'file', uri: url };
  }

  return { type: 'link', uri: url };
}

/**
 * Large inline player for an exercise's demonstration video.
 *
 * The frame takes the video's own shape — an upright phone clip gets a tall
 * frame instead of a letterboxed 16:9 strip — capped at most of the screen
 * height so the page stays scrollable.
 */
export function ExerciseVideo({ url }: { url: string }) {
  const { theme, radius } = useTheme();
  const { height: windowH } = useWindowDimensions();
  const kind = classifyVideo(url);
  const [frameW, setFrameW] = useState(0);
  const [fileAspect, setFileAspect] = useState(16 / 9);

  const aspect = kind.type === 'embed' ? kind.aspect : fileAspect;
  const maxH = Math.round(windowH * 0.72);
  const height = frameW ? Math.min(Math.round(frameW / aspect), maxH) : undefined;

  const frame = {
    width: '100%' as const,
    height,
    aspectRatio: height ? undefined : aspect,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    backgroundColor: '#000',
  };
  const measure = (e: { nativeEvent: { layout: { width: number } } }) =>
    setFrameW(e.nativeEvent.layout.width);

  if (kind.type === 'file') {
    return (
      <View style={frame} onLayout={measure}>
        <FilePlayer uri={kind.uri} onAspect={setFileAspect} />
      </View>
    );
  }

  if (kind.type === 'embed') {
    return (
      <View style={frame} onLayout={measure}>
        {Platform.OS === 'web' ? (
          // react-native-webview has no web build; a plain iframe is the web equivalent.
          React.createElement('iframe', {
            src: kind.uri,
            title: `${kind.provider} video`,
            allow: 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen',
            allowFullScreen: true,
            referrerPolicy: 'strict-origin-when-cross-origin',
            style: { border: 0, width: '100%', height: '100%' },
          })
        ) : (
          <WebView
            // Loaded via an HTML wrapper with a real origin: YouTube refuses
            // embeds that arrive without a referrer (player error 153).
            source={{
              html: `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${kind.uri}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`,
              baseUrl: 'https://localhost',
            }}
            style={{ flex: 1, backgroundColor: '#000' }}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            scrollEnabled={false}
          />
        )}
      </View>
    );
  }

  // A page we can't embed (Instagram, a blog, …): offer to open it.
  return (
    <Pressable
      onPress={() => Linking.openURL(kind.uri).catch(() => undefined)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: radius.md,
        backgroundColor: theme.surfaceMuted,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name="open-outline" size={20} color={theme.primary} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Txt variant="bodyStrong">Open video link</Txt>
        <Txt variant="caption" color={theme.textTertiary} numberOfLines={1}>
          {kind.uri}
        </Txt>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
    </Pressable>
  );
}

function FilePlayer({ uri, onAspect }: { uri: string; onAspect: (aspect: number) => void }) {
  // Paused until the user taps play; no surprise audio when the page opens.
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  // Report the clip's real shape so the frame can match it.
  useEffect(() => {
    const report = (w?: number, h?: number) => {
      if (w && h) onAspect(w / h);
    };

    if (Platform.OS === 'web') {
      // expo-video's web player never fills in videoTrack; read the metadata directly.
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.muted = true;
      probe.src = uri;
      const onMeta = () => report(probe.videoWidth, probe.videoHeight);
      probe.addEventListener('loadedmetadata', onMeta);
      return () => {
        probe.removeEventListener('loadedmetadata', onMeta);
        probe.removeAttribute('src');
        probe.load();
      };
    }

    report(player.videoTrack?.size.width, player.videoTrack?.size.height);
    const sub = player.addListener('videoTrackChange', ({ videoTrack }) =>
      report(videoTrack?.size.width, videoTrack?.size.height),
    );
    return () => sub.remove();
  }, [player, uri, onAspect]);

  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%' }}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
    />
  );
}

import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AppImage as Image } from '@/components/AppImage';
import { GlassCard } from '@/components/Glass';
import { Field, Txt } from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import { mediaApi } from '@/services/endpoints';
import { useTheme } from '@/theme/ThemeProvider';

export const MAX_IMAGES = 10;
const MAX_VIDEO_MB = 100;
const TILE = 104;

export interface ImageItem {
  key: string;
  /** What to show: the local file while uploading, then the server URL. */
  uri: string;
  /** Server URL once uploaded. */
  url?: string;
  uploading?: boolean;
  failed?: boolean;
  meta?: { mimeType?: string | null; fileName?: string | null };
}

export type VideoMode = 'link' | 'file';

export interface VideoFile {
  uri: string;
  url?: string;
  name: string;
  sizeMb?: number;
  uploading?: boolean;
  failed?: boolean;
  meta?: { mimeType?: string | null; fileName?: string | null };
}

export interface BackgroundImage {
  uri: string;
  url?: string;
  uploading?: boolean;
  failed?: boolean;
  meta?: { mimeType?: string | null; fileName?: string | null };
}

export interface MediaState {
  /** Banner behind the exercise title; separate from the gallery. */
  background: BackgroundImage | null;
  images: ImageItem[];
  videoMode: VideoMode;
  videoLink: string;
  videoFile: VideoFile | null;
}

let keySeq = 0;
const nextKey = () => `img-${Date.now()}-${keySeq++}`;

/** Builds editor state from a saved exercise. */
export function mediaStateFrom(e?: {
  backgroundImageUrl?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
}): MediaState {
  const urls = e?.imageUrls?.length ? e.imageUrls : e?.imageUrl ? [e.imageUrl] : [];
  const video = e?.videoUrl || '';
  // Files we host live under /uploads/; anything else is an external link.
  const isUploaded = /\/uploads\//.test(video);
  return {
    background: e?.backgroundImageUrl
      ? { uri: e.backgroundImageUrl, url: e.backgroundImageUrl }
      : null,
    images: urls.map((url) => ({ key: nextKey(), uri: url, url })),
    videoMode: isUploaded ? 'file' : 'link',
    videoLink: isUploaded ? '' : video,
    videoFile: isUploaded
      ? { uri: video, url: video, name: decodeURIComponent(video.split('/').pop() || 'Video') }
      : null,
  };
}

/** The values to send to the API. */
export function mediaPayload(m: MediaState) {
  return {
    // Empty string clears it on the server.
    backgroundImageUrl: m.background?.url || '',
    imageUrls: m.images.filter((i) => i.url).map((i) => i.url!),
    videoUrl: m.videoMode === 'link' ? m.videoLink.trim() : m.videoFile?.url || '',
  };
}

export const mediaBusy = (m: MediaState) =>
  !!m.background?.uploading || m.images.some((i) => i.uploading) || !!m.videoFile?.uploading;

export function ExerciseMediaEditor({
  value,
  onChange,
  videoError,
}: {
  value: MediaState;
  /** Functional updates, because uploads finish after the state has moved on. */
  onChange: (update: (prev: MediaState) => MediaState) => void;
  videoError?: string;
}) {
  const { notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  const { background, images, videoMode, videoLink, videoFile } = value;

  // --------------------------------------------------------- background

  const uploadBackground = async (bg: BackgroundImage) => {
    onChange((p) => ({ ...p, background: { ...bg, uploading: true, failed: false } }));
    try {
      const res = await mediaApi.upload(bg.uri, 'exercises', bg.meta);
      onChange((p) =>
        p.background?.uri === bg.uri
          ? { ...p, background: { ...p.background, uploading: false, url: res.mediaUrl } }
          : p,
      );
    } catch {
      onChange((p) =>
        p.background?.uri === bg.uri
          ? { ...p, background: { ...p.background, uploading: false, failed: true } }
          : p,
      );
    }
  };

  const chooseBackground = async () => {
    if (!(await ensureLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    uploadBackground({ uri: a.uri, meta: { mimeType: a.mimeType, fileName: a.fileName } });
  };

  // ------------------------------------------------------------- images

  const patchImage = (key: string, patch: Partial<ImageItem>) =>
    onChange((p) => ({
      ...p,
      images: p.images.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    }));

  const uploadImage = async (item: ImageItem) => {
    patchImage(item.key, { uploading: true, failed: false });
    try {
      const res = await mediaApi.upload(item.uri, 'exercises', item.meta);
      patchImage(item.key, { uploading: false, url: res.mediaUrl });
    } catch {
      patchImage(item.key, { uploading: false, failed: true });
    }
  };

  const ensureLibraryPermission = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify({
        title: 'Permission needed',
        message: 'Allow photo and video access to attach media.',
        tone: 'info',
      });
    }
    return permission.granted;
  };

  const addImages = async () => {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      notify({ title: 'Limit reached', message: `Up to ${MAX_IMAGES} images.`, tone: 'info' });
      return;
    }
    if (!(await ensureLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: room,
      orderedSelection: true,
      quality: 0.75,
    });
    if (result.canceled || !result.assets.length) return;

    const added: ImageItem[] = result.assets.slice(0, room).map((a) => ({
      key: nextKey(),
      uri: a.uri,
      meta: { mimeType: a.mimeType, fileName: a.fileName },
    }));
    onChange((p) => ({ ...p, images: [...p.images, ...added] }));
    // Upload in parallel; each tile tracks its own progress.
    added.forEach(uploadImage);
  };

  const removeImage = (key: string) =>
    onChange((p) => ({ ...p, images: p.images.filter((i) => i.key !== key) }));

  const makeCover = (key: string) =>
    onChange((p) => {
      const item = p.images.find((i) => i.key === key);
      if (!item) return p;
      return { ...p, images: [item, ...p.images.filter((i) => i.key !== key)] };
    });

  // -------------------------------------------------------------- video

  const uploadVideo = async (file: VideoFile) => {
    onChange((p) => ({ ...p, videoFile: { ...file, uploading: true, failed: false } }));
    try {
      const res = await mediaApi.upload(file.uri, 'exercise-videos', file.meta);
      onChange((p) =>
        p.videoFile?.uri === file.uri
          ? { ...p, videoFile: { ...p.videoFile, uploading: false, url: res.mediaUrl } }
          : p,
      );
    } catch (err: any) {
      onChange((p) =>
        p.videoFile?.uri === file.uri
          ? { ...p, videoFile: { ...p.videoFile, uploading: false, failed: true } }
          : p,
      );
      notify({
        title: 'Video upload failed',
        message: err?.message || 'The video could not be uploaded. Try again.',
        tone: 'info',
      });
    }
  };

  const chooseVideo = async () => {
    if (!(await ensureLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;

    const a = result.assets[0];
    const sizeMb = a.fileSize ? a.fileSize / (1024 * 1024) : undefined;
    if (sizeMb && sizeMb > MAX_VIDEO_MB) {
      notify({
        title: 'Video too large',
        message: `That video is ${sizeMb.toFixed(0)} MB. Pick one under ${MAX_VIDEO_MB} MB, or paste a link instead.`,
        tone: 'info',
      });
      return;
    }
    const file: VideoFile = {
      uri: a.uri,
      name: a.fileName || 'Video',
      sizeMb,
      meta: { mimeType: a.mimeType, fileName: a.fileName },
    };
    uploadVideo(file);
  };

  // ------------------------------------------------------------- render

  return (
    <>
      {/* ------------------------------------------------ background */}
      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
        BACKGROUND IMAGE
      </Txt>
      {background ? (
        <View
          style={{
            height: 170,
            borderRadius: radius.lg,
            overflow: 'hidden',
            backgroundColor: theme.surfaceMuted,
            marginBottom: spacing.base,
          }}
        >
          <Image source={{ uri: background.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />

          {(background.uploading || background.failed) && (
            <Pressable
              disabled={!background.failed}
              onPress={() => uploadBackground(background)}
              style={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
              }}
            >
              {background.uploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={22} color="#FFFFFF" />
                  <Txt variant="small" color="#FFFFFF" style={{ marginTop: 4 }}>
                    Upload failed · tap to retry
                  </Txt>
                </>
              )}
            </Pressable>
          )}

          {!background.uploading && (
            <View style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 8 }}>
              <OverlayButton icon="camera" label="Change" onPress={chooseBackground} />
              <OverlayButton
                icon="trash-outline"
                label="Remove"
                onPress={() => onChange((p) => ({ ...p, background: null }))}
              />
            </View>
          )}
        </View>
      ) : (
        <Pressable
          onPress={chooseBackground}
          style={({ pressed }) => ({
            height: 110,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: theme.primary,
            backgroundColor: theme.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.base,
            marginBottom: spacing.base,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="image-outline" size={24} color={theme.primary} />
          <Txt variant="small" color={theme.primary} style={{ marginTop: 4, fontWeight: '700' }}>
            Add background image
          </Txt>
          <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginTop: 2 }}>
            Shown behind the exercise title. If empty, the first gallery image is used.
          </Txt>
        </Pressable>
      )}

      {/* ---------------------------------------------------- images */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
          marginHorizontal: 2,
        }}
      >
        <Txt variant="caption" color={theme.textTertiary}>
          IMAGES
        </Txt>
        <Txt variant="caption" color={theme.textTertiary}>
          {images.length}/{MAX_IMAGES}
          {images.length > 1 ? ' · tap one to make it the cover' : ''}
        </Txt>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.base }}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {images.map((img, index) => (
          <Pressable
            key={img.key}
            onPress={() => (img.failed ? uploadImage(img) : makeCover(img.key))}
            style={{
              width: TILE,
              height: TILE,
              borderRadius: radius.md,
              overflow: 'hidden',
              backgroundColor: theme.surfaceMuted,
              borderWidth: index === 0 ? 2 : 0,
              borderColor: theme.primary,
            }}
          >
            <Image source={{ uri: img.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />

            {(img.uploading || img.failed) && (
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                {img.uploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Txt variant="caption" color="#FFFFFF" style={{ marginTop: 2 }}>
                      Retry
                    </Txt>
                  </>
                )}
              </View>
            )}

            {index === 0 && !img.uploading && (
              <View
                style={{
                  position: 'absolute',
                  left: 6,
                  bottom: 6,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                  backgroundColor: theme.primary,
                }}
              >
                <Txt variant="caption" color={theme.onPrimary} style={{ fontWeight: '800' }}>
                  COVER
                </Txt>
              </View>
            )}

            <Pressable
              onPress={() => removeImage(img.key)}
              hitSlop={8}
              accessibilityLabel="Remove image"
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.6)',
              }}
            >
              <Ionicons name="close" size={15} color="#FFFFFF" />
            </Pressable>
          </Pressable>
        ))}

        {images.length < MAX_IMAGES && (
          <Pressable
            onPress={addImages}
            style={({ pressed }) => ({
              width: TILE,
              height: TILE,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: theme.primary,
              backgroundColor: theme.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="images-outline" size={24} color={theme.primary} />
            <Txt variant="caption" color={theme.primary} style={{ marginTop: 4, fontWeight: '700' }}>
              {images.length ? 'Add more' : 'Add images'}
            </Txt>
          </Pressable>
        )}
      </ScrollView>

      {/* ----------------------------------------------------- video */}
      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
        VIDEO
      </Txt>

      <GlassCard style={{ marginBottom: spacing.base }}>
        {/* Link / Upload switch */}
        <View
          style={{
            flexDirection: 'row',
            padding: 3,
            borderRadius: radius.pill,
            backgroundColor: theme.surfaceMuted,
            marginBottom: spacing.md,
          }}
        >
          {(
            [
              { mode: 'link', label: 'Paste link', icon: 'link-outline' },
              { mode: 'file', label: 'Upload file', icon: 'cloud-upload-outline' },
            ] as const
          ).map((opt) => {
            const active = videoMode === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                onPress={() => onChange((p) => ({ ...p, videoMode: opt.mode }))}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 8,
                  borderRadius: radius.pill,
                  backgroundColor: active ? theme.primary : 'transparent',
                }}
              >
                <Ionicons
                  name={opt.icon}
                  size={15}
                  color={active ? theme.onPrimary : theme.textSecondary}
                />
                <Txt
                  variant="small"
                  color={active ? theme.onPrimary : theme.textSecondary}
                  style={{ marginLeft: 5, fontWeight: '700' }}
                >
                  {opt.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        {videoMode === 'link' ? (
          <Field
            label="VIDEO LINK"
            value={videoLink}
            onChangeText={(t: string) => onChange((p) => ({ ...p, videoLink: t }))}
            placeholder="https://youtube.com/watch?v=..."
            autoCapitalize="none"
            keyboardType="url"
            error={videoError}
            style={{ marginBottom: 0 }}
          />
        ) : videoFile ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.primarySoft,
              }}
            >
              {videoFile.uploading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Ionicons
                  name={videoFile.failed ? 'alert-circle-outline' : 'film-outline'}
                  size={22}
                  color={videoFile.failed ? theme.danger : theme.primary}
                />
              )}
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Txt variant="bodyStrong" numberOfLines={1}>
                {videoFile.name}
              </Txt>
              <Txt
                variant="caption"
                color={videoFile.failed ? theme.danger : theme.textTertiary}
                style={{ marginTop: 2 }}
              >
                {videoFile.uploading
                  ? 'Uploading…'
                  : videoFile.failed
                    ? 'Upload failed'
                    : `Uploaded${videoFile.sizeMb ? ` · ${videoFile.sizeMb.toFixed(1)} MB` : ''}`}
              </Txt>
            </View>
            {videoFile.failed ? (
              <Pressable onPress={() => uploadVideo(videoFile)} hitSlop={8} style={{ padding: 6 }}>
                <Ionicons name="refresh" size={19} color={theme.primary} />
              </Pressable>
            ) : !videoFile.uploading ? (
              <Pressable onPress={chooseVideo} hitSlop={8} style={{ padding: 6 }}>
                <Ionicons name="swap-horizontal" size={19} color={theme.textSecondary} />
              </Pressable>
            ) : null}
            {!videoFile.uploading && (
              <Pressable
                onPress={() => onChange((p) => ({ ...p, videoFile: null }))}
                hitSlop={8}
                style={{ padding: 6 }}
                accessibilityLabel="Remove video"
              >
                <Ionicons name="trash-outline" size={19} color={theme.danger} />
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            onPress={chooseVideo}
            style={({ pressed }) => ({
              height: 96,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: theme.primary,
              backgroundColor: theme.primarySoft,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="videocam-outline" size={26} color={theme.primary} />
            <Txt variant="small" color={theme.primary} style={{ marginTop: 4, fontWeight: '700' }}>
              Choose a video from your device
            </Txt>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 2 }}>
              MP4, MOV or WebM · up to {MAX_VIDEO_MB} MB
            </Txt>
          </Pressable>
        )}
      </GlassCard>
    </>
  );
}

function OverlayButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: pressed ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)',
      })}
    >
      <Ionicons name={icon} size={14} color="#FFFFFF" />
      <Txt variant="caption" color="#FFFFFF" style={{ marginLeft: 5, fontWeight: '700' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

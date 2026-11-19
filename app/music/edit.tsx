import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { mediaApi, songsApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { AppImage } from '@/components/AppImage';
import { Button, Field, IconButton, LoadingState, Txt } from '@/components/ui';
import { FormSection, Notice } from '@/components/premium';
import { useDialog } from '@/components/Dialog';

/** Add a song, or edit / delete one when opened with `?id=`. */
export default function SongFormScreen() {
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { confirm, notify } = useDialog();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const existing = useApi(
    () => (id ? songsApi.get(id) : Promise.resolve(null)),
    [id],
    { enabled: isEdit },
  );

  const [movieTitle, setMovieTitle] = useState('');
  const [songName, setSongName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
  const [audioUploading, setAudioUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const s = existing.data;
    if (!s) return;
    setMovieTitle(s.movieTitle);
    setSongName(s.songName);
    setImageUrl(s.imageUrl || '');
    setAudioUrl(s.audioUrl || '');
    setAudioName(s.audioUrl ? 'Audio file attached' : '');
  }, [existing.data]);

  const save = useMutation(async (payload: Record<string, any>) =>
    isEdit ? songsApi.update(id!, payload) : songsApi.create(payload),
  );
  const remove = useMutation(async () => {
    await songsApi.remove(id!);
    return true;
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify({
        title: 'Permission needed',
        message: 'Allow photo access to add a song picture.',
        tone: 'info',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setLocalImage(asset.uri);
    setUploading(true);
    try {
      const uploaded = await mediaApi.upload(asset.uri, 'songs', {
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      setImageUrl(uploaded.mediaUrl);
    } catch {
      notify({ title: 'Upload failed', message: 'The image could not be uploaded.', tone: 'danger' });
      setLocalImage(null);
    } finally {
      setUploading(false);
    }
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setAudioUploading(true);
    try {
      const uploaded = await mediaApi.upload(asset.uri, 'songs-audio', {
        mimeType: asset.mimeType || 'audio/mpeg',
        fileName: asset.name,
      });
      setAudioUrl(uploaded.mediaUrl);
      setAudioName(asset.name);
      // Handy default: the file name is usually the song name.
      if (!songName.trim()) {
        setSongName(asset.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
      }
    } catch {
      notify({
        title: 'Upload failed',
        message: 'The audio file could not be uploaded. Files up to 50 MB are supported.',
        tone: 'danger',
      });
    } finally {
      setAudioUploading(false);
    }
  };

  const clearImage = () => {
    setLocalImage(null);
    setImageUrl('');
  };

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (!movieTitle.trim()) next.movieTitle = 'Enter the movie title';
    if (!songName.trim()) next.songName = 'Enter the song name';
    setErrors(next);
    if (Object.keys(next).length) return;

    const result = await save.mutate({
      movieTitle: movieTitle.trim(),
      songName: songName.trim(),
      imageUrl: imageUrl || null,
    });
    if (result) router.back();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete song',
      message: `Delete "${songName || 'this song'}"?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (ok && (await remove.mutate())) router.back();
  };

  if (isEdit && existing.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  const preview = localImage || imageUrl;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader
        title={isEdit ? 'Edit Song' : 'New Song'}
        subtitle={isEdit ? songName : 'Add a song to your music list'}
        showBack
        right={
          isEdit ? (
            <IconButton icon="trash-outline" color={theme.danger} onPress={handleDelete} />
          ) : undefined
        }
      />

      <FormSection icon="image-outline" title="Picture" subtitle="Optional: album or movie poster">
        <View style={{ alignItems: 'center' }}>
          <Pressable
            onPress={pickImage}
            disabled={uploading}
            style={({ pressed }) => ({
              width: 160,
              height: 160,
              borderRadius: radius.lg,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primarySoft,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {preview ? (
              <AppImage source={preview} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={30} color={theme.primary} />
                <Txt variant="small" color={theme.primary} style={{ marginTop: spacing.xs }}>
                  Choose image
                </Txt>
              </>
            )}
            {uploading && (
              <View
                style={{
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                }}
              >
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          </Pressable>

          {!!preview && !uploading && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button title="Change" icon="image-outline" size="sm" variant="glass" onPress={pickImage} />
              <Button title="Remove" icon="close" size="sm" variant="glass" onPress={clearImage} />
            </View>
          )}
        </View>
      </FormSection>

      <FormSection icon="musical-notes-outline" title="Song" subtitle="Movie and song name">
        <Field
          label="MOVIE TITLE *"
          value={movieTitle}
          onChangeText={setMovieTitle}
          placeholder="e.g. Rocky"
          icon="film-outline"
          error={errors.movieTitle}
        />
        <Field
          label="SONG NAME *"
          value={songName}
          onChangeText={setSongName}
          placeholder="e.g. Gonna Fly Now"
          icon="musical-note-outline"
          error={errors.songName}
          style={{ marginBottom: 0 }}
        />
      </FormSection>

      {!!(save.error || remove.error) && <Notice tone="danger" text={(save.error || remove.error)!} />}

      <Button
        title={isEdit ? 'Save changes' : 'Add song'}
        icon="checkmark"
        size="lg"
        fullWidth
        loading={save.loading}
        disabled={uploading}
        onPress={handleSave}
      />
    </Screen>
  );
}

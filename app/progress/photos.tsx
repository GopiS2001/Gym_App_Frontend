import React, { useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useApi, useMutation } from '@/hooks/useApi';
import { mediaApi, progressApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  LoadingState,
  Txt,
} from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import { DateField } from '@/components/DateField';
import { formatDate, todayIso } from '@/utils/format';
import type { ProgressPhoto } from '@/types/models';

const { width: SCREEN_W } = Dimensions.get('window');
const TILE = (SCREEN_W - 40 - 24) / 3;

const PHOTO_TYPES = [
  { value: '', label: 'All' },
  { value: 'FRONT', label: 'Front' },
  { value: 'SIDE', label: 'Side' },
  { value: 'BACK', label: 'Back' },
  { value: 'OTHER', label: 'Other' },
];

export default function PhotosScreen() {
  const { confirm, notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();

  const [photoType, setPhotoType] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any | null>(null);
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const photos = useApi(
    () => progressApi.photos({ photoType: photoType || undefined, limit: 60 }),
    [photoType],
    { refetchOnFocus: true },
  );

  const toggleCompare = async (id: string) => {
    const next = compareIds.includes(id)
      ? compareIds.filter((x) => x !== id)
      : [...compareIds, id].slice(-2);
    setCompareIds(next);

    if (next.length === 2) {
      const result = await progressApi.comparePhotos(next[0], next[1]).catch(() => null);
      if (result) setComparison(result);
    } else {
      setComparison(null);
    }
  };

  const remove = (photo: ProgressPhoto) => {
    confirm({
      title: 'Delete photo',
      message: 'This photo and its stored file will be removed.',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      await progressApi.removePhoto(photo.id).catch(() => undefined);
      setViewing(null);
      photos.refresh();
    });
  };

  return (
    <Screen withTabBar={false} scroll={false}>
      <ScreenHeader
        title="Transformation"
        subtitle={compareMode ? 'Pick two photos to compare' : 'Your dated progress photos'}
        showBack
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton
              icon="git-compare-outline"
              color={compareMode ? theme.primary : theme.text}
              onPress={() => {
                setCompareMode((v) => !v);
                setCompareIds([]);
                setComparison(null);
              }}
            />
            <IconButton icon="add" color={theme.primary} onPress={() => setShowUpload(true)} />
          </View>
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: spacing.md }}
      >
        {PHOTO_TYPES.map((option) => (
          <Chip
            key={option.label}
            label={option.label}
            selected={photoType === option.value}
            onPress={() => setPhotoType(option.value)}
          />
        ))}
      </ScrollView>

      {comparison && (
        <GlassCard variant="strong" style={{ marginBottom: spacing.base }} padded={false}>
          <View style={{ flexDirection: 'row' }}>
            {[comparison.before, comparison.after].map((photo: any, index: number) => (
              <View key={photo.id} style={{ flex: 1 }}>
                <View style={{ height: 230, backgroundColor: theme.surfaceMuted }}>
                  <Image
                    source={{ uri: photo.photoUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                  <View style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Badge label={index === 0 ? 'BEFORE' : 'AFTER'} color="#FFFFFF" />
                  </View>
                </View>
                <View style={{ padding: spacing.sm, alignItems: 'center' }}>
                  <Txt variant="caption" color={theme.textTertiary}>
                    {formatDate(photo.capturedDate, 'medium')}
                  </Txt>
                  {photo.weightKg != null && (
                    <Txt variant="small" style={{ fontWeight: '700' }}>
                      {photo.weightKg.toFixed(1)} kg
                    </Txt>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.lg,
              padding: spacing.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.divider,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Txt variant="bodyStrong">{comparison.daysBetween}</Txt>
              <Txt variant="caption" color={theme.textTertiary}>
                days apart
              </Txt>
            </View>
            {comparison.weightChangeKg != null && (
              <View style={{ alignItems: 'center' }}>
                <Txt variant="bodyStrong" color={theme.primary}>
                  {comparison.weightChangeKg >= 0 ? '+' : ''}
                  {comparison.weightChangeKg.toFixed(1)} kg
                </Txt>
                <Txt variant="caption" color={theme.textTertiary}>
                  weight change
                </Txt>
              </View>
            )}
          </View>
        </GlassCard>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {photos.loading ? (
          <LoadingState />
        ) : photos.error ? (
          <ErrorState message={photos.error} onRetry={photos.refetch} />
        ) : !photos.data?.items.length ? (
          <GlassCard>
            <EmptyState
              icon="camera-outline"
              title="No photos yet"
              message="Take a front, side and back photo today so you have a baseline."
              actionLabel="Add a photo"
              onAction={() => setShowUpload(true)}
            />
          </GlassCard>
        ) : (
          (photos.data.timeline || []).map((group: any) => (
            <View key={group.date} style={{ marginBottom: spacing.lg }}>
              <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
                {formatDate(group.date, 'long').toUpperCase()}
              </Txt>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                {group.photos.map((photo: ProgressPhoto) => {
                  const selectedIndex = compareIds.indexOf(photo.id);
                  return (
                    <Pressable
                      key={photo.id}
                      onPress={() =>
                        compareMode ? toggleCompare(photo.id) : setViewing(photo)
                      }
                      style={{ width: TILE }}
                    >
                      <View
                        style={{
                          height: TILE * 1.35,
                          borderRadius: radius.md,
                          overflow: 'hidden',
                          backgroundColor: theme.surfaceMuted,
                          borderWidth: selectedIndex >= 0 ? 2.5 : 0,
                          borderColor: theme.primary,
                        }}
                      >
                        <Image
                          source={{ uri: photo.photoUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          transition={200}
                        />

                        <View style={{ position: 'absolute', top: 6, left: 6 }}>
                          <Badge label={photo.photoType} color="#FFFFFF" size="sm" />
                        </View>

                        {selectedIndex >= 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: theme.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Txt variant="caption" color={theme.onPrimary} style={{ fontSize: 10 }}>
                              {selectedIndex + 1}
                            </Txt>
                          </View>
                        )}
                      </View>

                      {photo.weightKg != null && (
                        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 4 }}>
                          {photo.weightKg.toFixed(1)} kg
                        </Txt>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ---------------------------------------------------- viewer */}
      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(4,6,9,0.96)' }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: spacing.lg,
              paddingTop: spacing.xxl,
            }}
          >
            <IconButton icon="close" color="#FFFFFF" onPress={() => setViewing(null)} />
            <IconButton
              icon="trash-outline"
              color="#FF6B72"
              onPress={() => viewing && remove(viewing)}
            />
          </View>

          {viewing && (
            <>
              <Image
                source={{ uri: viewing.photoUrl }}
                style={{ flex: 1, margin: spacing.lg }}
                contentFit="contain"
              />
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Badge label={viewing.photoType} color={theme.primary} />
                <Txt variant="h4" color="#FFFFFF" style={{ marginTop: spacing.sm }}>
                  {formatDate(viewing.capturedDate, 'long')}
                </Txt>
                {viewing.weightKg != null && (
                  <Txt variant="body" color="rgba(255,255,255,0.7)">
                    {viewing.weightKg.toFixed(1)} kg
                  </Txt>
                )}
                {viewing.notes ? (
                  <Txt
                    variant="small"
                    color="rgba(255,255,255,0.6)"
                    align="center"
                    style={{ marginTop: spacing.sm }}
                  >
                    {viewing.notes}
                  </Txt>
                ) : null}
              </View>
            </>
          )}
        </View>
      </Modal>

      <UploadPhotoModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onSaved={() => {
          setShowUpload(false);
          photos.refresh();
        }}
      />
    </Screen>
  );
}

function UploadPhotoModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { theme, spacing, radius } = useTheme();

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoType, setPhotoType] = useState('FRONT');
  const [capturedDate, setCapturedDate] = useState(todayIso());
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setLocalUri(null);
    setPhotoUrl('');
    setPhotoType('FRONT');
    setCapturedDate(todayIso());
    setWeightKg('');
    setNotes('');
  }, [visible]);

  const pick = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      notify({
        title: 'Permission needed',
        message: 'Allow access to add a progress photo.',
        tone: 'info',
      });
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.75 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.75,
        });

    if (result.canceled || !result.assets[0]) return;

    setLocalUri(result.assets[0].uri);
    setUploading(true);
    try {
      const uploaded = await mediaApi.upload(result.assets[0].uri, 'progress');
      setPhotoUrl(uploaded.mediaUrl);
    } catch {
      notify({
        title: 'Upload failed',
        message: 'The photo could not be uploaded. Try again.',
        tone: 'info',
      });
      setLocalUri(null);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation(() =>
    progressApi.addPhoto({
      photoUrl,
      photoType,
      capturedDate,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      notes: notes.trim() || undefined,
    }),
  );

  const handleSave = async () => {
    if (!photoUrl) {
      notify({
        title: 'No photo',
        message: 'Choose or take a photo first.',
        tone: 'info',
      });
      return;
    }
    const result = await save.mutate();
    if (result) onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5,8,11,0.8)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <ScrollView
          style={{
            maxHeight: '88%',
            backgroundColor: theme.cardElevated,
            borderTopLeftRadius: radius.xxl,
            borderTopRightRadius: radius.xxl,
          }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.border,
              alignSelf: 'center',
              marginBottom: spacing.lg,
            }}
          />

          <Txt variant="h3" style={{ marginBottom: spacing.lg }}>
            Add progress photo
          </Txt>

          <View
            style={{
              height: 220,
              borderRadius: radius.lg,
              overflow: 'hidden',
              backgroundColor: theme.surfaceMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.base,
            }}
          >
            {localUri ? (
              <Image source={{ uri: localUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Ionicons name="image-outline" size={34} color={theme.textTertiary} />
            )}
            {uploading && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={28} color="#FFFFFF" />
                <Txt variant="small" color="#FFFFFF" style={{ marginTop: 6 }}>
                  Uploading…
                </Txt>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.base }}>
            <Button
              title="Camera"
              icon="camera-outline"
              variant="glass"
              style={{ flex: 1 }}
              onPress={() => pick(true)}
            />
            <Button
              title="Gallery"
              icon="images-outline"
              variant="glass"
              style={{ flex: 1 }}
              onPress={() => pick(false)}
            />
          </View>

          <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm }}>
            VIEW
          </Txt>
          <View style={{ flexDirection: 'row', marginBottom: spacing.base }}>
            {['FRONT', 'SIDE', 'BACK', 'OTHER'].map((type) => (
              <Chip
                key={type}
                label={type.charAt(0) + type.slice(1).toLowerCase()}
                selected={photoType === type}
                onPress={() => setPhotoType(type)}
              />
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <DateField
              label="DATE"
              value={capturedDate}
              onChange={setCapturedDate}
              maximumDate={new Date()}
              style={{ flex: 1 }}
            />
            <Field
              label="WEIGHT"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="—"
              suffix="kg"
              style={{ flex: 1 }}
            />
          </View>

          <Field
            label="NOTES"
            value={notes}
            onChangeText={setNotes}
            placeholder="How you felt, lighting, time of day…"
            multiline
          />

          {save.error && (
            <Txt variant="small" color={theme.danger} style={{ marginBottom: spacing.md }}>
              {save.error}
            </Txt>
          )}

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button title="Cancel" variant="glass" style={{ flex: 1 }} onPress={onClose} />
            <Button
              title="Save photo"
              style={{ flex: 1 }}
              loading={save.loading}
              disabled={uploading || !photoUrl}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

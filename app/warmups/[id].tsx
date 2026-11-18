import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { useApi } from '@/hooks/useApi';
import { warmupsApi } from '@/services/endpoints';
import { Screen } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Badge, Button, ErrorState, IconButton, LoadingState, Txt } from '@/components/ui';
import { useConfirm } from '@/components/Dialog';
import { ExerciseGallery } from '@/components/ExerciseGallery';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { IconWell } from '@/components/premium';
import { warmupAmount } from '@/utils/format';

/** One warm-up: banner, amount, notes, photos and video. */
export default function WarmupDetailScreen() {
  const { theme, spacing } = useTheme();
  useStatusBarStyle('light');
  const router = useRouter();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();

  const warmup = useApi(() => warmupsApi.get(id), [id], { refetchOnFocus: true });

  if (warmup.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (warmup.error || !warmup.data) {
    return (
      <Screen withTabBar={false}>
        <ErrorState message={warmup.error || 'Warm-up not found'} onRetry={warmup.refetch} />
      </Screen>
    );
  }

  const w = warmup.data;
  const accent = w.category?.colorHex || theme.primary;
  const images = w.imageUrls?.length ? w.imageUrls : w.imageUrl ? [w.imageUrl] : [];
  const heroImage = w.backgroundImageUrl || images[0];
  const amount = warmupAmount(w);

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete warm-up',
      message: `Delete "${w.name}"?`,
      tone: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    const done = await warmupsApi.remove(w.id).catch(() => null);
    if (done) router.back();
  };

  return (
    <Screen withTabBar={false} padded={false}>
      {/* ----------------------------------------------------------- hero */}
      <View style={{ height: 250, marginBottom: spacing.base }}>
        {heroImage ? (
          <Image source={{ uri: heroImage }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        ) : (
          <LinearGradient colors={['#2B4A80', '#16294D', '#0A1630']} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={['rgba(10,22,48,0.55)', 'rgba(10,22,48,0.2)', theme.background]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
          }}
        >
          <IconButton icon="chevron-back" color="#FFFFFF" onPress={() => router.back()} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton
              icon="create-outline"
              color="#FFFFFF"
              onPress={() => router.push({ pathname: '/warmups/create', params: { id: w.id } })}
            />
            <IconButton icon="trash-outline" color="#FFFFFF" onPress={handleDelete} />
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}>
            <Badge label={w.category?.name?.toUpperCase() || 'GENERAL'} color={w.category ? accent : '#FFFFFF'} />
          </View>
          <Txt variant="h1" color="#FFFFFF">
            {w.name}
          </Txt>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* -------------------------------------------------- amount */}
        {!!amount && (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconWell icon="timer-outline" size={44} />
              <View style={{ marginLeft: spacing.md }}>
                <Txt variant="caption" color={theme.textTertiary}>
                  DO THIS FOR
                </Txt>
                <Txt variant="h4" style={{ marginTop: 2 }}>
                  {amount}
                </Txt>
              </View>
            </View>
          </GlassCard>
        )}

        {/* --------------------------------------------------- notes */}
        {!!w.description && (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <CardTitle icon="reader-outline" title="How to do it" />
            <Txt variant="body" color={theme.textSecondary}>
              {w.description}
            </Txt>
          </GlassCard>
        )}

        {/* ------------------------------------------------- gallery */}
        {images.length > 0 && (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <CardTitle
              icon="images-outline"
              title="Photos"
              meta={`${images.length} ${images.length === 1 ? 'photo' : 'photos'}`}
            />
            <ExerciseGallery images={images} />
          </GlassCard>
        )}

        {/* --------------------------------------------------- video */}
        {w.videoUrl ? (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <CardTitle icon="play-circle-outline" title="Video" />
            <ExerciseVideo url={w.videoUrl} />
          </GlassCard>
        ) : null}

        {!images.length && !w.videoUrl && (
          <Button
            title="Add photos or a video"
            icon="images-outline"
            variant="glass"
            fullWidth
            onPress={() => router.push({ pathname: '/warmups/create', params: { id: w.id } })}
            style={{ marginBottom: spacing.base }}
          />
        )}
      </View>
    </Screen>
  );
}

function CardTitle({
  icon,
  title,
  meta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta?: string;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
      <Ionicons name={icon} size={17} color={theme.primary} />
      <Txt variant="h4" style={{ marginLeft: 7, flex: 1 }}>
        {title}
      </Txt>
      {!!meta && (
        <Txt variant="caption" color={theme.textTertiary}>
          {meta}
        </Txt>
      )}
    </View>
  );
}

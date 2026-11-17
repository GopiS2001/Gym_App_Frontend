import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useStatusBarStyle } from '@/hooks/useStatusBarStyle';
import { useApi } from '@/hooks/useApi';
import { exercisesApi } from '@/services/endpoints';
import { Screen } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  SectionHeader,
  Txt,
} from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import { ExerciseGallery } from '@/components/ExerciseGallery';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { LineChart } from '@/components/charts';
import { DIFFICULTY_LABELS, formatDate, formatRelativeDate } from '@/utils/format';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ExerciseDetailScreen() {
  const { confirm, notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  useStatusBarStyle('light');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const exercise = useApi(() => exercisesApi.get(id), [id], { refetchOnFocus: true });

  const toggleFavourite = async () => {
    await exercisesApi.toggleFavourite(id).catch(() => undefined);
    exercise.refresh();
  };

  const remove = () => {
    confirm({
      title: 'Delete exercise',
      message: 'Remove this exercise from your library?',
      tone: 'danger',
      confirmLabel: 'Delete',
    }).then(async (ok) => {
      if (!ok) return;
      const result = await exercisesApi.remove(id).catch(() => null);
      if (result?.softDeleted) {
        notify({
          title: 'Archived instead',
          message: 'This exercise appears in recorded workouts, so it was archived to keep your history intact.',
          tone: 'info',
        });
      }
      router.back();
    });
  };

  if (exercise.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  if (exercise.error || !exercise.data) {
    return (
      <Screen withTabBar={false}>
        <ErrorState message={exercise.error || 'Not found'} onRetry={exercise.refetch} />
      </Screen>
    );
  }

  const e = exercise.data;
  const accent = e.category?.colorHex || theme.primary;
  const secondary = Array.isArray(e.secondaryMuscles) ? e.secondaryMuscles : [];
  // Older exercises only have a single cover image.
  const images = e.imageUrls?.length ? e.imageUrls : e.imageUrl ? [e.imageUrl] : [];
  // The banner uses its own background image, else the first gallery image.
  const heroImage = e.backgroundImageUrl || images[0];

  const chartPoints = (e.history || [])
    .slice()
    .reverse()
    .map((h) => ({ date: h.sessionDate.slice(0, 10), value: h.bestWeightKg }));

  return (
    <Screen withTabBar={false} padded={false}>
      {/* ------------------------------------------------------- hero */}
      <View style={{ height: 250, marginBottom: spacing.base }}>
        {heroImage ? (
          <Image
            source={{ uri: heroImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <LinearGradient colors={[accent, `${accent}55`]} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={['rgba(7,10,14,0.55)', 'rgba(7,10,14,0.2)', theme.background]}
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
              icon={e.isFavourite ? 'heart' : 'heart-outline'}
              color={e.isFavourite ? '#FF6B72' : '#FFFFFF'}
              onPress={toggleFavourite}
            />
            <IconButton
              icon="create-outline"
              color="#FFFFFF"
              onPress={() => router.push(`/exercises/create?id=${id}`)}
            />
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Badge label={e.category?.name?.toUpperCase() || 'OTHER'} color={accent} />
            <Badge
              label={DIFFICULTY_LABELS[e.difficultyLevel] || e.difficultyLevel}
              color="#FFFFFF"
            />
            {e.isCustom && <Badge label="CUSTOM" color={theme.streak} />}
          </View>
          <Txt variant="h1" color="#FFFFFF">
            {e.name}
          </Txt>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* ---------------------------------------------------- facts */}
        <GlassCard variant="strong" style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row' }}>
            <Fact icon="body-outline" label="Target" value={e.targetMuscle || '—'} />
            <Fact icon="fitness-outline" label="Equipment" value={e.equipment || 'Bodyweight'} />
            {e.caloriesPerMin ? (
              <Fact icon="flame-outline" label="Burn" value={`${e.caloriesPerMin}/min`} />
            ) : null}
          </View>

          {secondary.length > 0 && (
            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.divider,
              }}
            >
              <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: 6 }}>
                ALSO WORKS
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {secondary.map((muscle: string) => (
                  <View
                    key={muscle}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: radius.pill,
                      backgroundColor: theme.surfaceMuted,
                    }}
                  >
                    <Txt variant="caption" color={theme.textSecondary}>
                      {muscle}
                    </Txt>
                  </View>
                ))}
              </View>
            </View>
          )}
        </GlassCard>

        {/* ---------------------------------------------------- gallery */}
        {images.length > 0 && (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <CardTitle
              icon="images-outline"
              title="Gallery"
              meta={`${images.length} ${images.length === 1 ? 'photo' : 'photos'}`}
            />
            <ExerciseGallery images={images} />
          </GlassCard>
        )}

        {/* ------------------------------------------------------ video */}
        {e.videoUrl ? (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <CardTitle icon="play-circle-outline" title="Demonstration" />
            <ExerciseVideo url={e.videoUrl} />
          </GlassCard>
        ) : null}

        {/* ------------------------------------------------- personal best */}
        {e.personalRecord && (
          <GlassCard glowColor={theme.streak} style={{ marginBottom: spacing.base }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.streakSoft,
                }}
              >
                <Ionicons name="trophy" size={21} color={theme.streak} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Txt variant="caption" color={theme.textTertiary}>
                  PERSONAL RECORD
                </Txt>
                <Txt variant="h3" color={theme.streak}>
                  {e.personalRecord.weightKg} kg × {e.personalRecord.reps}
                </Txt>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Txt variant="caption" color={theme.textTertiary}>
                  EST. 1RM
                </Txt>
                <Txt variant="h4">{e.personalRecord.estimatedOneRepMaxKg} kg</Txt>
              </View>
            </View>
          </GlassCard>
        )}

        {/* --------------------------------------------------- progress */}
        {chartPoints.length > 1 && (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <Txt variant="h4" style={{ marginBottom: spacing.md }}>
              Weight Progression
            </Txt>
            <LineChart
              points={chartPoints}
              width={SCREEN_W - 40 - 32}
              height={160}
              color={accent}
              unit="kg"
            />
          </GlassCard>
        )}

        {/* ----------------------------------------------- instructions */}
        {e.instructions ? (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <Txt variant="h4" style={{ marginBottom: spacing.md }}>
              How to perform
            </Txt>
            {e.instructions.split('\n').map((line, index) => {
              const text = line.replace(/^\d+\.\s*/, '').trim();
              if (!text) return null;
              return (
                <View key={index} style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${accent}22`,
                      marginRight: spacing.md,
                      marginTop: 1,
                    }}
                  >
                    <Txt variant="caption" color={accent}>
                      {index + 1}
                    </Txt>
                  </View>
                  <Txt variant="small" color={theme.textSecondary} style={{ flex: 1, lineHeight: 21 }}>
                    {text}
                  </Txt>
                </View>
              );
            })}
          </GlassCard>
        ) : null}

        {e.description ? (
          <GlassCard style={{ marginBottom: spacing.base }}>
            <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: 5 }}>
              ABOUT
            </Txt>
            <Txt variant="small" color={theme.textSecondary} style={{ lineHeight: 21 }}>
              {e.description}
            </Txt>
          </GlassCard>
        ) : null}

        {/* -------------------------------------------------- history */}
        <SectionHeader title="Your History" />
        {!e.history?.length ? (
          <GlassCard>
            <EmptyState
              icon="stats-chart-outline"
              title="Not performed yet"
              message="Record this exercise in a workout and your sets will appear here."
            />
          </GlassCard>
        ) : (
          e.history.map((entry, index) => (
            <GlassCard
              key={`${entry.sessionId}-${index}`}
              style={{ marginBottom: spacing.base }}
              onPress={() => router.push(`/workout/summary?id=${entry.sessionId}`)}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Txt variant="small" style={{ fontWeight: '700' }}>
                  {formatRelativeDate(entry.sessionDate)}
                </Txt>
                <Txt variant="caption" color={accent}>
                  {entry.totalVolumeKg} kg volume
                </Txt>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {entry.sets.map((set) => (
                  <View
                    key={set.setNumber}
                    style={{
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: radius.xs,
                      backgroundColor: theme.surfaceMuted,
                    }}
                  >
                    <Txt variant="caption" color={theme.textSecondary}>
                      {set.reps} × {set.weightKg}kg
                    </Txt>
                  </View>
                ))}
              </View>
            </GlassCard>
          ))
        )}

        <Button
          title="Delete exercise"
          icon="trash-outline"
          variant="glass"
          fullWidth
          style={{ marginTop: spacing.base, marginBottom: insets.bottom + spacing.lg }}
          onPress={remove}
        />
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

function Fact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { theme, spacing } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Ionicons name={icon} size={17} color={theme.textTertiary} />
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 4 }}>
        {label}
      </Txt>
      <Txt variant="small" style={{ fontWeight: '700', marginTop: 2 }} numberOfLines={1} align="center">
        {value}
      </Txt>
    </View>
  );
}

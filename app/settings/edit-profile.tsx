import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppImage as Image } from '@/components/AppImage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/AuthContext';
import { useApi, useMutation } from '@/hooks/useApi';
import { mediaApi, profileApi } from '@/services/endpoints';
import { Screen, ScreenHeader } from '@/components/Screen';
import { GlassCard } from '@/components/Glass';
import { Button, Chip, Field, LoadingState, Txt } from '@/components/ui';
import { useDialog } from '@/components/Dialog';
import { DateField, yearsAgo } from '@/components/DateField';

const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNSPECIFIED', label: 'Prefer not to say' },
];

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ATHLETE', label: 'Athlete' },
];

export default function EditProfileScreen() {
  const { notify } = useDialog();
  const { theme, spacing, radius } = useTheme();
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const profile = useApi(() => profileApi.get(), []);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('UNSPECIFIED');
  const [heightCm, setHeightCm] = useState('');
  const [currentWeightKg, setCurrentWeightKg] = useState('');
  const [gymJoiningDate, setGymJoiningDate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setFullName(p.fullName || '');
    setDateOfBirth(p.dateOfBirth?.slice(0, 10) || '');
    setGender(p.gender || 'UNSPECIFIED');
    setHeightCm(p.heightCm != null ? String(p.heightCm) : '');
    setCurrentWeightKg(p.currentWeightKg != null ? String(p.currentWeightKg) : '');
    setGymJoiningDate(p.gymJoiningDate?.slice(0, 10) || '');
    setExperienceLevel(p.experienceLevel || 'BEGINNER');
    setPhone(p.phone || '');
    setNotes(p.notes || '');
    setProfileImageUrl(p.profileImageUrl || '');
  }, [profile.data]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify({
        title: 'Permission needed',
        message: 'Allow photo access to set a profile picture.',
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

    if (result.canceled || !result.assets[0]) return;

    setLocalImage(result.assets[0].uri);
    setUploading(true);
    try {
      const uploaded = await mediaApi.upload(result.assets[0].uri, 'avatars');
      setProfileImageUrl(uploaded.mediaUrl);
    } catch {
      notify({
        title: 'Upload failed',
        message: 'The image could not be uploaded.',
        tone: 'info',
      });
      setLocalImage(null);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation(() =>
    profileApi.update({
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth || undefined,
      gender,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      currentWeightKg: currentWeightKg ? parseFloat(currentWeightKg) : undefined,
      gymJoiningDate: gymJoiningDate || undefined,
      experienceLevel,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      profileImageUrl: profileImageUrl || undefined,
    } as any),
  );

  const handleSave = async () => {
    // The pickers can only produce valid dates within their bounds, so the
    // only thing left to check here is the name.
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) nextErrors.fullName = 'Enter your name';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const result = await save.mutate();
    if (result) {
      await refreshProfile();
      router.back();
    }
  };

  if (profile.loading) {
    return (
      <Screen withTabBar={false}>
        <LoadingState />
      </Screen>
    );
  }

  const preview = localImage || profileImageUrl;

  return (
    <Screen withTabBar={false}>
      <ScreenHeader title="Edit Profile" subtitle="Your personal details" showBack />

      {/* avatar */}
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Pressable onPress={pickImage}>
          <View
            style={{
              width: 108,
              height: 108,
              borderRadius: 34,
              overflow: 'hidden',
              borderWidth: 2.5,
              borderColor: theme.primary,
              backgroundColor: theme.surfaceMuted,
            }}
          >
            {preview ? (
              <Image source={{ uri: preview }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={44} color={theme.textTertiary} />
              </View>
            )}
            {uploading && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.primary,
              borderWidth: 3,
              borderColor: theme.background,
            }}
          >
            <Ionicons name="camera" size={14} color={theme.onPrimary} />
          </View>
        </Pressable>

        <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: spacing.sm }}>
          Tap to change your photo
        </Txt>
      </View>

      <Field
        label="FULL NAME *"
        value={fullName}
        onChangeText={setFullName}
        placeholder="Your name"
        icon="person-outline"
        error={errors.fullName}
      />

      <Field
        label="EMAIL"
        value={profile.data?.email || ''}
        onChangeText={() => undefined}
        editable={false}
        icon="mail-outline"
      />

      <Field
        label="PHONE"
        value={phone}
        onChangeText={setPhone}
        placeholder="Optional"
        keyboardType="default"
        icon="call-outline"
      />

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Field
          label="HEIGHT"
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          placeholder="175"
          suffix="cm"
          style={{ flex: 1 }}
        />
        <Field
          label="WEIGHT"
          value={currentWeightKg}
          onChangeText={setCurrentWeightKg}
          keyboardType="decimal-pad"
          placeholder="72.5"
          suffix="kg"
          style={{ flex: 1 }}
        />
      </View>

      <DateField
        label="DATE OF BIRTH"
        value={dateOfBirth}
        onChange={setDateOfBirth}
        placeholder="Select your date of birth"
        icon="calendar-outline"
        clearable
        // Nobody is unborn or over 120; this also opens the picker on a
        // plausible year instead of today.
        minimumDate={yearsAgo(120)}
        maximumDate={yearsAgo(10)}
        error={errors.dateOfBirth}
      />

      <DateField
        label="GYM JOINING DATE"
        value={gymJoiningDate}
        onChange={setGymJoiningDate}
        placeholder="When did you join?"
        icon="barbell-outline"
        clearable
        minimumDate={yearsAgo(50)}
        maximumDate={new Date()}
        error={errors.gymJoiningDate}
      />

      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
        GENDER
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: spacing.sm,
          marginBottom: spacing.base,
        }}
      >
        {GENDERS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={gender === g.value}
            onPress={() => setGender(g.value)}
          />
        ))}
      </View>

      <Txt variant="caption" color={theme.textTertiary} style={{ marginBottom: spacing.sm, marginLeft: 2 }}>
        EXPERIENCE LEVEL
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          rowGap: spacing.sm,
          marginBottom: spacing.base,
        }}
      >
        {LEVELS.map((level) => (
          <Chip
            key={level.value}
            label={level.label}
            selected={experienceLevel === level.value}
            onPress={() => setExperienceLevel(level.value)}
          />
        ))}
      </View>

      <Field
        label="NOTES"
        value={notes}
        onChangeText={setNotes}
        placeholder="Injuries, preferences, anything worth remembering"
        multiline
      />

      {profile.data?.bmi != null && (
        <GlassCard variant="subtle" style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row' }}>
            <Metric label="BMI" value={String(profile.data.bmi)} />
            <Metric label="Category" value={profile.data.bmiCategory || '--'} />
            <Metric label="Age" value={profile.data.age != null ? String(profile.data.age) : '--'} />
            {profile.data.bmr != null && (
              <Metric label="BMR" value={`${profile.data.bmr}`} />
            )}
          </View>
          <Txt variant="caption" color={theme.textTertiary} align="center" style={{ marginTop: spacing.sm }}>
            BMI and BMR are calculated by the server from your height, weight and age.
          </Txt>
        </GlassCard>
      )}

      {save.error && (
        <GlassCard style={{ marginBottom: spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={17} color={theme.danger} />
            <Txt variant="small" color={theme.danger} style={{ flex: 1, marginLeft: spacing.sm }}>
              {save.error}
            </Txt>
          </View>
        </GlassCard>
      )}

      <Button
        title="Save profile"
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

function Metric({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt variant="bodyStrong" numberOfLines={1}>
        {value}
      </Txt>
      <Txt variant="caption" color={theme.textTertiary} style={{ marginTop: 1 }}>
        {label}
      </Txt>
    </View>
  );
}

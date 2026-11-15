import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/store/AuthContext';
import { Button, Field, Txt } from '@/components/ui';
import { API_BASE_URL, wakeServer } from '@/services/api';

const { height: SCREEN_H } = Dimensions.get('window');

/**
 * Welcome / sign-in screen.
 *
 * Layout follows the glassmorphism welcome-screen reference: a full-bleed
 * photograph, a dark scrim for legibility, a brand mark and oversized
 * headline up top, and a frosted card carrying the form at the bottom.
 */
export default function LoginScreen() {
  const { theme, spacing, radius } = useTheme();
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('gopis2k01@gmail.com');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [showDebug, setShowDebug] = useState(false);
  // True while the free-plan server is starting up after sleeping.
  const [waking, setWaking] = useState(false);

  // Start waking the server as soon as the screen opens, so it is usually
  // ready by the time the password is typed.
  useEffect(() => {
    let active = true;
    wakeServer(() => active && setWaking(true)).finally(() => active && setWaking(false));
    return () => {
      active = false;
    };
  }, []);

  // Entrance animation: the card rises as the headline fades in.
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Enter your email address';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = 'That email address does not look right';
    if (!password) errors.password = 'Enter your password';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async () => {
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const up = await wakeServer(() => setWaking(true));
      setWaking(false);
      if (!up) {
        setError('The server is not responding right now. Please try again in a minute.');
        return;
      }
      await signIn(email, password);
      // Navigation is handled by the root layout once the session is set.
    } catch (e: any) {
      setError(e?.message || 'Could not sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#07090C' }}>
      <ImageBackground
        source={require('../../assets/images/auth-background.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* Scrim: keeps the headline readable over any part of the photo. */}
        <LinearGradient
          colors={[
            'rgba(7,9,12,0.35)',
            'rgba(7,9,12,0.55)',
            'rgba(7,9,12,0.92)',
            '#07090C',
          ]}
          locations={[0, 0.35, 0.72, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* A mint wash in the corner ties the photo to the app accent. */}
        <LinearGradient
          colors={['rgba(47,198,149,0.22)', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ---------------------------------------------------- top bar */}
          <View
            style={{
              paddingTop: insets.top + spacing.md,
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: 'rgba(255,255,255,0.22)',
                }}
              >
                <Ionicons name="barbell" size={18} color="#FFFFFF" />
              </View>
              <Txt variant="bodyStrong" color="#FFFFFF" style={{ marginLeft: spacing.sm }}>
                Personal Gym
              </Txt>
            </View>

            <Pressable onLongPress={() => setShowDebug((v) => !v)} hitSlop={12}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#5CD9AE',
                    marginRight: 6,
                  }}
                />
                <Txt variant="caption" color="rgba(255,255,255,0.86)">
                  Private
                </Txt>
              </View>
            </Pressable>
          </View>

          {/* --------------------------------------------------- headline */}
          <Animated.View
            style={{
              paddingHorizontal: spacing.lg,
              marginTop: SCREEN_H * 0.07,
              opacity: fade,
              transform: [{ translateY: slide }],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                paddingHorizontal: spacing.md,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(92,217,174,0.18)',
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: 'rgba(92,217,174,0.35)',
                marginBottom: spacing.base,
              }}
            >
              <Ionicons name="flame" size={12} color="#5CD9AE" />
              <Txt variant="caption" color="#8FE8C8" style={{ marginLeft: 5 }}>
                YOUR TRAINING, TRACKED
              </Txt>
            </View>

            <Txt variant="display" color="#FFFFFF" style={{ marginBottom: spacing.sm }}>
              Welcome back
            </Txt>
            <Txt
              variant="body"
              color="rgba(255,255,255,0.68)"
              style={{ maxWidth: 300, lineHeight: 23 }}
            >
              Sign in to pick up your plan, log every set and watch the numbers move.
            </Txt>
          </Animated.View>

          <View style={{ flex: 1, minHeight: spacing.xl }} />

          {/* ------------------------------------------------- glass form */}
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
              marginHorizontal: spacing.base,
              marginBottom: insets.bottom + spacing.lg,
            }}
          >
            <View
              style={{
                borderRadius: radius.xxl,
                overflow: 'hidden',
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: 'rgba(255,255,255,0.16)',
                backgroundColor:
                  Platform.OS === 'ios' ? 'rgba(255,255,255,0.06)' : 'rgba(18,24,31,0.88)',
                shadowColor: '#000',
                shadowOpacity: 0.4,
                shadowRadius: 30,
                shadowOffset: { width: 0, height: 16 },
                elevation: 16,
              }}
            >
              {Platform.OS === 'ios' && (
                <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}
              />

              <View style={{ padding: spacing.lg }}>
                <Txt variant="h3" color="#FFFFFF" style={{ marginBottom: spacing.xs }}>
                  Sign in
                </Txt>
                <Txt
                  variant="small"
                  color="rgba(255,255,255,0.55)"
                  style={{ marginBottom: spacing.lg }}
                >
                  This account is private to you.
                </Txt>

                <Field
                  label="EMAIL"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                  error={fieldErrors.email}
                />

                <Field
                  label="PASSWORD"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  icon="lock-closed-outline"
                  error={fieldErrors.password}
                  onSubmitEditing={handleSignIn}
                />

                {!!error && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      padding: spacing.md,
                      borderRadius: radius.md,
                      backgroundColor: 'rgba(255,107,114,0.14)',
                      borderWidth: StyleSheet.hairlineWidth * 2,
                      borderColor: 'rgba(255,107,114,0.3)',
                      marginBottom: spacing.base,
                    }}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={17}
                      color="#FF8A8F"
                      style={{ marginRight: spacing.sm, marginTop: 1 }}
                    />
                    <Txt variant="small" color="#FFB3B6" style={{ flex: 1 }}>
                      {error}
                    </Txt>
                  </View>
                )}

                {waking && !error && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.md,
                      borderRadius: radius.md,
                      backgroundColor: 'rgba(62,207,142,0.12)',
                      borderWidth: StyleSheet.hairlineWidth * 2,
                      borderColor: 'rgba(62,207,142,0.3)',
                      marginBottom: spacing.base,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color="#6EE7B7"
                      style={{ marginRight: spacing.sm }}
                    />
                    <Txt variant="small" color="#A7F3D0" style={{ flex: 1 }}>
                      Waking up the server… this can take up to a minute.
                    </Txt>
                  </View>
                )}

                <Button
                  title="Sign in"
                  onPress={handleSignIn}
                  loading={submitting}
                  size="lg"
                  fullWidth
                  iconRight="arrow-forward"
                />

                {showDebug && (
                  <View
                    style={{
                      marginTop: spacing.base,
                      padding: spacing.md,
                      borderRadius: radius.sm,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                    }}
                  >
                    <Txt variant="caption" color="rgba(255,255,255,0.5)">
                      API endpoint
                    </Txt>
                    <Txt variant="small" color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>
                      {API_BASE_URL}
                    </Txt>
                  </View>
                )}
              </View>
            </View>

            <Txt
              variant="caption"
              color="rgba(255,255,255,0.35)"
              align="center"
              style={{ marginTop: spacing.base }}
            >
              Personal Gym · Private account · No public sign-up
            </Txt>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

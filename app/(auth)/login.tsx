import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
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
 * Layout follows the premium light reference: a deep-navy header carrying
 * the brand and a two-tone headline over a faded training photo, and a white
 * 3D card holding the form that overlaps the header's rounded bottom edge.
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
          {/* ------------------------------------------------ navy header */}
          <View
            style={{
              minHeight: SCREEN_H * 0.46,
              borderBottomLeftRadius: 36,
              borderBottomRightRadius: 36,
              overflow: 'hidden',
              paddingTop: insets.top + spacing.md,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.huge,
            }}
          >
            <LinearGradient
              colors={['#2B4A80', '#16294D', '#0A1630']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* The training photo, faded into the navy for texture. */}
            <Image
              source={require('../../assets/images/auth-background.jpg')}
              style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(10,22,48,0.1)', 'rgba(10,22,48,0.85)']}
              style={StyleSheet.absoluteFill}
            />
            {/* Soft light bloom for depth. */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -90,
                right: -70,
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: 'rgba(169,195,240,0.07)',
              }}
            />

            {/* Top bar */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    borderWidth: StyleSheet.hairlineWidth * 2,
                    borderColor: 'rgba(255,255,255,0.2)',
                    boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.25)',
                  }}
                >
                  <Ionicons name="barbell" size={19} color="#FFFFFF" />
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
                  <Ionicons name="lock-closed" size={11} color="#A9C3F0" style={{ marginRight: 5 }} />
                  <Txt variant="caption" color="rgba(255,255,255,0.86)">
                    Private
                  </Txt>
                </View>
              </Pressable>
            </View>

            {/* Headline */}
            <Animated.View
              style={{
                marginTop: SCREEN_H * 0.07,
                opacity: fade,
                transform: [{ translateY: slide }],
              }}
            >
              <Txt variant="caption" color="#A9C3F0" style={{ marginBottom: spacing.sm, letterSpacing: 1.2 }}>
                YOUR TRAINING, TRACKED
              </Txt>
              <Txt variant="display" color="#FFFFFF">
                Welcome
              </Txt>
              <Txt variant="display" color="#A9C3F0" style={{ marginBottom: spacing.md }}>
                back
              </Txt>
              <Txt
                variant="body"
                color="rgba(255,255,255,0.7)"
                style={{ maxWidth: 300, lineHeight: 22 }}
              >
                Sign in to pick up your plan, log every set and watch the numbers move.
              </Txt>
            </Animated.View>
          </View>

          {/* ------------------------------------------------- form card */}
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
              marginHorizontal: spacing.base,
              marginTop: -spacing.xxxl,
              marginBottom: insets.bottom + spacing.lg,
            }}
          >
            <View
              style={{
                borderRadius: radius.xxl,
                backgroundColor: theme.card,
                borderWidth: StyleSheet.hairlineWidth * 2,
                borderColor: theme.glassBorder,
                boxShadow: theme.elevation.raised,
                padding: spacing.lg,
              }}
            >
              <Txt variant="h3" style={{ marginBottom: spacing.xs }}>
                Sign in
              </Txt>
              <Txt variant="small" color={theme.textTertiary} style={{ marginBottom: spacing.lg }}>
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
                    backgroundColor: theme.dangerSoft,
                    marginBottom: spacing.base,
                  }}
                >
                  <Ionicons
                    name="alert-circle"
                    size={17}
                    color={theme.danger}
                    style={{ marginRight: spacing.sm, marginTop: 1 }}
                  />
                  <Txt variant="small" color={theme.danger} style={{ flex: 1 }}>
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
                    backgroundColor: theme.primarySoft,
                    marginBottom: spacing.base,
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color={theme.primary}
                    style={{ marginRight: spacing.sm }}
                  />
                  <Txt variant="small" color={theme.primary} style={{ flex: 1 }}>
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
                    backgroundColor: theme.surfaceMuted,
                  }}
                >
                  <Txt variant="caption" color={theme.textTertiary}>
                    API endpoint
                  </Txt>
                  <Txt variant="small" color={theme.textSecondary} style={{ marginTop: 2 }}>
                    {API_BASE_URL}
                  </Txt>
                </View>
              )}
            </View>

            <Txt
              variant="caption"
              color={theme.textTertiary}
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

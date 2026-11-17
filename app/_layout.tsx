import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AuthProvider, useAuth } from '@/store/AuthContext';
import { DialogProvider } from '@/components/Dialog';
import { LoadingState } from '@/components/ui';
import { ScreenGradient } from '@/components/Glass';
import { useReminderSync } from '@/hooks/useReminderSync';
import { NOTIFICATIONS_SUPPORTED } from '@/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Sends the user to the login screen or into the app as the session changes. */
function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const { theme, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Meal reminders: schedule while signed in and open the right screen on tap.
  useReminderSync(isAuthenticated && !isLoading && NOTIFICATIONS_SUPPORTED);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync().catch(() => undefined);

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
        <ScreenGradient>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <LoadingState message="Loading your gym" />
          </View>
        </ScreenGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        id={undefined}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="workout/active"
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* Dialogs sit above the navigator so any screen can raise one. */}
          <DialogProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </DialogProvider>
          {/* Save / update / delete confirmations, above every screen. */}
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

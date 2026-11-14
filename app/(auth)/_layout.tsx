import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack id={undefined} screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}

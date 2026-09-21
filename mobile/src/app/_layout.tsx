import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth';
import { resolveAuthRedirect } from '@/lib/auth-redirect';

SplashScreen.preventAutoHideAsync();

/** Sends logged-out users to /welcome and logged-in users into /(tabs). */
function AuthRedirect() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const target = resolveAuthRedirect({ signedIn: !!user, loading, segments });
    if (target) router.replace(target);
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        {/* The app is light-only: dark clock, battery and signal icons on every page by default. */}
        <StatusBar style="dark" />
        <AnimatedSplashOverlay />
        <AuthRedirect />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="register" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="security" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="new-business" />
          <Stack.Screen name="new-offering" />
          <Stack.Screen name="verify-business" />
          <Stack.Screen name="conversation/[id]" />
          <Stack.Screen name="business/[id]" />
          <Stack.Screen name="offering/[id]" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

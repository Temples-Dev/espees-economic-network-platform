import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

/** Sends logged-out users to /sign-in and logged-in users into /(tabs). */
function AuthRedirect() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inTabs = segments[0] === '(tabs)';
    if (!user && inTabs) {
      router.replace('/sign-in');
    } else if (user && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DefaultTheme}>
        <AnimatedSplashOverlay />
        <AuthRedirect />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sign-in" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}

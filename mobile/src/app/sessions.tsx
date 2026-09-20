import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Session } from '@/lib/types';

export default function SessionsScreen() {
  const { user, loading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await api.get<{ sessions: Session[] }>('/api/v1/auth/sessions/');
      setSessions(data.sessions);
    } catch (err) {
      setError(errorMessage(err, 'Could not load sessions.'));
    } finally {
      setFetching(false);
    }
  }, []);

  // Refetch every time the tab regains focus: a new-device sign-in elsewhere
  // should show up here as soon as the member returns.
  useFocusEffect(
    useCallback(() => {
      if (user) void load();
    }, [user, load]),
  );

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Sessions</ThemedText>
        <ThemedText themeColor="textSecondary">Sign in to review your sign-in activity.</ThemedText>
        <Link href="/" asChild>
          <Pressable>
            <ThemedText type="linkPrimary">Go to sign-in</ThemedText>
          </Pressable>
        </Link>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Sessions</ThemedText>
        <ThemedText themeColor="textSecondary">
          Recent successful sign-ins. Anything unfamiliar here means someone else may have your
          password — change it from the Account tab.
        </ThemedText>
        {fetching && sessions.length === 0 ? (
          <ActivityIndicator />
        ) : error ? (
          <>
            <ThemedText style={styles.error}>{error}</ThemedText>
            <Pressable onPress={() => void load()}>
              <ThemedText type="linkPrimary">Retry</ThemedText>
            </Pressable>
          </>
        ) : sessions.length === 0 ? (
          <ThemedText themeColor="textSecondary">No sign-in activity yet.</ThemedText>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sessions.map((s, i) => (
              <ThemedView key={`${s.device_key}-${s.created_at}-${i}`} type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">
                  Device {s.device_key ? s.device_key.slice(0, 12) : 'unknown'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {s.ip_address ?? 'unknown IP'} ·{' '}
                  {new Date(s.created_at).toLocaleString()}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {s.user_agent || 'unknown browser'}
                </ThemedText>
              </ThemedView>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  error: {
    color: '#c0392b',
  },
});

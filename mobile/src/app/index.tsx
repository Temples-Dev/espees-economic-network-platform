import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function HomeScreen() {
  const { user, loading, login, register, logout } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({ email: email.trim(), password });
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(errorMessage(err, mode === 'login' ? 'Sign-in failed.' : 'Sign-up failed.'));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.textSecondary },
  ];

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">EENP</ThemedText>
          <ThemedText themeColor="textSecondary">Signed in as {user.email}</ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Espees wallet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user.wallet ? `${user.wallet.espees_wallet_id} · ${user.wallet.status}` : 'pending'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user.is_verified ? 'Verified member' : 'Unverified member'}
            </ThemedText>
          </ThemedView>

          <Link href="/sessions" asChild>
            <Pressable style={[styles.primaryButton, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.primaryLabel}>View sign-in sessions</ThemedText>
            </Pressable>
          </Link>
          <Link href="/account" asChild>
            <Pressable style={[styles.secondaryButton, { borderColor: theme.primary }]}>
              <ThemedText style={[styles.secondaryLabel, { color: theme.primary }]}>
                Account & password
              </ThemedText>
            </Pressable>
          </Link>
          <Pressable
            onPress={() => void logout()}
            style={[styles.secondaryButton, { borderColor: '#c0392b' }]}>
            <ThemedText style={[styles.secondaryLabel, { color: '#c0392b' }]}>Sign out</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">EENP</ThemedText>
        <ThemedText themeColor="textSecondary">Espees Economic Network</ThemedText>

        <ThemedView style={styles.modeRow}>
          {(['login', 'register'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)}>
              <ThemedText
                type="smallBold"
                style={{ color: m === mode ? Brand.gold : theme.textSecondary }}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        <TextInput
          style={inputStyle}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder={mode === 'login' ? 'Password' : 'Choose a password'}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable
          onPress={() => void submit()}
          disabled={busy}
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}>
          <ThemedText style={styles.primaryLabel}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </ThemedText>
        </Pressable>
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
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
  },
  primaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
});

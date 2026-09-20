import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AccountScreen() {
  const { user, loading, logout } = useAuth();
  const theme = useTheme();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.textSecondary },
  ];

  async function changePassword() {
    setError(null);
    setNotice(null);
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<{ detail: string }>('/api/v1/auth/change-password/', {
        old_password: current,
        new_password: next,
      });
      // The backend blacklists every outstanding token, including ours, so
      // this device is signed out everywhere too: clear local state.
      setCurrent('');
      setNext('');
      setConfirm('');
      await logout();
      setNotice(`${res.detail} Please sign in again.`);
    } catch (err) {
      setError(errorMessage(err, 'Password change failed.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="subtitle">Account</ThemedText>
          {notice && <ThemedText style={styles.notice}>{notice}</ThemedText>}

          {!user ? (
            <>
              <ThemedText themeColor="textSecondary">
                You are signed out. Sign in to manage your account.
              </ThemedText>
              <Link href="/" asChild>
                <Pressable>
                  <ThemedText type="linkPrimary">Go to sign-in</ThemedText>
                </Pressable>
              </Link>
            </>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{user.full_name || user.email}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {user.email} · {user.is_verified ? 'verified' : 'unverified'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Wallet:{' '}
                  {user.wallet
                    ? `${user.wallet.espees_wallet_id} (${user.wallet.status})`
                    : 'pending'}
                </ThemedText>
              </ThemedView>

              <ThemedText type="smallBold">Change password</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Changing your password signs out all other sessions immediately.
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="Current password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={current}
                onChangeText={setCurrent}
              />
              <TextInput
                style={inputStyle}
                placeholder="New password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={next}
                onChangeText={setNext}
              />
              <TextInput
                style={inputStyle}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={confirm}
                onChangeText={setConfirm}
              />
              {error && <ThemedText style={styles.error}>{error}</ThemedText>}
              <Pressable
                onPress={() => void changePassword()}
                disabled={busy}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 },
                ]}>
                <ThemedText style={styles.primaryLabel}>
                  {busy ? 'Working…' : 'Change password'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => void logout()}
                style={[styles.secondaryButton, { borderColor: '#c0392b' }]}>
                <ThemedText style={[styles.secondaryLabel, { color: '#c0392b' }]}>
                  Sign out
                </ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
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
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Spacing.three,
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
  notice: {
    color: '#1e7e34',
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

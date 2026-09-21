import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationSwitch, ProfileHeader, SettingRow } from '@/components/profile-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { maskWalletId } from '@/lib/home';

function ProfileBody() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [inApp, setInApp] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<{ in_app: boolean }>('/api/v1/notification-preferences/')
        .then((p) => setInApp(p.in_app))
        .catch(() => setInApp(null));
    }, []),
  );

  async function toggleNotifications(next: boolean) {
    setInApp(next);
    try {
      await api.patch('/api/v1/notification-preferences/', { in_app: next });
    } catch {
      setInApp(!next);
    }
  }

  async function sendVerification() {
    setVerifyError(null);
    setSending(true);
    try {
      await api.post('/api/v1/auth/verify-email/request/', {});
      setSent(true);
    } catch (err) {
      setVerifyError(errorMessage(err, 'Could not send the email.'));
    } finally {
      setSending(false);
    }
  }

  if (!user) return null;
  const wallet = user.wallet;
  const verified = user.is_verified;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <ThemedText style={styles.title}>Profile</ThemedText>
          <ProfileHeader fullName={user.full_name} email={user.email} onEdit={() => router.push('/edit-profile')} />

          <ThemedText style={styles.section}>SETTINGS</ThemedText>
          <View style={styles.list}>
            <SettingRow
              icon={verified ? 'shield-checkmark' : 'shield-outline'}
              tint={verified ? '#2E9E5B' : Brand.bronze}
              label="Email verification"
              value={verified ? 'Verified' : sent ? 'Check your inbox' : sending ? 'Sending…' : 'Not verified'}
              a11y="Verify email"
              onPress={verified || sending ? undefined : () => void sendVerification()}
              chevron={!verified}
              note={!!verifyError && <ThemedText style={styles.error}>{verifyError}</ThemedText>}
            />
            <SettingRow
              icon="wallet-outline"
              tint={Brand.royal}
              label="Espees wallet"
              value={
                wallet
                  ? `${maskWalletId(wallet.espees_wallet_id)} · ${wallet.status.charAt(0).toUpperCase()}${wallet.status.slice(1)}`
                  : 'Being provisioned'
              }
            />
            <SettingRow
              icon="receipt-outline"
              tint="#2A9D8F"
              label="Transactions"
              chevron
              onPress={() => router.push('/transactions')}
            />
            <SettingRow
              icon="notifications-outline"
              tint="#3A6FE0"
              label="Notifications"
              control={<NotificationSwitch value={inApp ?? true} onChange={(v) => void toggleNotifications(v)} />}
            />
            <SettingRow
              icon="lock-closed-outline"
              tint="#8B5CF6"
              label="Security"
              value="Sessions and password"
              chevron
              onPress={() => router.push('/security')}
            />
            <SettingRow icon="log-out-outline" tint="#c0392b" label="Sign out" danger onPress={() => void logout()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function ProfileScreen() {
  return (
    <AuthGate title="Profile" blurb="Sign in to see your profile.">
      <ProfileBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scroll: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: TabBar.clearance, gap: Spacing.four },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: Brand.ink },
  section: { fontSize: 13, fontWeight: '800', letterSpacing: 1, color: Brand.body },
  list: { gap: Spacing.two + 2, marginTop: -Spacing.two },
  error: { color: '#B0382B', fontSize: 13, fontWeight: '600', paddingHorizontal: Spacing.three },
});

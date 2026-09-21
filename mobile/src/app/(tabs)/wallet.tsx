import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  Card,
  ErrorText,
  Field,
  ListCard,
  NoticeText,
  PrimaryButton,
  Screen,
  SectionHeader,
  SettingsRow,
} from '@/components/ui';
import { Brand, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Order, Session } from '@/lib/types';

function ProfileHeader({ name, email }: { name: string; email: string }) {
  return (
    <View style={styles.profile}>
      <View style={styles.avatar}>
        <ThemedText style={styles.avatarLabel}>{name.slice(0, 1).toUpperCase()}</ThemedText>
      </View>
      <View style={styles.profileText}>
        <ThemedText style={styles.profileName}>{name}</ThemedText>
        <ThemedText style={styles.profileEmail}>{email}</ThemedText>
      </View>
    </View>
  );
}

function WalletBody() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, s] = await Promise.all([
        api.getList<Order>('/api/v1/orders/'),
        api.get<{ sessions: Session[] }>('/api/v1/auth/sessions/'),
      ]);
      setOrders(o);
      setSessions(s.sessions);
    } catch {
      /* sections render their empty states; auth errors surface via gate */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  if (!user) return null;
  const displayName = user.full_name || user.email;

  return (
    <>
      <ProfileHeader name={displayName} email={user.email} />

      <Card>
        <ThemedText type="smallBold">Espees wallet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user.wallet ? `${user.wallet.espees_wallet_id} · ${user.wallet.status}` : 'pending'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user.is_verified ? 'Verified member' : 'Unverified member'}
        </ThemedText>
      </Card>

      <SectionHeader title={`Transactions (${orders.length})`} />
      {orders.slice(0, 6).map((o) => (
        <ListCard
          key={o.id}
          title={`${o.total} Espees`}
          pill={o.status}
          meta={[`${o.business_name} · ${new Date(o.created_at).toLocaleDateString()}`]}
        />
      ))}
      {orders.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No transactions yet — pay a business from the Pay tab.
        </ThemedText>
      )}

      <SectionHeader title="Sign-in sessions" />
      <ThemedText type="small" themeColor="textSecondary">
        Anything unfamiliar here means someone else may have your password.
      </ThemedText>
      {sessions.slice(0, 6).map((s, i) => (
        <ListCard
          key={`${s.device_key}-${s.created_at}-${i}`}
          title={`Device ${s.device_key ? s.device_key.slice(0, 12) : 'unknown'}`}
          meta={[
            `${s.ip_address ?? 'unknown IP'} · ${new Date(s.created_at).toLocaleString()}`,
            s.user_agent || 'unknown browser',
          ]}
        />
      ))}
      {sessions.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No sign-in activity yet.
        </ThemedText>
      )}

      <SectionHeader title="Change password" />
      <ThemedText type="small" themeColor="textSecondary">
        Changing your password signs out all other sessions immediately.
      </ThemedText>
      <Field
        label="Current password"
        secureTextEntry
        value={current}
        onChangeText={setCurrent}
      />
      <Field label="New password" secureTextEntry value={next} onChangeText={setNext} />
      <Field
        label="Confirm new password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <ErrorText message={error} />
      <NoticeText message={notice} />
      <PrimaryButton
        title={busy ? 'Working…' : 'Change password'}
        onPress={() => void changePassword()}
        disabled={busy}
      />

      <Card>
        <SettingsRow label="Sign out" glyph="↩" danger onPress={() => void logout()} />
      </Card>
    </>
  );
}

export default function WalletScreen() {
  return (
    <AuthGate title="Wallet" blurb="Sign in to manage your wallet and security.">
      <Screen>
        <WalletBody />
      </Screen>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  profile: {
    backgroundColor: Brand.royal,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
});

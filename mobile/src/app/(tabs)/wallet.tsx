import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  Card,
  ErrorText,
  Field,
  NoticeText,
  OutlineButton,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Order, Session } from '@/lib/types';

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

  return (
    <>
      <ThemedText type="subtitle">Wallet</ThemedText>

      <Card>
        <ThemedText type="smallBold">Espees wallet</ThemedText>
        <ThemedText themeColor="textSecondary">{user.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user.wallet ? `${user.wallet.espees_wallet_id} · ${user.wallet.status}` : 'pending'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user.is_verified ? 'Verified member' : 'Unverified member'}
        </ThemedText>
      </Card>

      <ThemedText type="smallBold">Transaction history ({orders.length})</ThemedText>
      {orders.slice(0, 10).map((o) => (
        <Card key={o.id}>
          <ThemedText type="smallBold">
            {o.total} Espees · {o.status}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {o.business_name} · {new Date(o.created_at).toLocaleString()}
          </ThemedText>
        </Card>
      ))}
      {orders.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No transactions yet — pay a business from the Pay tab.
        </ThemedText>
      )}

      <ThemedText type="smallBold">Sign-in sessions</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Recent successful sign-ins. Anything unfamiliar means someone else may have your
        password.
      </ThemedText>
      {sessions.slice(0, 10).map((s, i) => (
        <Card key={`${s.device_key}-${s.created_at}-${i}`}>
          <ThemedText type="smallBold">
            Device {s.device_key ? s.device_key.slice(0, 12) : 'unknown'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {s.ip_address ?? 'unknown IP'} · {new Date(s.created_at).toLocaleString()}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {s.user_agent || 'unknown browser'}
          </ThemedText>
        </Card>
      ))}
      {sessions.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No sign-in activity yet.
        </ThemedText>
      )}

      <ThemedText type="smallBold">Change password</ThemedText>
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

      <OutlineButton title="Sign out" color="#c0392b" onPress={() => void logout()} />
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

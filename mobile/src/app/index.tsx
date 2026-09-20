import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  Card,
  ErrorText,
  Field,
  LinkButton,
  Loading,
  NoticeText,
  OutlineButton,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AppNotification } from '@/lib/types';

function SignInForm() {
  const { login, register } = useAuth();
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

  return (
    <>
      <ThemedText type="subtitle">EENP</ThemedText>
      <ThemedText themeColor="textSecondary">Espees Economic Network</ThemedText>

      <View style={{ flexDirection: 'row', gap: Spacing.four }}>
        {(['login', 'register'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)}>
            <ThemedText
              type="smallBold"
              style={{ color: m === mode ? Brand.gold : theme.textSecondary }}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Field
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label={mode === 'login' ? 'Password' : 'Choose a password'}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <ErrorText message={error} />
      <PrimaryButton
        title={busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
        onPress={() => void submit()}
        disabled={busy}
      />
    </>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await api.getList<AppNotification>('/api/v1/notifications/');
      setNotes(all.filter((n) => !n.is_read).slice(0, 5));
    } catch {
      setNotes([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function markAllRead() {
    try {
      await api.post('/api/v1/notifications/read-all/', {});
      setNotes([]);
      setNotice('All notifications marked as read.');
    } catch {
      setNotice(null);
    }
  }

  if (!user) return null;

  return (
    <>
      <ThemedText type="subtitle">Home</ThemedText>
      <ThemedText themeColor="textSecondary">
        {user.full_name ? `Welcome, ${user.full_name}` : user.email}
      </ThemedText>

      <Card>
        <ThemedText type="smallBold">Espees wallet</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user.wallet ? `${user.wallet.espees_wallet_id} · ${user.wallet.status}` : 'pending'}
        </ThemedText>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <LinkButton href="/pay" title="Pay" />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <LinkButton href="/discover" title="Discover" />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <LinkButton href="/wallet" title="Wallet" />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <LinkButton href="/community" title="Community" />
        </View>
      </View>

      <ThemedText type="smallBold">Notifications</ThemedText>
      {notes.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          You are all caught up.
        </ThemedText>
      ) : (
        <>
          {notes.map((n) => (
            <Card key={n.id}>
              <ThemedText type="smallBold">{n.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {n.message}
              </ThemedText>
            </Card>
          ))}
          <OutlineButton title="Mark all as read" onPress={() => void markAllRead()} />
        </>
      )}
      <NoticeText message={notice} />

      <OutlineButton title="Sign out" color="#c0392b" onPress={() => void logout()} />
    </>
  );
}

export default function HomeScreen() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return (
    <Screen>
      {user ? <Dashboard /> : <SignInForm />}
    </Screen>
  );
}

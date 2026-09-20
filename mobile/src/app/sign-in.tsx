import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  ErrorText,
  Field,
  Loading,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const { loading, login, register } = useAuth();
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
      // AuthRedirect in the root layout moves the user into /(tabs).
    } catch (err) {
      setError(errorMessage(err, mode === 'login' ? 'Sign-in failed.' : 'Sign-up failed.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <Screen>
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
    </Screen>
  );
}

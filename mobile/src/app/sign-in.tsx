import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Card,
  ErrorText,
  Field,
  Hero,
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

export default function SignInScreen() {
  const { loading, login, loginWithCode, needsCode, register } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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

  async function submitCode() {
    setError(null);
    setBusy(true);
    try {
      await loginWithCode(code.trim());
      setCode('');
    } catch (err) {
      setError(errorMessage(err, 'Invalid code.'));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset() {
    setError(null);
    setBusy(true);
    try {
      await api.post('/api/v1/auth/password-reset/', { email: email.trim() });
      setResetSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Request failed. Try again.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  if (showReset) {
    return (
      <Screen>
        <Hero title="Reset your" accent="password" copy="Enter your account email for a reset link." />
        <Card>
          {resetSent ? (
            <NoticeText message="If the account exists, a reset email has been sent." />
          ) : (
            <>
              <Field
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <ErrorText message={error} />
              <PrimaryButton
                tone="gold"
                title={busy ? 'Sending…' : 'Send reset link'}
                onPress={() => void submitReset()}
                disabled={busy}
              />
            </>
          )}
          <OutlineButton
            title="Back to sign-in"
            onPress={() => {
              setShowReset(false);
              setResetSent(false);
              setError(null);
            }}
          />
        </Card>
      </Screen>
    );
  }

  if (needsCode) {
    return (
      <Screen>
        <Hero title="Check your" accent="authenticator" copy="Enter the 6-digit code to finish signing in." />
        <Card>
          <Field
            label="Two-factor code"
            keyboardType="numeric"
            value={code}
            onChangeText={setCode}
          />
          <ErrorText message={error} />
          <PrimaryButton
            tone="gold"
            title={busy ? 'Verifying…' : 'Verify'}
            onPress={() => void submitCode()}
            disabled={busy}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Hero
        title="Espees Economic"
        accent="Network"
        copy="One account for businesses, payments, campaigns, and community."
      />
      <Card>
        <View style={{ flexDirection: 'row', gap: Spacing.four }}>
          {(['login', 'register'] as const).map((m) => (
            <Pressable key={m} onPress={() => setMode(m)}>
              <ThemedText
                type="smallBold"
                style={{ color: m === mode ? Brand.royal : theme.textSecondary }}>
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
          tone="gold"
          title={busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          onPress={() => void submit()}
          disabled={busy}
        />
        {mode === 'login' && (
          <Pressable
            onPress={() => {
              setShowReset(true);
              setError(null);
            }}>
            <ThemedText type="small" style={{ color: Brand.royal, textAlign: 'center' }}>
              Forgot password?
            </ThemedText>
          </Pressable>
        )}
      </Card>
      <ThemedView style={{ alignItems: 'center' }}>
        <ThemedText type="small" themeColor="textSecondary">
          Member trust network · secured sessions
        </ThemedText>
      </ThemedView>
    </Screen>
  );
}

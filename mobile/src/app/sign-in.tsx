import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AuthField, AuthPasswordField, AuthShell } from '@/components/auth-ui';
import { ErrorText, Loading, NoticeText, OutlineButton, PrimaryButton } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { SocialAuthRow } from '@/components/social-auth-row';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isValidEmail } from '@/lib/validation';

export default function SignInScreen() {
  const { loading, login, loginWithCode, needsCode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      // AuthRedirect in the root layout moves the user into /(tabs).
    } catch (err) {
      setError(errorMessage(err, 'Sign-in failed.'));
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
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
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
      <AuthShell
        title="Reset your"
        accent="password"
        subtitle="Enter your account email and we'll send a reset link.">
        {resetSent ? (
          <NoticeText message="If the account exists, a reset email has been sent." />
        ) : (
          <>
            <AuthField
              label="Email"
              icon="mail-outline"
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
      </AuthShell>
    );
  }

  if (needsCode) {
    return (
      <AuthShell
        title="Check your"
        accent="authenticator"
        subtitle="Enter the 6-digit code to finish signing in.">
        <AuthField
          label="Two-factor code"
          icon="shield-checkmark-outline"
          keyboardType="numeric"
          maxLength={6}
          autoComplete="one-time-code"
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
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Welcome"
      accent="back"
      subtitle="Sign in to your Espees Economic Network account."
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create an account"
          onPress={() => router.push('/register')}>
          <ThemedText type="small" themeColor="textSecondary">
            New to EENP?{' '}
            <ThemedText type="small" style={{ color: Brand.royal, fontWeight: '700' }}>
              Create an account
            </ThemedText>
          </ThemedText>
        </Pressable>
      }>
      <AuthField
        label="Email"
        icon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <AuthPasswordField
        label="Password"
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        accessibilityRole="button"
        style={{ alignSelf: 'flex-end' }}
        onPress={() => {
          setShowReset(true);
          setError(null);
        }}>
        <ThemedText type="small" style={{ color: Brand.royal, fontWeight: '600' }}>
          Forgot password?
        </ThemedText>
      </Pressable>
      <ErrorText message={error} />
      <PrimaryButton
        tone="gold"
        title={busy ? 'Signing in…' : 'Sign in'}
        onPress={() => void submit()}
        disabled={busy}
      />
      <SocialAuthRow />
    </AuthShell>
  );
}

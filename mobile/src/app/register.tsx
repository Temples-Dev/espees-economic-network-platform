import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AuthField, AuthPasswordField, AuthShell } from '@/components/auth-ui';
import { ErrorText, PrimaryButton, StrengthMeter } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { SocialAuthRow } from '@/components/social-auth-row';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  passwordStrength,
  validateAccountStep,
  validatePasswordStep,
  type AccountStepErrors,
  type PasswordStepErrors,
} from '@/lib/validation';

export default function RegisterScreen() {
  const { register, login } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<AccountStepErrors & PasswordStepErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const found = {
      ...validateAccountStep({ fullName, email, phone }),
      ...validatePasswordStep({ password, confirm }),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setError(null);
    setBusy(true);
    try {
      const cleanEmail = email.trim();
      await register({
        email: cleanEmail,
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      await login(cleanEmail, password);
      // AuthRedirect in the root layout moves the user into /(tabs).
    } catch (err) {
      setError(errorMessage(err, 'Sign-up failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create"
      accent="account"
      subtitle="Join the Espees Economic Network — one member account for businesses, payments and community."
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          onPress={() => router.replace('/sign-in')}>
          <ThemedText type="small" themeColor="textSecondary">
            Already a member?{' '}
            <ThemedText type="small" style={{ color: Brand.royal, fontWeight: '700' }}>
              Sign in
            </ThemedText>
          </ThemedText>
        </Pressable>
      }>
      <AuthField
        label="Full name"
        icon="person-outline"
        autoCapitalize="words"
        autoComplete="name"
        value={fullName}
        onChangeText={setFullName}
        error={errors.fullName}
      />
      <AuthField
        label="Email"
        icon="mail-outline"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <AuthField
        label="Phone (optional)"
        icon="call-outline"
        autoComplete="tel"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
      />
      <AuthPasswordField
        label="Password"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
      />
      {password.length > 0 && <StrengthMeter strength={passwordStrength(password)} />}
      <AuthPasswordField
        label="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChangeText={setConfirm}
        error={errors.confirm}
      />
      <ErrorText message={error} />
      <PrimaryButton
        tone="gold"
        title={busy ? 'Creating account…' : 'Create account'}
        onPress={() => void submit()}
        disabled={busy}
      />
      <SocialAuthRow />
    </AuthShell>
  );
}

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthField } from '@/components/auth-ui';
import { FormLabel, FormShell, GoldSubmit } from '@/components/build-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function EditBody() {
  const router = useRouter();
  const { user, reload } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [nameError, setNameError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!fullName.trim()) {
      setNameError('Enter your name.');
      return;
    }
    setNameError(undefined);
    setBusy(true);
    setError(null);
    try {
      await api.patch('/api/v1/me/', { full_name: fullName.trim(), phone: phone.trim() });
      await reload();
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Could not save your changes.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell title="Edit profile" subtitle="Your email is your sign-in and cannot be changed here." onBack={() => router.back()}>
      <AuthField label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} error={nameError} />
      <AuthField label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <View style={{ gap: 4 }}>
        <FormLabel>Email</FormLabel>
        <ThemedText style={{ color: Brand.ink, fontSize: 15 }}>{user?.email}</ThemedText>
      </View>
      {!!error && <ThemedText style={{ color: '#B0382B', fontWeight: '600' }}>{error}</ThemedText>}
      <GoldSubmit label="Save changes" busy={busy} onPress={() => void save()} />
    </FormShell>
  );
}

export default function EditProfileScreen() {
  return (
    <AuthGate title="Edit profile" blurb="Sign in to edit your profile.">
      <EditBody />
    </AuthGate>
  );
}

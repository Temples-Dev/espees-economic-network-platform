import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthField } from '@/components/auth-ui';
import { FormShell, GoldSubmit } from '@/components/build-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';

type VerificationRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  legal_name: string;
  registration_number?: string;
  rejection_reason: string;
};

function VerifyBody() {
  const router = useRouter();
  const { business } = useLocalSearchParams<{ business: string }>();
  const [latest, setLatest] = useState<VerificationRequest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .get<VerificationRequest>(`/api/v1/businesses/${business}/verification/`)
      .then((r) => live && setLatest(r))
      .catch(() => undefined) // 404 just means no application yet
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [business]);

  async function submit() {
    if (!legalName.trim()) {
      setNameError('Enter the registered legal name.');
      return;
    }
    setNameError(undefined);
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/v1/businesses/${business}/verification/`, {
        legal_name: legalName.trim(),
        registration_number: regNumber.trim(),
        notes: notes.trim(),
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Could not submit your application.'));
    } finally {
      setBusy(false);
    }
  }

  const pending = latest?.status === 'pending';
  const rejected = latest?.status === 'rejected';

  return (
    <FormShell
      title="Get verified"
      subtitle="A verified badge tells customers your business is registered and real."
      onBack={() => router.back()}>
      {pending && (
        <View style={{ gap: 6, padding: 16, borderRadius: 20, backgroundColor: '#FBF4E1' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time-outline" size={20} color={Brand.bronze} />
            <ThemedText style={{ fontWeight: '800', color: Brand.bronze }}>Under review</ThemedText>
          </View>
          <ThemedText style={{ color: Brand.ink, fontWeight: '700' }}>{latest?.legal_name}</ThemedText>
          <ThemedText style={{ color: Brand.body, fontSize: 13 }}>
            We will notify you when the review is done.
          </ThemedText>
        </View>
      )}
      {rejected && (
        <View style={{ padding: 16, borderRadius: 20, backgroundColor: '#FBE6E3' }}>
          <ThemedText style={{ color: '#B0382B', fontWeight: '700' }}>
            {`Not approved: ${latest?.rejection_reason || 'please check your details'}. You can apply again.`}
          </ThemedText>
        </View>
      )}
      {loaded && !pending && (
        <>
          <AuthField label="Registered legal name" icon="business-outline" value={legalName} onChangeText={setLegalName} error={nameError} />
          <AuthField label="Registration number" icon="document-text-outline" value={regNumber} onChangeText={setRegNumber} autoCapitalize="characters" />
          <AuthField label="Anything else we should know" icon="chatbox-ellipses-outline" value={notes} onChangeText={setNotes} multiline />
          {!!error && <ThemedText style={{ color: '#B0382B', fontWeight: '600' }}>{error}</ThemedText>}
          <GoldSubmit label="Submit for verification" busy={busy} onPress={() => void submit()} />
        </>
      )}
    </FormShell>
  );
}

export default function VerifyBusinessScreen() {
  return (
    <AuthGate title="Get verified" blurb="Sign in to verify your business.">
      <VerifyBody />
    </AuthGate>
  );
}

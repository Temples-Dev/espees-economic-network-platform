import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthField } from '@/components/auth-ui';
import { FormLabel, FormShell, GoldSubmit } from '@/components/build-parts';
import { FilterChips } from '@/components/pay-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { validateBusiness } from '@/lib/build';
import type { Business, Category } from '@/lib/types';

function NewBusinessBody() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; contactEmail?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .getList<Category>('/api/v1/categories/')
      .then((c) => live && setCategories(c))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function submit() {
    const found = validateBusiness({ name, contactEmail: email });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.post<Business>('/api/v1/businesses/', {
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        contact_email: email.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        category: category ?? undefined,
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Could not create the business.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell title="New business" subtitle="Tell people what you do. You can add products and services next." onBack={() => router.back()}>
      <AuthField label="Business name" icon="storefront-outline" value={name} onChangeText={setName} error={errors.name} />
      <AuthField label="Description" icon="document-text-outline" value={description} onChangeText={setDescription} multiline />
      <AuthField label="Location" icon="location-outline" value={location} onChangeText={setLocation} />
      <AuthField
        label="Contact email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.contactEmail}
      />
      <AuthField label="Contact phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {categories.length > 0 && (
        <View style={{ gap: 8 }}>
          <FormLabel>Category</FormLabel>
          <FilterChips
            options={categories.map((c) => ({ id: c.name as string | null, label: c.name }))}
            value={category}
            onChange={(c) => setCategory(c === category ? null : c)}
          />
        </View>
      )}
      {!!error && <ThemedText style={{ color: '#B0382B', fontWeight: '600' }}>{error}</ThemedText>}
      <GoldSubmit label="Create business" busy={busy} onPress={() => void submit()} />
    </FormShell>
  );
}

export default function NewBusinessScreen() {
  return (
    <AuthGate title="New business" blurb="Sign in to create a business.">
      <NewBusinessBody />
    </AuthGate>
  );
}

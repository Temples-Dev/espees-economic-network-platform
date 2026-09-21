import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthField } from '@/components/auth-ui';
import { FormLabel, FormShell, GoldSubmit } from '@/components/build-parts';
import { FilterChips } from '@/components/pay-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { validateOffering } from '@/lib/build';
import type { Category } from '@/lib/types';

function NewOfferingBody() {
  const router = useRouter();
  const params = useLocalSearchParams<{ business: string; kind: string }>();
  const kind = params.kind === 'service' ? 'service' : 'product';
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});
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
    const found = validateOffering({ name, price });
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/v1/${kind}s/`, {
        business: params.business,
        name: name.trim(),
        description: description.trim(),
        price: price.trim(),
        ...(category ? { category } : {}),
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err, `Could not add the ${kind}.`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormShell
      title={`Add a ${kind}`}
      subtitle="Customers will be able to find it in Discover and pay for it in Espees."
      onBack={() => router.back()}>
      <AuthField label="Name" icon="pricetag-outline" value={name} onChangeText={setName} error={errors.name} />
      <AuthField
        label="Price (ESP)"
        icon="cash-outline"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        error={errors.price}
      />
      <AuthField label="Description" icon="document-text-outline" value={description} onChangeText={setDescription} multiline />
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
      <GoldSubmit label={`Add ${kind}`} busy={busy} onPress={() => void submit()} />
    </FormShell>
  );
}

export default function NewOfferingScreen() {
  return (
    <AuthGate title="Add an offering" blurb="Sign in to add products and services.">
      <NewOfferingBody />
    </AuthGate>
  );
}

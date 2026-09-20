import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  Card,
  ErrorText,
  Field,
  NoticeText,
  PrimaryButton,
  Screen,
} from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { Business, Category, SupplierRequest } from '@/lib/types';

function BuildBody() {
  const [mine, setMine] = useState<Business[]>([]);
  const [opps, setOpps] = useState<SupplierRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, o, c] = await Promise.all([
        api.getList<Business>('/api/v1/businesses/'),
        api.getList<SupplierRequest>('/api/v1/supplier-requests/'),
        api.getList<Category>('/api/v1/categories/'),
      ]);
      setMine(b);
      setOpps(o);
      setCategories(c);
    } catch (err) {
      setError(errorMessage(err, 'Could not load builder data.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function createBusiness() {
    if (!name.trim()) {
      setError('Business name is required.');
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const created = await api.post<Business>('/api/v1/businesses/', {
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        contact_email: contact.trim() || undefined,
        category: category.trim() || undefined,
      });
      setNotice(`“${created.name}” created.`);
      setName('');
      setDescription('');
      setLocation('');
      setContact('');
      setCategory('');
      setMine(await api.getList<Business>('/api/v1/businesses/'));
    } catch (err) {
      setError(errorMessage(err, 'Business creation failed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ThemedText type="subtitle">Build</ThemedText>
      <ThemedText themeColor="textSecondary">
        Create a business profile, manage what you offer, and find opportunities.
      </ThemedText>

      <ThemedText type="smallBold">My businesses ({mine.length})</ThemedText>
      {mine.slice(0, 10).map((b) => (
        <Card key={b.id}>
          <ThemedText type="smallBold">{b.name}</ThemedText>
          {!!b.location && (
            <ThemedText type="small" themeColor="textSecondary">
              {b.location}
            </ThemedText>
          )}
        </Card>
      ))}
      {mine.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No businesses yet — create your first below.
        </ThemedText>
      )}

      <ThemedText type="smallBold">New business</ThemedText>
      <Field label="Business name *" value={name} onChangeText={setName} />
      <Field label="Description" value={description} onChangeText={setDescription} />
      <Field label="Location" value={location} onChangeText={setLocation} />
      <Field
        label="Contact email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={contact}
        onChangeText={setContact}
      />
      <Field
        label={`Category name${categories.length > 0 ? ` (e.g. ${categories.slice(0, 3).map((c) => c.name).join(', ')})` : ''}`}
        autoCapitalize="none"
        value={category}
        onChangeText={setCategory}
      />
      <ErrorText message={error} />
      <NoticeText message={notice} />
      <PrimaryButton
        title={busy ? 'Creating…' : 'Create business'}
        onPress={() => void createBusiness()}
        disabled={busy}
      />

      <ThemedText type="smallBold">Opportunities ({opps.length})</ThemedText>
      {opps.slice(0, 10).map((o) => (
        <Card key={o.id}>
          <ThemedText type="smallBold">{o.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {o.description}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {o.requesting_business_name} · {o.status}
            {o.budget_espees != null ? ` · budget ${o.budget_espees}` : ''}
          </ThemedText>
        </Card>
      ))}
      {opps.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No open opportunities.
        </ThemedText>
      )}
    </>
  );
}

export default function BuildScreen() {
  return (
    <AuthGate title="Build" blurb="Sign in to create and manage businesses.">
      <Screen>
        <BuildBody />
      </Screen>
    </AuthGate>
  );
}

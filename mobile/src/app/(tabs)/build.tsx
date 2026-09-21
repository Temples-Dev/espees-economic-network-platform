import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  ErrorText,
  Field,
  ListCard,
  NoticeText,
  PrimaryButton,
  Screen,
  SectionHeader,
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
      setNotice(`“${created.name}” is live.`);
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
        Create economic activity — businesses, offerings, and opportunities.
      </ThemedText>

      <SectionHeader title={`My businesses (${mine.length})`} />
      {mine.slice(0, 8).map((b) => (
        <ListCard
          key={b.id}
          title={b.name}
          meta={[b.location, b.description].filter(Boolean)}
        />
      ))}
      {mine.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          No businesses yet — create your first below.
        </ThemedText>
      )}

      <SectionHeader title="New business" />
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
        label={`Category${categories.length > 0 ? ` (e.g. ${categories.slice(0, 3).map((c) => c.name).join(', ')})` : ''}`}
        autoCapitalize="none"
        value={category}
        onChangeText={setCategory}
      />
      <ErrorText message={error} />
      <NoticeText message={notice} />
      <PrimaryButton
        tone="gold"
        title={busy ? 'Creating…' : 'Create business'}
        onPress={() => void createBusiness()}
        disabled={busy}
      />

      <SectionHeader title={`Opportunities (${opps.length})`} />
      {opps.slice(0, 8).map((o) => (
        <ListCard
          key={o.id}
          title={o.title}
          pill={o.status}
          meta={[
            o.requesting_business_name,
            o.budget_espees != null ? `Budget ${o.budget_espees} Espees` : null,
          ].filter((m): m is string => m !== null)}
        />
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

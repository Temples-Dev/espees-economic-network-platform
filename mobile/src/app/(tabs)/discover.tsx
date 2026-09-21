import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { AuthGate, Chips, ErrorText, Field, ListCard, Screen, SectionHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { Business, Campaign, Offering } from '@/lib/types';

type Filter = 'all' | 'businesses' | 'offerings' | 'campaigns';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'offerings', label: 'Products & services' },
  { id: 'campaigns', label: 'Campaigns' },
] as const;

function matches(query: string, ...haystacks: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(q));
}

function DiscoverBody() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Offering[]>([]);
  const [services, setServices] = useState<Offering[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const [b, p, s, c] = await Promise.all([
        api.getList<Business>('/api/v1/businesses/'),
        api.getList<Offering>('/api/v1/products/'),
        api.getList<Offering>('/api/v1/services/'),
        api.getList<Campaign>('/api/v1/campaigns/'),
      ]);
      setBusinesses(b);
      setProducts(p);
      setServices(s);
      setCampaigns(c);
    } catch (err) {
      setError(errorMessage(err, 'Could not load discovery.'));
    } finally {
      setFetching(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const show = (section: Exclude<Filter, 'all'>) => filter === 'all' || filter === section;
  const biz = businesses.filter((b) => matches(query, b.name, b.description, b.location));
  const offs = [...products, ...services].filter((o) =>
    matches(query, o.name, o.description, o.business_name),
  );
  const camps = campaigns.filter((c) => matches(query, c.title, c.description, c.business_name));

  return (
    <>
      <ThemedText type="subtitle">Discover</ThemedText>
      <Field
        label="Search"
        autoCapitalize="none"
        placeholder="Businesses, products, campaigns…"
        value={query}
        onChangeText={setQuery}
      />
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      {fetching && biz.length === 0 ? (
        <ActivityIndicator />
      ) : error ? (
        <ErrorText message={error} />
      ) : (
        <>
          {show('businesses') && (
            <>
              <SectionHeader title={`Businesses (${biz.length})`} />
              {biz.slice(0, 8).map((b) => (
                <ListCard
                  key={b.id}
                  title={b.name}
                  meta={[
                    [b.location, b.review_count > 0 ? `★ ${b.average_rating ?? '–'}` : null]
                      .filter(Boolean)
                      .join(' · '),
                    b.description,
                  ].filter(Boolean)}
                />
              ))}
            </>
          )}
          {show('offerings') && (
            <>
              <SectionHeader title={`Products & services (${offs.length})`} />
              {offs.slice(0, 8).map((o) => (
                <ListCard
                  key={o.id}
                  title={o.name}
                  pill={o.kind}
                  meta={[`${o.business_name} · ${o.price} Espees`]}
                />
              ))}
            </>
          )}
          {show('campaigns') && (
            <>
              <SectionHeader title={`Campaigns (${camps.length})`} />
              {camps.slice(0, 8).map((c) => (
                <ListCard
                  key={c.id}
                  title={c.title}
                  pill="Campaign"
                  meta={[`Goal ${c.goal_espees} · raised ${c.raised_espees ?? '–'} · ${c.status}`]}
                />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}

export default function DiscoverScreen() {
  return (
    <AuthGate title="Discover" blurb="Sign in to discover businesses, products and campaigns.">
      <Screen>
        <DiscoverBody />
      </Screen>
    </AuthGate>
  );
}

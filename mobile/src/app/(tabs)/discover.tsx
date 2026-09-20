import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { AuthGate, Card, ErrorText, Field, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { Business, Campaign, Offering } from '@/lib/types';

function matches(query: string, ...haystacks: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(q));
}

function DiscoverBody() {
  const [query, setQuery] = useState('');
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

  const biz = businesses.filter((b) => matches(query, b.name, b.description, b.location));
  const prods = products.filter((o) => matches(query, o.name, o.description, o.business_name));
  const servs = services.filter((o) => matches(query, o.name, o.description, o.business_name));
  const camps = campaigns.filter((c) => matches(query, c.title, c.description, c.business_name));

  return (
    <>
      <ThemedText type="subtitle">Discover</ThemedText>
      <Field
        label="Search businesses, products, services, campaigns"
        autoCapitalize="none"
        value={query}
        onChangeText={setQuery}
      />
      {fetching && biz.length === 0 ? (
        <ActivityIndicator />
      ) : error ? (
        <ErrorText message={error} />
      ) : (
        <>
          <ThemedText type="smallBold">Businesses ({biz.length})</ThemedText>
          {biz.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No businesses match.
            </ThemedText>
          )}
          {biz.slice(0, 10).map((b) => (
            <Card key={b.id}>
              <ThemedText type="smallBold">{b.name}</ThemedText>
              {!!b.location && (
                <ThemedText type="small" themeColor="textSecondary">
                  {b.location}
                </ThemedText>
              )}
              {!!b.description && (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {b.description}
                </ThemedText>
              )}
              {b.review_count > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  ★ {b.average_rating ?? '–'} ({b.review_count})
                </ThemedText>
              )}
            </Card>
          ))}

          <ThemedText type="smallBold">
            Products & services ({prods.length + servs.length})
          </ThemedText>
          {[...prods, ...servs].slice(0, 10).map((o) => (
            <Card key={o.id}>
              <ThemedText type="smallBold">{o.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {o.business_name} · {o.price} Espees
              </ThemedText>
            </Card>
          ))}

          <ThemedText type="smallBold">Campaigns ({camps.length})</ThemedText>
          {camps.slice(0, 10).map((c) => (
            <Card key={c.id}>
              <ThemedText type="smallBold">{c.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Goal {c.goal_espees} · raised {c.raised_espees ?? '–'} · {c.status}
              </ThemedText>
            </Card>
          ))}
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

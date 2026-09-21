import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BusinessResultCard,
  CampaignHeroCard,
  CategoryChips,
  FeaturedCarousel,
  OfferingList,
  SearchBar,
  SegmentTabs,
  StateMessage,
} from '@/components/discover-parts';
import { HomeSectionHeader, Skeleton } from '@/components/home-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { api } from '@/lib/api';
import { buildQuery, matchesQuery } from '@/lib/discover';
import type { Business, Campaign, Category, Offering } from '@/lib/types';

type SearchResult = {
  q: string;
  interpreted: { keywords: string[]; location: string | null; category: string | null };
  businesses: Business[];
  products: Offering[];
  services: Offering[];
};

type Segment = 'businesses' | 'products' | 'services' | 'campaigns';

const SEGMENTS = [
  { id: 'businesses', label: 'Businesses', icon: 'storefront-outline' },
  { id: 'products', label: 'Products', icon: 'cube-outline' },
  { id: 'services', label: 'Services', icon: 'construct-outline' },
  { id: 'campaigns', label: 'Campaigns', icon: 'heart-outline' },
] as const;

const EMPTY_COPY: Record<Segment, string> = {
  businesses: 'No businesses yet.',
  products: 'No products yet.',
  services: 'No services yet.',
  campaigns: 'No campaigns right now.',
};

function DiscoverBody() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<Segment>('businesses');
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [products, setProducts] = useState<Offering[]>([]);
  const [services, setServices] = useState<Offering[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [interpreted, setInterpreted] = useState<SearchResult['interpreted'] | null>(null);
  const latest = useRef(0);

  const search = useDebouncedValue(query, 350);

  useEffect(() => {
    api
      .getList<Category>('/api/v1/categories/')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    const request = ++latest.current;
    setStatus('loading');
    try {
      if (search.trim() && segment !== 'campaigns') {
        // Plain-language search across everything; the category chip narrows it below.
        const res = await api.get<SearchResult>(`/api/v1/search/?q=${encodeURIComponent(search.trim())}&limit=30`);
        if (request === latest.current) {
          setBusinesses(res.businesses);
          setProducts(res.products);
          setServices(res.services);
          setInterpreted(res.interpreted);
        }
      } else if (segment === 'businesses') {
        if (request === latest.current) setInterpreted(null);
        const rows = await api.getList<Business>(
          buildQuery('/api/v1/businesses/', { search, category }),
        );
        if (request === latest.current) setBusinesses(rows);
      } else if (segment === 'products') {
        const rows = await api.getList<Offering>(
          buildQuery('/api/v1/products/', { search, category }),
        );
        if (request === latest.current) setProducts(rows);
      } else if (segment === 'services') {
        const rows = await api.getList<Offering>(
          buildQuery('/api/v1/services/', { search, category }),
        );
        if (request === latest.current) setServices(rows);
      } else {
        const rows = await api.getList<Campaign>('/api/v1/campaigns/');
        if (request === latest.current) setCampaigns(rows);
      }
      if (request === latest.current) setStatus('ready');
    } catch {
      if (request === latest.current) setStatus('error');
    }
  }, [segment, search, category]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const visibleCampaigns = campaigns.filter((c) =>
    matchesQuery(search, c.title, c.description, c.business_name),
  );
  const searching = search.trim().length > 0;
  const categoryName = categories.find((c) => c.slug === category)?.name;
  const narrow = <T extends { category?: string | null }>(list: T[]) =>
    searching && categoryName ? list.filter((x) => x.category === categoryName) : list;
  const shownBusinesses = narrow(businesses);
  const shownProducts = narrow(products);
  const shownServices = narrow(services);
  const rows =
    segment === 'businesses'
      ? shownBusinesses
      : segment === 'products'
        ? shownProducts
        : segment === 'services'
          ? shownServices
          : visibleCampaigns;
  const browsing = segment === 'businesses' && !search.trim() && !category;
  const featured = browsing
    ? businesses
        .filter((b) => b.average_rating != null)
        .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
        .slice(0, 5)
    : [];
  const listed = browsing ? shownBusinesses.filter((b) => !featured.includes(b)) : shownBusinesses;
  const emptyCopy = search.trim() ? `No results for "${search.trim()}"` : EMPTY_COPY[segment];

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          testID="discover-scroll"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={Brand.gold}
              colors={[Brand.royal]}
            />
          }>
          <View style={styles.heading}>
            <ThemedText style={styles.title}>Discover</ThemedText>
            <ThemedText style={styles.subtitle}>
              Find businesses, products and campaigns across the network.
            </ThemedText>
          </View>

          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="What do you need? e.g. laptop repair"
          />
          <SegmentTabs options={SEGMENTS} value={segment} onChange={setSegment} />
          {segment !== 'campaigns' && categories.length > 0 && (
            <CategoryChips categories={categories} value={category} onChange={setCategory} />
          )}

          {searching && !!interpreted && segment !== 'campaigns' && (
            <ThemedText style={styles.understood}>
              {`Understood as: ${[interpreted.keywords.join(' '), interpreted.location, interpreted.category].filter(Boolean).join(' · ')}`}
            </ThemedText>
          )}

          <View style={styles.results}>
            {status === 'error' ? (
              <StateMessage
                icon="cloud-offline-outline"
                title="Could not load results."
                action={{ label: 'Try again', onPress: () => void load() }}
              />
            ) : status === 'loading' && rows.length === 0 ? (
              <Skeleton rows={4} />
            ) : rows.length === 0 ? (
              <StateMessage icon="search-outline" title={emptyCopy} />
            ) : segment === 'businesses' ? (
              <>
                {featured.length > 0 && (
                  <View style={styles.block}>
                    <HomeSectionHeader title="Featured" />
                    <FeaturedCarousel
                      businesses={featured}
                      onPress={(b) => router.push(`/business/${b.id}`)}
                    />
                  </View>
                )}
                {listed.length > 0 && (
                  <View style={styles.block}>
                    <HomeSectionHeader
                      title={
                        browsing
                          ? 'All businesses'
                          : `${listed.length} ${listed.length === 1 ? 'result' : 'results'}`
                      }
                    />
                    {listed.map((b) => (
                      <BusinessResultCard
                        key={b.id}
                        business={b}
                        onPress={() => router.push(`/business/${b.id}`)}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : segment === 'products' || segment === 'services' ? (
              <View style={styles.block}>
                <HomeSectionHeader
                  title={`${rows.length} ${segment === 'products' ? (rows.length === 1 ? 'product' : 'products') : rows.length === 1 ? 'service' : 'services'}`}
                />
                <OfferingList
                  offerings={rows as Offering[]}
                  onPress={(o) => router.push(`/offering/${o.id}`)}
                />
              </View>
            ) : (
              <View style={styles.block}>
                <HomeSectionHeader
                  title={`${visibleCampaigns.length} ${visibleCampaigns.length === 1 ? 'campaign' : 'campaigns'}`}
                />
                {visibleCampaigns.map((c) => (
                  <CampaignHeroCard key={c.id} campaign={c} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function DiscoverScreen() {
  return (
    <AuthGate title="Discover" blurb="Sign in to discover businesses, products and campaigns.">
      <DiscoverBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: TabBar.clearance,
    gap: Spacing.three,
  },
  heading: { gap: 2, marginBottom: Spacing.one },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, color: Brand.body },
  understood: { fontSize: 13, fontWeight: '600', color: Brand.royal },
  results: { gap: Spacing.four, marginTop: Spacing.one },
  block: { gap: Spacing.three },
});

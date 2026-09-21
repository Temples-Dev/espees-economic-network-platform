import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchBar, SegmentTabs, StateMessage } from '@/components/discover-parts';
import { EmptyNote, HomeSectionHeader, Skeleton } from '@/components/home-parts';
import { BasketCard, PaymentRow, PayOfferingRow } from '@/components/pay-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import {
  basketSummary,
  clampQuantity,
  filterByKind,
  formatEsp,
  groupByBusiness,
  matchesOffering,
  type Basket,
  type KindFilter,
} from '@/lib/pay';
import type { Offering, Order } from '@/lib/types';

const KINDS = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'product', label: 'Products', icon: 'cube-outline' },
  { id: 'service', label: 'Services', icon: 'construct-outline' },
] as const;

function PayBody() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [kind, setKind] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [basket, setBasket] = useState<Basket>({});
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, o] = await Promise.all([
        api.getList<Offering>('/api/v1/products/'),
        api.getList<Offering>('/api/v1/services/'),
        api.getList<Order>('/api/v1/orders/'),
      ]);
      setOfferings([...p, ...s].filter((x) => x.is_active));
      setOrders(o);
    } catch (err) {
      setProblems([errorMessage(err, 'Could not load offerings.')]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const summary = basketSummary(offerings, basket);
  const visible = filterByKind(offerings, kind).filter((o) => matchesOffering(o, query));

  function toggle(o: Offering) {
    setNotice(null);
    setProblems([]);
    setBasket((b) => {
      const { [o.id]: had, ...rest } = b;
      return had ? rest : { ...b, [o.id]: 1 };
    });
  }

  function setQuantity(o: Offering, n: number) {
    setBasket((b) => ({ ...b, [o.id]: clampQuantity(n) }));
  }

  /** One order per business; whatever succeeds leaves the basket, whatever fails stays for a retry. */
  async function pay() {
    setProblems([]);
    setNotice(null);
    setBusy(true);
    const paid: string[] = [];
    const failed: string[] = [];
    let remaining = { ...basket };
    for (const group of groupByBusiness(offerings, basket)) {
      try {
        await api.post<Order>('/api/v1/orders/', { business: group.businessId, items: group.items });
        paid.push(`${formatEsp(group.subtotal)} to ${group.businessName}`);
        for (const item of group.items) delete remaining[item.offering];
      } catch (err) {
        failed.push(`${group.businessName}: ${errorMessage(err, 'Payment failed.')}`);
      }
    }
    setBasket(remaining);
    if (paid.length) {
      setNotice(`Payment sent: ${paid.join(', ')}.`);
      try {
        setOrders(await api.getList<Order>('/api/v1/orders/'));
      } catch {
        /* the next refresh will reconcile */
      }
    }
    setProblems(failed);
    setBusy(false);
  }

  const now = new Date();
  const searching = query.trim().length > 0;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
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
            <ThemedText style={styles.title}>Pay</ThemedText>
            <ThemedText style={styles.subtitle}>Pick one or several things, from any business, and pay at once.</ThemedText>
          </View>

          <BasketCard
            count={summary.count}
            businesses={summary.businesses}
            total={summary.total}
            busy={busy}
            onClear={() => setBasket({})}
            onPay={() => void pay()}
          />
          {problems.map((p) => (
            <ThemedText key={p} style={styles.error}>
              {p}
            </ThemedText>
          ))}
          {!!notice && <ThemedText style={styles.notice}>{notice}</ThemedText>}

          <View style={styles.block}>
            <HomeSectionHeader title="What are you paying for?" />
            <SearchBar value={query} onChange={setQuery} placeholder="Search products, services, businesses" />
            <SegmentTabs options={KINDS} value={kind} onChange={setKind} />
            {!loaded ? (
              <Skeleton rows={3} />
            ) : visible.length === 0 ? (
              <StateMessage
                icon="search-outline"
                title={searching ? 'No matches' : 'Nothing to pay for yet'}
                action={searching ? { label: 'Clear search', onPress: () => setQuery('') } : undefined}
              />
            ) : (
              <View style={styles.list}>
                {visible.slice(0, 30).map((o) => (
                  <PayOfferingRow
                    key={o.id}
                    offering={o}
                    quantity={basket[o.id] ?? 0}
                    onToggle={() => toggle(o)}
                    onQuantity={(n) => setQuantity(o, n)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.block}>
            <HomeSectionHeader
              title="Recent payments"
              action={{ label: 'See all transactions', onPress: () => router.push('/transactions') }}
            />
            {!loaded ? (
              <Skeleton rows={2} />
            ) : orders.length === 0 ? (
              <EmptyNote message="No payments yet." />
            ) : (
              orders.slice(0, 5).map((o) => <PaymentRow key={o.id} order={o} now={now} />)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function PayScreen() {
  return (
    <AuthGate title="Pay" blurb="Sign in to pay businesses in Espees.">
      <PayBody />
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
    gap: Spacing.four,
  },
  heading: { gap: 2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, color: Brand.body },
  block: { gap: Spacing.three },
  list: { gap: Spacing.two + 2 },
  error: { color: '#B0382B', fontSize: 14, fontWeight: '600' },
  notice: { color: '#1F7A4D', fontSize: 14, fontWeight: '600' },
});

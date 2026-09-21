import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActionGrid,
  BusinessHero,
  EmptyBusinessCard,
  IncomingOrderCard,
  OpportunityCard,
} from '@/components/build-parts';
import { EmptyNote, HomeSectionHeader, Skeleton } from '@/components/home-parts';
import { FilterChips } from '@/components/pay-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { dashboardStats, openOpportunities } from '@/lib/build';
import type { Business, Offering, Order, SupplierRequest } from '@/lib/types';

type Dashboard = { orders: Order[]; products: number; services: number };
const EMPTY: Dashboard = { orders: [], products: 0, services: 0 };

function BuildBody() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [opps, setOpps] = useState<SupplierRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dash, setDash] = useState<Dashboard>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (businessId: string) => {
    try {
      const [orders, products, services] = await Promise.all([
        api.getList<Order>(`/api/v1/orders/?business=${businessId}`),
        api.getList<Offering>(`/api/v1/products/?business=${businessId}`),
        api.getList<Offering>(`/api/v1/services/?business=${businessId}`),
      ]);
      setDash({ orders, products: products.length, services: services.length });
    } catch (err) {
      setError(errorMessage(err, 'Could not load your dashboard.'));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [mine, requests] = await Promise.all([
        api.getList<Business>('/api/v1/businesses/?mine=true'),
        api.getList<SupplierRequest>('/api/v1/supplier-requests/?status=open'),
      ]);
      setBusinesses(mine);
      setOpps(requests);
      setSelectedId((cur) => (cur && mine.some((b) => b.id === cur) ? cur : (mine[0]?.id ?? null)));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load builder data.'));
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      if (selectedId) void loadDashboard(selectedId);
    }, [load, loadDashboard, selectedId]),
  );

  async function refresh() {
    setRefreshing(true);
    await load();
    if (selectedId) await loadDashboard(selectedId);
    setRefreshing(false);
  }

  async function act(order: Order, next: 'confirmed' | 'fulfilled' | 'cancelled') {
    setBusyOrder(order.id);
    setError(null);
    try {
      await api.patch(`/api/v1/orders/${order.id}/status/`, { status: next });
      await loadDashboard(order.business);
    } catch (err) {
      setError(errorMessage(err, 'Could not update the order.'));
    } finally {
      setBusyOrder(null);
    }
  }

  const selected = businesses.find((b) => b.id === selectedId) ?? null;
  const stats = dashboardStats(dash.orders, dash.products, dash.services);
  const opportunities = openOpportunities(opps, businesses.map((b) => b.id)).slice(0, 6);
  const now = new Date();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Brand.gold} colors={[Brand.royal]} />
          }>
          <View style={styles.heading}>
            <ThemedText style={styles.title}>Build</ThemedText>
            <ThemedText style={styles.subtitle}>Create and run your business on Espees.</ThemedText>
          </View>

          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}

          {!loaded ? (
            <Skeleton rows={3} />
          ) : !selected ? (
            <EmptyBusinessCard onCreate={() => router.push('/new-business')} />
          ) : (
            <>
              {businesses.length > 1 && (
                <FilterChips
                  options={businesses.map((b) => ({ id: b.id, label: b.name, a11y: `Business ${b.name}` }))}
                  value={selected.id}
                  onChange={(id) => setSelectedId(id)}
                />
              )}
              <BusinessHero
                business={selected}
                stats={stats}
                onOpen={() => router.push(`/business/${selected.id}`)}
                onVerify={() => router.push({ pathname: '/verify-business', params: { business: selected.id } })}
              />
              <ActionGrid
                actions={[
                  { label: 'Add product', icon: 'cube-outline', onPress: () => router.push({ pathname: '/new-offering', params: { business: selected.id, kind: 'product' } }) },
                  { label: 'Add service', icon: 'construct-outline', onPress: () => router.push({ pathname: '/new-offering', params: { business: selected.id, kind: 'service' } }) },
                  { label: 'New business', icon: 'add-circle-outline', onPress: () => router.push('/new-business') },
                  { label: 'Transactions', icon: 'receipt-outline', onPress: () => router.push('/transactions') },
                ]}
              />
              <View style={styles.block}>
                <HomeSectionHeader title="Incoming orders" />
                {dash.orders.length === 0 ? (
                  <EmptyNote message="No orders yet." />
                ) : (
                  dash.orders.slice(0, 8).map((o) => (
                    <IncomingOrderCard key={o.id} order={o} now={now} busy={busyOrder === o.id} onAction={(n) => void act(o, n)} />
                  ))
                )}
              </View>
            </>
          )}

          <View style={styles.block}>
            <HomeSectionHeader title="Opportunities" />
            {!loaded ? (
              <Skeleton rows={2} />
            ) : opportunities.length === 0 ? (
              <EmptyNote message="No open opportunities right now." />
            ) : (
              opportunities.map((r) => <OpportunityCard key={r.id} request={r} />)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function BuildScreen() {
  return (
    <AuthGate title="Build" blurb="Sign in to create and manage businesses.">
      <BuildBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scroll: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: TabBar.clearance, gap: Spacing.four },
  heading: { gap: 2 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, color: Brand.body },
  block: { gap: Spacing.three },
  error: { color: '#B0382B', fontSize: 14, fontWeight: '600' },
});

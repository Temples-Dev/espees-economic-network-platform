import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SearchBar, StateMessage } from '@/components/discover-parts';
import { Skeleton } from '@/components/home-parts';
import { FilterChips, PaymentRow } from '@/components/pay-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatEsp } from '@/lib/pay';
import {
  distinctBusinesses,
  filterOrders,
  ordersTotal,
  type DateRange,
  type TransactionFilters,
} from '@/lib/transactions';
import type { Order } from '@/lib/types';

const RANGES = [
  { id: 'all', label: 'All time' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
] as const satisfies readonly { id: DateRange; label: string }[];

const NO_FILTERS: TransactionFilters = { query: '', range: 'all', business: null, status: 'all' };
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function TransactionsBody() {
  const router = useRouter();
  const { user } = useAuth();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>(NO_FILTERS);

  const load = useCallback(async () => {
    try {
      setOrders(await api.getList<Order>('/api/v1/orders/'));
    } catch {
      /* keep whatever is on screen */
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function cancel(order: Order) {
    setCancelError(null);
    try {
      await api.patch(`/api/v1/orders/${order.id}/status/`, { status: 'cancelled' });
      await load();
    } catch (err) {
      setCancelError(errorMessage(err, 'Could not cancel the order.'));
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const set = (patch: Partial<TransactionFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const now = new Date();
  const rows = filterOrders(orders, filters, now);
  const businessOptions = [
    { id: null as string | null, label: 'All businesses', a11y: 'All businesses' },
    ...distinctBusinesses(orders).map((b) => ({ id: b.id as string | null, label: b.name, a11y: `Business ${b.name}` })),
  ];
  const statusOptions = [
    { id: 'all', label: 'Any status', a11y: 'Any status' },
    ...[...new Set(orders.map((o) => o.status))].map((s) => ({
      id: s,
      label: capitalise(s),
      a11y: `Status ${capitalise(s)}`,
    })),
  ];

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
          <View style={styles.bar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={8}
              style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={Brand.royal} />
            </Pressable>
            <ThemedText style={styles.title}>Transactions</ThemedText>
          </View>

          <SearchBar
            value={filters.query}
            onChange={(query) => set({ query })}
            placeholder="Search by business or what you paid for"
          />

          <View style={styles.group}>
            <ThemedText style={styles.groupLabel}>Date</ThemedText>
            <FilterChips options={RANGES} value={filters.range} onChange={(range) => set({ range })} />
          </View>
          <View style={styles.group}>
            <ThemedText style={styles.groupLabel}>Business</ThemedText>
            <FilterChips options={businessOptions} value={filters.business} onChange={(business) => set({ business })} />
          </View>
          <View style={styles.group}>
            <ThemedText style={styles.groupLabel}>Status</ThemedText>
            <FilterChips options={statusOptions} value={filters.status} onChange={(status) => set({ status })} />
          </View>

          {!loaded ? (
            <Skeleton rows={4} />
          ) : (
            <>
              {!!cancelError && <ThemedText style={styles.cancelError}>{cancelError}</ThemedText>}
              <ThemedText style={styles.summary}>
                {`${rows.length} ${rows.length === 1 ? 'transaction' : 'transactions'} · ${formatEsp(ordersTotal(rows))}`}
              </ThemedText>
              {rows.length === 0 ? (
                <StateMessage
                  icon="receipt-outline"
                  title={orders.length === 0 ? 'No transactions yet' : 'No transactions match'}
                  action={orders.length === 0 ? undefined : { label: 'Reset filters', onPress: () => setFilters(NO_FILTERS) }}
                />
              ) : (
                <View>
                  {rows.map((o) => (
                    <PaymentRow
                      key={o.id}
                      order={o}
                      now={now}
                      onCancel={o.status === 'pending' && o.customer_email === user?.email ? () => void cancel(o) : undefined}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function TransactionsScreen() {
  return (
    <AuthGate title="Transactions" blurb="Sign in to see your payments.">
      <TransactionsBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scroll: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  bar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  back: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.white,
    borderWidth: 1, borderColor: '#E9EAF0', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: Brand.ink },
  group: { gap: Spacing.two },
  groupLabel: { fontSize: 12, fontWeight: '800', color: Brand.body, letterSpacing: 0.6, textTransform: 'uppercase' },
  cancelError: { color: '#B0382B', fontSize: 14, fontWeight: '600' },
  summary: { fontSize: 14, fontWeight: '700', color: Brand.royal },
});

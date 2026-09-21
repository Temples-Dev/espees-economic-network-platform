import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityList,
  BalanceCard,
  BusinessRow,
  CampaignCard,
  EmptyNote,
  HomeHeader,
  HomeSectionHeader,
  PendingList,
  QuickActionGrid,
  Section,
  Skeleton,
} from '@/components/home-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  buildActivity,
  buildPending,
  greetingFor,
  initialsOf,
  maskWalletId,
  type PendingItem,
} from '@/lib/home';
import type { AppNotification, Business, Campaign, Conversation, Order } from '@/lib/types';

type HomeData = {
  notifications: AppNotification[];
  orders: Order[];
  conversations: Conversation[];
  businesses: Business[];
  campaigns: Campaign[];
};

const EMPTY: HomeData = {
  notifications: [],
  orders: [],
  conversations: [],
  businesses: [],
  campaigns: [],
};

const orEmpty = <T,>(r: PromiseSettledResult<T[]>): T[] => (r.status === 'fulfilled' ? r.value : []);

const byRating = (a: Business, b: Business) =>
  (b.average_rating ?? -1) - (a.average_rating ?? -1);

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [soonNote, setSoonNote] = useState(false);

  const load = useCallback(async () => {
    const [notifications, orders, conversations, businesses, campaigns] = await Promise.allSettled([
      api.getList<AppNotification>('/api/v1/notifications/'),
      api.getList<Order>('/api/v1/orders/'),
      api.getList<Conversation>('/api/v1/conversations/'),
      api.getList<Business>('/api/v1/businesses/'),
      api.getList<Campaign>('/api/v1/campaigns/'),
    ]);
    setData({
      notifications: orEmpty(notifications),
      orders: orEmpty(orders),
      conversations: orEmpty(conversations),
      businesses: orEmpty(businesses),
      campaigns: orEmpty(campaigns),
    });
    setLoaded(true);
  }, []);

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

  async function markAllRead() {
    try {
      await api.post('/api/v1/notifications/read-all/', {});
      setData((d) => ({
        ...d,
        notifications: d.notifications.map((n) => ({ ...n, is_read: true })),
      }));
    } catch {
      /* leave the badge as is; the next refresh will reconcile */
    }
  }

  if (!user) return null;

  const now = new Date();
  const firstName = (user.full_name || user.email).split(/[\s@]/)[0];
  const unread = data.notifications.filter((n) => !n.is_read).length;
  const wallet = user.wallet;
  const walletLine = wallet
    ? `Wallet ${maskWalletId(wallet.espees_wallet_id)} · ${wallet.status.charAt(0).toUpperCase()}${wallet.status.slice(1)}`
    : 'Your Espees wallet is being provisioned.';
  const pending = buildPending(data.orders, data.conversations);
  const activity = buildActivity(data.orders, data.notifications, 5);
  const businesses = [...data.businesses].sort(byRating).slice(0, 6);
  const campaigns = data.campaigns.slice(0, 3);

  function soon() {
    setSoonNote(true);
  }

  function openPending(item: PendingItem) {
    router.push(item.kind === 'order' ? '/pay' : '/community');
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          testID="home-scroll"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={Brand.gold}
              colors={[Brand.royal]}
            />
          }>
          <HomeHeader
            greeting={greetingFor(now)}
            firstName={firstName}
            initials={initialsOf(user.full_name, user.email)}
            unread={unread}
            onBell={() => void markAllRead()}
            onProfile={() => router.push('/profile')}
          />
          <BalanceCard
            walletLine={walletLine}
            onFund={soon}
            onSend={() => router.push('/pay')}
          />
          {soonNote && (
            <ThemedText style={styles.soonNote}>Funding, receiving and withdrawals are coming soon.</ThemedText>
          )}
          <Section>
            <HomeSectionHeader title="Quick actions" />
            <QuickActionGrid
              actions={[
                { label: 'Receive', copy: 'Get paid in Espees', icon: 'arrow-down', onPress: soon },
                { label: 'Withdraw', copy: 'Cash out to your local currency', icon: 'cash-outline', onPress: soon },
                { label: 'Discover', copy: 'Find businesses and services', icon: 'search', onPress: () => router.push('/discover') },
                { label: 'Build', copy: 'Start or grow a business', icon: 'construct-outline', onPress: () => router.push('/build') },
              ]}
            />
          </Section>

          {loaded && pending.length > 0 && (
            <Section>
              <HomeSectionHeader title="Pending actions" />
              <PendingList items={pending} onPress={openPending} />
            </Section>
          )}

          <Section>
            <HomeSectionHeader
              title="Recent activity"
              action={{ label: 'See all activity', onPress: () => router.push('/transactions') }}
            />
            {!loaded ? (
              <Skeleton rows={3} />
            ) : activity.length === 0 ? (
              <EmptyNote message="No activity yet." />
            ) : (
              <ActivityList items={activity} now={now} />
            )}
          </Section>

          <Section>
            <HomeSectionHeader
              title="Recommended businesses"
              action={{ label: 'See all businesses', onPress: () => router.push('/discover') }}
            />
            {!loaded ? (
              <Skeleton rows={1} />
            ) : businesses.length === 0 ? (
              <EmptyNote message="No businesses to show yet." />
            ) : (
              <BusinessRow businesses={businesses} onPress={(b) => router.push(`/business/${b.id}`)} />
            )}
          </Section>

          <Section>
            <HomeSectionHeader
              title="Opportunities"
              action={{ label: 'See all opportunities', onPress: () => router.push('/discover') }}
            />
            {!loaded ? (
              <Skeleton rows={2} />
            ) : campaigns.length === 0 ? (
              <EmptyNote message="No campaigns right now." />
            ) : (
              campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} onPress={() => router.push('/discover')} />
              ))
            )}
          </Section>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <AuthGate title="Home" blurb="Sign in to see your dashboard.">
      <Dashboard />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth, backgroundColor: Brand.paper },
  scroll: { paddingBottom: TabBar.clearance },
  soonNote: { marginHorizontal: Spacing.four, marginTop: Spacing.two, color: Brand.bronze, fontSize: 13, fontWeight: '600' },
});

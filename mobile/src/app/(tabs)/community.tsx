import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InboxList, InboxRow, RecentStrip } from '@/components/community-parts';
import { SearchBar, StateMessage } from '@/components/discover-parts';
import { Skeleton } from '@/components/home-parts';
import { FilterChips } from '@/components/pay-parts';
import { ThemedText } from '@/components/themed-text';
import { AuthGate } from '@/components/ui';
import { Brand, MaxContentWidth, Spacing, TabBar } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { filterConversations, type InboxFilter } from '@/lib/community';
import type { Conversation } from '@/lib/types';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'business', label: 'Businesses' },
  { id: 'order', label: 'Orders' },
  { id: 'campaign', label: 'Campaigns' },
] as const satisfies readonly { id: InboxFilter; label: string }[];

function CommunityBody() {
  const router = useRouter();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');

  const load = useCallback(async () => {
    try {
      setConvos(await api.getList<Conversation>('/api/v1/conversations/'));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load conversations.'));
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

  if (!user) return null;
  const now = new Date();
  const rows = filterConversations(convos, { query, filter }, user.id);
  const unreadTotal = convos.reduce((n, c) => n + c.unread_count, 0);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Brand.gold} colors={[Brand.royal]} />
          }>
          <View style={styles.headingRow}>
            <View style={styles.heading}>
              <ThemedText style={styles.title}>Community</ThemedText>
              <ThemedText style={styles.subtitle}>
                {unreadTotal > 0 ? `${unreadTotal} unread ${unreadTotal === 1 ? 'message' : 'messages'}` : 'Conversations with businesses, buyers and backers.'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Find someone to message"
              onPress={() => router.push('/discover')}
              style={styles.compose}>
              <Ionicons name="create-outline" size={22} color={Brand.royal} />
            </Pressable>
          </View>
          {loaded && convos.length > 0 && (
            <RecentStrip
              conversations={filterConversations(convos, { query: '', filter: 'all' }, user.id).slice(0, 10)}
              myId={user.id}
              onPress={(c) => router.push(`/conversation/${c.id}`)}
            />
          )}
          <SearchBar value={query} onChange={setQuery} placeholder="Search people, businesses, campaigns" />
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
          {!!error && <ThemedText style={styles.error}>{error}</ThemedText>}
          {!loaded ? (
            <Skeleton rows={4} />
          ) : rows.length === 0 ? (
            <StateMessage
              icon="chatbubbles-outline"
              title={convos.length === 0 ? 'No conversations yet' : 'No conversations match'}
            />
          ) : (
            <InboxList>
              {rows.map((c, i) => (
                <InboxRow key={c.id} conversation={c} myId={user.id} now={now} first={i === 0} onPress={() => router.push(`/conversation/${c.id}`)} />
              ))}
            </InboxList>
          )}
          {loaded && convos.length === 0 && (
            <ThemedText style={styles.hint}>
              Open a business in Discover and tap Message to start one.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function CommunityScreen() {
  return (
    <AuthGate title="Community" blurb="Sign in to message businesses and members.">
      <CommunityBody />
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  safe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scroll: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: TabBar.clearance, gap: Spacing.three },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  heading: { flex: 1, gap: 2 },
  compose: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: '#E3E8F7', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: Brand.ink },
  subtitle: { fontSize: 14, color: Brand.body },
  error: { color: '#B0382B', fontSize: 14, fontWeight: '600' },
  hint: { textAlign: 'center', fontSize: 13, color: Brand.body },
});

import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import {
  AuthGate,
  Card,
  Hero,
  ListCard,
  NoticeText,
  OutlineButton,
  QuickActions,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AppNotification, Campaign } from '@/lib/types';

function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<AppNotification[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [all, camps] = await Promise.all([
        api.getList<AppNotification>('/api/v1/notifications/'),
        api.getList<Campaign>('/api/v1/campaigns/'),
      ]);
      setNotes(all.filter((n) => !n.is_read).slice(0, 3));
      setCampaigns(camps.slice(0, 3));
    } catch {
      setNotes([]);
      setCampaigns([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function markAllRead() {
    try {
      await api.post('/api/v1/notifications/read-all/', {});
      setNotes([]);
      setNotice('All notifications marked as read.');
    } catch {
      setNotice(null);
    }
  }

  if (!user) return null;
  const firstName = (user.full_name || user.email).split(' ')[0];

  return (
    <>
      <Hero
        title={`Hello, ${firstName}`}
        accent="Welcome back"
        copy={
          user.wallet
            ? `Wallet ${user.wallet.espees_wallet_id} · ${user.wallet.status}`
            : 'Your Espees wallet is being provisioned.'
        }
        cta="Pay now"
        onCta={() => router.push('/pay')}
      />

      <QuickActions
        actions={[
          { label: 'Pay', glyph: '₦', onPress: () => router.push('/pay') },
          { label: 'Discover', glyph: '◎', tint: '#F3E9CF', onPress: () => router.push('/discover') },
          { label: 'Wallet', glyph: '▣', tint: '#E7E4F5', onPress: () => router.push('/wallet') },
          { label: 'Build', glyph: '✚', tint: '#E4F3E8', onPress: () => router.push('/build') },
        ]}
      />

      <SectionHeader title="Opportunities" action="View All" onAction={() => router.push('/discover')} />
      {campaigns.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No campaigns right now — check back soon.
        </ThemedText>
      ) : (
        campaigns.map((c) => (
          <ListCard
            key={c.id}
            title={c.title}
            pill="Campaign"
            meta={[
              `Goal ${c.goal_espees} · raised ${c.raised_espees ?? '–'}`,
              `${c.contribution_count} contributions · ${c.status}`,
            ]}
          />
        ))
      )}

      <SectionHeader title="Notifications" />
      {notes.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          You are all caught up.
        </ThemedText>
      ) : (
        <>
          {notes.map((n) => (
            <Card key={n.id}>
              <ThemedText type="smallBold">{n.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {n.message}
              </ThemedText>
            </Card>
          ))}
          <OutlineButton title="Mark all as read" onPress={() => void markAllRead()} />
        </>
      )}
      <NoticeText message={notice} />

      <OutlineButton title="Sign out" color="#c0392b" onPress={() => void logout()} />
    </>
  );
}

export default function HomeScreen() {
  return (
    <AuthGate title="Home" blurb="Sign in to see your dashboard.">
      <Screen>
        <Dashboard />
      </Screen>
    </AuthGate>
  );
}

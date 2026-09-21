import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Block,
  BAR_CLEARANCE,
  DetailHero,
  DetailSheet,
  GlassChip,
  InfoRow,
  OfferingCarousel,
  Panel,
  StatTile,
  StickyBar,
} from '@/components/detail-parts';
import { StateMessage } from '@/components/discover-parts';
import { Skeleton } from '@/components/home-parts';
import { ThemedText } from '@/components/themed-text';
import { ErrorText } from '@/components/ui';
import { Brand, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import { categoryIcon } from '@/lib/discover';
import type { Business, Offering } from '@/lib/types';

export default function BusinessProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, products, services] = await Promise.all([
        api.get<Business>(`/api/v1/businesses/${id}/`),
        api.getList<Offering>(`/api/v1/products/?business=${id}`).catch(() => [] as Offering[]),
        api.getList<Offering>(`/api/v1/services/?business=${id}`).catch(() => [] as Offering[]),
      ]);
      setBusiness(detail);
      setOfferings([...products, ...services]);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function retry() {
    setStatus('loading');
    void load();
  }

  async function message() {
    setError(null);
    setBusy(true);
    try {
      const conversation = await api.post<{ id: string }>('/api/v1/conversations/', { business: id });
      router.push(`/conversation/${conversation.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not start the conversation.'));
    } finally {
      setBusy(false);
    }
  }

  const verified = business?.verification_status === 'verified';
  const pending = business?.verification_status === 'pending';

  return (
    <View style={styles.root}>
      {/* The photo/gradient hero runs under the status bar, so these pages need light icons. */}
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BAR_CLEARANCE }}>
        <DetailHero
          seed={business?.name ?? 'business'}
          icon={categoryIcon(business?.category)}
          imageUrl={business?.cover_image ?? business?.logo}
          onBack={() => router.back()}
          right={
            verified || pending ? (
              <GlassChip
                icon={verified ? 'checkmark-circle' : 'time-outline'}
                label={verified ? 'Verified' : 'Verification pending'}
              />
            ) : undefined
          }>
          {business && (
            <>
              {!!business.category && (
                <GlassChip label={business.category} label2={`Category ${business.category}`} />
              )}
              <ThemedText style={styles.name} numberOfLines={2}>
                {business.name}
              </ThemedText>
              <View style={styles.metaRow}>
                {!!business.location && (
                  <View style={styles.meta}>
                    <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.9)" />
                    <ThemedText style={styles.metaText}>{business.location}</ThemedText>
                  </View>
                )}
              </View>
            </>
          )}
        </DetailHero>

        <DetailSheet>
          {status === 'error' ? (
            <StateMessage
              icon="cloud-offline-outline"
              title="Could not load this business."
              action={{ label: 'Try again', onPress: retry }}
            />
          ) : status === 'loading' || !business ? (
            <Skeleton rows={4} />
          ) : (
            <>
              <View style={styles.stats}>
                <StatTile
                  icon="star"
                  value={business.average_rating == null ? 'New' : business.average_rating.toFixed(1)}
                  label="Rating"
                />
                <StatTile icon="chatbubble-ellipses-outline" value={String(business.review_count)} label="Reviews" />
                <StatTile icon="grid-outline" value={String(offerings.length)} label="Listings" />
              </View>

              <Panel>
                <InfoRow
                  icon="cash-outline"
                  title="Accepts Espees"
                  copy="Pay and get paid securely inside the network"
                  last
                />
              </Panel>

              {!!business.description && (
                <Block title="About">
                  <ThemedText style={styles.about}>{business.description}</ThemedText>
                </Block>
              )}

              <Block title="Products & services">
                {offerings.length === 0 ? (
                  <ThemedText style={styles.about}>No products or services listed yet.</ThemedText>
                ) : (
                  <OfferingCarousel
                    offerings={offerings}
                    onPress={(o) => router.push(`/offering/${o.id}`)}
                  />
                )}
              </Block>

              {(!!business.contact_phone || !!business.contact_email) && (
                <Block title="Contact">
                  <Panel>
                    {!!business.contact_phone && (
                      <ContactRow
                        icon="call-outline"
                        label="Call"
                        value={business.contact_phone}
                        url={`tel:${business.contact_phone}`}
                        last={!business.contact_email}
                      />
                    )}
                    {!!business.contact_email && (
                      <ContactRow
                        icon="mail-outline"
                        label="Email"
                        value={business.contact_email}
                        url={`mailto:${business.contact_email}`}
                        last
                      />
                    )}
                  </Panel>
                </Block>
              )}
            </>
          )}
        </DetailSheet>
      </ScrollView>

      {status === 'ready' && business && (
        <StickyBar>
          <ErrorText message={error} />
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Message"
              onPress={() => void message()}
              disabled={busy}
              style={[styles.message, busy && { opacity: 0.6 }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Brand.deep} />
              <ThemedText style={styles.messageText}>{busy ? 'Opening…' : 'Message'}</ThemedText>
            </Pressable>
            {!!business.contact_phone && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call business"
                onPress={() => void Linking.openURL(`tel:${business.contact_phone}`)}
                style={styles.call}>
                <Ionicons name="call" size={20} color={Brand.white} />
              </Pressable>
            )}
          </View>
        </StickyBar>
      )}
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  url,
  last,
}: {
  icon: 'call-outline' | 'mail-outline';
  label: string;
  value: string;
  url: string;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      onPress={() => void Linking.openURL(url)}
      style={[styles.contactRow, !last && styles.contactDivider]}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={18} color={Brand.royal} />
      </View>
      <ThemedText style={styles.contactValue} numberOfLines={1}>
        {value}
      </ThemedText>
      <Ionicons name="chevron-forward" size={16} color="#9AA0AE" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  name: { color: Brand.white, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: Spacing.three },
  about: { fontSize: 14, lineHeight: 21, color: Brand.body },
  actions: { flexDirection: 'row', gap: Spacing.three },
  message: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 54,
    borderRadius: 999,
    backgroundColor: Brand.gold,
  },
  messageText: { color: Brand.deep, fontWeight: '800', fontSize: 16 },
  call: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Brand.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.three },
  contactDivider: { borderBottomWidth: 1, borderBottomColor: '#E9EAF0' },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#E3E8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactValue: { flex: 1, fontSize: 14, fontWeight: '600', color: Brand.ink },
});

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  BAR_CLEARANCE,
  Block,
  DetailHero,
  DetailSheet,
  GlassChip,
  OfferingCarousel,
  Panel,
  StickyBar,
} from '@/components/detail-parts';
import { StateMessage } from '@/components/discover-parts';
import { Skeleton } from '@/components/home-parts';
import { ThemedText } from '@/components/themed-text';
import { ErrorText, NoticeText } from '@/components/ui';
import { Brand, Spacing } from '@/constants/theme';
import { api, errorMessage } from '@/lib/api';
import type { Business, Offering, Order } from '@/lib/types';

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailDivider]}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue}>{value}</ThemedText>
    </View>
  );
}

export default function OfferingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [more, setMore] = useState<Offering[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      let detail: Offering;
      try {
        detail = await api.get<Offering>(`/api/v1/products/${id}/`);
      } catch {
        detail = await api.get<Offering>(`/api/v1/services/${id}/`);
      }
      const [biz, products, services] = await Promise.allSettled([
        api.get<Business>(`/api/v1/businesses/${detail.business}/`),
        api.getList<Offering>(`/api/v1/products/?business=${detail.business}`),
        api.getList<Offering>(`/api/v1/services/?business=${detail.business}`),
      ]);
      setOffering(detail);
      setBusiness(biz.status === 'fulfilled' ? biz.value : null);
      const others = [
        ...(products.status === 'fulfilled' ? products.value : []),
        ...(services.status === 'fulfilled' ? services.value : []),
      ].filter((o) => o.id !== detail.id);
      setMore(others.slice(0, 8));
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

  const unit = offering ? parseFloat(offering.price) || 0 : 0;
  const total = (unit * quantity).toFixed(2);

  async function placeOrder() {
    if (!offering) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const order = await api.post<Order>('/api/v1/orders/', {
        business: offering.business,
        items: [{ offering: offering.id, quantity }],
      });
      setNotice(`Order placed · ${order.total} ESP · ${capitalise(order.status)}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not place the order.'));
    } finally {
      setBusy(false);
    }
  }

  const isService = offering?.kind === 'service';
  const kindLabel = isService ? 'Service' : 'Product';
  const verified = business?.verification_status === 'verified';

  return (
    <View style={styles.root}>
      {/* The photo/gradient hero runs under the status bar, so these pages need light icons. */}
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BAR_CLEARANCE }}>
        <DetailHero
          seed={offering?.business_name || offering?.name || 'listing'}
          icon={isService ? 'construct-outline' : 'cube-outline'}
          imageUrl={offering?.image}
          height={290}
          onBack={() => router.back()}>
          {offering && (
            <>
              <GlassChip label={kindLabel} label2={`Type ${kindLabel}`} />
              <ThemedText style={styles.name} numberOfLines={3}>
                {offering.name}
              </ThemedText>
              <View testID="price-chip" style={styles.priceChip}>
                <ThemedText style={styles.priceText}>{`${offering.price} ESP`}</ThemedText>
              </View>
            </>
          )}
        </DetailHero>

        <DetailSheet>
          {status === 'error' ? (
            <StateMessage
              icon="cloud-offline-outline"
              title="Could not load this listing."
              action={{ label: 'Try again', onPress: retry }}
            />
          ) : status === 'loading' || !offering ? (
            <Skeleton rows={4} />
          ) : (
            <>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color={Brand.gold} />
                {offering.review_count > 0 && offering.average_rating != null ? (
                  <>
                    <ThemedText style={styles.rating}>{offering.average_rating.toFixed(1)}</ThemedText>
                    <ThemedText style={styles.muted}>{`${offering.review_count} reviews`}</ThemedText>
                  </>
                ) : (
                  <ThemedText style={styles.muted}>No reviews yet</ThemedText>
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={offering.business_name}
                onPress={() => router.push(`/business/${offering.business}`)}
                style={({ pressed }) => [styles.seller, pressed && { opacity: 0.9 }]}>
                <View style={styles.sellerLogo}>
                  <ThemedText style={styles.sellerInitial}>
                    {offering.business_name.charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText style={styles.eyebrow}>Sold by</ThemedText>
                  <View style={styles.sellerName}>
                    <ThemedText style={styles.sellerTitle} numberOfLines={1}>
                      {offering.business_name}
                    </ThemedText>
                    {verified && (
                      <View accessibilityLabel="Verified">
                        <Ionicons name="checkmark-circle" size={16} color={Brand.royal} />
                      </View>
                    )}
                  </View>
                  {!!business?.location && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={13} color={Brand.body} />
                      <ThemedText style={styles.muted}>{business.location}</ThemedText>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9AA0AE" />
              </Pressable>

              {!!offering.description && (
                <Block title={`About this ${kindLabel.toLowerCase()}`}>
                  <ThemedText style={styles.about}>{offering.description}</ThemedText>
                </Block>
              )}

              <Panel>
                <DetailRow label="Type" value={kindLabel} last={!offering.category} />
                {!!offering.category && <DetailRow label="Category" value={offering.category} last />}
              </Panel>

              {more.length > 0 && (
                <Block title={`More from ${offering.business_name}`}>
                  <OfferingCarousel offerings={more} onPress={(o) => router.push(`/offering/${o.id}`)} />
                </Block>
              )}
            </>
          )}
        </DetailSheet>
      </ScrollView>

      {status === 'ready' && offering && (
        <StickyBar>
          <ErrorText message={error} />
          <NoticeText message={notice} />
          <View style={styles.orderRow}>
            <View>
              <ThemedText style={styles.muted}>Total</ThemedText>
              <ThemedText accessibilityLabel={`Order total ${total} ESP`} style={styles.total}>
                {`${total} ESP`}
              </ThemedText>
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                accessibilityState={{ disabled: quantity <= 1 }}
                disabled={quantity <= 1}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={[styles.stepButton, quantity <= 1 && { opacity: 0.4 }]}>
                <Ionicons name="remove" size={20} color={Brand.royal} />
              </Pressable>
              <ThemedText style={styles.quantity}>{String(quantity)}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                onPress={() => setQuantity((q) => q + 1)}
                style={styles.stepButton}>
                <Ionicons name="add" size={20} color={Brand.royal} />
              </Pressable>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Place order"
            onPress={() => void placeOrder()}
            disabled={busy || !offering.is_active}
            style={[styles.order, (busy || !offering.is_active) && { opacity: 0.6 }]}>
            <Ionicons name="bag-check-outline" size={20} color={Brand.deep} />
            <ThemedText style={styles.orderText}>
              {busy ? 'Placing order…' : offering.is_active ? 'Place order' : 'No longer available'}
            </ThemedText>
          </Pressable>
        </StickyBar>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  name: { color: Brand.white, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  priceChip: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.gold,
    borderRadius: 999,
    paddingHorizontal: Spacing.four,
    paddingVertical: 8,
    marginTop: 2,
  },
  priceText: { color: Brand.deep, fontSize: 18, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  muted: { fontSize: 13, color: Brand.body },
  seller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 22,
    backgroundColor: Brand.white,
    borderWidth: 1,
    borderColor: '#E9EAF0',
  },
  sellerLogo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Brand.royal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInitial: { color: Brand.gold, fontSize: 22, fontWeight: '800' },
  eyebrow: {
    color: Brand.bronze,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sellerName: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sellerTitle: { flexShrink: 1, fontSize: 16, fontWeight: '800', color: Brand.ink },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  about: { fontSize: 14, lineHeight: 21, color: Brand.body },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  detailDivider: { borderBottomWidth: 1, borderBottomColor: '#E9EAF0' },
  detailLabel: { fontSize: 14, color: Brand.body },
  detailValue: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  orderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  total: { fontSize: 22, fontWeight: '800', color: Brand.ink },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#ECEEF4',
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: { minWidth: 22, textAlign: 'center', fontSize: 17, fontWeight: '800', color: Brand.ink },
  order: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 56,
    borderRadius: 999,
    backgroundColor: Brand.gold,
  },
  orderText: { color: Brand.deep, fontWeight: '800', fontSize: 16 },
});

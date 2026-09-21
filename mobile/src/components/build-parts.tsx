import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatEsp } from '@/lib/pay';
import { itemsSummary } from '@/lib/transactions';
import { orderActions } from '@/lib/build';
import { relativeTime } from '@/lib/home';
import type { Business, Order, SupplierRequest } from '@/lib/types';

type IconName = ComponentProps<typeof Ionicons>['name'];
const LINE = '#E9EAF0';
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Form screen: back button, title, scrollable fields and a pinned-feel submit button. */
export function FormShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.formRoot}>
      <SafeAreaView style={styles.formSafe}>
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8} style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={Brand.royal} />
            </Pressable>
            <View style={{ gap: 4 }}>
              <ThemedText style={styles.formTitle}>{title}</ThemedText>
              {!!subtitle && <ThemedText style={styles.formSubtitle}>{subtitle}</ThemedText>}
            </View>
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function GoldSubmit({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.submit, busy && { opacity: 0.6 }]}>
      <ThemedText style={styles.submitText}>{busy ? 'Saving…' : label}</ThemedText>
    </Pressable>
  );
}

export function FormLabel({ children }: { children: string }) {
  return <ThemedText style={styles.groupLabel}>{children}</ThemedText>;
}

export function StatTile({ id, label, value, icon }: { id: string; label: string; value: string; icon: IconName }) {
  return (
    <View testID={`stat-${id}`} style={styles.stat}>
      <Ionicons name={icon} size={18} color={Brand.gold} />
      <ThemedText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText style={styles.statLabel} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

export function BusinessHero({
  business,
  stats,
  onOpen,
  onVerify,
}: {
  business: Business;
  stats: { pending: number; earned: string; products: number; services: number };
  onOpen: () => void;
  onVerify: () => void;
}) {
  const verified = business.verification_status === 'verified';
  return (
    <View style={styles.hero}>
      <View style={styles.orbBig} />
      <View style={styles.orbSmall} />
      <View style={styles.heroTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <ThemedText style={styles.heroName} numberOfLines={1}>
            {business.name}
          </ThemedText>
          <ThemedText style={styles.heroMeta} numberOfLines={1}>
            {[business.category, business.location].filter(Boolean).join(' · ') || 'Add a category and location'}
          </ThemedText>
        </View>
        <View style={[styles.verify, verified && styles.verifyOn]}>
          <Ionicons name={verified ? 'checkmark-circle' : 'time-outline'} size={14} color={verified ? Brand.deep : Brand.white} />
          <ThemedText style={[styles.verifyText, verified && { color: Brand.deep }]}>{verified ? 'Verified' : 'Unverified'}</ThemedText>
        </View>
      </View>
      <View style={styles.statsRow}>
        <StatTile id="pending" label="Pending" value={String(stats.pending)} icon="hourglass-outline" />
        <StatTile id="products" label="Products" value={String(stats.products)} icon="cube-outline" />
        <StatTile id="services" label="Services" value={String(stats.services)} icon="construct-outline" />
        <StatTile id="earned" label="Earned ESP" value={stats.earned} icon="wallet-outline" />
      </View>
      <View style={styles.heroLinks}>
        <Pressable accessibilityRole="button" accessibilityLabel="View public page" onPress={onOpen} style={styles.heroLink}>
          <ThemedText style={styles.heroLinkText}>View public page</ThemedText>
          <Ionicons name="arrow-forward" size={14} color={Brand.gold} />
        </Pressable>
        {business.verification_status !== 'verified' && (
          <Pressable accessibilityRole="button" accessibilityLabel="Get verified" onPress={onVerify} style={styles.heroLink}>
            <ThemedText style={styles.heroLinkText}>
              {business.verification_status === 'pending' ? 'Verification status' : 'Get verified'}
            </ThemedText>
            <Ionicons name="shield-checkmark-outline" size={14} color={Brand.gold} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function ActionGrid({
  actions,
}: {
  actions: { label: string; icon: IconName; onPress: () => void }[];
}) {
  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable key={a.label} accessibilityRole="button" accessibilityLabel={a.label} onPress={a.onPress} style={styles.tile}>
          <View style={styles.tileIcon}>
            <Ionicons name={a.icon} size={22} color={Brand.royal} />
          </View>
          <ThemedText style={styles.tileLabel} numberOfLines={1} adjustsFontSizeToFit>
            {a.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export function EmptyBusinessCard({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.hero}>
      <View style={styles.orbBig} />
      <View style={styles.orbSmall} />
      <Ionicons name="storefront-outline" size={30} color={Brand.gold} />
      <ThemedText style={styles.heroName}>Start your business</ThemedText>
      <ThemedText style={styles.heroMeta}>
        Create a profile, list products and services, and start receiving Espees orders.
      </ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel="Create your business" onPress={onCreate} style={styles.submit}>
        <ThemedText style={styles.submitText}>Create your business</ThemedText>
      </Pressable>
    </View>
  );
}

export function IncomingOrderCard({
  order,
  busy,
  now,
  onAction,
}: {
  order: Order;
  busy: boolean;
  now: Date;
  onAction: (next: 'confirmed' | 'fulfilled' | 'cancelled') => void;
}) {
  const actions = orderActions(order.status);
  return (
    <View style={styles.order}>
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.orderWho} numberOfLines={1}>
            {order.customer_email}
          </ThemedText>
          <ThemedText style={styles.orderItems} numberOfLines={1}>
            {itemsSummary(order)}
          </ThemedText>
          <ThemedText style={styles.orderWhen}>{`${capitalise(order.status)} · ${relativeTime(order.created_at, now)}`}</ThemedText>
        </View>
        <ThemedText style={styles.orderTotal}>{formatEsp(order.total)}</ThemedText>
      </View>
      {actions.length > 0 && (
        <View style={styles.orderActions}>
          {actions.map((a) => (
            <Pressable
              key={a.next}
              accessibilityRole="button"
              accessibilityLabel={`${a.label} order from ${order.customer_email}`}
              disabled={busy}
              onPress={() => onAction(a.next)}
              style={[styles.orderBtn, a.danger ? styles.orderBtnDanger : styles.orderBtnMain, busy && { opacity: 0.5 }]}>
              <ThemedText style={[styles.orderBtnText, a.danger && { color: '#B0382B' }]}>{a.label}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function OpportunityCard({ request }: { request: SupplierRequest }) {
  return (
    <View style={styles.opp}>
      <View style={styles.oppIcon}>
        <Ionicons name="briefcase-outline" size={20} color={Brand.royal} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <ThemedText style={styles.orderItems} numberOfLines={1}>
          {request.requesting_business_name}
        </ThemedText>
        <ThemedText style={styles.orderWho} numberOfLines={2}>
          {request.title}
        </ThemedText>
        <ThemedText style={styles.orderWhen}>
          {[
            request.budget_espees != null ? `Budget ${request.budget_espees} ESP` : null,
            `${request.quote_count} ${request.quote_count === 1 ? 'quote' : 'quotes'}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  formRoot: { flex: 1, backgroundColor: Brand.paper, alignItems: 'center' },
  formSafe: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  formScroll: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  back: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Brand.white,
    borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center',
  },
  formTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: Brand.ink },
  formSubtitle: { fontSize: 14, color: Brand.body },
  groupLabel: { fontSize: 12, fontWeight: '800', color: Brand.body, letterSpacing: 0.6, textTransform: 'uppercase' },
  submit: {
    height: 52, borderRadius: 26, backgroundColor: Brand.gold, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitText: { color: Brand.deep, fontWeight: '800', fontSize: 15 },
  hero: {
    borderRadius: 28, padding: Spacing.four, gap: Spacing.three, overflow: 'hidden',
    experimental_backgroundImage: 'linear-gradient(135deg, #2246B8, #0B298E)',
  },
  orbBig: {
    position: 'absolute', right: -50, top: -60, width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(218,191,121,0.16)',
  },
  orbSmall: {
    position: 'absolute', left: -30, bottom: -40, width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  heroName: { color: Brand.white, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  heroMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  verify: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)',
  },
  verifyOn: { backgroundColor: Brand.gold },
  verifyText: { color: Brand.white, fontSize: 11, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: {
    flex: 1, alignItems: 'center', gap: 2, paddingVertical: Spacing.two + 2, paddingHorizontal: 4,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: { color: Brand.white, fontSize: 18, fontWeight: '800', maxWidth: '100%' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  heroLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: Spacing.two },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLinkText: { color: Brand.gold, fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two + 2 },
  tile: {
    flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two + 2,
    padding: Spacing.three, borderRadius: 20, backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#E3E8F7', alignItems: 'center', justifyContent: 'center' },
  tileLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Brand.ink },
  order: { padding: Spacing.three, gap: Spacing.two + 2, borderRadius: 20, backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE },
  orderTop: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  orderWho: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  orderItems: { fontSize: 12, color: Brand.brandText },
  orderWhen: { fontSize: 12, color: Brand.body },
  orderTotal: { fontSize: 14, fontWeight: '800', color: Brand.royal },
  orderActions: { flexDirection: 'row', gap: Spacing.two },
  orderBtn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  orderBtnMain: { backgroundColor: Brand.royal },
  orderBtnDanger: { backgroundColor: '#FBE6E3' },
  orderBtnText: { color: Brand.white, fontWeight: '800', fontSize: 13 },
  opp: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three,
    borderRadius: 20, backgroundColor: Brand.white, borderWidth: 1, borderColor: LINE,
  },
  oppIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E3E8F7', alignItems: 'center', justifyContent: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Cover } from './discover-parts';
import { ThemedText } from './themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { relativeTime } from '@/lib/home';
import { formatEsp, statusTone, type StatusTone } from '@/lib/pay';
import { itemsSummary } from '@/lib/transactions';
import type { Offering, Order } from '@/lib/types';

const LINE = '#E9EAF0';

const iconFor = (o: Offering) => (o.kind === 'service' ? 'construct-outline' : 'cube-outline');
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function BasketCard({
  count,
  businesses,
  total,
  busy,
  onClear,
  onPay,
}: {
  count: number;
  businesses: number;
  total: string;
  busy: boolean;
  onClear: () => void;
  onPay: () => void;
}) {
  const empty = count === 0;
  return (
    <View style={styles.checkout}>
      <View style={styles.orbBig} />
      <View style={styles.orbSmall} />
      <View style={styles.checkoutTop}>
        <ThemedText style={styles.checkoutLabel}>You are paying</ThemedText>
        {!empty && (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear basket" onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}
      </View>
      {empty ? (
        <ThemedText style={styles.prompt}>Your basket is empty</ThemedText>
      ) : (
        <ThemedText style={styles.payFor}>
          {`${count} ${count === 1 ? 'item' : 'items'} · ${businesses} ${businesses === 1 ? 'business' : 'businesses'}`}
        </ThemedText>
      )}
      <ThemedText testID="basket-total" style={styles.total} adjustsFontSizeToFit numberOfLines={1}>
        {formatEsp(total)}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pay now"
        accessibilityState={{ disabled: busy || empty }}
        disabled={busy || empty}
        onPress={onPay}
        style={[styles.payBtn, (busy || empty) && styles.dim]}>
        <ThemedText style={styles.payBtnText}>{busy ? 'Processing…' : 'Pay now'}</ThemedText>
        {!busy && <Ionicons name="arrow-forward" size={18} color={Brand.deep} />}
      </Pressable>
    </View>
  );
}

export function PayOfferingRow({
  offering,
  quantity,
  onToggle,
  onQuantity,
}: {
  offering: Offering;
  quantity: number;
  onToggle: () => void;
  onQuantity: (next: number) => void;
}) {
  const selected = quantity > 0;
  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={offering.name}
        accessibilityState={{ selected }}
        onPress={onToggle}
        style={styles.rowMain}>
        <Cover seed={offering.business_name || offering.name} icon={iconFor(offering)} imageUrl={offering.image} style={styles.thumb} />
        <View style={styles.rowBody}>
          <ThemedText style={styles.rowEyebrow} numberOfLines={1}>
            {offering.business_name}
          </ThemedText>
          <ThemedText style={styles.rowName} numberOfLines={2}>
            {offering.name}
          </ThemedText>
          <ThemedText style={styles.rowPrice}>{formatEsp(offering.price)}</ThemedText>
        </View>
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={selected ? Brand.royal : '#C5C9D6'}
        />
      </Pressable>
      {selected && (
        <View style={styles.rowStepper}>
          <ThemedText style={styles.rowStepperLabel}>Quantity</ThemedText>
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity of ${offering.name}`}
              onPress={() => onQuantity(quantity - 1)}
              style={styles.stepBtn}>
              <Ionicons name="remove" size={18} color={Brand.royal} />
            </Pressable>
            <ThemedText style={styles.qty}>{String(quantity)}</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity of ${offering.name}`}
              onPress={() => onQuantity(quantity + 1)}
              style={styles.stepBtn}>
              <Ionicons name="add" size={18} color={Brand.royal} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export function FilterChips<T extends string | null>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string; a11y?: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="button"
            accessibilityLabel={o.a11y ?? o.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.id)}
            style={[styles.chip, active && styles.chipActive]}>
            <ThemedText style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const TONES: Record<StatusTone, { bg: string; fg: string }> = {
  pending: { bg: '#FBF3DC', fg: '#8F7440' },
  done: { bg: '#E2F4EA', fg: '#1F7A4D' },
  failed: { bg: '#FBE6E3', fg: '#B0382B' },
};

export function PaymentRow({ order, now, onCancel }: { order: Order; now: Date; onCancel?: () => void }) {
  const tone = TONES[statusTone(order.status)];
  return (
    <View style={styles.payment}>
      <View style={styles.paymentIcon}>
        <Ionicons name="arrow-up" size={18} color={Brand.royal} />
      </View>
      <View style={styles.rowBody}>
        <ThemedText style={styles.rowName} numberOfLines={1}>
          {order.business_name}
        </ThemedText>
        {!!itemsSummary(order) && (
          <ThemedText style={styles.rowPurpose} numberOfLines={1}>
            {itemsSummary(order)}
          </ThemedText>
        )}
        <ThemedText style={styles.rowEyebrow}>{relativeTime(order.created_at, now)}</ThemedText>
      </View>
      <View style={styles.paymentEnd}>
        <ThemedText style={styles.rowPrice}>{formatEsp(order.total)}</ThemedText>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <ThemedText style={[styles.statusText, { color: tone.fg }]}>{capitalise(order.status)}</ThemedText>
        </View>
        {!!onCancel && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cancel order with ${order.business_name}`}
            onPress={onCancel}
            hitSlop={8}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  checkout: {
    borderRadius: 28,
    padding: Spacing.four,
    gap: Spacing.two,
    overflow: 'hidden',
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
  checkoutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkoutLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  payee: { color: Brand.gold, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  payFor: { color: Brand.white, fontSize: 18, fontWeight: '700' },
  prompt: { color: Brand.white, fontSize: 18, fontWeight: '700' },
  total: { color: Brand.white, fontSize: 38, lineHeight: 46, fontWeight: '800', marginVertical: Spacing.one },
  stepper: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 3, backgroundColor: '#E3E8F7',
  },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qty: { color: Brand.deep, fontWeight: '800', fontSize: 15, minWidth: 28, textAlign: 'center' },
  payBtn: {
    height: 48, borderRadius: 24, backgroundColor: Brand.gold, marginTop: Spacing.one,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
  },
  payBtnText: { color: Brand.deep, fontWeight: '800', fontSize: 15 },
  dim: { opacity: 0.5 },
  row: {
    gap: Spacing.two, padding: Spacing.two + 2,
    borderRadius: 20, backgroundColor: Brand.white, borderWidth: 1.5, borderColor: LINE,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowStepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: LINE,
  },
  rowStepperLabel: { fontSize: 13, fontWeight: '600', color: Brand.body },
  rowPurpose: { fontSize: 12, color: Brand.brandText },
  chips: { gap: Spacing.two, paddingRight: Spacing.four },
  chip: { paddingHorizontal: Spacing.three + 2, paddingVertical: Spacing.two, borderRadius: 999, backgroundColor: '#ECEEF4' },
  chipActive: { backgroundColor: Brand.royal },
  chipText: { fontSize: 13, fontWeight: '700', color: Brand.ink },
  chipTextActive: { color: Brand.white },
  rowSelected: { borderColor: Brand.royal, backgroundColor: '#F1F4FD' },
  thumb: { width: 56, height: 56, borderRadius: 16 },
  rowBody: { flex: 1, gap: 2 },
  rowEyebrow: { fontSize: 12, color: Brand.body },
  rowName: { fontSize: 15, fontWeight: '700', color: Brand.ink },
  rowPrice: { fontSize: 14, fontWeight: '800', color: Brand.royal },
  payment: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  paymentIcon: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: '#E3E8F7',
    alignItems: 'center', justifyContent: 'center',
  },
  paymentEnd: { alignItems: 'flex-end', gap: 4 },
  cancelText: { fontSize: 12, fontWeight: '800', color: '#B0382B' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '800' },
});

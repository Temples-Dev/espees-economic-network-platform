import { matchesQuery } from '@/lib/discover';
import type { Offering } from '@/lib/types';

export type KindFilter = 'all' | 'product' | 'service';
export type StatusTone = 'pending' | 'done' | 'failed';

export function lineTotal(price: string, quantity: number): string {
  const cents = Math.round((parseFloat(price) || 0) * 100) * quantity;
  return (cents / 100).toFixed(2);
}

export function formatEsp(amount: string): string {
  const n = parseFloat(amount) || 0;
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ESP`;
}

export function clampQuantity(n: number): number {
  return Math.min(99, Math.max(1, n));
}

export function filterByKind(offerings: Offering[], kind: KindFilter): Offering[] {
  return kind === 'all' ? offerings : offerings.filter((o) => o.kind === kind);
}

export function statusTone(status: string): StatusTone {
  if (['completed', 'paid', 'confirmed', 'fulfilled'].includes(status)) return 'done';
  if (['cancelled', 'failed', 'refunded'].includes(status)) return 'failed';
  return 'pending';
}

/** Offering id → quantity. */
export type Basket = Record<string, number>;

export type BusinessOrder = {
  businessId: string;
  businessName: string;
  items: { offering: string; quantity: number }[];
  subtotal: string;
};

/** The API takes one business per order, so a mixed basket becomes one order per business. */
export function groupByBusiness(offerings: Offering[], basket: Basket): BusinessOrder[] {
  const groups = new Map<string, BusinessOrder & { cents: number }>();
  for (const o of offerings) {
    const quantity = basket[o.id];
    if (!quantity) continue;
    const g = groups.get(o.business) ?? {
      businessId: o.business,
      businessName: o.business_name,
      items: [],
      subtotal: '0.00',
      cents: 0,
    };
    g.items.push({ offering: o.id, quantity });
    g.cents += Math.round((parseFloat(o.price) || 0) * 100) * quantity;
    g.subtotal = (g.cents / 100).toFixed(2);
    groups.set(o.business, g);
  }
  return [...groups.values()].map(({ cents: _cents, ...g }) => g);
}

export function basketSummary(offerings: Offering[], basket: Basket) {
  const groups = groupByBusiness(offerings, basket);
  const cents = groups.reduce((sum, g) => sum + Math.round(parseFloat(g.subtotal) * 100), 0);
  const count = groups.reduce((sum, g) => sum + g.items.reduce((n, i) => n + i.quantity, 0), 0);
  return { count, businesses: groups.length, total: (cents / 100).toFixed(2) };
}

export function matchesOffering(o: Offering, query: string): boolean {
  return matchesQuery(query, o.name, o.business_name, o.category, o.description);
}

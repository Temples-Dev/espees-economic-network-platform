import { matchesQuery } from '@/lib/discover';
import type { Order } from '@/lib/types';

export type DateRange = 'all' | '7d' | '30d' | '90d';

export type TransactionFilters = {
  query: string;
  range: DateRange;
  business: string | null;
  status: string;
};

const DAYS: Record<Exclude<DateRange, 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 };

/** Newest first. "Purpose" is what was bought: the order's item names. */
export function filterOrders(orders: Order[], f: TransactionFilters, now: Date): Order[] {
  const cutoff = f.range === 'all' ? null : now.getTime() - DAYS[f.range] * 86400000;
  return orders
    .filter((o) => {
      if (cutoff !== null && Date.parse(o.created_at) < cutoff) return false;
      if (f.business && o.business !== f.business) return false;
      if (f.status !== 'all' && o.status !== f.status) return false;
      return matchesQuery(f.query, o.business_name, ...o.items.map((i) => i.offering_name));
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function distinctBusinesses(orders: Order[]): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const o of orders) seen.set(o.business, o.business_name);
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

export function itemsSummary(order: Order): string {
  const names = order.items.map((i) => i.offering_name);
  return names.length > 3 ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more` : names.join(', ');
}

export function ordersTotal(orders: Order[]): string {
  const cents = orders.reduce((sum, o) => sum + Math.round((parseFloat(o.total) || 0) * 100), 0);
  return (cents / 100).toFixed(2);
}

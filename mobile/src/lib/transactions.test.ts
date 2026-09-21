import {
  distinctBusinesses,
  filterOrders,
  itemsSummary,
  ordersTotal,
  type TransactionFilters,
} from '@/lib/transactions';
import type { Order } from '@/lib/types';

const NOW = new Date('2026-09-21T12:00:00Z');
const order = (id: string, biz: string, bizId: string, total: string, at: string, names: string[], status = 'pending') =>
  ({
    id, business: bizId, business_name: biz, total, status, created_at: at,
    items: names.map((n, i) => ({ id: `${id}${i}`, offering_name: n, quantity: 1, unit_price: '1', line_total: '1' })),
  }) as unknown as Order;

const orders = [
  order('1', 'Mama Tees', 'b1', '20.00', '2026-09-20T10:00:00Z', ['Tee Shirt']),
  order('2', 'Kofi Tech', 'b2', '80.00', '2026-09-05T10:00:00Z', ['Laptop Repair'], 'fulfilled'),
  order('3', 'Mama Tees', 'b1', '15.00', '2026-06-01T10:00:00Z', ['Cap', 'Socks'], 'cancelled'),
];
const none: TransactionFilters = { query: '', range: 'all', business: null, status: 'all' };

describe('transactions helpers', () => {
  it('returns everything, newest first, with no filters', () => {
    expect(filterOrders(orders, none, NOW).map((o) => o.id)).toEqual(['1', '2', '3']);
  });

  it('searches business name and purpose (item names)', () => {
    expect(filterOrders(orders, { ...none, query: 'kofi' }, NOW).map((o) => o.id)).toEqual(['2']);
    expect(filterOrders(orders, { ...none, query: 'socks' }, NOW).map((o) => o.id)).toEqual(['3']);
  });

  it('filters by date range', () => {
    expect(filterOrders(orders, { ...none, range: '7d' }, NOW).map((o) => o.id)).toEqual(['1']);
    expect(filterOrders(orders, { ...none, range: '30d' }, NOW).map((o) => o.id)).toEqual(['1', '2']);
    expect(filterOrders(orders, { ...none, range: '90d' }, NOW).map((o) => o.id)).toEqual(['1', '2']);
  });

  it('filters by business and status, and combines filters', () => {
    expect(filterOrders(orders, { ...none, business: 'b1' }, NOW).map((o) => o.id)).toEqual(['1', '3']);
    expect(filterOrders(orders, { ...none, status: 'fulfilled' }, NOW).map((o) => o.id)).toEqual(['2']);
    expect(filterOrders(orders, { ...none, business: 'b1', range: '30d' }, NOW).map((o) => o.id)).toEqual(['1']);
  });

  it('lists distinct businesses alphabetically', () => {
    expect(distinctBusinesses(orders)).toEqual([
      { id: 'b2', name: 'Kofi Tech' },
      { id: 'b1', name: 'Mama Tees' },
    ].sort((a, b) => a.name.localeCompare(b.name)));
  });

  it('summarises items and totals', () => {
    expect(itemsSummary(orders[2])).toBe('Cap, Socks');
    expect(itemsSummary({ ...orders[0], items: [] })).toBe('');
    expect(itemsSummary(order('9', 'x', 'b', '1', '2026-01-01T00:00:00Z', ['A', 'B', 'C', 'D']))).toBe('A, B +2 more');
    expect(ordersTotal(orders)).toBe('115.00');
  });
});

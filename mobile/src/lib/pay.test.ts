import {
  basketSummary,
  clampQuantity,
  filterByKind,
  formatEsp,
  groupByBusiness,
  lineTotal,
  matchesOffering,
  statusTone,
} from '@/lib/pay';
import type { Offering } from '@/lib/types';

const off = (kind: string, id: string) => ({ id, kind }) as Offering;

describe('pay helpers', () => {
  it('multiplies price by quantity to two decimals', () => {
    expect(lineTotal('80.00', 3)).toBe('240.00');
    expect(lineTotal('0.10', 3)).toBe('0.30');
    expect(lineTotal('abc', 2)).toBe('0.00');
  });

  it('formats amounts with thousands separators and the ESP unit', () => {
    expect(formatEsp('1234.5')).toBe('1,234.50 ESP');
    expect(formatEsp('80')).toBe('80.00 ESP');
  });

  it('keeps quantity between 1 and 99', () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(150)).toBe(99);
    expect(clampQuantity(4)).toBe(4);
  });

  it('filters offerings by kind, all keeps everything', () => {
    const list = [off('product', 'a'), off('service', 'b')];
    expect(filterByKind(list, 'all')).toHaveLength(2);
    expect(filterByKind(list, 'product').map((o) => o.id)).toEqual(['a']);
    expect(filterByKind(list, 'service').map((o) => o.id)).toEqual(['b']);
  });

  it('maps order status to a tone', () => {
    expect(statusTone('pending')).toBe('pending');
    expect(statusTone('completed')).toBe('done');
    expect(statusTone('paid')).toBe('done');
    expect(statusTone('cancelled')).toBe('failed');
    expect(statusTone('whatever')).toBe('pending');
  });

  const full = (id: string, business: string, name: string, price: string, extra = {}) =>
    ({ id, business, business_name: `Biz ${business}`, name, price, kind: 'product', ...extra }) as Offering;
  const A = full('a', 'b1', 'Tee', '20.00');
  const B = full('b', 'b2', 'Repair', '80.00');
  const C = full('c', 'b1', 'Cap', '5.50');

  it('groups the basket into one order per business with subtotals', () => {
    const groups = groupByBusiness([A, B, C], { a: 2, b: 1, c: 1 });
    expect(groups).toHaveLength(2);
    const b1 = groups.find((g) => g.businessId === 'b1')!;
    expect(b1.items).toEqual([
      { offering: 'a', quantity: 2 },
      { offering: 'c', quantity: 1 },
    ]);
    expect(b1.subtotal).toBe('45.50');
    expect(b1.businessName).toBe('Biz b1');
  });

  it('ignores basket entries whose offering is gone', () => {
    expect(groupByBusiness([A], { a: 1, zzz: 3 })).toHaveLength(1);
  });

  it('summarises the basket: items, businesses and total', () => {
    expect(basketSummary([A, B, C], { a: 2, b: 1 })).toEqual({ count: 3, businesses: 2, total: '120.00' });
    expect(basketSummary([A], {})).toEqual({ count: 0, businesses: 0, total: '0.00' });
  });

  it('searches offerings by name, business, category or description', () => {
    const o = full('x', 'b9', 'Braids', '10', { category: 'Beauty', description: 'Box braids' });
    expect(matchesOffering(o, 'braid')).toBe(true);
    expect(matchesOffering(o, 'biz b9')).toBe(true);
    expect(matchesOffering(o, 'beauty')).toBe(true);
    expect(matchesOffering(o, 'box')).toBe(true);
    expect(matchesOffering(o, 'nope')).toBe(false);
    expect(matchesOffering(o, '  ')).toBe(true);
  });
});

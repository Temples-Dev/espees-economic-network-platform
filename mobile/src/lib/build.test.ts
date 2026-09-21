import {
  dashboardStats,
  openOpportunities,
  orderActions,
  validateBusiness,
  validateOffering,
} from '@/lib/build';
import type { Order, SupplierRequest } from '@/lib/types';

const order = (status: string, total: string) => ({ id: status + total, status, total }) as Order;
const request = (id: string, business: string, status = 'open') =>
  ({ id, requesting_business: business, status }) as SupplierRequest;

describe('build helpers', () => {
  it('requires a business name and a valid optional contact email', () => {
    expect(validateBusiness({ name: ' ', contactEmail: '' })).toEqual({ name: 'Enter your business name.' });
    expect(validateBusiness({ name: 'Shop', contactEmail: 'nope' })).toEqual({
      contactEmail: 'Enter a valid email address.',
    });
    expect(validateBusiness({ name: 'Shop', contactEmail: 'a@b.co' })).toEqual({});
  });

  it('requires an offering name and a positive price', () => {
    expect(validateOffering({ name: '', price: '' })).toEqual({
      name: 'Enter a name.',
      price: 'Enter a price greater than zero.',
    });
    expect(validateOffering({ name: 'Tee', price: '0' }).price).toBeDefined();
    expect(validateOffering({ name: 'Tee', price: 'abc' }).price).toBeDefined();
    expect(validateOffering({ name: 'Tee', price: '12.50' })).toEqual({});
  });

  it('offers the next steps for an incoming order', () => {
    expect(orderActions('pending').map((a) => a.next)).toEqual(['confirmed', 'cancelled']);
    expect(orderActions('confirmed').map((a) => a.next)).toEqual(['fulfilled', 'cancelled']);
    expect(orderActions('fulfilled')).toEqual([]);
    expect(orderActions('cancelled')).toEqual([]);
  });

  it('summarises the dashboard: pending orders and Espees earned from fulfilled ones', () => {
    const stats = dashboardStats(
      [order('pending', '10.00'), order('fulfilled', '20.50'), order('fulfilled', '4.50'), order('cancelled', '99')],
      3,
      2,
    );
    expect(stats).toEqual({ pending: 1, earned: '25.00', products: 3, services: 2 });
  });

  it('lists open opportunities from other businesses only', () => {
    const list = [request('1', 'mine'), request('2', 'theirs'), request('3', 'theirs', 'closed')];
    expect(openOpportunities(list, ['mine']).map((r) => r.id)).toEqual(['2']);
  });
});

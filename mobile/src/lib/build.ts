import { isValidEmail } from '@/lib/validation';
import type { Order, SupplierRequest } from '@/lib/types';

export function validateBusiness(input: { name: string; contactEmail: string }) {
  const errors: { name?: string; contactEmail?: string } = {};
  if (!input.name.trim()) errors.name = 'Enter your business name.';
  if (input.contactEmail.trim() && !isValidEmail(input.contactEmail)) {
    errors.contactEmail = 'Enter a valid email address.';
  }
  return errors;
}

export function validateOffering(input: { name: string; price: string }) {
  const errors: { name?: string; price?: string } = {};
  if (!input.name.trim()) errors.name = 'Enter a name.';
  const price = Number(input.price);
  if (!input.price.trim() || !Number.isFinite(price) || price <= 0) {
    errors.price = 'Enter a price greater than zero.';
  }
  return errors;
}

export type OrderAction = { label: string; next: 'confirmed' | 'fulfilled' | 'cancelled'; danger?: boolean };

export function orderActions(status: string): OrderAction[] {
  if (status === 'pending') {
    return [
      { label: 'Confirm', next: 'confirmed' },
      { label: 'Decline', next: 'cancelled', danger: true },
    ];
  }
  if (status === 'confirmed') {
    return [
      { label: 'Mark fulfilled', next: 'fulfilled' },
      { label: 'Cancel', next: 'cancelled', danger: true },
    ];
  }
  return [];
}

export function dashboardStats(orders: Order[], products: number, services: number) {
  const pending = orders.filter((o) => o.status === 'pending').length;
  const cents = orders
    .filter((o) => o.status === 'fulfilled')
    .reduce((sum, o) => sum + Math.round((parseFloat(o.total) || 0) * 100), 0);
  return { pending, earned: (cents / 100).toFixed(2), products, services };
}

export function openOpportunities(requests: SupplierRequest[], myBusinessIds: string[]): SupplierRequest[] {
  return requests.filter((r) => r.status === 'open' && !myBusinessIds.includes(r.requesting_business));
}

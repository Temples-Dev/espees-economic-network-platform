import { render, screen, userEvent } from '@testing-library/react-native';

import TransactionsScreen from '@/app/transactions';
import { ApiError } from '@/lib/api';

const mockGetList = jest.fn();
const mockBack = jest.fn();
const mockPatch = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'u1', email: 'a@b.co', full_name: 'A B' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getList: (...args: unknown[]) => mockGetList(...args), patch: (...args: unknown[]) => mockPatch(...args) },
}));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const mk = (id: string, biz: string, bizId: string, total: string, at: string, names: string[], status = 'pending', customer = 'a@b.co') => ({
  id, customer_email: customer, business: bizId, business_name: biz, total, status, created_at: at,
  items: names.map((n, i) => ({ id: `${id}${i}`, offering_name: n, quantity: 1, unit_price: total, line_total: total })),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetList.mockResolvedValue([
    mk('1', 'Mama Tees', 'b1', '20.00', daysAgo(1), ['Tee Shirt']),
    mk('2', 'Kofi Tech', 'b2', '80.00', daysAgo(20), ['Laptop Repair'], 'fulfilled'),
    mk('3', 'Mama Tees', 'b1', '15.00', daysAgo(200), ['Cap'], 'cancelled'),
  ]);
});

describe('TransactionsScreen', () => {
  it('shows every transaction with a count and total', async () => {
    await render(<TransactionsScreen />);
    expect(await screen.findByText('Laptop Repair')).toBeTruthy();
    expect(screen.getByText('3 transactions · 115.00 ESP')).toBeTruthy();
  });

  it('searches by business and by purpose', async () => {
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await screen.findByText('Laptop Repair');
    await user.type(screen.getByLabelText('Search'), 'kofi');
    expect(screen.queryByText('Tee Shirt')).toBeNull();
    expect(screen.getByText('1 transaction · 80.00 ESP')).toBeTruthy();
    await user.clear(screen.getByLabelText('Search'));
    await user.type(screen.getByLabelText('Search'), 'cap');
    expect(screen.getByText('Cap')).toBeTruthy();
    expect(screen.queryByText('Laptop Repair')).toBeNull();
  });

  it('filters by date range', async () => {
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await screen.findByText('Laptop Repair');
    await user.press(screen.getByLabelText('Last 7 days'));
    expect(screen.getByText('1 transaction · 20.00 ESP')).toBeTruthy();
    await user.press(screen.getByLabelText('Last 30 days'));
    expect(screen.getByText('2 transactions · 100.00 ESP')).toBeTruthy();
  });

  it('filters by business and by status', async () => {
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await screen.findByText('Laptop Repair');
    await user.press(screen.getByLabelText('Business Mama Tees'));
    expect(screen.getByText('2 transactions · 35.00 ESP')).toBeTruthy();
    await user.press(screen.getByLabelText('Status Cancelled'));
    expect(screen.getByText('1 transaction · 15.00 ESP')).toBeTruthy();
  });

  it('says so and offers a reset when nothing matches', async () => {
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await screen.findByText('Laptop Repair');
    await user.type(screen.getByLabelText('Search'), 'zzzz');
    expect(screen.getByText('No transactions match')).toBeTruthy();
    await user.press(screen.getByLabelText('Reset filters'));
    expect(screen.getByText('3 transactions · 115.00 ESP')).toBeTruthy();
  });

  it('lets you cancel your own pending order and refreshes', async () => {
    mockPatch.mockResolvedValue({});
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await user.press(await screen.findByLabelText('Cancel order with Mama Tees'));
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/orders/1/status/', { status: 'cancelled' });
    expect(mockGetList.mock.calls.length).toBeGreaterThan(1);
  });

  it('only offers cancel on your own pending orders', async () => {
    mockGetList.mockResolvedValue([
      mk('1', 'Mama Tees', 'b1', '20.00', daysAgo(1), ['Tee Shirt'], 'confirmed'),
      mk('2', 'Kofi Tech', 'b2', '80.00', daysAgo(2), ['Repair'], 'pending', 'someone@else.co'),
    ]);
    await render(<TransactionsScreen />);
    await screen.findByText('Repair');
    expect(screen.queryByLabelText(/Cancel order/)).toBeNull();
  });

  it('shows why a cancellation failed', async () => {
    mockPatch.mockRejectedValue(new ApiError(400, { detail: 'An order that is confirmed cannot be changed to cancelled.' }));
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await user.press(await screen.findByLabelText('Cancel order with Mama Tees'));
    expect(await screen.findByText(/cannot be changed to cancelled/)).toBeTruthy();
  });

  it('goes back', async () => {
    const user = userEvent.setup();
    await render(<TransactionsScreen />);
    await user.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });
});

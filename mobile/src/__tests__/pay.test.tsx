import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import PayScreen from '@/app/(tabs)/pay';
import { ApiError } from '@/lib/api';

const mockGetList = jest.fn();
const mockPost = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'u1', email: 'a@b.co', full_name: 'A B' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getList: (...args: unknown[]) => mockGetList(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const PRODUCT = { id: 'p1', business: 'b1', business_name: 'Mama Tees', kind: 'product', name: 'Tee Shirt', description: '', category: 'Fashion', price: '20.00', is_active: true };
const PRODUCT2 = { id: 'p2', business: 'b1', business_name: 'Mama Tees', kind: 'product', name: 'Cap', description: '', category: 'Fashion', price: '5.00', is_active: true };
const SERVICE = { id: 's1', business: 'b2', business_name: 'Kofi Tech', kind: 'service', name: 'Laptop Repair', description: '', category: 'Repairs', price: '80.00', is_active: true };
const ORDER = { id: 'o1', business: 'b1', business_name: 'Mama Tees', status: 'pending', total: '20.00', items: [{ id: 'i1', offering_name: 'Tee Shirt', quantity: 1, unit_price: '20.00', line_total: '20.00' }], created_at: '2026-09-01T10:00:00Z' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetList.mockImplementation(async (path: string) =>
    path.startsWith('/api/v1/products/') ? [PRODUCT, PRODUCT2]
      : path.startsWith('/api/v1/services/') ? [SERVICE]
        : [ORDER],
  );
  mockPost.mockImplementation(async (_p: string, body: { business: string }) => ({
    total: body.business === 'b1' ? '20.00' : '80.00',
    status: 'pending',
  }));
});

const total = () => screen.getByTestId('basket-total').props.children;

describe('PayScreen', () => {
  it('starts with an empty basket and a disabled pay button', async () => {
    await render(<PayScreen />);
    await screen.findByLabelText('Laptop Repair');
    expect(screen.getByText('Your basket is empty')).toBeTruthy();
    expect(screen.getByLabelText('Pay now').props.accessibilityState.disabled).toBe(true);
  });

  it('lets you pick several offerings, even from different businesses', async () => {
    const user = userEvent.setup();
    await render(<PayScreen />);
    await user.press(await screen.findByLabelText('Laptop Repair'));
    await user.press(screen.getByLabelText('Tee Shirt'));
    expect(screen.getByText('2 items · 2 businesses')).toBeTruthy();
    expect(total()).toBe('100.00 ESP');
  });

  it('adjusts quantity per selected row and can deselect', async () => {
    const user = userEvent.setup();
    await render(<PayScreen />);
    await user.press(await screen.findByLabelText('Tee Shirt'));
    await user.press(screen.getByLabelText('Increase quantity of Tee Shirt'));
    expect(total()).toBe('40.00 ESP');
    await user.press(screen.getByLabelText('Decrease quantity of Tee Shirt'));
    await user.press(screen.getByLabelText('Decrease quantity of Tee Shirt'));
    expect(total()).toBe('20.00 ESP');
    await user.press(screen.getByLabelText('Tee Shirt'));
    expect(screen.getByText('Your basket is empty')).toBeTruthy();
  });

  it('searches what you can pay for and keeps the basket while searching', async () => {
    const user = userEvent.setup();
    await render(<PayScreen />);
    await user.press(await screen.findByLabelText('Tee Shirt'));
    await user.type(screen.getByLabelText('Search'), 'repair');
    expect(screen.queryByLabelText('Cap')).toBeNull();
    expect(screen.getByLabelText('Laptop Repair')).toBeTruthy();
    expect(total()).toBe('20.00 ESP');
    await user.type(screen.getByLabelText('Search'), 'zzzz');
    expect(screen.getByText('No matches')).toBeTruthy();
  });

  it('filters by kind', async () => {
    const user = userEvent.setup();
    await render(<PayScreen />);
    await screen.findByLabelText('Tee Shirt');
    await user.press(screen.getByLabelText('Services'));
    expect(screen.queryByLabelText('Tee Shirt')).toBeNull();
    expect(screen.getByLabelText('Laptop Repair')).toBeTruthy();
  });

  it('pays one order per business and clears the basket', async () => {
    const user = userEvent.setup();
    await render(<PayScreen />);
    await user.press(await screen.findByLabelText('Laptop Repair'));
    await user.press(screen.getByLabelText('Tee Shirt'));
    await user.press(screen.getByLabelText('Cap'));
    await user.press(screen.getByLabelText('Increase quantity of Cap'));
    await user.press(screen.getByLabelText('Pay now'));
    expect(mockPost).toHaveBeenCalledTimes(2);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/orders/', {
      business: 'b1',
      items: [{ offering: 'p1', quantity: 1 }, { offering: 'p2', quantity: 2 }],
    });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/orders/', {
      business: 'b2',
      items: [{ offering: 's1', quantity: 1 }],
    });
    expect(await screen.findByText(/Payment sent/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Your basket is empty')).toBeTruthy());
  });

  it('keeps unpaid businesses in the basket when one payment fails', async () => {
    mockPost.mockImplementation(async (_p: string, body: { business: string }) => {
      if (body.business === 'b2') throw new ApiError(400, { detail: 'nope' });
      return { total: '20.00', status: 'pending' };
    });
    const user = userEvent.setup();
    await render(<PayScreen />);
    await user.press(await screen.findByLabelText('Laptop Repair'));
    await user.press(screen.getByLabelText('Tee Shirt'));
    await user.press(screen.getByLabelText('Pay now'));
    expect(await screen.findByText(/Kofi Tech: nope/)).toBeTruthy();
    expect(screen.getByText(/Payment sent.*Mama Tees/)).toBeTruthy();
    expect(screen.getByText('1 item · 1 business')).toBeTruthy();
    expect(total()).toBe('80.00 ESP');
  });

  it('lists recent payments and links to the full transactions view', async () => {
    const user = userEvent.setup();
    await render(<PayScreen />);
    expect(await screen.findByText('Recent payments')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    await user.press(screen.getByLabelText('See all transactions'));
    expect(mockPush).toHaveBeenCalledWith('/transactions');
  });
});

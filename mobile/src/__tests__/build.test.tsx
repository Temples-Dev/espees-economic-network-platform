import { render, screen, userEvent, within } from '@testing-library/react-native';

import BuildScreen from '@/app/(tabs)/build';

const mockGetList = jest.fn();
const mockPatch = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'u1', email: 'a@b.co', full_name: 'A B' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getList: (...a: unknown[]) => mockGetList(...a),
    patch: (...a: unknown[]) => mockPatch(...a),
  },
}));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const BIZ1 = { id: 'b1', name: 'Kofi Tech', location: 'Accra', category: 'Tech', verification_status: 'verified', description: '' };
const BIZ2 = { id: 'b2', name: 'Mama Tees', location: 'Kumasi', category: 'Fashion', verification_status: 'unverified', description: '' };
const item = { id: 'i', offering_name: 'Laptop Repair', quantity: 1, unit_price: '80.00', line_total: '80.00' };
const ORDERS_B1 = [
  { id: 'o1', business: 'b1', business_name: 'Kofi Tech', customer_email: 'ama@x.co', status: 'pending', total: '80.00', items: [item], created_at: '2026-09-20T10:00:00Z' },
  { id: 'o2', business: 'b1', business_name: 'Kofi Tech', customer_email: 'kwe@x.co', status: 'fulfilled', total: '20.00', items: [item], created_at: '2026-09-10T10:00:00Z' },
];
const OPPS = [
  { id: 'r1', requesting_business: 'zz', requesting_business_name: 'Big Buyer', title: 'Need 50 chargers', status: 'open', budget_espees: '500', quote_count: 2 },
  { id: 'r2', requesting_business: 'b1', requesting_business_name: 'Kofi Tech', title: 'My own request', status: 'open', budget_espees: null, quote_count: 0 },
];

function setup(businesses = [BIZ1, BIZ2]) {
  mockGetList.mockImplementation(async (path: string) => {
    if (path === '/api/v1/businesses/?mine=true') return businesses;
    if (path.startsWith('/api/v1/orders/?business=b1')) return ORDERS_B1;
    if (path.startsWith('/api/v1/orders/?business=')) return [];
    if (path.startsWith('/api/v1/products/?business=')) return [{ id: 'p1' }, { id: 'p2' }];
    if (path.startsWith('/api/v1/services/?business=')) return [{ id: 's1' }];
    if (path.startsWith('/api/v1/supplier-requests/')) return OPPS;
    return [];
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPatch.mockResolvedValue({});
  setup();
});

describe('BuildScreen', () => {
  it('invites you to start a business when you have none', async () => {
    setup([]);
    const user = userEvent.setup();
    await render(<BuildScreen />);
    expect(await screen.findByText('Start your business')).toBeTruthy();
    await user.press(screen.getByLabelText('Create your business'));
    expect(mockPush).toHaveBeenCalledWith('/new-business');
  });

  it('asks the API for only your businesses', async () => {
    await render(<BuildScreen />);
    await screen.findByTestId('stat-pending');
    expect(mockGetList).toHaveBeenCalledWith('/api/v1/businesses/?mine=true');
  });

  it('shows the selected business dashboard stats', async () => {
    await render(<BuildScreen />);
    await screen.findByTestId('stat-pending');
    expect(within(await screen.findByTestId('stat-pending')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('stat-products')).getByText('2')).toBeTruthy();
    expect(within(screen.getByTestId('stat-services')).getByText('1')).toBeTruthy();
    expect(within(screen.getByTestId('stat-earned')).getByText('20.00')).toBeTruthy();
  });

  it('switches business and reloads its data', async () => {
    const user = userEvent.setup();
    await render(<BuildScreen />);
    await screen.findByTestId('stat-pending');
    await user.press(screen.getByLabelText('Business Mama Tees'));
    expect(mockGetList).toHaveBeenCalledWith('/api/v1/orders/?business=b2');
    expect(await screen.findByText('No orders yet.')).toBeTruthy();
  });

  it('opens the add forms for the selected business', async () => {
    const user = userEvent.setup();
    await render(<BuildScreen />);
    await screen.findByTestId('stat-pending');
    await user.press(screen.getByLabelText('Add product'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/new-offering', params: { business: 'b1', kind: 'product' } });
    await user.press(screen.getByLabelText('Add service'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/new-offering', params: { business: 'b1', kind: 'service' } });
    await user.press(screen.getByLabelText('New business'));
    expect(mockPush).toHaveBeenCalledWith('/new-business');
  });

  it('offers verification only to businesses that are not verified', async () => {
    const user = userEvent.setup();
    await render(<BuildScreen />);
    await screen.findByTestId('stat-pending');
    expect(screen.queryByLabelText('Get verified')).toBeNull();
    await user.press(screen.getByLabelText('Business Mama Tees'));
    await user.press(await screen.findByLabelText('Get verified'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/verify-business', params: { business: 'b2' } });
  });

  it('confirms a pending order and refreshes the list', async () => {
    const user = userEvent.setup();
    await render(<BuildScreen />);
    await user.press(await screen.findByLabelText('Confirm order from ama@x.co'));
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/orders/o1/status/', { status: 'confirmed' });
    expect(mockGetList.mock.calls.filter((c) => c[0] === '/api/v1/orders/?business=b1').length).toBeGreaterThan(1);
  });

  it('lists open opportunities from other businesses only', async () => {
    await render(<BuildScreen />);
    expect(await screen.findByText('Need 50 chargers')).toBeTruthy();
    expect(screen.queryByText('My own request')).toBeNull();
    expect(screen.getByText('Budget 500 ESP · 2 quotes')).toBeTruthy();
  });
});

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';

const mockPush = jest.fn();
const mockGetList = jest.fn();
const mockPost = jest.fn();

const mockUser = {
  id: 'u1',
  email: 'temple@espees.org',
  full_name: 'Temple Lomotey',
  is_verified: false,
  wallet: { espees_wallet_id: 'stub-espees-wallet-abc123', status: 'active' },
};

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: mockUser }),
}));

jest.mock('@/lib/api', () => ({
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

const data: Record<string, unknown[]> = {};

function seed(overrides: Record<string, unknown[]> = {}) {
  Object.assign(data, {
    '/api/v1/notifications/': [
      { id: 'n1', title: 'Welcome to EENP', message: 'Your wallet is ready', is_read: false, created_at: '2026-09-21T11:00:00Z' },
      { id: 'n2', title: 'Security alert', message: 'New sign-in', is_read: false, created_at: '2026-09-20T11:00:00Z' },
    ],
    '/api/v1/orders/': [
      { id: 'o1', business_name: 'Kofi Repairs', status: 'pending', total: '50.00', created_at: '2026-09-21T10:00:00Z' },
    ],
    '/api/v1/conversations/': [
      { id: 'c1', unread_count: 2, other_party: { full_name: 'Ama Boateng', email: 'ama@x.co' } },
    ],
    '/api/v1/businesses/': [
      { id: 'b1', name: 'Kofi Repairs', location: 'Accra', category: 'Repairs', average_rating: 4.2, review_count: 5 },
      { id: 'b2', name: 'Ama Bakes', location: 'Kumasi', category: 'Food', average_rating: 4.9, review_count: 12 },
      { id: 'b3', name: 'New Shop', location: 'Tema', category: null, average_rating: null, review_count: 0 },
    ],
    '/api/v1/campaigns/': [
      { id: 'k1', title: 'Community borehole', goal_espees: '1000', raised_espees: '250', contribution_count: 8, status: 'active' },
    ],
    ...overrides,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.is_verified = false;
  seed();
  mockGetList.mockImplementation(async (path: string) => {
    const value = data[path];
    if (value instanceof Error) throw value;
    return value ?? [];
  });
  mockPost.mockResolvedValue({});
});

describe('HomeScreen', () => {
  it('greets the member by first name', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Hello, Temple')).toBeTruthy();
    expect(screen.getByText(/^Good (morning|afternoon|evening)$/)).toBeTruthy();
  });

  it('opens the profile from the initials avatar', async () => {
    const user = userEvent.setup();
    await render(<HomeScreen />);

    await user.press(await screen.findByRole('button', { name: 'Profile TL' }));

    expect(mockPush).toHaveBeenLastCalledWith('/profile');
  });

  it('no longer shows a verify prompt on Home', async () => {
    await render(<HomeScreen />);
    await screen.findByText('Hello, Temple');
    expect(screen.queryByText('Verify your account')).toBeNull();
  });

  it('shows the wallet reference without inventing a balance', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Espees balance')).toBeTruthy();
    expect(screen.getByText('Balance available soon')).toBeTruthy();
    expect(screen.getByText(/•••• abc123/)).toBeTruthy();
    expect(screen.queryByText(/stub-espees-wallet/)).toBeNull();
    expect(screen.queryByText(/^\d[\d,]*\.\d{2}$/)).toBeNull();
  });

  it('offers Fund and Send on the balance card and Receive, Withdraw, Discover and Build below', async () => {
    await render(<HomeScreen />);
    for (const name of ['Fund', 'Send', 'Receive', 'Withdraw', 'Discover', 'Build']) {
      expect(await screen.findByRole('button', { name })).toBeTruthy();
    }
  });

  it('describes each quick action', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Quick actions')).toBeTruthy();
    for (const copy of [
      'Get paid in Espees',
      'Cash out to your local currency',
      'Find businesses and services',
      'Start or grow a business',
    ]) {
      expect(screen.getByText(copy)).toBeTruthy();
    }
  });

  it('routes Send to Pay and says wallet funding is not available yet for the other money actions', async () => {
    const user = userEvent.setup();
    await render(<HomeScreen />);

    await user.press(await screen.findByRole('button', { name: 'Send' }));
    expect(mockPush).toHaveBeenLastCalledWith('/pay');

    mockPush.mockClear();
    for (const name of ['Fund', 'Receive', 'Withdraw']) {
      await user.press(screen.getByRole('button', { name }));
      expect(screen.getByText('Funding, receiving and withdrawals are coming soon.')).toBeTruthy();
    }
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('links to Discover and Build', async () => {
    const user = userEvent.setup();
    await render(<HomeScreen />);

    await user.press(await screen.findByRole('button', { name: 'Discover' }));
    expect(mockPush).toHaveBeenLastCalledWith('/discover');
    await user.press(screen.getByRole('button', { name: 'Build' }));
    expect(mockPush).toHaveBeenLastCalledWith('/build');
  });

  it('shows the unread count on the bell and clears it when pressed', async () => {
    const user = userEvent.setup();
    await render(<HomeScreen />);

    const bell = await screen.findByLabelText('Notifications, 2 unread');
    await user.press(bell);

    expect(mockPost).toHaveBeenCalledWith('/api/v1/notifications/read-all/', {});
    expect(await screen.findByLabelText('Notifications, none unread')).toBeTruthy();
  });

  it('lists pending actions from open orders and unread messages', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Pending actions')).toBeTruthy();
    expect(screen.getByText('Order awaiting confirmation')).toBeTruthy();
    expect(screen.getByText('2 unread messages')).toBeTruthy();
  });

  it('hides pending actions when there are none', async () => {
    seed({ '/api/v1/orders/': [], '/api/v1/conversations/': [] });
    await render(<HomeScreen />);
    await screen.findByText('Recent activity');
    expect(screen.queryByText('Pending actions')).toBeNull();
  });

  it('shows recent activity newest first', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Welcome to EENP')).toBeTruthy();
    expect(screen.getByText('Order with Kofi Repairs')).toBeTruthy();
    expect(screen.getByText('50.00 ESP')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Security alert')).toBeTruthy();
  });

  it('links each section to where its full list lives', async () => {
    const user = userEvent.setup();
    await render(<HomeScreen />);

    await user.press(await screen.findByRole('button', { name: 'See all activity' }));
    expect(mockPush).toHaveBeenLastCalledWith('/transactions');
    await user.press(screen.getByRole('button', { name: 'See all businesses' }));
    expect(mockPush).toHaveBeenLastCalledWith('/discover');
    await user.press(screen.getByRole('button', { name: 'See all opportunities' }));
    expect(mockPush).toHaveBeenLastCalledWith('/discover');
  });

  it('shows an empty state when there is no activity', async () => {
    seed({ '/api/v1/orders/': [], '/api/v1/notifications/': [], '/api/v1/conversations/': [] });
    await render(<HomeScreen />);
    expect(await screen.findByText('No activity yet.')).toBeTruthy();
  });

  it('recommends businesses with the best-rated first', async () => {
    await render(<HomeScreen />);
    await screen.findByText('Recommended businesses');
    const names = screen.getAllByTestId('business-card').map((c) => c.props.accessibilityLabel);
    expect(names).toEqual(['Ama Bakes', 'Kofi Repairs', 'New Shop']);
    expect(screen.getByText('4.9')).toBeTruthy();
    expect(screen.getByText('Kumasi')).toBeTruthy();
    expect(screen.getByText('12 reviews')).toBeTruthy();
    expect(screen.getByText('No reviews yet')).toBeTruthy();
  });

  it('opens a business profile when a recommended business is pressed', async () => {
    const user = userEvent.setup();
    await render(<HomeScreen />);

    await user.press(await screen.findByRole('button', { name: 'Ama Bakes' }));

    expect(mockPush).toHaveBeenLastCalledWith('/business/b2');
  });

  it('shows campaign opportunities with funding progress', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Community borehole')).toBeTruthy();
    expect(screen.getByText('25% funded')).toBeTruthy();
    expect(screen.getByText('250 of 1000 ESP')).toBeTruthy();
    expect(screen.getByText('8 contributions')).toBeTruthy();
  });

  it('keeps the other sections when one request fails', async () => {
    seed({ '/api/v1/campaigns/': new Error('boom') as unknown as unknown[] });
    await render(<HomeScreen />);
    expect(await screen.findByText('Ama Bakes')).toBeTruthy();
    expect(screen.getByText('No campaigns right now.')).toBeTruthy();
  });

  it('reloads everything on pull-to-refresh', async () => {
    await render(<HomeScreen />);
    await screen.findByText('Ama Bakes');
    const calls = mockGetList.mock.calls.length;

    const scroll = screen.getByTestId('home-scroll');
    await scroll.props.refreshControl.props.onRefresh();

    await waitFor(() => expect(mockGetList.mock.calls.length).toBeGreaterThan(calls));
  });

  it('no longer carries a sign-out button', async () => {
    await render(<HomeScreen />);
    await screen.findByText('Hello, Temple');
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });
});

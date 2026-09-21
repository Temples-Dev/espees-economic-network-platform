import { act, fireEvent, render, screen, userEvent, waitFor, within } from '@testing-library/react-native';

import DiscoverScreen from '@/app/(tabs)/discover';

const mockPush = jest.fn();
const mockGetList = jest.fn();
const mockGet = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 'u1', email: 'temple@espees.org', full_name: 'Temple', is_verified: true, wallet: null },
  }),
}));

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getList: (...args: unknown[]) => mockGetList(...args), get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const BUSINESSES = [
  {
    id: 'b1', name: 'Kofi Repairs', location: 'Accra', category: 'Repairs',
    average_rating: 4.6, review_count: 9, verification_status: 'verified',
  },
  {
    id: 'b2', name: 'Ama Bakes', location: 'Kumasi', category: 'Food',
    average_rating: null, review_count: 0, verification_status: 'unverified',
  },
];
const PRODUCTS = [
  { id: 'p1', business: 'b2', business_name: 'Ama Bakes', kind: 'product', name: 'Sourdough Loaf', price: '12.50' },
];
const SERVICES = [
  { id: 's1', business: 'b1', business_name: 'Kofi Repairs', kind: 'service', name: 'Laptop Repair', price: '80.00' },
];
const CAMPAIGNS = [
  { id: 'k1', title: 'Community borehole', description: 'Clean water', goal_espees: '1000', raised_espees: '250', contribution_count: 8, status: 'active' },
  { id: 'k2', title: 'School library', description: 'Books', goal_espees: '500', raised_espees: '500', contribution_count: 20, status: 'active' },
];
const CATEGORIES = [
  { id: 'c1', name: 'Repairs', slug: 'repairs' },
  { id: 'c2', name: 'Food', slug: 'food' },
];

const paths = () => mockGetList.mock.calls.map((c) => c[0] as string);
const searches = () => mockGet.mock.calls.map((c) => c[0] as string);

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockGet.mockImplementation(async (path: string) =>
    path.includes('zzz')
      ? { q: 'zzz', interpreted: { keywords: ['zzz'], location: null, category: null }, businesses: [], products: [], services: [] }
      : {
          q: 'laptop',
          interpreted: { keywords: ['laptop', 'repair'], location: 'Accra', category: 'Repairs' },
          businesses: BUSINESSES,
          products: PRODUCTS,
          services: SERVICES,
        },
  );
  mockGetList.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/v1/categories/')) return CATEGORIES;
    if (path.startsWith('/api/v1/businesses/')) return BUSINESSES;
    if (path.startsWith('/api/v1/products/')) return PRODUCTS;
    if (path.startsWith('/api/v1/services/')) return SERVICES;
    if (path.startsWith('/api/v1/campaigns/')) return CAMPAIGNS;
    return [];
  });
});
afterEach(() => jest.useRealTimers());

async function settle() {
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

describe('DiscoverScreen', () => {
  it('opens on businesses with the details a member needs to choose', async () => {
    await render(<DiscoverScreen />);

    expect(await screen.findByText('Kofi Repairs')).toBeTruthy();
    expect(screen.getByText('Accra')).toBeTruthy();
    expect(screen.getByLabelText('Category Repairs')).toBeTruthy();
    expect(screen.getByText('4.6')).toBeTruthy();
    expect(screen.getByLabelText('Verified')).toBeTruthy();
    expect(screen.getByText('Ama Bakes')).toBeTruthy();
    expect(screen.getByLabelText('Category Food')).toBeTruthy();
    expect(screen.getByText('Kumasi')).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
  });

  it('keeps category tags on one line and lets long business names wrap instead of clipping', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Ama Bakes');

    const tag = within(screen.getByLabelText('Category Food')).getByText('Food');
    expect(tag.props.numberOfLines).toBe(1);
    expect(screen.getByText('Ama Bakes').props.numberOfLines).toBe(2);
  });

  it('features the best-rated businesses while browsing', async () => {
    await render(<DiscoverScreen />);
    expect(await screen.findByText('Featured')).toBeTruthy();
    expect(screen.getAllByTestId('featured-card')).toHaveLength(1);
    expect(screen.getByText('All businesses')).toBeTruthy();
  });

  it('shows each business once, either featured or in the list', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Featured');
    expect(screen.getAllByText('Kofi Repairs')).toHaveLength(1);
    expect(screen.getAllByText('Ama Bakes')).toHaveLength(1);
  });

  it('drops the featured strip and counts results while filtering by category', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Featured');

    await user.press(screen.getByRole('button', { name: 'Repairs' }));

    await waitFor(() => expect(screen.queryByText('Featured')).toBeNull());
    expect(await screen.findByText('2 results')).toBeTruthy();
  });

  it('drops the featured strip while searching', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Featured');

    await fireEvent.changeText(screen.getByLabelText('Search'), 'kofi');
    await settle();

    await waitFor(() => expect(screen.queryByText('Featured')).toBeNull());
  });

  it('opens a business profile when a result is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);

    await user.press(await screen.findByRole('button', { name: 'Kofi Repairs' }));

    expect(mockPush).toHaveBeenCalledWith('/business/b1');
  });

  it('lists the categories after All', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    expect(screen.getByRole('button', { name: 'All categories' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Repairs' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Food' })).toBeTruthy();
  });

  it('asks the server for one category when a chip is chosen', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');

    await user.press(screen.getByRole('button', { name: 'Repairs' }));

    await waitFor(() => expect(paths()).toContain('/api/v1/businesses/?category=repairs'));
  });

  it('searches on the server after a pause in typing', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    mockGetList.mockClear();

    await fireEvent.changeText(screen.getByLabelText('Search'), 'laptop');
    expect(searches()).toEqual([]);

    await settle();
    await waitFor(() => expect(searches()).toContain('/api/v1/search/?q=laptop&limit=30'));
  });

  it('says how a plain-language search was understood', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    await fireEvent.changeText(screen.getByLabelText('Search'), 'laptop repair in accra');
    await settle();
    expect(await screen.findByText('Understood as: laptop repair · Accra · Repairs')).toBeTruthy();
  });

  it('combines a search with a category', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');

    await user.press(screen.getByRole('button', { name: 'Repairs' }));
    await fireEvent.changeText(screen.getByLabelText('Search'), 'laptop');
    await settle();

    await waitFor(() => expect(searches()).toContain('/api/v1/search/?q=laptop&limit=30'));
    // the category chip narrows the search results on the device
    expect(screen.queryByText('Ama Bakes')).toBeNull();
    expect(screen.getByText('Kofi Repairs')).toBeTruthy();
  });

  it('clears the search with the clear button', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');

    await fireEvent.changeText(screen.getByLabelText('Search'), 'laptop');
    await user.press(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByLabelText('Search').props.value).toBe('');
  });

  it('says so when a search finds nothing', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');

    await fireEvent.changeText(screen.getByLabelText('Search'), 'zzz');
    await settle();

    expect(await screen.findByText('No results for "zzz"')).toBeTruthy();
  });

  it('offers four tabs whose labels are never clipped', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    for (const name of ['Businesses', 'Products', 'Services', 'Campaigns']) {
      const tab = screen.getByRole('button', { name });
      expect(tab).toBeTruthy();
      expect(screen.getByText(name).props.adjustsFontSizeToFit).toBe(true);
    }
    expect(screen.queryByText('Products & services')).toBeNull();
  });

  it('shows only products on the Products tab and opens the product page', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    mockGetList.mockClear();

    await user.press(screen.getByRole('button', { name: 'Products' }));

    expect(await screen.findByText('Sourdough Loaf')).toBeTruthy();
    expect(screen.getByText('12.50 ESP')).toBeTruthy();
    expect(screen.getByText('Ama Bakes')).toBeTruthy();
    expect(screen.queryByText('Laptop Repair')).toBeNull();
    expect(paths().some((p) => p.startsWith('/api/v1/services/'))).toBe(false);

    await user.press(screen.getByRole('button', { name: 'Sourdough Loaf' }));
    expect(mockPush).toHaveBeenCalledWith('/offering/p1');
  });

  it('shows only services on the Services tab, still with category chips', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    mockGetList.mockClear();

    await user.press(screen.getByRole('button', { name: 'Services' }));

    expect(await screen.findByText('Laptop Repair')).toBeTruthy();
    expect(screen.getByText('80.00 ESP')).toBeTruthy();
    expect(screen.queryByText('Sourdough Loaf')).toBeNull();
    expect(paths().some((p) => p.startsWith('/api/v1/products/'))).toBe(false);
    expect(screen.getByRole('button', { name: 'All categories' })).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Laptop Repair' }));
    expect(mockPush).toHaveBeenCalledWith('/offering/s1');
  });

  it('shows campaigns with progress and hides the category chips', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');

    await user.press(screen.getByRole('button', { name: 'Campaigns' }));

    expect(await screen.findByText('Community borehole')).toBeTruthy();
    expect(screen.getByText('25% funded')).toBeTruthy();
    expect(screen.getByText('250 of 1000 ESP')).toBeTruthy();
    expect(screen.getByText('8 contributions')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'All categories' })).toBeNull();
  });

  it('filters campaigns by the search text', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    await user.press(screen.getByRole('button', { name: 'Campaigns' }));
    await screen.findByText('Community borehole');

    await fireEvent.changeText(screen.getByLabelText('Search'), 'library');
    await settle();

    expect(await screen.findByText('School library')).toBeTruthy();
    expect(screen.queryByText('Community borehole')).toBeNull();
  });

  it('offers a retry when loading fails', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockGetList.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/v1/categories/')) return CATEGORIES;
      throw new Error('offline');
    });
    await render(<DiscoverScreen />);
    expect(await screen.findByText('Could not load results.')).toBeTruthy();

    mockGetList.mockImplementation(async (path: string) =>
      path.startsWith('/api/v1/businesses/') ? BUSINESSES : CATEGORIES,
    );
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Kofi Repairs')).toBeTruthy();
  });

  it('reloads on pull-to-refresh', async () => {
    await render(<DiscoverScreen />);
    await screen.findByText('Kofi Repairs');
    const calls = mockGetList.mock.calls.length;

    await screen.getByTestId('discover-scroll').props.refreshControl.props.onRefresh();

    await waitFor(() => expect(mockGetList.mock.calls.length).toBeGreaterThan(calls));
  });
});

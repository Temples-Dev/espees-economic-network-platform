import { render, screen, userEvent, within } from '@testing-library/react-native';

import OfferingDetailScreen from '@/app/offering/[id]';
import { ApiError } from '@/lib/api';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockGet = jest.fn();
const mockGetList = jest.fn();
const mockPost = jest.fn();

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    getList: (...args: unknown[]) => mockGetList(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
    useLocalSearchParams: () => ({ id: 's1' }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const SERVICE = {
  id: 's1', business: 'b1', business_name: 'Kofi Repairs', kind: 'service',
  name: 'Laptop Repair', description: 'We diagnose and repair laptops of all brands.',
  category: 'Repairs', price: '80.00', average_rating: 4.8, review_count: 5, is_active: true,
};
const OTHER_SERVICE = {
  id: 's2', business: 'b1', business_name: 'Kofi Repairs', kind: 'service',
  name: 'Screen Replacement', description: '', category: 'Repairs', price: '150.00',
  average_rating: null, review_count: 0, is_active: true,
};
const PRODUCT = {
  id: 'p1', business: 'b1', business_name: 'Kofi Repairs', kind: 'product',
  name: 'Charger', description: '', category: 'Repairs', price: '15.00',
  average_rating: null, review_count: 0, is_active: true,
};
const BUSINESS = {
  id: 'b1', name: 'Kofi Repairs', location: 'Accra', category: 'Repairs',
  verification_status: 'verified', average_rating: 4.6, review_count: 9,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockImplementation(async (path: string) => {
    if (path === '/api/v1/products/s1/') throw new ApiError(404, { detail: 'Not found.' });
    if (path === '/api/v1/services/s1/') return { ...SERVICE };
    if (path === '/api/v1/businesses/b1/') return { ...BUSINESS };
    throw new ApiError(404, { detail: 'Not found.' });
  });
  mockGetList.mockImplementation(async (path: string) =>
    path.startsWith('/api/v1/products/') ? [PRODUCT] : path.startsWith('/api/v1/services/') ? [SERVICE, OTHER_SERVICE] : [],
  );
  mockPost.mockResolvedValue({ total: '80.00', status: 'pending' });
});


const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style?: string }) => {
    mockStatusBar(props.style);
    return null;
  },
}));

describe('OfferingDetailScreen', () => {
  it('uses light status bar icons over the hero', async () => {
    await render(<OfferingDetailScreen />);
    expect(mockStatusBar).toHaveBeenCalledWith('light');
  });

  it('finds the listing whether it is a product or a service, then loads its business', async () => {
    await render(<OfferingDetailScreen />);
    await screen.findByText('Laptop Repair');
    const gets = mockGet.mock.calls.map((c) => c[0]);
    expect(gets).toContain('/api/v1/products/s1/');
    expect(gets).toContain('/api/v1/services/s1/');
    expect(gets).toContain('/api/v1/businesses/b1/');
  });

  it('shows what is on offer and its price', async () => {
    await render(<OfferingDetailScreen />);
    expect(await screen.findByText('Laptop Repair')).toBeTruthy();
    expect(screen.getByLabelText('Type Service')).toBeTruthy();
    expect(within(screen.getByTestId('price-chip')).getByText('80.00 ESP')).toBeTruthy();
    expect(screen.getByText('We diagnose and repair laptops of all brands.')).toBeTruthy();
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByText('5 reviews')).toBeTruthy();
  });

  it('says so when a listing has no reviews yet', async () => {
    mockGet.mockImplementation(async (path: string) =>
      path === '/api/v1/services/s1/'
        ? { ...SERVICE, average_rating: null, review_count: 0 }
        : path === '/api/v1/businesses/b1/'
          ? { ...BUSINESS }
          : Promise.reject(new ApiError(404, { detail: 'Not found.' })),
    );
    await render(<OfferingDetailScreen />);
    expect(await screen.findByText('No reviews yet')).toBeTruthy();
  });

  it('introduces the seller and opens their profile', async () => {
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);

    expect(await screen.findByText('Sold by')).toBeTruthy();
    expect(screen.getByText('Accra')).toBeTruthy();
    expect(screen.getByLabelText('Verified')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Kofi Repairs' }));
    expect(mockPush).toHaveBeenCalledWith('/business/b1');
  });

  it('lists the key details', async () => {
    await render(<OfferingDetailScreen />);
    await screen.findByText('Laptop Repair');
    expect(screen.getByText('Category')).toBeTruthy();
    expect(screen.getAllByText('Repairs').length).toBeGreaterThan(0);
    expect(screen.getByText('Type')).toBeTruthy();
  });

  it('suggests other listings from the same business, not this one', async () => {
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);

    expect(await screen.findByText('More from Kofi Repairs')).toBeTruthy();
    expect(screen.getByText('Screen Replacement')).toBeTruthy();
    expect(screen.getByText('Charger')).toBeTruthy();
    expect(screen.getAllByText('Laptop Repair')).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Charger' }));
    expect(mockPush).toHaveBeenCalledWith('/offering/p1');
  });

  it('totals the order as the quantity changes, never below one', async () => {
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);
    await screen.findByText('Laptop Repair');

    expect(screen.getByLabelText('Order total 80.00 ESP')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Decrease quantity' }).props.accessibilityState).toEqual({
      disabled: true,
    });

    await user.press(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.press(screen.getByRole('button', { name: 'Increase quantity' }));

    expect(screen.getByLabelText('Order total 240.00 ESP')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Decrease quantity' }));
    expect(screen.getByLabelText('Order total 160.00 ESP')).toBeTruthy();
  });

  it('places an order for the chosen quantity and confirms it', async () => {
    mockPost.mockResolvedValue({ total: '160.00', status: 'pending' });
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);
    await screen.findByText('Laptop Repair');

    await user.press(screen.getByRole('button', { name: 'Increase quantity' }));
    await user.press(screen.getByRole('button', { name: 'Place order' }));

    expect(mockPost).toHaveBeenCalledWith('/api/v1/orders/', {
      business: 'b1',
      items: [{ offering: 's1', quantity: 2 }],
    });
    expect(await screen.findByText('Order placed · 160.00 ESP · Pending')).toBeTruthy();
  });

  it('shows the server reason when the order is refused', async () => {
    mockPost.mockRejectedValue(new ApiError(400, { detail: 'This business is not accepting orders.' }));
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);

    await user.press(await screen.findByRole('button', { name: 'Place order' }));

    expect(await screen.findByText('This business is not accepting orders.')).toBeTruthy();
  });

  it('goes back from the header', async () => {
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);

    await user.press(await screen.findByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('offers a retry when the listing cannot be found', async () => {
    mockGet.mockRejectedValue(new ApiError(404, { detail: 'Not found.' }));
    const user = userEvent.setup();
    await render(<OfferingDetailScreen />);

    expect(await screen.findByText('Could not load this listing.')).toBeTruthy();

    mockGet.mockImplementation(async (path: string) =>
      path === '/api/v1/services/s1/' ? { ...SERVICE } : path === '/api/v1/businesses/b1/' ? { ...BUSINESS } : Promise.reject(new ApiError(404, {})),
    );
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Laptop Repair')).toBeTruthy();
  });
});

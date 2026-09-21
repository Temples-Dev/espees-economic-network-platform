import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import BusinessProfileScreen from '@/app/business/[id]';
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
    useLocalSearchParams: () => ({ id: 'b1' }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

const BUSINESS = {
  id: 'b1',
  name: 'Kofi Repairs',
  description: 'We fix laptops and phones fast.',
  category: 'Repairs',
  location: 'Accra',
  contact_email: 'kofi@repairs.co',
  contact_phone: '+233201112233',
  verification_status: 'verified',
  average_rating: 4.6,
  review_count: 9,
};

const SERVICES = [
  { id: 's1', business: 'b1', business_name: 'Kofi Repairs', kind: 'service', name: 'Laptop Repair', price: '80.00' },
];
const PRODUCTS = [
  { id: 'p1', business: 'b1', business_name: 'Kofi Repairs', kind: 'product', name: 'Charger', price: '15.00' },
];

let openUrl: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openUrl = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  mockGet.mockResolvedValue({ ...BUSINESS });
  mockGetList.mockImplementation(async (path: string) =>
    path.startsWith('/api/v1/products/') ? PRODUCTS : path.startsWith('/api/v1/services/') ? SERVICES : [],
  );
  mockPost.mockResolvedValue({ id: 'conv1' });
});


const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style?: string }) => {
    mockStatusBar(props.style);
    return null;
  },
}));

describe('BusinessProfileScreen', () => {
  it('uses light status bar icons over the hero', async () => {
    await render(<BusinessProfileScreen />);
    expect(mockStatusBar).toHaveBeenCalledWith('light');
  });

  it('loads the business and its listings by id', async () => {
    await render(<BusinessProfileScreen />);
    await screen.findByText('Kofi Repairs');
    expect(mockGet).toHaveBeenCalledWith('/api/v1/businesses/b1/');
    expect(mockGetList).toHaveBeenCalledWith('/api/v1/products/?business=b1');
    expect(mockGetList).toHaveBeenCalledWith('/api/v1/services/?business=b1');
  });

  it('shows who the business is', async () => {
    await render(<BusinessProfileScreen />);
    expect(await screen.findByText('Kofi Repairs')).toBeTruthy();
    expect(screen.getByLabelText('Category Repairs')).toBeTruthy();
    expect(screen.getByText('Accra')).toBeTruthy();
    expect(screen.getByText('4.6')).toBeTruthy();
    expect(screen.getByText('Reviews')).toBeTruthy();
    expect(screen.getByText('Listings')).toBeTruthy();
    expect(screen.getByText('We fix laptops and phones fast.')).toBeTruthy();
  });

  it('tells members the business accepts Espees', async () => {
    await render(<BusinessProfileScreen />);
    expect(await screen.findByText('Accepts Espees')).toBeTruthy();
  });

  it('shows the verification status', async () => {
    await render(<BusinessProfileScreen />);
    expect(await screen.findByText('Verified')).toBeTruthy();
  });

  it('shows a pending verification and hides the badge when unverified', async () => {
    mockGet.mockResolvedValue({ ...BUSINESS, verification_status: 'pending' });
    const { unmount } = await render(<BusinessProfileScreen />);
    expect(await screen.findByText('Verification pending')).toBeTruthy();
    await unmount();

    mockGet.mockResolvedValue({ ...BUSINESS, verification_status: 'unverified' });
    await render(<BusinessProfileScreen />);
    await screen.findByText('Kofi Repairs');
    expect(screen.queryByText('Verified')).toBeNull();
    expect(screen.queryByText('Verification pending')).toBeNull();
  });

  it('lets a member call or email the business from the contact card', async () => {
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    await user.press(await screen.findByRole('button', { name: 'Call +233201112233' }));
    expect(openUrl).toHaveBeenLastCalledWith('tel:+233201112233');

    await user.press(screen.getByRole('button', { name: 'Email kofi@repairs.co' }));
    expect(openUrl).toHaveBeenLastCalledWith('mailto:kofi@repairs.co');
  });

  it('has a quick Call button in the action bar', async () => {
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    await user.press(await screen.findByRole('button', { name: 'Call business' }));

    expect(openUrl).toHaveBeenLastCalledWith('tel:+233201112233');
  });

  it('omits contact rows and the Call button when the business has no contact details', async () => {
    mockGet.mockResolvedValue({ ...BUSINESS, contact_phone: '', contact_email: '' });
    await render(<BusinessProfileScreen />);
    await screen.findByText('Kofi Repairs');
    expect(screen.queryByText('Contact')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Call business' })).toBeNull();
  });

  it('lists products and services as cards that open the listing page', async () => {
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    expect(await screen.findByText('Laptop Repair')).toBeTruthy();
    expect(screen.getByText('Charger')).toBeTruthy();
    expect(screen.getByText('80.00 ESP')).toBeTruthy();
    expect(screen.getByText('15.00 ESP')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Charger' }));
    expect(mockPush).toHaveBeenCalledWith('/offering/p1');
  });

  it('says so when nothing is listed', async () => {
    mockGetList.mockResolvedValue([]);
    await render(<BusinessProfileScreen />);
    expect(await screen.findByText('No products or services listed yet.')).toBeTruthy();
  });

  it('starts a conversation with the business and opens the chat', async () => {
    mockPost.mockResolvedValue({ id: 'c9' });
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    await user.press(await screen.findByRole('button', { name: 'Message' }));

    expect(mockPost).toHaveBeenCalledWith('/api/v1/conversations/', { business: 'b1' });
    expect(mockPush).toHaveBeenCalledWith('/conversation/c9');
  });

  it('shows the server reason when a conversation cannot be started', async () => {
    mockPost.mockRejectedValue(
      new ApiError(400, { business: ['You cannot start a conversation with your own business.'] }),
    );
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    await user.press(await screen.findByRole('button', { name: 'Message' }));

    expect(
      await screen.findByText('You cannot start a conversation with your own business.'),
    ).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('no longer has an Order button, since ordering happens on each listing', async () => {
    await render(<BusinessProfileScreen />);
    await screen.findByText('Kofi Repairs');
    expect(screen.queryByRole('button', { name: 'Order' })).toBeNull();
  });

  it('goes back from the header', async () => {
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    await user.press(await screen.findByRole('button', { name: 'Back' }));

    expect(mockBack).toHaveBeenCalled();
  });

  it('offers a retry when the business cannot be loaded', async () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await render(<BusinessProfileScreen />);

    expect(await screen.findByText('Could not load this business.')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Kofi Repairs')).toBeTruthy();
  });
});

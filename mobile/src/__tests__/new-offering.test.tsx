import { render, screen, userEvent } from '@testing-library/react-native';

import NewOfferingScreen from '@/app/new-offering';

const mockGetList = jest.fn();
const mockPost = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { business: 'b1', kind: 'service' };

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'u1', email: 'a@b.co', full_name: 'A B' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getList: (...a: unknown[]) => mockGetList(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { business: 'b1', kind: 'service' };
  mockGetList.mockResolvedValue([{ id: 'c1', name: 'Repairs', slug: 'repairs' }]);
  mockPost.mockResolvedValue({ id: 's1' });
});

describe('NewOfferingScreen', () => {
  it('adds a service to the business', async () => {
    const user = userEvent.setup();
    await render(<NewOfferingScreen />);
    expect(screen.getByText('Add a service')).toBeTruthy();
    await user.type(screen.getByLabelText('Name'), 'Laptop Repair');
    await user.type(screen.getByLabelText('Price (ESP)'), '80');
    await user.press(await screen.findByLabelText('Repairs'));
    await user.press(screen.getByLabelText('Add service'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/services/', {
      business: 'b1',
      name: 'Laptop Repair',
      description: '',
      price: '80',
      category: 'Repairs',
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('adds a product through the products endpoint', async () => {
    mockParams = { business: 'b1', kind: 'product' };
    const user = userEvent.setup();
    await render(<NewOfferingScreen />);
    expect(screen.getByText('Add a product')).toBeTruthy();
    await user.type(screen.getByLabelText('Name'), 'Tee');
    await user.type(screen.getByLabelText('Price (ESP)'), '20');
    await user.press(screen.getByLabelText('Add product'));
    expect(mockPost.mock.calls[0][0]).toBe('/api/v1/products/');
  });

  it('validates name and price first', async () => {
    const user = userEvent.setup();
    await render(<NewOfferingScreen />);
    await user.press(screen.getByLabelText('Add service'));
    expect(screen.getByText('Enter a name.')).toBeTruthy();
    expect(screen.getByText('Enter a price greater than zero.')).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

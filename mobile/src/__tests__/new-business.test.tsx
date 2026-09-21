import { render, screen, userEvent } from '@testing-library/react-native';

import NewBusinessScreen from '@/app/new-business';
import { ApiError } from '@/lib/api';

const mockGetList = jest.fn();
const mockPost = jest.fn();
const mockBack = jest.fn();

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
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetList.mockResolvedValue([{ id: 'c1', name: 'Food & Dining', slug: 'food' }, { id: 'c2', name: 'Tech', slug: 'tech' }]);
  mockPost.mockResolvedValue({ id: 'b1', name: 'Kofi Repairs' });
});

describe('NewBusinessScreen', () => {
  it('asks for a name before submitting', async () => {
    const user = userEvent.setup();
    await render(<NewBusinessScreen />);
    await user.press(screen.getByLabelText('Create business'));
    expect(screen.getByText('Enter your business name.')).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('creates the business with the chosen category and goes back', async () => {
    const user = userEvent.setup();
    await render(<NewBusinessScreen />);
    await user.type(screen.getByLabelText('Business name'), 'Kofi Repairs');
    await user.type(screen.getByLabelText('Location'), 'Accra');
    await user.press(await screen.findByLabelText('Tech'));
    await user.press(screen.getByLabelText('Create business'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/businesses/', {
      name: 'Kofi Repairs',
      description: '',
      location: 'Accra',
      contact_email: undefined,
      contact_phone: undefined,
      category: 'Tech',
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows the server error and stays put', async () => {
    mockPost.mockRejectedValueOnce(new ApiError(400, { detail: 'Nope.' }));
    const user = userEvent.setup();
    await render(<NewBusinessScreen />);
    await user.type(screen.getByLabelText('Business name'), 'X');
    await user.press(screen.getByLabelText('Create business'));
    expect(await screen.findByText('Nope.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

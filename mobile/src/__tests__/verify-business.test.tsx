import { render, screen, userEvent } from '@testing-library/react-native';

import VerifyBusinessScreen from '@/app/verify-business';
import { ApiError } from '@/lib/api';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockBack = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'u1', email: 'a@b.co', full_name: 'A B' } }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ business: 'b1' }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockRejectedValue(new ApiError(404, { detail: 'No verification request yet.' }));
  mockPost.mockResolvedValue({ id: 'v1', status: 'pending' });
});

describe('VerifyBusinessScreen', () => {
  it('needs a legal name before submitting', async () => {
    const user = userEvent.setup();
    await render(<VerifyBusinessScreen />);
    await user.press(await screen.findByLabelText('Submit for verification'));
    expect(screen.getByText('Enter the registered legal name.')).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('submits the application and goes back', async () => {
    const user = userEvent.setup();
    await render(<VerifyBusinessScreen />);
    await user.type(await screen.findByLabelText('Registered legal name'), 'Kofi Tech Ltd');
    await user.type(screen.getByLabelText('Registration number'), 'CS123');
    await user.press(screen.getByLabelText('Submit for verification'));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/businesses/b1/verification/', {
      legal_name: 'Kofi Tech Ltd',
      registration_number: 'CS123',
      notes: '',
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows the server error and stays', async () => {
    mockPost.mockRejectedValueOnce(new ApiError(400, { detail: 'A verification request is already pending.' }));
    const user = userEvent.setup();
    await render(<VerifyBusinessScreen />);
    await user.type(await screen.findByLabelText('Registered legal name'), 'X');
    await user.press(screen.getByLabelText('Submit for verification'));
    expect(await screen.findByText('A verification request is already pending.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('shows a pending application instead of the form', async () => {
    mockGet.mockResolvedValue({ id: 'v1', status: 'pending', legal_name: 'Kofi Tech Ltd', rejection_reason: '' });
    await render(<VerifyBusinessScreen />);
    expect(await screen.findByText('Under review')).toBeTruthy();
    expect(screen.getByText('Kofi Tech Ltd')).toBeTruthy();
    expect(screen.queryByLabelText('Submit for verification')).toBeNull();
  });

  it('explains a rejection and lets the business apply again', async () => {
    mockGet.mockResolvedValue({ id: 'v1', status: 'rejected', legal_name: 'Kofi Tech Ltd', rejection_reason: 'Blurry document' });
    await render(<VerifyBusinessScreen />);
    expect(await screen.findByText(/Blurry document/)).toBeTruthy();
    expect(screen.getByLabelText('Submit for verification')).toBeTruthy();
  });
});

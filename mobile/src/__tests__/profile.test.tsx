import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import { ApiError } from '@/lib/api';

const mockLogout = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockPush = jest.fn();

const mockUser = {
  id: 'u1',
  email: 'temple@espees.org',
  full_name: 'Temple Lomotey',
  phone: '+233201234567',
  is_verified: false,
  wallet: { espees_wallet_id: 'stub-espees-wallet-abc123', status: 'active' },
};

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: mockUser, logout: mockLogout }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.is_verified = false;
  mockGet.mockResolvedValue({ in_app: true, email: true, push: false, sms: false });
  mockPost.mockResolvedValue({ detail: 'Verification email sent.' });
  mockPatch.mockResolvedValue({ in_app: false });
  mockLogout.mockResolvedValue(undefined);
});

describe('ProfileScreen', () => {
  it('shows the member with initials, name and email', async () => {
    await render(<ProfileScreen />);
    expect(await screen.findByText('Temple Lomotey')).toBeTruthy();
    expect(screen.getByText('temple@espees.org')).toBeTruthy();
    expect(screen.getByText('TL')).toBeTruthy();
  });

  it('is a tab, so it has no back button', async () => {
    await render(<ProfileScreen />);
    await screen.findByText('Temple Lomotey');
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('opens the edit screen from the edit button', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(await screen.findByRole('button', { name: 'Edit profile' }));
    expect(mockPush).toHaveBeenCalledWith('/edit-profile');
  });

  it('lists the settings rows', async () => {
    await render(<ProfileScreen />);
    await screen.findByText('Temple Lomotey');
    for (const label of ['Email verification', 'Espees wallet', 'Transactions', 'Notifications', 'Security']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText(/•••• abc123 · Active/)).toBeTruthy();
  });

  it('navigates to Transactions and Security', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(await screen.findByRole('button', { name: 'Transactions' }));
    expect(mockPush).toHaveBeenLastCalledWith('/transactions');
    await user.press(screen.getByRole('button', { name: 'Security' }));
    expect(mockPush).toHaveBeenLastCalledWith('/security');
  });

  it('shows a verified member as verified with nothing to do', async () => {
    mockUser.is_verified = true;
    await render(<ProfileScreen />);
    expect(await screen.findByText('Verified')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Verify email' })).toBeNull();
  });

  it('emails a verification link from the verification row', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(await screen.findByRole('button', { name: 'Verify email' }));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/verify-email/request/', {});
    expect(await screen.findByText('Check your inbox')).toBeTruthy();
  });

  it('shows why the verification email could not be sent', async () => {
    mockPost.mockRejectedValue(new ApiError(429, { detail: 'Request was throttled.' }));
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    await user.press(await screen.findByRole('button', { name: 'Verify email' }));
    expect(await screen.findByText('Request was throttled.')).toBeTruthy();
  });

  it('reflects and changes the notification preference', async () => {
    await render(<ProfileScreen />);
    const toggle = await screen.findByLabelText('Notifications toggle');
    expect(toggle.props.value).toBe(true);
    await fireEvent(toggle, 'valueChange', false);
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/notification-preferences/', { in_app: false });
  });

  it('has a single sign-out, in the settings list', async () => {
    const user = userEvent.setup();
    await render(<ProfileScreen />);
    const buttons = await screen.findAllByRole('button', { name: 'Sign out' });
    expect(buttons).toHaveLength(1);
    await user.press(buttons[0]);
    expect(mockLogout).toHaveBeenCalled();
  });
});

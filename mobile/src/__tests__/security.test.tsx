import { render, screen, userEvent } from '@testing-library/react-native';

import SecurityScreen from '@/app/security';

const mockLogout = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockBack = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ loading: false, user: { id: 'u1', email: 'a@b.co', full_name: 'A B' }, logout: mockLogout }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) },
}));
jest.mock('expo-router', () => {
  const { useEffect } = require('react');
  return {
    useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({
    sessions: [{ device_key: 'abcdef1234567890', ip_address: '102.1.1.1', user_agent: 'EENP Android', created_at: '2026-09-21T10:00:00Z' }],
  });
  mockPost.mockResolvedValue({ detail: 'Password changed.' });
  mockLogout.mockResolvedValue(undefined);
});

async function fillPasswords(user: ReturnType<typeof userEvent.setup>, next: string, confirm: string) {
  await user.type(screen.getByLabelText('Current password'), 'oldpassword1');
  await user.type(screen.getByLabelText('New password'), next);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
}

describe('SecurityScreen', () => {
  it('goes back', async () => {
    const user = userEvent.setup();
    await render(<SecurityScreen />);
    await user.press(await screen.findByRole('button', { name: 'Back' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows recent sign-in sessions', async () => {
    await render(<SecurityScreen />);
    expect(await screen.findByText(/102\.1\.1\.1/)).toBeTruthy();
  });

  it('shows an empty state when there are no sessions', async () => {
    mockGet.mockResolvedValue({ sessions: [] });
    await render(<SecurityScreen />);
    expect(await screen.findByText('No sign-in activity yet.')).toBeTruthy();
  });

  it('rejects a change of password when the confirmation differs', async () => {
    const user = userEvent.setup();
    await render(<SecurityScreen />);
    await screen.findByText(/102\.1\.1\.1/);
    await fillPasswords(user, 'newpassword1', 'different1');
    await user.press(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByText('New passwords do not match.')).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('changes the password then signs out this device', async () => {
    const user = userEvent.setup();
    await render(<SecurityScreen />);
    await screen.findByText(/102\.1\.1\.1/);
    await fillPasswords(user, 'newpassword1', 'newpassword1');
    await user.press(screen.getByRole('button', { name: 'Change password' }));
    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/change-password/', {
      old_password: 'oldpassword1',
      new_password: 'newpassword1',
    });
    expect(await screen.findByText('Password changed. Please sign in again.')).toBeTruthy();
    expect(mockLogout).toHaveBeenCalled();
  });
});

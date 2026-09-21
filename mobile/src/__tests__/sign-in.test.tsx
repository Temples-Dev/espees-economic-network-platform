import { render, screen, userEvent } from '@testing-library/react-native';

import SignInScreen from '@/app/sign-in';

const mockLogin = jest.fn();
const mockLoginWithCode = jest.fn();
const mockPush = jest.fn();
const mockPost = jest.fn();
let mockNeedsCode = false;

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    loading: false,
    needsCode: mockNeedsCode,
    login: mockLogin,
    loginWithCode: mockLoginWithCode,
  }),
}));

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockNeedsCode = false;
  mockLogin.mockResolvedValue(undefined);
  mockLoginWithCode.mockResolvedValue(undefined);
  mockPost.mockResolvedValue({});
});

describe('SignInScreen', () => {
  it('signs in with the trimmed email and password', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.type(screen.getByLabelText('Email'), '  temple@espees.org ');
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockLogin).toHaveBeenCalledWith('temple@espees.org', 'longenough1');
  });

  it('asks for both fields instead of calling the API when they are empty', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your email and password.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows the failure message when sign-in is rejected', async () => {
    mockLogin.mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.type(screen.getByLabelText('Email'), 'temple@espees.org');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Sign-in failed.')).toBeTruthy();
  });

  it('offers social sign-in options', async () => {
    await render(<SignInScreen />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with X' })).toBeTruthy();
  });

  it('sends the member to the register screen from the footer link', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.press(screen.getByRole('button', { name: 'Create an account' }));

    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('requests a password reset for the entered email', async () => {
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.press(screen.getByRole('button', { name: 'Forgot password?' }));
    await user.type(screen.getByLabelText('Email'), 'temple@espees.org');
    await user.press(screen.getByRole('button', { name: 'Send reset link' }));

    expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/password-reset/', {
      email: 'temple@espees.org',
    });
    expect(
      await screen.findByText('If the account exists, a reset email has been sent.'),
    ).toBeTruthy();
  });

  it('shows the two-factor step and verifies the code when a challenge is pending', async () => {
    mockNeedsCode = true;
    const user = userEvent.setup();
    await render(<SignInScreen />);

    await user.type(screen.getByLabelText('Two-factor code'), '123456');
    await user.press(screen.getByRole('button', { name: 'Verify' }));

    expect(mockLoginWithCode).toHaveBeenCalledWith('123456');
  });
});

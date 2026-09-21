import { render, screen, userEvent } from '@testing-library/react-native';

import RegisterScreen from '@/app/register';

const mockRegister = jest.fn();
const mockLogin = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    loading: false,
    register: mockRegister,
    login: mockLogin,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }),
}));

type User = ReturnType<typeof userEvent.setup>;

async function fillForm(
  user: User,
  { password = 'longenough1', confirm = 'longenough1', phone = '' } = {},
) {
  await user.type(screen.getByLabelText('Full name'), 'Temple Lomotey');
  await user.type(screen.getByLabelText('Email'), 'temple@espees.org');
  if (phone) await user.type(screen.getByLabelText('Phone (optional)'), phone);
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirm);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRegister.mockResolvedValue(undefined);
  mockLogin.mockResolvedValue(undefined);
});

describe('RegisterScreen', () => {
  it('shows every field on a single screen', async () => {
    await render(<RegisterScreen />);

    for (const label of ['Full name', 'Email', 'Phone (optional)', 'Password', 'Confirm password']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(screen.queryByText(/step \d of \d/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('offers social sign-up options', async () => {
    await render(<RegisterScreen />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with Apple' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue with X' })).toBeTruthy();
  });

  it('reports every problem at once and does not submit', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen />);

    await user.press(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter your full name.')).toBeTruthy();
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('blocks submit when the passwords do not match', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen />);

    await fillForm(user, { confirm: 'different1' });
    await user.press(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows a strength meter once a password is typed', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen />);

    expect(screen.queryByText('Weak')).toBeNull();
    await user.type(screen.getByLabelText('Password'), 'abc');

    expect(screen.getByText('Weak')).toBeTruthy();
  });

  it('registers with all fields then signs the user in', async () => {
    const user = userEvent.setup();
    await render(<RegisterScreen />);

    await fillForm(user, { phone: '+233201234567' });
    await user.press(screen.getByRole('button', { name: 'Create account' }));

    expect(mockRegister).toHaveBeenCalledWith({
      email: 'temple@espees.org',
      password: 'longenough1',
      full_name: 'Temple Lomotey',
      phone: '+233201234567',
    });
    expect(mockLogin).toHaveBeenCalledWith('temple@espees.org', 'longenough1');
  });

  it('shows the failure message and does not sign in when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    await render(<RegisterScreen />);

    await fillForm(user);
    await user.press(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Sign-up failed.')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});

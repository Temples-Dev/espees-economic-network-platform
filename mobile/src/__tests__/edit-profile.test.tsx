import { render, screen, userEvent } from '@testing-library/react-native';

import EditProfileScreen from '@/app/edit-profile';
import { ApiError } from '@/lib/api';

const mockPatch = jest.fn();
const mockReload = jest.fn();
const mockBack = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    loading: false,
    user: { id: 'u1', email: 'temple@espees.org', full_name: 'Temple Lomotey', phone: '+233201234567' },
    reload: mockReload,
  }),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { patch: (...a: unknown[]) => mockPatch(...a) },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPatch.mockResolvedValue({});
  mockReload.mockResolvedValue(undefined);
});

describe('EditProfileScreen', () => {
  it('starts with the current name and phone, and shows the email as fixed', async () => {
    await render(<EditProfileScreen />);
    expect(screen.getByLabelText('Full name').props.value).toBe('Temple Lomotey');
    expect(screen.getByLabelText('Phone').props.value).toBe('+233201234567');
    expect(screen.getByText('temple@espees.org')).toBeTruthy();
  });

  it('saves the changes, refreshes the member and goes back', async () => {
    const user = userEvent.setup();
    await render(<EditProfileScreen />);
    await user.clear(screen.getByLabelText('Full name'));
    await user.type(screen.getByLabelText('Full name'), 'Temple L');
    await user.press(screen.getByLabelText('Save changes'));
    expect(mockPatch).toHaveBeenCalledWith('/api/v1/me/', { full_name: 'Temple L', phone: '+233201234567' });
    expect(mockReload).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it('will not save a blank name', async () => {
    const user = userEvent.setup();
    await render(<EditProfileScreen />);
    await user.clear(screen.getByLabelText('Full name'));
    await user.press(screen.getByLabelText('Save changes'));
    expect(screen.getByText('Enter your name.')).toBeTruthy();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('shows the server error and stays', async () => {
    mockPatch.mockRejectedValue(new ApiError(400, { phone: ['Enter a valid phone number.'] }));
    const user = userEvent.setup();
    await render(<EditProfileScreen />);
    await user.press(screen.getByLabelText('Save changes'));
    expect(await screen.findByText('Enter a valid phone number.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

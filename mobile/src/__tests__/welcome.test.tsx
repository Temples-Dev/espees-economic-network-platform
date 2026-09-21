import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import WelcomeScreen from '@/app/welcome';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

const { width } = Dimensions.get('window');

beforeEach(() => jest.clearAllMocks());


const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style?: string }) => {
    mockStatusBar(props.style);
    return null;
  },
}));

describe('WelcomeScreen', () => {
  it('uses light status bar icons on the blue page', async () => {
    await render(<WelcomeScreen />);
    expect(mockStatusBar).toHaveBeenCalledWith('light');
  });

  it('shows the EENP logo', async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByLabelText('EENP logo')).toBeTruthy();
  });

  it('gives Businesses, Payments and Community a card each', async () => {
    await render(<WelcomeScreen />);
    for (const title of ['Businesses', 'Payments', 'Community']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByLabelText('Businesses illustration')).toBeTruthy();
    expect(screen.getByLabelText('Payments illustration')).toBeTruthy();
    expect(screen.getByLabelText('Community illustration')).toBeTruthy();
  });

  it('does not show the security tagline', async () => {
    await render(<WelcomeScreen />);
    expect(screen.queryByText(/two-factor/i)).toBeNull();
    expect(screen.queryByText(/secure sessions/i)).toBeNull();
  });

  it('starts on page 1 with Next and Skip, and no Get started yet', async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByLabelText('Page 1 of 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull();
  });

  it('reaches Get started after paging through the cards with Next', async () => {
    const user = userEvent.setup();
    await render(<WelcomeScreen />);

    await user.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByLabelText('Page 2 of 3')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByLabelText('Page 3 of 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();
  });

  it('jumps to the last card with Skip', async () => {
    const user = userEvent.setup();
    await render(<WelcomeScreen />);

    await user.press(screen.getByRole('button', { name: 'Skip' }));

    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy();
  });

  it('follows a swipe to the last card', async () => {
    await render(<WelcomeScreen />);

    await fireEvent(screen.getByTestId('welcome-pager'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: width * 2 } },
    });

    expect(screen.getByLabelText('Page 3 of 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy();
  });

  it('opens the register screen from Get started', async () => {
    const user = userEvent.setup();
    await render(<WelcomeScreen />);

    await user.press(screen.getByRole('button', { name: 'Skip' }));
    await user.press(screen.getByRole('button', { name: 'Get started' }));

    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('offers sign-in to existing members on the last card', async () => {
    const user = userEvent.setup();
    await render(<WelcomeScreen />);

    await user.press(screen.getByRole('button', { name: 'Skip' }));
    await user.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });
});

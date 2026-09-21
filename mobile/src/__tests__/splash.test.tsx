import { fireEvent, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
  preventAutoHideAsync: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  class Keyframe {
    duration() {
      return this;
    }
    withCallback() {
      return this;
    }
  }
  return {
    __esModule: true,
    default: { View },
    Keyframe,
    Easing: { out: (fn: unknown) => fn, cubic: undefined },
  };
});

jest.mock('react-native-worklets', () => ({ scheduleOnRN: jest.fn() }));


const mockStatusBar = jest.fn();
jest.mock('expo-status-bar', () => ({
  StatusBar: (props: { style?: string }) => {
    mockStatusBar(props.style);
    return null;
  },
}));

describe('AnimatedSplashOverlay', () => {
  it('shows the EENP logo and tagline', async () => {
    await render(<AnimatedSplashOverlay />);
    expect(screen.getByLabelText('EENP logo')).toBeTruthy();
    expect(screen.getByText('Espees Economic Network')).toBeTruthy();
  });

  it('shows light status bar icons on the blue splash', async () => {
    await render(<AnimatedSplashOverlay />);
    expect(mockStatusBar).toHaveBeenCalledWith('light');
  });

  it('hands over from the native splash once laid out', async () => {
    await render(<AnimatedSplashOverlay />);
    await fireEvent(screen.getByTestId('splash-overlay'), 'layout');
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});

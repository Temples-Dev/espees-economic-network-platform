import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FloatingTabBar } from '@/components/floating-tab-bar';

const ROUTES = [
  { key: 'index-1', name: 'index', title: 'Home' },
  { key: 'discover-1', name: 'discover', title: 'Discover' },
  { key: 'pay-1', name: 'pay', title: 'Pay' },
  { key: 'build-1', name: 'build', title: 'Build' },
  { key: 'community-1', name: 'community', title: 'Community' },
  { key: 'profile-1', name: 'profile', title: 'Profile' },
];

const emit = jest.fn();
const navigate = jest.fn();

async function renderBar(focused = 0) {
  const props = {
    state: {
      index: focused,
      routes: ROUTES.map(({ key, name }) => ({ key, name })),
    },
    descriptors: Object.fromEntries(
      ROUTES.map((r) => [r.key, { options: { title: r.title } }]),
    ),
    navigation: { emit, navigate },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  } as unknown as ComponentProps<typeof FloatingTabBar>;

  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 34 },
      }}>
      <FloatingTabBar {...props} />
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  emit.mockReturnValue({ defaultPrevented: false });
});

describe('FloatingTabBar', () => {
  it('shows one labelled button per tab', async () => {
    await renderBar();
    for (const r of ROUTES) {
      expect(screen.getByRole('button', { name: r.title })).toBeTruthy();
    }
  });

  it('marks only the focused tab as selected', async () => {
    await renderBar(2);
    expect(screen.getByRole('button', { name: 'Pay' }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByRole('button', { name: 'Home' }).props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('switches to a tab when it is pressed', async () => {
    const user = userEvent.setup();
    await renderBar(0);

    await user.press(screen.getByRole('button', { name: 'Profile' }));

    expect(emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'profile-1', canPreventDefault: true });
    expect(navigate).toHaveBeenCalledWith('profile');
  });

  it('stays put when the focused tab is pressed again', async () => {
    const user = userEvent.setup();
    await renderBar(1);

    await user.press(screen.getByRole('button', { name: 'Discover' }));

    expect(emit).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not switch when a tab press is default-prevented', async () => {
    emit.mockReturnValue({ defaultPrevented: true });
    const user = userEvent.setup();
    await renderBar(0);

    await user.press(screen.getByRole('button', { name: 'Build' }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports a long press to the navigator', async () => {
    await renderBar(0);

    await fireEvent(screen.getByRole('button', { name: 'Community' }), 'longPress');

    expect(emit).toHaveBeenCalledWith({ type: 'tabLongPress', target: 'community-1' });
  });
});

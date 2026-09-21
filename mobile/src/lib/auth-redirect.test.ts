import { resolveAuthRedirect } from './auth-redirect';

describe('resolveAuthRedirect', () => {
  it('does nothing while the session is still loading', () => {
    expect(resolveAuthRedirect({ signedIn: false, loading: true, segments: ['(tabs)'] })).toBeNull();
  });

  it('sends a signed-out member inside the tabs to the welcome screen', () => {
    expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: ['(tabs)'] })).toBe(
      '/welcome',
    );
  });

  it('sends a signed-out member off the profile screen to the welcome screen', () => {
    expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: ['profile'] })).toBe(
      '/welcome',
    );
  });

  it('lets a signed-in member stay on the profile screen', () => {
    expect(resolveAuthRedirect({ signedIn: true, loading: false, segments: ['profile'] })).toBeNull();
  });

  it('sends a signed-out member off a business profile to the welcome screen', () => {
    expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: ['business', '[id]'] })).toBe(
      '/welcome',
    );
  });

  it('lets a signed-in member stay on a business profile', () => {
    expect(
      resolveAuthRedirect({ signedIn: true, loading: false, segments: ['business', '[id]'] }),
    ).toBeNull();
  });

  it('keeps a listing page members-only', () => {
    expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: ['offering', '[id]'] })).toBe(
      '/welcome',
    );
    expect(
      resolveAuthRedirect({ signedIn: true, loading: false, segments: ['offering', '[id]'] }),
    ).toBeNull();
  });

  it('lets a signed-out member stay on the welcome, sign-in and register screens', () => {
    for (const screen of ['welcome', 'sign-in', 'register']) {
      expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: [screen] })).toBeNull();
    }
  });

  it('moves a signed-in member off the auth screens into the tabs', () => {
    for (const screen of ['welcome', 'sign-in', 'register']) {
      expect(resolveAuthRedirect({ signedIn: true, loading: false, segments: [screen] })).toBe(
        '/(tabs)',
      );
    }
  });

  it('leaves a signed-in member inside the tabs alone', () => {
    expect(resolveAuthRedirect({ signedIn: true, loading: false, segments: ['(tabs)'] })).toBeNull();
  });

  const STACK_SCREENS = [
    'conversation',
    'transactions',
    'security',
    'edit-profile',
    'new-business',
    'new-offering',
    'verify-business',
  ];

  it('lets a signed-in member stay on every screen pushed above the tabs', () => {
    for (const screen of STACK_SCREENS) {
      expect(resolveAuthRedirect({ signedIn: true, loading: false, segments: [screen, '[id]'] })).toBeNull();
    }
  });

  it('sends a signed-out member off those screens to the welcome screen', () => {
    for (const screen of STACK_SCREENS) {
      expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: [screen] })).toBe('/welcome');
    }
  });

  it('still moves a signed-in member from the bare root into the tabs', () => {
    expect(resolveAuthRedirect({ signedIn: true, loading: false, segments: [] })).toBe('/(tabs)');
    expect(resolveAuthRedirect({ signedIn: false, loading: false, segments: [] })).toBeNull();
  });
});

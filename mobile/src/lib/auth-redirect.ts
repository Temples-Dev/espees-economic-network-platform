export type AuthRedirect = '/welcome' | '/(tabs)' | null;

/** Screens for signed-out visitors. Every other route is for members, so new screens need no registration here. */
const PUBLIC = ['welcome', 'sign-in', 'register'];

export function resolveAuthRedirect(input: {
  signedIn: boolean;
  loading: boolean;
  segments: readonly string[];
}): AuthRedirect {
  if (input.loading) return null;
  const first = input.segments[0];
  if (first === undefined) return input.signedIn ? '/(tabs)' : null;
  const isPublic = PUBLIC.includes(first);
  if (!input.signedIn && !isPublic) return '/welcome';
  if (input.signedIn && isPublic) return '/(tabs)';
  return null;
}

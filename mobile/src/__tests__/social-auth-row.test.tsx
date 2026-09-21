import { render, screen } from '@testing-library/react-native';

import { SocialAuthRow } from '@/components/social-auth-row';

describe('SocialAuthRow', () => {
  it('offers Google, Apple and X', async () => {
    await render(<SocialAuthRow />);

    for (const name of ['Continue with Google', 'Continue with Apple', 'Continue with X']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('labels the divider', async () => {
    await render(<SocialAuthRow />);
    expect(screen.getByText('or continue with')).toBeTruthy();
  });
});

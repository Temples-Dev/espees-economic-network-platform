import { ApiError, errorMessage } from './api';

describe('errorMessage', () => {
  it('returns the fallback for non-API errors', () => {
    expect(errorMessage(new Error('x'), 'Sign-up failed.')).toBe('Sign-up failed.');
  });

  it('uses a DRF detail string', () => {
    expect(errorMessage(new ApiError(401, { detail: 'Invalid credentials.' }), 'f')).toBe(
      'Invalid credentials.',
    );
  });

  it('surfaces field-level validation errors', () => {
    const err = new ApiError(400, { email: ['A user with this email already exists.'] });
    expect(errorMessage(err, 'Sign-up failed.')).toBe('A user with this email already exists.');
  });

  it('joins messages from several fields', () => {
    const err = new ApiError(400, {
      email: ['Enter a valid email address.'],
      password: ['This password is too common.'],
    });
    expect(errorMessage(err, 'f')).toBe(
      'Enter a valid email address. This password is too common.',
    );
  });
});

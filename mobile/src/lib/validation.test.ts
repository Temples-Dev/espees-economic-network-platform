import {
  isValidEmail,
  passwordStrength,
  validateAccountStep,
  validatePasswordStep,
} from './validation';

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('temple@espees.org')).toBe(true);
  });

  it('rejects an address without a domain', () => {
    expect(isValidEmail('temple@')).toBe(false);
  });

  it('ignores surrounding whitespace', () => {
    expect(isValidEmail('  temple@espees.org  ')).toBe(true);
  });
});

describe('passwordStrength', () => {
  it('rates short passwords as weak', () => {
    expect(passwordStrength('abc12')).toBe('weak');
  });

  it('rates 8+ chars with mixed letters and digits as fair', () => {
    expect(passwordStrength('abcdefg1')).toBe('fair');
  });

  it('rates 12+ chars with mixed case, digit and symbol as strong', () => {
    expect(passwordStrength('Abcdefgh123!')).toBe('strong');
  });
});

describe('validateAccountStep', () => {
  it('requires a full name', () => {
    const errors = validateAccountStep({ fullName: ' ', email: 'a@b.co', phone: '' });
    expect(errors.fullName).toBe('Enter your full name.');
  });

  it('requires a valid email', () => {
    const errors = validateAccountStep({ fullName: 'Temple', email: 'nope', phone: '' });
    expect(errors.email).toBe('Enter a valid email address.');
  });

  it('allows an empty phone number', () => {
    const errors = validateAccountStep({ fullName: 'Temple', email: 'a@b.co', phone: '' });
    expect(errors).toEqual({});
  });

  it('rejects a phone number with too few digits', () => {
    const errors = validateAccountStep({ fullName: 'Temple', email: 'a@b.co', phone: '12345' });
    expect(errors.phone).toBe('Enter a valid phone number.');
  });
});

describe('validatePasswordStep', () => {
  it('requires at least 8 characters', () => {
    const errors = validatePasswordStep({ password: 'short1', confirm: 'short1' });
    expect(errors.password).toBe('Use at least 8 characters.');
  });

  it('requires the confirmation to match', () => {
    const errors = validatePasswordStep({ password: 'longenough1', confirm: 'different1' });
    expect(errors.confirm).toBe('Passwords do not match.');
  });

  it('passes when long enough and matching', () => {
    const errors = validatePasswordStep({ password: 'longenough1', confirm: 'longenough1' });
    expect(errors).toEqual({});
  });
});

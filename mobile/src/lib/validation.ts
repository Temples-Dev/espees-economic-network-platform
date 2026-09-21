export type Strength = 'weak' | 'fair' | 'strong';

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function passwordStrength(password: string): Strength {
  if (password.length < 8) return 'weak';
  const hasLetter = /[a-z]/i.test(password);
  const hasDigit = /\d/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (password.length >= 12 && hasMixedCase && hasDigit && hasSymbol) return 'strong';
  if (hasLetter && hasDigit) return 'fair';
  return 'weak';
}

export type AccountStepErrors = { fullName?: string; email?: string; phone?: string };

export function validateAccountStep(input: {
  fullName: string;
  email: string;
  phone: string;
}): AccountStepErrors {
  const errors: AccountStepErrors = {};
  if (!input.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!isValidEmail(input.email)) errors.email = 'Enter a valid email address.';
  const phone = input.phone.trim();
  if (phone && phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number.';
  return errors;
}

export type PasswordStepErrors = { password?: string; confirm?: string };

export function validatePasswordStep(input: {
  password: string;
  confirm: string;
}): PasswordStepErrors {
  const errors: PasswordStepErrors = {};
  if (input.password.length < 8) errors.password = 'Use at least 8 characters.';
  else if (input.confirm !== input.password) errors.confirm = 'Passwords do not match.';
  return errors;
}

import {describe, it, expect} from 'vitest';

import {FORMAT, MAX_LENGTH, sanitize} from './registrationNumber.js';

describe('sanitize', () => {
  it('keeps a well-formed number as it is', () => {
    expect(sanitize('UA12345678')).toBe('UA12345678');
  });

  it('upper cases the prefix', () => {
    expect(sanitize('ua12345678')).toBe('UA12345678');
  });

  it('drops separators and spaces', () => {
    expect(sanitize('UA-1234 5678')).toBe('UA12345678');
  });

  it('refuses letters where digits belong', () => {
    expect(sanitize('UAAB345678')).toBe('UA345678');
  });

  it('refuses digits where the prefix belongs', () => {
    expect(sanitize('12UA345678')).toBe('UA345678');
  });

  it('stops at the maximum length', () => {
    expect(sanitize('UA123456789012345')).toHaveLength(MAX_LENGTH);
  });

  it('leaves a partially typed value alone', () => {
    expect(sanitize('U')).toBe('U');
    expect(sanitize('UA')).toBe('UA');
    expect(sanitize('UA1')).toBe('UA1');
  });
});

describe('FORMAT', () => {
  it.each(['UA12345678', 'UA123456789', 'UA1234567890'])('accepts %s', (value) => {
    expect(FORMAT.test(value)).toBe(true);
  });

  it.each([
    '',
    'UA',
    'UA1234567',
    'UA12345678901',
    'PL12345678',
    'ua12345678',
    'UA1234567A',
  ])('rejects %s', (value) => {
    expect(FORMAT.test(value)).toBe(false);
  });
});

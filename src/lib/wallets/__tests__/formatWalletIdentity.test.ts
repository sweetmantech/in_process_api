import { describe, it, expect } from 'vitest';
import formatWalletIdentity from '../formatWalletIdentity';

const ADDRESS = '0xrecipient0000000000000000000000000000000';

describe('formatWalletIdentity', () => {
  it('includes the username alongside the truncated address when available', () => {
    expect(formatWalletIdentity(ADDRESS, 'cxy')).toBe('cxy (0xreci…0000)');
  });

  it('falls back to just the truncated address when no username is linked', () => {
    expect(formatWalletIdentity(ADDRESS, null)).toBe('0xreci…0000');
  });

  it('falls back to just the truncated address when username is undefined', () => {
    expect(formatWalletIdentity(ADDRESS)).toBe('0xreci…0000');
  });
});

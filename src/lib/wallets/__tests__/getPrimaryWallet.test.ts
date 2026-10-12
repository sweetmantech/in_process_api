import { describe, it, expect } from 'vitest';
import getPrimaryWallet from '../getPrimaryWallet';
import type { Tables } from '@/lib/supabase/types';

const wallet = (
  address: string,
  type: Tables<'in_process_wallets'>['type']
): Tables<'in_process_wallets'> => ({ address, artist: 'artist-1', type });

describe('getPrimaryWallet', () => {
  it('returns undefined for empty input', () => {
    expect(getPrimaryWallet([])).toBeUndefined();
    expect(getPrimaryWallet(null)).toBeUndefined();
  });

  it('prefers external over privy', () => {
    expect(
      getPrimaryWallet([
        wallet('0xprivy', 'privy'),
        wallet('0xext', 'external'),
      ])
    ).toBe('0xext');
  });

  it('prefers privy over other EOAs', () => {
    expect(
      getPrimaryWallet([wallet('0xnull', null), wallet('0xprivy', 'privy')])
    ).toBe('0xprivy');
  });

  it('skips smart and operator wallets when falling back', () => {
    expect(
      getPrimaryWallet([
        wallet('0xoperator', 'operator'),
        wallet('0xsmart', 'smart'),
        wallet('0xnull', null),
      ])
    ).toBe('0xnull');
  });

  it('falls back to the first wallet when only smart wallets exist', () => {
    expect(
      getPrimaryWallet([
        wallet('0xoperator', 'operator'),
        wallet('0xsmart', 'smart'),
      ])
    ).toBe('0xoperator');
  });
});

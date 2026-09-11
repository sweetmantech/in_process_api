import { describe, expect, it } from 'vitest';
import isDbMomentSoldOut from '@/lib/moment/isDbMomentSoldOut';

describe('isDbMomentSoldOut', () => {
  it('returns true when max_supply is reached', () => {
    expect(isDbMomentSoldOut({ max_supply: 5, total_minted: 5 })).toBe(true);
  });

  it('returns false when supply remains', () => {
    expect(isDbMomentSoldOut({ max_supply: 5, total_minted: 4 })).toBe(false);
  });

  it('returns false when max_supply is unlimited (0)', () => {
    expect(isDbMomentSoldOut({ max_supply: 0, total_minted: 100 })).toBe(false);
  });
});

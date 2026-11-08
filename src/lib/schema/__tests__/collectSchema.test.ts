import { describe, expect, it } from 'vitest';
import { collectSchema } from '../collectSchema';

const base = {
  moment: {
    collectionAddress: '0x702a115746430328c64ea1b59ccb2fd38ff6f378',
    tokenId: '14',
    chainId: 8453,
  },
  comment: '',
};

describe('collectSchema', () => {
  it('accepts quantity', () => {
    expect(collectSchema.parse({ ...base, quantity: 2 }).quantity).toBe(2);
  });

  it('accepts amount', () => {
    expect(collectSchema.parse({ ...base, amount: 3 }).quantity).toBe(3);
  });

  it('prefers quantity when both are sent', () => {
    expect(
      collectSchema.parse({ ...base, quantity: 2, amount: 3 }).quantity
    ).toBe(2);
  });

  it('rejects a body with neither', () => {
    const result = collectSchema.safeParse(base);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['quantity']);
  });
});

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
  it.each([1, 2])('accepts quantity %j', (quantity) => {
    expect(collectSchema.parse({ ...base, quantity }).quantity).toBe(quantity);
  });

  it('accepts amount', () => {
    expect(collectSchema.parse({ ...base, amount: 3 }).quantity).toBe(3);
  });

  it('prefers quantity when both are sent', () => {
    expect(
      collectSchema.parse({ ...base, quantity: 2, amount: 3 }).quantity
    ).toBe(2);
  });

  it('defaults to 1 when neither is sent', () => {
    expect(collectSchema.parse(base).quantity).toBe(1);
  });

  it.each(['', '1', 0, -1, 1.5])('rejects %j', (value) => {
    expect(collectSchema.safeParse({ ...base, quantity: value }).success).toBe(
      false
    );
    expect(collectSchema.safeParse({ ...base, amount: value }).success).toBe(
      false
    );
  });
});

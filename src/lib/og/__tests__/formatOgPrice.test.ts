import { describe, it, expect } from 'vitest';
import formatOgPrice from '@/lib/og/formatOgPrice';
import { MomentType } from '@/types/moment';

const sale = (pricePerToken: string, type: MomentType) =>
  ({ pricePerToken, type }) as any;

describe('formatOgPrice', () => {
  it('returns null without a sale', () => {
    expect(formatOgPrice(null)).toBeNull();
  });

  it('returns FREE for a zero price', () => {
    expect(formatOgPrice(sale('0', MomentType.Erc20Mint))).toBe('FREE');
  });

  it('formats erc20 sales as USDC with 6 decimals', () => {
    expect(formatOgPrice(sale('10000000', MomentType.Erc20Mint))).toBe(
      '10 USDC'
    );
  });

  it('formats other sales as ETH with 18 decimals', () => {
    expect(
      formatOgPrice(sale('1000000000000000', MomentType.FixedPriceMint))
    ).toBe('0.001 ETH');
  });
});

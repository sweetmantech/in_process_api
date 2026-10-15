import { describe, it, expect, vi, beforeEach } from 'vitest';

const readContract = vi.fn();

vi.mock('@/lib/viem/publicClient', () => ({
  getPublicClient: () => ({ readContract }),
}));
vi.mock('@/lib/coinbase/getArweaveDepositSmartAccount', () => ({
  getArweaveDepositSmartAccount: vi.fn(),
}));
vi.mock('@/lib/arweave/topUpTurboCreditsFromAccount', () => ({
  default: vi.fn(),
}));

import forwardArweaveDeposit from '@/lib/arweave/forwardArweaveDeposit';
import { getArweaveDepositSmartAccount } from '@/lib/coinbase/getArweaveDepositSmartAccount';
import topUpTurboCreditsFromAccount from '@/lib/arweave/topUpTurboCreditsFromAccount';

const smartAccount = { address: '0x2222222222222222222222222222222222222222' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getArweaveDepositSmartAccount).mockResolvedValue(
    smartAccount as never
  );
});

describe('forwardArweaveDeposit', () => {
  it('skips the top-up when the balance is below 1 USDC', async () => {
    readContract.mockResolvedValue(BigInt(999_999));

    const result = await forwardArweaveDeposit();

    expect(topUpTurboCreditsFromAccount).not.toHaveBeenCalled();
    expect(result).toEqual({
      address: smartAccount.address,
      forwardedUsdcMicros: '0',
    });
  });

  it('tops up Turbo credits with the full USDC balance', async () => {
    readContract.mockResolvedValue(BigInt(25_000_000));
    vi.mocked(topUpTurboCreditsFromAccount).mockResolvedValue({
      id: '0xabc',
    } as never);

    const result = await forwardArweaveDeposit();

    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'balanceOf',
        args: [smartAccount.address],
      })
    );
    expect(topUpTurboCreditsFromAccount).toHaveBeenCalledWith(
      smartAccount,
      BigInt(25_000_000)
    );
    expect(result).toEqual({
      address: smartAccount.address,
      forwardedUsdcMicros: '25000000',
      result: { id: '0xabc' },
    });
  });
});

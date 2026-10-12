import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import cdp from '@/lib/coinbase/client';
import { deterministicAccountName } from '@/lib/coinbase/deterministricAccountName';
import { findWalletSmartAccount } from '../findWalletSmartAccount';

vi.mock('@/lib/coinbase/client', () => ({
  default: {
    evm: {
      getAccount: vi.fn(),
      getOrCreateAccount: vi.fn(),
      getOrCreateSmartAccount: vi.fn(),
    },
  },
}));

const ADDRESS = '0x36DCB4B950B883DDBB87CA862E30BDD9E2FC41BB' as Address;
const owner = { address: '0xowner', name: 'owner-name' };
const smartAccount = { address: '0x73bf1fac7c18702f070633d24ead608675c88cb8' };

describe('findWalletSmartAccount', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the existing smart account without creating an owner', async () => {
    vi.mocked(cdp.evm.getAccount).mockResolvedValue(owner as never);
    vi.mocked(cdp.evm.getOrCreateSmartAccount).mockResolvedValue(
      smartAccount as never
    );

    const result = await findWalletSmartAccount({ address: ADDRESS });

    expect(cdp.evm.getAccount).toHaveBeenCalledWith({
      name: deterministicAccountName(ADDRESS.toLowerCase()),
    });
    expect(cdp.evm.getOrCreateAccount).not.toHaveBeenCalled();
    expect(result).toBe(smartAccount);
  });

  it('returns null when no account was ever derived from the address', async () => {
    vi.mocked(cdp.evm.getAccount).mockRejectedValue(
      Object.assign(new Error('not found'), { statusCode: 404 })
    );

    const result = await findWalletSmartAccount({ address: ADDRESS });

    expect(result).toBeNull();
    expect(cdp.evm.getOrCreateSmartAccount).not.toHaveBeenCalled();
  });

  it('rethrows other CDP errors', async () => {
    vi.mocked(cdp.evm.getAccount).mockRejectedValue(
      Object.assign(new Error('rate limited'), { statusCode: 429 })
    );

    await expect(findWalletSmartAccount({ address: ADDRESS })).rejects.toThrow(
      'rate limited'
    );
  });
});

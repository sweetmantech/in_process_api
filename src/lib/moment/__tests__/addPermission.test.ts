import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import { getOperationalSmartWallet } from '@/lib/smartwallets/getOperationalSmartWallet';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import getPermissionTargets from '@/lib/wallets/getPermissionTargets';
import getAddPermissionCall from '@/lib/viem/getAddPermissionCall';
import { addPermission } from '../addPermission';

vi.mock('@/lib/smartwallets/getOperationalSmartWallet', () => ({
  getOperationalSmartWallet: vi.fn(),
}));
vi.mock('@/lib/coinbase/sendUserOperation', () => ({
  sendUserOperation: vi.fn(),
}));
vi.mock('@/lib/wallets/getPermissionTargets', () => ({ default: vi.fn() }));
vi.mock('@/lib/viem/getAddPermissionCall', () => ({ default: vi.fn() }));

const moment = {
  collectionAddress: '0x16af6f4491a4aa8cabd4f0f959dbe0ec24cb88ec' as Address,
  tokenId: '1',
  chainId: 8453,
};
const artist = {
  artistId: 'artist-1',
  primaryWallet: '0x00000000000000000000000000000000000000a1' as Address,
  wallets: [],
};
const ADMIN_EOA = '0x00000000000000000000000000000000000000b1' as Address;
const ADMIN_OPERATOR = '0x00000000000000000000000000000000000000b2' as Address;

describe('addPermission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOperationalSmartWallet).mockResolvedValue({
      address: '0xcaller',
    } as never);
    vi.mocked(getAddPermissionCall).mockImplementation(
      (_moment, address) => ({ to: address }) as never
    );
    vi.mocked(sendUserOperation).mockResolvedValue({
      transactionHash: '0xhash',
    } as never);
  });

  it('grants the admin and its linked operators in one user operation', async () => {
    vi.mocked(getPermissionTargets).mockResolvedValue([
      ADMIN_EOA,
      ADMIN_OPERATOR,
    ]);

    await addPermission({ moment, adminAddress: ADMIN_EOA, artist });

    expect(
      vi.mocked(getAddPermissionCall).mock.calls.map(([, address]) => address)
    ).toEqual([ADMIN_EOA, ADMIN_OPERATOR]);
    expect(sendUserOperation).toHaveBeenCalledTimes(1);
  });

  it('grants only the address when it has no linked operator', async () => {
    vi.mocked(getPermissionTargets).mockResolvedValue([ADMIN_EOA]);

    await addPermission({ moment, adminAddress: ADMIN_EOA, artist });

    expect(getAddPermissionCall).toHaveBeenCalledTimes(1);
  });
});

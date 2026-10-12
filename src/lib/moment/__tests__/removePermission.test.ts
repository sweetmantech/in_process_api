import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import { getOperationalSmartWallet } from '@/lib/smartwallets/getOperationalSmartWallet';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import getCollectionOwner from '@/lib/viem/getCollectionOwner';
import getPermissionTargets from '@/lib/wallets/getPermissionTargets';
import getRemovePermissionCall from '@/lib/viem/getRemovePermissionCall';
import { removePermission } from '../removePermission';

vi.mock('@/lib/smartwallets/getOperationalSmartWallet', () => ({
  getOperationalSmartWallet: vi.fn(),
}));
vi.mock('@/lib/coinbase/sendUserOperation', () => ({
  sendUserOperation: vi.fn(),
}));
vi.mock('@/lib/viem/getCollectionOwner', () => ({ default: vi.fn() }));
vi.mock('@/lib/wallets/getPermissionTargets', () => ({ default: vi.fn() }));
vi.mock('@/lib/viem/getRemovePermissionCall', () => ({ default: vi.fn() }));

const moment = {
  collectionAddress: '0x16af6f4491a4aa8cabd4f0f959dbe0ec24cb88ec' as Address,
  tokenId: '0',
  chainId: 8453,
};
const artist = {
  artistId: 'artist-1',
  primaryWallet: '0x00000000000000000000000000000000000000a1' as Address,
  wallets: [],
};
const CALLER_OPERATOR = '0x00000000000000000000000000000000000000c1';
const OWNER = '0x00000000000000000000000000000000000000c0';
const ADMIN_EOA = '0x00000000000000000000000000000000000000b1' as Address;
const ADMIN_OPERATOR = '0x00000000000000000000000000000000000000b2' as Address;

const removedAddresses = () =>
  vi.mocked(getRemovePermissionCall).mock.calls.map(([, address]) => address);

describe('removePermission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOperationalSmartWallet).mockResolvedValue({
      address: CALLER_OPERATOR,
    } as never);
    vi.mocked(getCollectionOwner).mockResolvedValue(OWNER as Address);
    vi.mocked(getRemovePermissionCall).mockImplementation(
      (_moment, address) => ({ to: address }) as never
    );
    vi.mocked(sendUserOperation).mockResolvedValue({
      transactionHash: '0xhash',
    } as never);
  });

  it('removes the admin and its linked operators in one user operation', async () => {
    vi.mocked(getPermissionTargets).mockResolvedValue([
      ADMIN_EOA,
      ADMIN_OPERATOR,
    ]);

    const result = await removePermission({
      moment,
      adminAddress: ADMIN_EOA,
      artist,
    });

    expect(removedAddresses()).toEqual([ADMIN_EOA, ADMIN_OPERATOR]);
    expect(sendUserOperation).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendUserOperation).mock.calls[0][0].calls).toHaveLength(2);
    expect(result.hash).toBe('0xhash');
  });

  it('keeps a linked operator that owns the collection', async () => {
    vi.mocked(getPermissionTargets).mockResolvedValue([
      ADMIN_EOA,
      OWNER as Address,
    ]);

    await removePermission({ moment, adminAddress: ADMIN_EOA, artist });

    expect(removedAddresses()).toEqual([ADMIN_EOA]);
  });

  it('keeps a linked operator that is sending the request', async () => {
    vi.mocked(getPermissionTargets).mockResolvedValue([
      ADMIN_EOA,
      CALLER_OPERATOR as Address,
    ]);

    await removePermission({ moment, adminAddress: ADMIN_EOA, artist });

    expect(removedAddresses()).toEqual([ADMIN_EOA]);
  });

  it.each([
    ['the collection owner', OWNER],
    ['the wallet sending the request', CALLER_OPERATOR],
  ])('refuses to remove %s', async (_label, address) => {
    vi.mocked(getPermissionTargets).mockResolvedValue([address as Address]);

    await expect(
      removePermission({
        moment,
        adminAddress: address.toUpperCase().replace('0X', '0x') as Address,
        artist,
      })
    ).rejects.toThrow('Cannot remove the collection owner');
    expect(sendUserOperation).not.toHaveBeenCalled();
  });
});

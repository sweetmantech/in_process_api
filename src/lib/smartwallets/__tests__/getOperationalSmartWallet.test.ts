import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import { getWalletSmartAccount } from '@/lib/coinbase/getWalletSmartAccount';
import getPermission from '@/lib/zora/getPermission';
import { PERMISSION_BIT_ADMIN } from '@/lib/consts';
import type { ArtistContext } from '@/types/artist';
import { getOperationalSmartWallet } from '../getOperationalSmartWallet';

vi.mock('@/lib/coinbase/getWalletSmartAccount', () => ({
  getWalletSmartAccount: vi.fn(),
}));
vi.mock('@/lib/zora/getPermission', () => ({ default: vi.fn() }));

const mockGetWalletSmartAccount = vi.mocked(getWalletSmartAccount);
const mockGetPermission = vi.mocked(getPermission);

const COLLECTION = '0x16af6f4491a4aa8cabd4f0f959dbe0ec24cb88ec' as Address;

const artist: ArtistContext = {
  artistId: 'artist-1',
  primaryWallet: '0xprimary' as Address,
  wallets: [
    { address: '0xprimary' as Address, type: 'external' },
    { address: '0xoperator' as Address, type: 'operator' },
    { address: '0xsmart' as Address, type: 'smart' },
    { address: '0xprivy' as Address, type: 'privy' },
  ],
};

describe('getOperationalSmartWallet', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetWalletSmartAccount.mockImplementation(
      async ({ address }) => ({ address: `sa-${address}` }) as never
    );
  });

  it('tries the primary wallet, then other EOAs, then smart wallets', async () => {
    mockGetPermission.mockResolvedValue(0 as never);

    await expect(
      getOperationalSmartWallet({
        artist,
        moment: { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 },
      })
    ).rejects.toThrow('No authorized smart wallet found');

    expect(
      mockGetWalletSmartAccount.mock.calls.map(([{ address }]) => address)
    ).toEqual(['0xprimary', '0xprivy', '0xoperator', '0xsmart']);
  });

  it('stops at an EOA operator before trying smart wallets', async () => {
    mockGetPermission.mockImplementation(
      async (_collection, account) =>
        ((account as string) === 'sa-0xprimary'
          ? PERMISSION_BIT_ADMIN
          : 0) as never
    );

    const result = await getOperationalSmartWallet({
      artist,
      moment: { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 },
    });

    expect(result.address).toBe('sa-0xprimary');
    expect(mockGetWalletSmartAccount).toHaveBeenCalledTimes(1);
  });

  it('falls back to a smart wallet when only it holds admin permission', async () => {
    mockGetPermission.mockImplementation(
      async (_collection, account) =>
        ((account as string) === 'sa-0xsmart'
          ? PERMISSION_BIT_ADMIN
          : 0) as never
    );

    const result = await getOperationalSmartWallet({
      artist,
      moment: { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 },
    });

    expect(result.address).toBe('sa-0xsmart');
  });

  it('returns the first smart account holding admin permission', async () => {
    mockGetPermission.mockImplementation(
      async (_collection, account) =>
        ((account as string) === 'sa-0xprivy'
          ? PERMISSION_BIT_ADMIN
          : 0) as never
    );

    const result = await getOperationalSmartWallet({
      artist,
      moment: { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 },
    });

    expect(result.address).toBe('sa-0xprivy');
  });
});

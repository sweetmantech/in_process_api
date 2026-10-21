import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress, type Address } from 'viem';
import getCollectionAddress from '@/lib/telegram/chat/collection/getCollectionAddress';
import { CHAIN_ID } from '@/lib/consts';
import type { ArtistContext } from '@/types/artist';

vi.mock('../getSelectedCollectionAddress', () => ({ default: vi.fn() }));
vi.mock('@/lib/collection/resolveDefaultCollection', () => ({
  default: vi.fn(),
}));

import getSelectedCollectionAddress from '@/lib/telegram/chat/collection/getSelectedCollectionAddress';
import resolveDefaultCollection from '@/lib/collection/resolveDefaultCollection';

const ARTIST: ArtistContext = {
  artistId: 'artist-1',
  primaryWallet: '0x0000000000000000000000000000000000000123' as Address,
  wallets: [],
};
const DEFAULT_COLLECTION =
  '0x0000000000000000000000000000000000000abc' as Address;
const SELECTED_COLLECTION =
  '0x0000000000000000000000000000000000000def' as Address;

const makeThread = () => ({ channelId: 'telegram:chat-1' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSelectedCollectionAddress).mockResolvedValue(null);
  vi.mocked(resolveDefaultCollection).mockResolvedValue({
    address: DEFAULT_COLLECTION,
  } as never);
});

describe('getCollectionAddress', () => {
  it('returns an explicitly selected collection', async () => {
    vi.mocked(getSelectedCollectionAddress).mockResolvedValue(
      getAddress(SELECTED_COLLECTION)
    );

    const result = await getCollectionAddress(makeThread() as never, ARTIST);

    expect(result).toEqual({
      collectionAddress: getAddress(SELECTED_COLLECTION),
      explicitSelection: true,
    });
    expect(resolveDefaultCollection).not.toHaveBeenCalled();
  });

  it('falls back to the artist default collection when none is selected', async () => {
    const result = await getCollectionAddress(makeThread() as never, ARTIST);

    expect(resolveDefaultCollection).toHaveBeenCalledWith(ARTIST, CHAIN_ID);
    expect(result).toEqual({
      collectionAddress: getAddress(DEFAULT_COLLECTION),
      explicitSelection: false,
    });
  });

  it('throws when resolveDefaultCollection fails', async () => {
    vi.mocked(resolveDefaultCollection).mockRejectedValue({
      message: 'create failed',
    });

    await expect(
      getCollectionAddress(makeThread() as never, ARTIST)
    ).rejects.toEqual({ message: 'create failed' });
  });
});

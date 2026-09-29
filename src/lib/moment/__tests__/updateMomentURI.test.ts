import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/smartwallets/getOperationalSmartWallet', () => ({
  getOperationalSmartWallet: vi.fn(),
}));

vi.mock('@/lib/coinbase/sendUserOperation', () => ({
  sendUserOperation: vi.fn(),
}));

vi.mock('@/lib/viem/getUpdateTokenURICall', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/moment/getUpdateCollectionCall', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/moment/indexMoment', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/moment/findMoments', () => ({
  default: vi.fn(),
}));

import { getOperationalSmartWallet } from '@/lib/smartwallets/getOperationalSmartWallet';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import getUpdateTokenURICall from '@/lib/viem/getUpdateTokenURICall';
import getUpdateCollectionCall from '@/lib/moment/getUpdateCollectionCall';
import indexMoment from '@/lib/moment/indexMoment';
import findMoments from '@/lib/moment/findMoments';
import { updateMomentURI } from '@/lib/moment/updateMomentURI';

const COLLECTION = '0x1111111111111111111111111111111111111111' as const;
const ARTIST = '0x2222222222222222222222222222222222222222' as const;
const TX_HASH =
  '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd' as const;

const NEW_COLLECTION = '0x3333333333333333333333333333333333333333' as const;
const artist = {
  artistId: 'artist-uuid',
  primaryWallet: ARTIST,
  wallets: [ARTIST],
};

const moment = { collectionAddress: COLLECTION, tokenId: '3', chainId: 8453 };
const baseInput = {
  moment,
  newUri: 'ar://new-metadata-hash',
  artist,
};

describe('updateMomentURI', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getOperationalSmartWallet).mockResolvedValue({
      address: ARTIST,
    } as any);
    vi.mocked(getUpdateTokenURICall).mockReturnValue({
      to: COLLECTION,
      data: '0xcalldata',
    } as any);
    vi.mocked(sendUserOperation).mockResolvedValue({
      transactionHash: TX_HASH,
    } as any);
    vi.mocked(findMoments).mockResolvedValue({
      data: [{ max_supply: 100 }],
      error: null,
    } as any);
    vi.mocked(indexMoment).mockResolvedValue(undefined);
  });

  it('returns hash, chainId, contractAddress, tokenId', async () => {
    const result = await updateMomentURI(baseInput);

    expect(result.hash).toBe(TX_HASH);
    expect(result.chainId).toBe(8453);
    expect(result.contractAddress).toBe(COLLECTION);
    expect(result.tokenId).toBe('3');
  });

  it('calls sendUserOperation with the encoded update call', async () => {
    await updateMomentURI(baseInput);

    expect(sendUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        calls: [{ to: COLLECTION, data: '0xcalldata' }],
      })
    );
  });

  it('indexes updated metadata after the transaction', async () => {
    await updateMomentURI(baseInput);

    expect(findMoments).not.toHaveBeenCalled();
    expect(indexMoment).toHaveBeenCalledWith({
      contractAddress: COLLECTION,
      tokenId: '3',
      uri: baseInput.newUri,
      chainId: 8453,
      artistAddress: ARTIST,
    });
    expect(indexMoment).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from sendUserOperation', async () => {
    vi.mocked(sendUserOperation).mockRejectedValue(
      new Error('Paymaster failed')
    );

    await expect(updateMomentURI(baseInput)).rejects.toThrow(
      'Paymaster failed'
    );
  });

  describe('when newCollectionAddress is provided', () => {
    beforeEach(() => {
      vi.mocked(getUpdateCollectionCall).mockResolvedValue({
        call: { to: NEW_COLLECTION, data: '0xcreatedata' },
        redirectUri: 'ar://redirect-hash',
        contractAddress: NEW_COLLECTION,
        tokenId: '1',
      } as any);
      vi.mocked(getUpdateTokenURICall).mockReturnValue({
        to: COLLECTION,
        data: '0xredirectcalldata',
      } as any);
    });

    it('returns new contractAddress and tokenId', async () => {
      const result = await updateMomentURI({
        ...baseInput,
        newCollectionAddress: NEW_COLLECTION,
      });

      expect(result.contractAddress).toBe(NEW_COLLECTION);
      expect(result.tokenId).toBe('1');
    });

    it('sends create call followed by update call', async () => {
      await updateMomentURI({
        ...baseInput,
        newCollectionAddress: NEW_COLLECTION,
      });

      expect(sendUserOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          calls: [
            { to: NEW_COLLECTION, data: '0xcreatedata' },
            { to: COLLECTION, data: '0xredirectcalldata' },
          ],
        })
      );
    });

    it('indexes new and redirect moments after the transaction', async () => {
      vi.mocked(getUpdateCollectionCall).mockResolvedValue({
        call: { to: NEW_COLLECTION, data: '0xcreatedata' },
        resetUri: 'ar://redirect-hash',
        contractAddress: NEW_COLLECTION,
        tokenId: '1',
      } as any);

      await updateMomentURI({
        ...baseInput,
        newCollectionAddress: NEW_COLLECTION,
      });

      expect(findMoments).toHaveBeenCalledTimes(1);
      expect(indexMoment).toHaveBeenCalledWith({
        contractAddress: NEW_COLLECTION,
        tokenId: '1',
        uri: baseInput.newUri,
        chainId: 8453,
        artistAddress: ARTIST,
        maxSupply: 100,
      });
      expect(indexMoment).toHaveBeenCalledWith({
        contractAddress: COLLECTION,
        tokenId: '3',
        uri: 'ar://redirect-hash',
        chainId: 8453,
        artistAddress: ARTIST,
      });
      expect(indexMoment).toHaveBeenCalledTimes(2);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MomentType } from '@/types/moment';

vi.mock('@/lib/consts', () => ({
  CHAIN_ID: 8453,
  IS_TESTNET: false,
}));
vi.mock('@/lib/coinbase/getArtistSmartAccount', () => ({
  getArtistSmartAccount: vi.fn(),
}));
vi.mock('@/lib/moment/resolveMomentInfo', () => ({
  resolveMomentInfo: vi.fn(),
}));
vi.mock('@/lib/sales/validateBalanceAndAllowance', () => ({
  validateBalanceAndAllowance: vi.fn(),
}));
vi.mock('@/lib/viem/getCollectCall', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/coinbase/sendUserOperation', () => ({
  sendUserOperation: vi.fn(),
}));
vi.mock('@/lib/moment/recordCollectTransfer', () => ({
  recordCollectTransfer: vi.fn(),
}));
vi.mock('@/lib/moment/recordCollectComment', () => ({
  recordCollectComment: vi.fn(),
}));

import { getArtistSmartAccount } from '@/lib/coinbase/getArtistSmartAccount';
import { resolveMomentInfo } from '@/lib/moment/resolveMomentInfo';
import { validateBalanceAndAllowance } from '@/lib/sales/validateBalanceAndAllowance';
import getCollectCall from '@/lib/viem/getCollectCall';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import { recordCollectTransfer } from '@/lib/moment/recordCollectTransfer';
import { recordCollectComment } from '@/lib/moment/recordCollectComment';
import { collectMoment } from '../collectMoment';

const COLLECTION = '0x1111111111111111111111111111111111111111' as const;
const SMART_WALLET = '0x2222222222222222222222222222222222222222' as const;
const PRIMARY_WALLET = '0x3333333333333333333333333333333333333333' as const;
const TX_HASH =
  '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd' as const;

const moment = { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 };

const saleConfig = {
  pricePerToken: '1000',
  saleStart: 0,
  saleEnd: 0,
  maxTokensPerAddress: 0,
  fundsRecipient: COLLECTION,
  type: MomentType.FixedPriceMint,
};

describe('collectMoment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getArtistSmartAccount).mockResolvedValue({
      address: SMART_WALLET,
    } as any);
    vi.mocked(resolveMomentInfo).mockResolvedValue({
      id: 'moment-uuid',
      uri: 'ar://uri',
      contentUri: null,
      owner: null,
      saleConfig,
      soldOut: false,
    });
    vi.mocked(validateBalanceAndAllowance).mockResolvedValue([]);
    vi.mocked(getCollectCall).mockReturnValue({
      to: COLLECTION,
      data: '0xcalldata',
    } as any);
    vi.mocked(sendUserOperation).mockResolvedValue({
      transactionHash: TX_HASH,
      blockNumber: 100n,
      logs: [],
    } as any);
  });

  it('throws when the moment has no sale config', async () => {
    vi.mocked(resolveMomentInfo).mockResolvedValue({
      id: null,
      uri: null,
      contentUri: null,
      owner: null,
      saleConfig: null,
      soldOut: false,
    });

    await expect(
      collectMoment({
        moment,
        comment: '',
        amount: 1,
        artistId: 'artist-1',
        primaryWallet: PRIMARY_WALLET,
      })
    ).rejects.toThrow('Sale config not found');

    expect(sendUserOperation).not.toHaveBeenCalled();
  });

  it('sends the transaction and returns its hash', async () => {
    const result = await collectMoment({
      moment,
      comment: '',
      amount: 2,
      artistId: 'artist-1',
      primaryWallet: PRIMARY_WALLET,
    });

    expect(result).toEqual({ hash: TX_HASH, chainId: 8453 });
  });

  it('reflects the mint in Supabase eagerly, ahead of the async indexer', async () => {
    await collectMoment({
      moment,
      comment: '',
      amount: 2,
      artistId: 'artist-1',
      primaryWallet: PRIMARY_WALLET,
    });

    expect(recordCollectTransfer).toHaveBeenCalledWith({
      momentId: 'moment-uuid',
      recipient: PRIMARY_WALLET,
      quantity: 2,
      transactionHash: TX_HASH,
    });
  });

  it('reflects an inline mint comment in Supabase eagerly too', async () => {
    await collectMoment({
      moment,
      comment: 'nice track',
      amount: 1,
      artistId: 'artist-1',
      primaryWallet: PRIMARY_WALLET,
    });

    expect(recordCollectComment).toHaveBeenCalledWith({
      momentId: 'moment-uuid',
      logs: [],
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: PRIMARY_WALLET,
      comment: 'nice track',
    });
  });
});

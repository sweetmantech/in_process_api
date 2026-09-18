import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress, maxUint64, parseUnits, type Address } from 'viem';
import createMomentsFromGroup from '@/lib/telegram/chat/moment/createMomentsFromGroup';
import { CHAIN_ID, REFERRAL_RECIPIENT, USDC_ADDRESS } from '@/lib/consts';
import { MomentType } from '@/types/moment';

vi.mock('@/lib/telegram/chat/attachment/fetchTelegramFile', () => ({
  default: vi.fn(),
}));
vi.mock('../processAttachmentUpload', () => ({ default: vi.fn() }));
vi.mock('@/lib/moment/createMomentBatch', () => ({ default: vi.fn() }));
vi.mock('@/lib/telegram/chat/messaging/sendReadyMessage', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/telegram/chat/messaging/sendArtistCollage', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/telegram/chat/collection/getCollectionAddress', () => ({
  default: vi.fn(),
}));

import fetchTelegramFile from '@/lib/telegram/chat/attachment/fetchTelegramFile';
import processAttachmentUpload from '@/lib/telegram/chat/moment/processAttachmentUpload';
import createMomentBatch from '@/lib/moment/createMomentBatch';
import sendReadyMessage from '@/lib/telegram/chat/messaging/sendReadyMessage';
import sendArtistCollage from '@/lib/telegram/chat/messaging/sendArtistCollage';
import getCollectionAddress from '@/lib/telegram/chat/collection/getCollectionAddress';

const ARTIST_ADDRESS = '0x0000000000000000000000000000000000000123' as Address;
const ARTIST_CONTEXT = {
  artistId: 'artist-uuid-123',
  primaryWallet: ARTIST_ADDRESS,
  wallets: [{ address: ARTIST_ADDRESS, type: 'external' as const }],
};

const PENDING_IMAGE = {
  fileId: 'file-1',
  name: 'Photo 1',
  mimeType: 'image/jpeg',
  attachmentType: 'image' as const,
};

const PENDING_VIDEO = {
  fileId: 'file-2',
  thumbFileId: 'thumb-2',
  name: 'Video 1',
  mimeType: 'video/mp4',
  attachmentType: 'video' as const,
};

const UPLOAD_RESULT_1 = {
  uri: 'ar://meta-1',
  mimeType: 'image/jpeg',
  mediaUri: 'ar://img-1',
};
const UPLOAD_RESULT_2 = {
  uri: 'ar://meta-2',
  mimeType: 'video/mp4',
  mediaUri: 'ar://vid-2',
};
const MOMENT_1 = { contractAddress: '0xC1' as Address, tokenId: '1' };
const MOMENT_2 = { contractAddress: '0xC2' as Address, tokenId: '2' };
const BATCH_HASH =
  '0x1111111111111111111111111111111111111111111111111111111111111111' as const;

const makeStateAdapter = (assets: unknown[] = []) => ({
  getList: vi.fn().mockResolvedValue(assets),
  get: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
});

const makeThread = (stateAdapter = makeStateAdapter()) => ({
  startTyping: vi.fn().mockResolvedValue(undefined),
  _stateAdapter: stateAdapter,
  id: 'telegram:chat-xyz',
  channelId: 'telegram:chat-xyz',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCollectionAddress).mockResolvedValue({
    collectionAddress: null,
    explicitSelection: false,
  });
  vi.mocked(fetchTelegramFile).mockResolvedValue({
    buffer: Buffer.from(''),
    mimeType: 'image/jpeg',
  });
  vi.mocked(processAttachmentUpload).mockResolvedValue(
    UPLOAD_RESULT_1 as never
  );
  vi.mocked(createMomentBatch).mockResolvedValue({
    contractAddress: MOMENT_1.contractAddress,
    hash: BATCH_HASH,
    chainId: CHAIN_ID,
    tokenIds: [MOMENT_1.tokenId],
  });
  vi.mocked(sendReadyMessage).mockResolvedValue(undefined);
  vi.mocked(sendArtistCollage).mockResolvedValue(undefined);
});

describe('createMomentsFromGroup', () => {
  it('returns early without uploading when list is empty', async () => {
    const thread = makeThread(makeStateAdapter([]));

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    expect(processAttachmentUpload).not.toHaveBeenCalled();
    expect(createMomentBatch).not.toHaveBeenCalled();
  });

  it('uploads each pending asset in parallel', async () => {
    vi.mocked(processAttachmentUpload)
      .mockResolvedValueOnce(UPLOAD_RESULT_1 as never)
      .mockResolvedValueOnce(UPLOAD_RESULT_2 as never);
    vi.mocked(createMomentBatch).mockResolvedValue({
      contractAddress: MOMENT_1.contractAddress,
      hash: BATCH_HASH,
      chainId: CHAIN_ID,
      tokenIds: [MOMENT_1.tokenId, MOMENT_2.tokenId],
    });
    vi.mocked(sendReadyMessage).mockResolvedValue(undefined);

    const thread = makeThread(makeStateAdapter([PENDING_IMAGE, PENDING_VIDEO]));

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    expect(processAttachmentUpload).toHaveBeenCalledTimes(2);
  });

  it('builds a fetchData that calls fetchTelegramFile with the correct fileId', async () => {
    const thread = makeThread(makeStateAdapter([PENDING_IMAGE]));

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    const attachment = vi.mocked(processAttachmentUpload).mock.calls[0][0];
    await attachment.fetchData!();
    expect(fetchTelegramFile).toHaveBeenCalledWith(PENDING_IMAGE.fileId);
  });

  it('passes thumbFileId to processAttachmentUpload', async () => {
    const thread = makeThread(makeStateAdapter([PENDING_VIDEO]));

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    expect(processAttachmentUpload).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video', mimeType: 'video/mp4' }),
      PENDING_VIDEO.fileId,
      PENDING_VIDEO.name,
      PENDING_VIDEO.thumbFileId
    );
  });

  it('calls createMomentBatch with tokens and a new-collection contract from the first asset', async () => {
    const thread = makeThread(makeStateAdapter([PENDING_IMAGE]));

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    expect(createMomentBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        contract: {
          name: PENDING_IMAGE.name,
          uri: UPLOAD_RESULT_1.uri,
        },
        tokens: [
          {
            tokenMetadataURI: UPLOAD_RESULT_1.uri,
            createReferral: getAddress(
              REFERRAL_RECIPIENT
            ).toLowerCase() as Address,
            salesConfig: {
              type: MomentType.Erc20Mint,
              pricePerToken: parseUnits('1', 6),
              saleStart: expect.any(BigInt),
              saleEnd: maxUint64,
              currency: getAddress(
                USDC_ADDRESS[CHAIN_ID]
              ).toLowerCase() as Address,
            },
            mintToCreatorCount: 1,
            payoutRecipient: getAddress(
              ARTIST_ADDRESS
            ).toLowerCase() as Address,
          },
        ],
        account: getAddress(ARTIST_ADDRESS).toLowerCase() as Address,
        channel: 'telegram',
        chainId: CHAIN_ID,
      })
    );
  });

  it('passes existingCollectionAddress and clears selection when a collection was selected', async () => {
    const collection = '0x0000000000000000000000000000000000000003' as Address;
    const stateAdapter = {
      getList: vi.fn().mockResolvedValue([PENDING_IMAGE]),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const thread = makeThread(stateAdapter);
    vi.mocked(getCollectionAddress).mockResolvedValue({
      collectionAddress: getAddress(collection),
      explicitSelection: true,
    });

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    expect(createMomentBatch).toHaveBeenCalledWith(
      expect.objectContaining({
        contract: { address: getAddress(collection) },
        tokens: expect.any(Array),
        account: ARTIST_ADDRESS,
        channel: 'telegram',
        chainId: CHAIN_ID,
      })
    );
    expect(stateAdapter.delete).toHaveBeenCalledWith(
      'telegram:chat-xyz:selected_collection_address'
    );
  });

  it('calls sendReadyMessage once with all tokenIds as an array', async () => {
    vi.mocked(processAttachmentUpload)
      .mockResolvedValueOnce(UPLOAD_RESULT_1 as never)
      .mockResolvedValueOnce(UPLOAD_RESULT_2 as never);
    vi.mocked(createMomentBatch).mockResolvedValue({
      contractAddress: MOMENT_1.contractAddress,
      hash: BATCH_HASH,
      chainId: CHAIN_ID,
      tokenIds: [MOMENT_1.tokenId, MOMENT_2.tokenId],
    });

    const thread = makeThread(makeStateAdapter([PENDING_IMAGE, PENDING_VIDEO]));

    await createMomentsFromGroup(thread as never, 'grp-1', ARTIST_CONTEXT);

    expect(sendReadyMessage).toHaveBeenCalledTimes(1);
    expect(sendReadyMessage).toHaveBeenCalledWith(
      thread,
      MOMENT_1.contractAddress.toString(),
      [MOMENT_1.tokenId, MOMENT_2.tokenId]
    );
  });
});

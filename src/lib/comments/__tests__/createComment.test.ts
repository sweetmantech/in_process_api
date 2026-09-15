import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthMethod } from '@/types/auth';

vi.mock('@/lib/coinbase/getCommenterSmartAccount', () => ({
  getCommenterSmartAccount: vi.fn(),
}));
vi.mock('@/lib/coinbase/sendUserOperation', () => ({
  sendUserOperation: vi.fn(),
}));
vi.mock('@/lib/viem/getCommentCall', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/comments/recordCommentEagerly', () => ({
  recordCommentEagerly: vi.fn(),
}));

import { getCommenterSmartAccount } from '@/lib/coinbase/getCommenterSmartAccount';
import { sendUserOperation } from '@/lib/coinbase/sendUserOperation';
import getCommentCall from '@/lib/viem/getCommentCall';
import { recordCommentEagerly } from '@/lib/comments/recordCommentEagerly';
import { createComment } from '../createComment';

const COLLECTION = '0x1111111111111111111111111111111111111111' as const;
const COMMENTER_SMART = '0x2222222222222222222222222222222222222222' as const;
const TX_HASH =
  '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd' as const;

const artist = {
  artistId: 'artist-uuid',
  primaryWallet: '0x3333333333333333333333333333333333333333' as const,
  wallets: [],
  authMethod: AuthMethod.Privy,
};

describe('createComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCommenterSmartAccount).mockResolvedValue({
      address: COMMENTER_SMART,
    } as any);
    vi.mocked(getCommentCall).mockReturnValue({
      to: '0xcomments',
      data: '0xcalldata',
    } as any);
    vi.mocked(sendUserOperation).mockResolvedValue({
      transactionHash: TX_HASH,
      logs: [],
    } as any);
  });

  it('sends delegateComment from the in-process-commenter smart account', async () => {
    const result = await createComment({
      artist,
      collection: { address: COLLECTION, chainId: 8453 },
      tokenId: '1',
      text: 'hello',
    });

    expect(getCommenterSmartAccount).toHaveBeenCalledOnce();
    expect(getCommentCall).toHaveBeenCalledWith(
      expect.objectContaining({
        commenter: artist.primaryWallet,
        collectionAddress: COLLECTION,
        tokenId: '1',
        text: 'hello',
        replyTo: undefined,
      })
    );
    expect(sendUserOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        smartAccount: { address: COMMENTER_SMART },
        calls: [{ to: '0xcomments', data: '0xcalldata' }],
      })
    );
    expect(result.hash).toBe(TX_HASH);
  });

  it('records the comment eagerly ahead of the async indexer', async () => {
    await createComment({
      artist,
      collection: { address: COLLECTION, chainId: 8453 },
      tokenId: '1',
      text: 'hello',
    });

    expect(recordCommentEagerly).toHaveBeenCalledWith({
      logs: [],
      chainId: 8453,
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: artist.primaryWallet,
      text: 'hello',
    });
  });

  it('passes replyTo through when moment identifiers match', async () => {
    const replyTo = {
      commenter: '0x4444444444444444444444444444444444444444' as const,
      contractAddress: COLLECTION,
      tokenId: '1',
      nonce:
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    };

    await createComment({
      artist,
      collection: { address: COLLECTION, chainId: 8453 },
      tokenId: '1',
      text: 'reply',
      replyTo,
    });

    expect(getCommentCall).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo })
    );
  });

  it('assumes replyTo is already validated before execution', async () => {
    await createComment({
      artist,
      collection: { address: COLLECTION, chainId: 8453 },
      tokenId: '1',
      text: 'reply',
      replyTo: {
        commenter: '0x4444444444444444444444444444444444444444',
        contractAddress: COLLECTION,
        tokenId: '1',
        nonce:
          '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      },
    });

    expect(sendUserOperation).toHaveBeenCalled();
  });
});

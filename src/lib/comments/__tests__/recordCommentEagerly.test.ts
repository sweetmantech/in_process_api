import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return { ...actual, parseEventLogs: vi.fn() };
});
vi.mock('@/lib/supabase/in_process_moments/selectMoments', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_moment_comments/upsertComments', () => ({
  upsertComments: vi.fn(),
}));
vi.mock('@/lib/wallets/ensureWallets', () => ({
  ensureWallets: vi.fn(),
}));

import { parseEventLogs } from 'viem';
import selectMoments from '@/lib/supabase/in_process_moments/selectMoments';
import { upsertComments } from '@/lib/supabase/in_process_moment_comments/upsertComments';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import { recordCommentEagerly } from '@/lib/comments/recordCommentEagerly';

const mockParseEventLogs = vi.mocked(parseEventLogs);
const mockSelectMoments = vi.mocked(selectMoments);
const mockUpsertComments = vi.mocked(upsertComments);
const mockEnsureWallets = vi.mocked(ensureWallets);

const COLLECTION = '0x1111111111111111111111111111111111111111' as const;
const SENDER = '0x2222222222222222222222222222222222222222' as const;
// base chain (8453) COMMENTS_ADDRESS from @/lib/consts
const COMMENTS_CONTRACT = '0x89d1e8b71330cd1d5d651b2d3a62472e10dd567d';
const ZERO_HASH = `0x${'0'.repeat(64)}` as const;

describe('recordCommentEagerly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureWallets.mockResolvedValue(undefined);
    mockUpsertComments.mockResolvedValue(undefined);
  });

  it('does nothing when there are no logs', async () => {
    await recordCommentEagerly({
      logs: [],
      chainId: 8453,
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: SENDER,
      text: 'hi',
    });

    expect(mockParseEventLogs).not.toHaveBeenCalled();
  });

  it('does nothing when no Commented log is found', async () => {
    mockParseEventLogs.mockReturnValue([]);

    await recordCommentEagerly({
      logs: [{} as any],
      chainId: 8453,
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: SENDER,
      text: 'hi',
    });

    expect(mockSelectMoments).not.toHaveBeenCalled();
  });

  it('does nothing when the moment has no Supabase row yet', async () => {
    mockParseEventLogs.mockReturnValue([
      {
        address: COMMENTS_CONTRACT,
        args: {
          commentId: '0xcommentid',
          commentIdentifier: { nonce: '0xnonce' },
          replyToId: ZERO_HASH,
          sparksQuantity: 0n,
        },
      } as any,
    ]);
    mockSelectMoments.mockResolvedValue({ data: [], error: null });

    await recordCommentEagerly({
      logs: [{} as any],
      chainId: 8453,
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: SENDER,
      text: 'hi',
    });

    expect(mockUpsertComments).not.toHaveBeenCalled();
  });

  it('upserts the comment using the parsed on-chain identifiers', async () => {
    mockParseEventLogs.mockReturnValue([
      {
        address: COMMENTS_CONTRACT,
        transactionHash: '0xtxhash',
        logIndex: 4,
        args: {
          commentId: '0xcommentid',
          commentIdentifier: { nonce: '0xnonce' },
          replyToId: ZERO_HASH,
          sparksQuantity: 5n,
        },
      } as any,
    ]);
    mockSelectMoments.mockResolvedValue({
      data: [{ id: 'moment-uuid' } as any],
      error: null,
    });

    await recordCommentEagerly({
      logs: [{} as any],
      chainId: 8453,
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: SENDER,
      text: 'hi',
    });

    expect(mockEnsureWallets).toHaveBeenCalledWith([SENDER.toLowerCase()]);
    expect(mockUpsertComments).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          moment: 'moment-uuid',
          artist_address: SENDER.toLowerCase(),
          comment: 'hi',
          comment_id: '0xcommentid',
          nonce: '0xnonce',
          reply_to_id: null,
          sparks_quantity: 5,
          transaction_hash: '0xtxhash',
          log_index: 4,
        }),
      ],
      'comment_id'
    );
  });

  it('keeps a non-zero replyToId', async () => {
    mockParseEventLogs.mockReturnValue([
      {
        address: COMMENTS_CONTRACT,
        args: {
          commentId: '0xcommentid',
          commentIdentifier: { nonce: '0xnonce' },
          replyToId: '0xreplyid',
          sparksQuantity: 0n,
        },
      } as any,
    ]);
    mockSelectMoments.mockResolvedValue({
      data: [{ id: 'moment-uuid' } as any],
      error: null,
    });

    await recordCommentEagerly({
      logs: [{} as any],
      chainId: 8453,
      collectionAddress: COLLECTION,
      tokenId: '1',
      sender: SENDER,
      text: 'reply',
    });

    expect(mockUpsertComments).toHaveBeenCalledWith(
      [expect.objectContaining({ reply_to_id: '0xreplyid' })],
      'comment_id'
    );
  });

  it('swallows errors so a Supabase hiccup does not fail the comment', async () => {
    mockParseEventLogs.mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(
      recordCommentEagerly({
        logs: [{} as any],
        chainId: 8453,
        collectionAddress: COLLECTION,
        tokenId: '1',
        sender: SENDER,
        text: 'hi',
      })
    ).resolves.toBeUndefined();
  });
});

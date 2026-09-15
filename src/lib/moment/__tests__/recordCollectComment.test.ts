import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return { ...actual, parseEventLogs: vi.fn() };
});
vi.mock('@/lib/supabase/in_process_moment_comments/upsertComments', () => ({
  upsertComments: vi.fn(),
}));
vi.mock('@/lib/wallets/ensureWallets', () => ({
  ensureWallets: vi.fn(),
}));

import { parseEventLogs } from 'viem';
import { upsertComments } from '@/lib/supabase/in_process_moment_comments/upsertComments';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import { recordCollectComment } from '@/lib/moment/recordCollectComment';

const mockParseEventLogs = vi.mocked(parseEventLogs);
const mockUpsertComments = vi.mocked(upsertComments);
const mockEnsureWallets = vi.mocked(ensureWallets);

const COLLECTION = '0x1111111111111111111111111111111111111111' as const;
const SENDER = '0x2222222222222222222222222222222222222222' as const;

const mintCommentLog = (overrides = {}) => ({
  transactionHash: '0xtxhash',
  logIndex: 5,
  args: {
    sender: SENDER,
    tokenContract: COLLECTION,
    tokenId: 1n,
    quantity: 1n,
    comment: 'nice',
    ...overrides,
  },
});

const baseParams = {
  momentId: 'moment-uuid',
  logs: [{} as any],
  collectionAddress: COLLECTION,
  tokenId: '1',
  sender: SENDER,
  comment: 'nice',
};

describe('recordCollectComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureWallets.mockResolvedValue(undefined);
    mockUpsertComments.mockResolvedValue(undefined);
  });

  it('does nothing when the moment has no Supabase row yet', async () => {
    await recordCollectComment({ ...baseParams, momentId: null });
    expect(mockParseEventLogs).not.toHaveBeenCalled();
  });

  it('does nothing when no comment text was submitted', async () => {
    await recordCollectComment({ ...baseParams, comment: '   ' });
    expect(mockParseEventLogs).not.toHaveBeenCalled();
  });

  it('does nothing when there are no logs', async () => {
    await recordCollectComment({ ...baseParams, logs: [] });
    expect(mockParseEventLogs).not.toHaveBeenCalled();
  });

  it('does nothing when no matching MintComment log is found', async () => {
    mockParseEventLogs.mockReturnValue([]);

    await recordCollectComment(baseParams);

    expect(mockUpsertComments).not.toHaveBeenCalled();
  });

  it('ignores a MintComment log for a different token', async () => {
    mockParseEventLogs.mockReturnValue([mintCommentLog({ tokenId: 2n }) as any]);

    await recordCollectComment(baseParams);

    expect(mockUpsertComments).not.toHaveBeenCalled();
  });

  it('upserts the comment keyed by (moment, transaction_hash, log_index)', async () => {
    mockParseEventLogs.mockReturnValue([mintCommentLog() as any]);

    await recordCollectComment(baseParams);

    expect(mockEnsureWallets).toHaveBeenCalledWith([SENDER.toLowerCase()]);
    expect(mockUpsertComments).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          moment: 'moment-uuid',
          artist_address: SENDER.toLowerCase(),
          comment: 'nice',
          transaction_hash: '0xtxhash',
          log_index: 5,
        }),
      ],
      'moment,transaction_hash,log_index'
    );
  });

  it('swallows errors so a Supabase hiccup does not fail the collect', async () => {
    mockParseEventLogs.mockImplementation(() => {
      throw new Error('boom');
    });

    await expect(recordCollectComment(baseParams)).resolves.toBeUndefined();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));
vi.mock(
  '../../supabase/in_process_moment_comments/getMomentCommentsRpc',
  () => ({
    default: vi.fn(),
  })
);

import { momentComments } from '../momentComments';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import getMomentCommentsRpc from '../../supabase/in_process_moment_comments/getMomentCommentsRpc';

const mockGetMomentsByAddressAndTokenId = vi.mocked(
  getMomentsByAddressAndTokenId
);
const mockRpc = vi.mocked(getMomentCommentsRpc);

const validInput = {
  moment: {
    collectionAddress:
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    tokenId: '1',
    chainId: 8453,
  },
  offset: 0,
};

describe('momentComments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns RPC comments for a moment', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);
    mockRpc.mockResolvedValue([
      {
        id: 'comment-1',
        comment: 'Great track!',
        sender: '0xabc',
        username: 'alice',
        timestamp: 1,
        commentId: null,
        replyToId: null,
        nonce: null,
        replyCount: 0,
        replies: [],
      },
    ]);

    const result = await momentComments(validInput);

    expect(mockRpc).toHaveBeenCalledWith({
      momentId: 'moment-1',
      offset: 0,
      replyToId: undefined,
    });
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].id).toBe('comment-1');
  });

  it('passes replyToId to RPC', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);
    mockRpc.mockResolvedValue([]);

    await momentComments({ ...validInput, replyToId: '0xparent' });

    expect(mockRpc).toHaveBeenCalledWith({
      momentId: 'moment-1',
      offset: 0,
      replyToId: '0xparent',
    });
  });

  it('throws when getMomentsByAddressAndTokenId returns error', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    } as any);
    await expect(momentComments(validInput)).rejects.toThrow(
      'Failed to get moments'
    );
  });

  it('throws when moment is not found', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [],
      error: null,
    } as any);
    await expect(momentComments(validInput)).rejects.toThrow(
      'Moment not found'
    );
  });
});

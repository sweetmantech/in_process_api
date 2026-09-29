import { describe, it, expect, vi, beforeEach } from 'vitest';
import { momentCollectors } from '../momentCollectors';
import type { Address } from 'viem';

vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));

vi.mock('../../supabase/in_process_transfers/selectCollectors', () => ({
  default: vi.fn(),
}));

import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import selectCollectors from '../../supabase/in_process_transfers/selectCollectors';

const mockGetMomentsByAddressAndTokenId = vi.mocked(
  getMomentsByAddressAndTokenId
);
const mockSelectCollectors = vi.mocked(selectCollectors);

const validInput = {
  moment: {
    collectionAddress: '0x1234567890abcdef1234567890abcdef12345678' as Address,
    tokenId: '1',
    chainId: 8453,
  },
  offset: 0,
};

describe('momentCollectors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return formatted collectors', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);

    mockSelectCollectors.mockResolvedValue([
      {
        id: 'collector-1',
        collector: '0xabc',
        wallet: { artist: { username: 'alice' } },
        amount: 2,
        transaction_hash: '0xtx1',
        collected_at: '2025-01-01T00:00:00Z',
      },
    ] as any);

    const result = await momentCollectors(validInput);

    expect(result).toEqual({
      collectors: [
        {
          id: 'collector-1',
          collector: '0xabc',
          username: 'alice',
          amount: 2,
          transactionHash: '0xtx1',
          timestamp: new Date('2025-01-01T00:00:00Z').getTime(),
        },
      ],
    });

    expect(mockGetMomentsByAddressAndTokenId).toHaveBeenCalledWith({
      moments: [validInput.moment],
    });
    expect(mockSelectCollectors).toHaveBeenCalledWith({
      momentId: 'moment-1',
      offset: 0,
    });
  });

  it('should default username to empty string when null', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);

    mockSelectCollectors.mockResolvedValue([
      {
        id: 'collector-1',
        collector: '0xabc',
        wallet: { artist: { username: null } },
        amount: 1,
        transaction_hash: '0xtx1',
        collected_at: '2025-01-01T00:00:00Z',
      },
    ] as any);

    const result = await momentCollectors(validInput);
    expect(result.collectors[0].username).toBe('');
  });

  it('should default timestamp to 0 when collected_at is null', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);

    mockSelectCollectors.mockResolvedValue([
      {
        id: 'collector-1',
        collector: '0xabc',
        wallet: { artist: { username: 'alice' } },
        amount: 1,
        transaction_hash: '0xtx1',
        collected_at: null,
      },
    ] as any);

    const result = await momentCollectors(validInput);
    expect(result.collectors[0].timestamp).toBe(0);
  });

  it('should throw when getMomentsByAddressAndTokenId returns an error', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: null,
      error: { message: 'db error' },
    } as any);

    await expect(momentCollectors(validInput)).rejects.toThrow(
      'Failed to get moments'
    );
  });

  it('should throw when moment is not found', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [],
      error: null,
    } as any);

    await expect(momentCollectors(validInput)).rejects.toThrow(
      'Moment not found'
    );
  });

  it('should pass offset to selectCollectors', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);

    mockSelectCollectors.mockResolvedValue([] as any);

    const input = { ...validInput, offset: 20 };
    await momentCollectors(input);

    expect(mockSelectCollectors).toHaveBeenCalledWith({
      momentId: 'moment-1',
      offset: 20,
    });
  });

  it('should return empty collectors array when none exist', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [{ id: 'moment-1' }],
      error: null,
    } as any);

    mockSelectCollectors.mockResolvedValue([] as any);

    const result = await momentCollectors(validInput);
    expect(result).toEqual({ collectors: [] });
  });
});

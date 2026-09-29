import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transfers_t } from '@/types/envio';

vi.mock('@/lib/moment/findMoments', () => ({
  default: vi.fn(),
}));

import findMoments from '@/lib/moment/findMoments';
import getMomentTitleForTransfer from '../getMomentTitleForTransfer';

const makeTransfer = (overrides: Partial<Transfers_t> = {}): Transfers_t =>
  ({
    collection: '0xCollection',
    token_id: '29',
    chain_id: 8453,
    ...overrides,
  }) as Transfers_t;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMomentTitleForTransfer', () => {
  it('returns the moment metadata name when present', async () => {
    vi.mocked(findMoments).mockResolvedValue({
      data: [{ metadata: { name: 'Telegram Demo with CY' } }],
      error: null,
    } as never);

    expect(await getMomentTitleForTransfer(makeTransfer())).toBe(
      'Telegram Demo with CY'
    );
    expect(findMoments).toHaveBeenCalledWith({
      moments: [
        { collectionAddress: '0xcollection', tokenId: '29', chainId: 8453 },
      ],
      includeMetadata: true,
      limit: 1,
    });
  });

  it('falls back to "moment #<tokenId>" when there is no name', async () => {
    vi.mocked(findMoments).mockResolvedValue({
      data: [{ metadata: { name: null } }],
      error: null,
    } as never);

    expect(await getMomentTitleForTransfer(makeTransfer())).toBe('moment #29');
  });

  it('falls back to "moment #<tokenId>" when the moment is not found', async () => {
    vi.mocked(findMoments).mockResolvedValue({
      data: [],
      error: null,
    } as never);

    expect(await getMomentTitleForTransfer(makeTransfer())).toBe('moment #29');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/in_process_transfers/upsertTransfers', () => ({
  upsertTransfers: vi.fn(),
}));
vi.mock('@/lib/wallets/ensureWallets', () => ({
  ensureWallets: vi.fn(),
}));

import { upsertTransfers } from '@/lib/supabase/in_process_transfers/upsertTransfers';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import { recordCollectTransfer } from '@/lib/moment/recordCollectTransfer';

const mockUpsertTransfers = vi.mocked(upsertTransfers);
const mockEnsureWallets = vi.mocked(ensureWallets);

const RECIPIENT = '0x1234567890ABCDEF1234567890ABCDEF12345678' as const;
const TX_HASH =
  '0xaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccddaabbccdd' as const;

describe('recordCollectTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureWallets.mockResolvedValue(undefined);
    mockUpsertTransfers.mockResolvedValue(undefined);
  });

  it('does nothing when the moment has no Supabase row yet', async () => {
    await recordCollectTransfer({
      momentId: null,
      recipient: RECIPIENT,
      quantity: 1,
      transactionHash: TX_HASH,
    });

    expect(mockEnsureWallets).not.toHaveBeenCalled();
    expect(mockUpsertTransfers).not.toHaveBeenCalled();
  });

  it('ensures the wallet then upserts a lowercased transfer row', async () => {
    await recordCollectTransfer({
      momentId: 'moment-uuid',
      recipient: RECIPIENT,
      quantity: 3,
      transactionHash: TX_HASH,
    });

    expect(mockEnsureWallets).toHaveBeenCalledWith([RECIPIENT.toLowerCase()]);
    expect(mockUpsertTransfers).toHaveBeenCalledWith([
      expect.objectContaining({
        moment: 'moment-uuid',
        recipient: RECIPIENT.toLowerCase(),
        quantity: 3,
        transaction_hash: TX_HASH,
      }),
    ]);
  });

  it('swallows errors so a Supabase hiccup does not fail the collect', async () => {
    mockEnsureWallets.mockRejectedValue(new Error('db down'));

    await expect(
      recordCollectTransfer({
        momentId: 'moment-uuid',
        recipient: RECIPIENT,
        quantity: 1,
        transactionHash: TX_HASH,
      })
    ).resolves.toBeUndefined();
  });
});

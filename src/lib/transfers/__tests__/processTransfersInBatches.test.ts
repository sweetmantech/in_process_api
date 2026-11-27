import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/consts', () => ({ BATCH_SIZE: 2 }));
vi.mock('../distribute', () => ({ distribute: vi.fn() }));
vi.mock('../mapTransfersToSupabase', () => ({
  mapTransfersToSupabase: vi.fn(),
}));
vi.mock('../notifyAirdrop', () => ({ default: vi.fn() }));
vi.mock('../notifyAirdropByEmail', () => ({ notifyAirdropByEmail: vi.fn() }));
vi.mock('../notifyCollectByEmail', () => ({ notifyCollectByEmail: vi.fn() }));
vi.mock('@/lib/wallets/ensureWallets', () => ({
  ensureWallets: vi.fn(),
}));
vi.mock('@/lib/wallets/resolveCollectorNames', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_transfers/upsertTransfers', () => ({
  upsertTransfers: vi.fn(),
}));

import { processTransfersInBatches } from '../processTransfersInBatches';
import { distribute } from '../distribute';
import { mapTransfersToSupabase } from '../mapTransfersToSupabase';
import { ensureWallets } from '@/lib/wallets/ensureWallets';
import resolveCollectorNames from '@/lib/wallets/resolveCollectorNames';
import { upsertTransfers } from '@/lib/supabase/in_process_transfers/upsertTransfers';
import notifyAirdrop from '../notifyAirdrop';
import { notifyAirdropByEmail } from '../notifyAirdropByEmail';
import { notifyCollectByEmail } from '../notifyCollectByEmail';
import type { Transfers_t } from '@/types/envio';

const mockDistribute = vi.mocked(distribute);
const mockMap = vi.mocked(mapTransfersToSupabase);
const mockEnsureArtists = vi.mocked(ensureWallets);
const mockResolveCollectorNames = vi.mocked(resolveCollectorNames);
const mockUpsert = vi.mocked(upsertTransfers);
const mockNotifyAirdrop = vi.mocked(notifyAirdrop);
const mockNotifyAirdropByEmail = vi.mocked(notifyAirdropByEmail);
const mockNotifyCollectByEmail = vi.mocked(notifyCollectByEmail);

const transfer = (id: string): Transfers_t => ({
  id,
  collection: '0xcol',
  token_id: '1',
  chain_id: 8453,
  recipient: '0xrecipient00000000000000000000000000000001',
  quantity: '1',
  value: '1',
  currency: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  transaction_hash: `0xtx${id}`,
  transferred_at: 1700000000,
});

describe('processTransfersInBatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDistribute.mockResolvedValue(undefined);
    mockEnsureArtists.mockResolvedValue(undefined as never);
    mockResolveCollectorNames.mockResolvedValue(undefined);
    mockUpsert.mockResolvedValue(undefined);
    mockNotifyCollectByEmail.mockResolvedValue(undefined);
    mockNotifyAirdrop.mockResolvedValue(undefined);
    mockNotifyAirdropByEmail.mockResolvedValue(undefined);
  });

  it('does nothing for empty array', async () => {
    await processTransfersInBatches([]);
    expect(mockDistribute).not.toHaveBeenCalled();
    expect(mockMap).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('runs distribute before map, then ensureWallets and upsert', async () => {
    const rows = [
      {
        recipient: '0xab',
        quantity: 1,
        value: 1,
        currency: '0xusdc',
        transaction_hash: '0xt',
        transferred_at: new Date().toISOString(),
        moment: 'm1',
      },
    ];
    const batch = [transfer('1')];
    mockMap.mockResolvedValue({
      rows: rows as never,
      processedTransfers: batch,
    });

    await processTransfersInBatches(batch);

    expect(mockDistribute).toHaveBeenCalledTimes(1);
    expect(mockDistribute).toHaveBeenCalledWith(batch);
    expect(mockMap).toHaveBeenCalledWith(batch);
    expect(mockDistribute.mock.invocationCallOrder[0]).toBeLessThan(
      mockMap.mock.invocationCallOrder[0]
    );
    expect(mockEnsureArtists).toHaveBeenCalledWith(['0xab']);
    expect(mockResolveCollectorNames).toHaveBeenCalledWith(['0xab']);
    expect(mockUpsert).toHaveBeenCalledWith(rows);
    expect(mockNotifyCollectByEmail).toHaveBeenCalledWith(batch);
    expect(mockNotifyAirdrop).toHaveBeenCalledWith(batch);
    expect(mockNotifyAirdropByEmail).toHaveBeenCalledWith(batch);
  });

  it('does not call ensureWallets or resolveCollectorNames when map returns no rows', async () => {
    mockMap.mockResolvedValue({ rows: [], processedTransfers: [] });

    await processTransfersInBatches([transfer('1')]);

    expect(mockDistribute).toHaveBeenCalled();
    expect(mockEnsureArtists).not.toHaveBeenCalled();
    expect(mockResolveCollectorNames).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith([]);
  });

  it('throws when upsert rejects', async () => {
    mockMap.mockResolvedValue({
      rows: [
        {
          recipient: '0xab',
          quantity: 1,
          moment: 'm1',
          transaction_hash: '0xt',
          transferred_at: new Date().toISOString(),
        },
      ] as never,
      processedTransfers: [transfer('1')],
    });
    mockUpsert.mockRejectedValue(new Error('db fail'));

    await expect(processTransfersInBatches([transfer('1')])).rejects.toThrow(
      'db fail'
    );
  });

  it('throws when distribute rejects', async () => {
    mockDistribute.mockRejectedValue(new Error('split fail'));

    await expect(processTransfersInBatches([transfer('1')])).rejects.toThrow(
      'split fail'
    );
    expect(mockMap).not.toHaveBeenCalled();
  });

  it('throws when mapTransfersToSupabase rejects', async () => {
    mockMap.mockRejectedValue(new Error('map fail'));

    await expect(processTransfersInBatches([transfer('1')])).rejects.toThrow(
      'map fail'
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('processes multiple batches when length exceeds BATCH_SIZE', async () => {
    mockMap.mockImplementation(async (batch: Transfers_t[]) => ({
      rows: batch.map((t) => ({
        recipient: t.recipient,
        quantity: 1,
        moment: t.id,
        transaction_hash: t.transaction_hash,
        transferred_at: new Date().toISOString(),
      })) as never,
      processedTransfers: batch,
    }));

    await processTransfersInBatches([
      transfer('1'),
      transfer('2'),
      transfer('3'),
    ]);

    expect(mockDistribute).toHaveBeenCalledTimes(2);
    expect(mockMap).toHaveBeenCalledTimes(2);
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });
});

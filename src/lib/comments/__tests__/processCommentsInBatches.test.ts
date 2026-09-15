import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../mapCommentsToSupabase', () => ({ mapCommentsToSupabase: vi.fn() }));
vi.mock('@/lib/supabase/in_process_moment_comments/upsertComments', () => ({
  upsertComments: vi.fn(),
}));
vi.mock('@/lib/wallets/ensureWallets', () => ({
  ensureWallets: vi.fn(),
}));

import { processCommentsInBatches } from '../processCommentsInBatches';
import { mapCommentsToSupabase } from '../mapCommentsToSupabase';
import { upsertComments } from '@/lib/supabase/in_process_moment_comments/upsertComments';
import { ensureWallets } from '@/lib/wallets/ensureWallets';

const mockMap = vi.mocked(mapCommentsToSupabase);
const mockUpsert = vi.mocked(upsertComments);
const mockEnsureArtists = vi.mocked(ensureWallets);

const comment = {
  id: '1',
  collection: '0xcol',
  token_id: '1',
  sender: '0xabc',
  comment: 'hi',
  chain_id: 8453,
  commented_at: 1000,
  transaction_hash: '0xtx',
  log_index: 2,
};

describe('processCommentsInBatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue(undefined as any);
    mockEnsureArtists.mockResolvedValue(undefined as any);
  });

  it('does nothing for empty array', async () => {
    mockMap.mockResolvedValue([]);
    await processCommentsInBatches([]);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('maps, ensures artists and upserts mint comments by moment/tx_hash/log_index', async () => {
    const mapped = [
      {
        moment: 'mid',
        artist_address: '0xabc',
        comment: 'hi',
        commented_at: 'ts',
        transaction_hash: '0xtx',
        log_index: 2,
      },
    ];
    mockMap.mockResolvedValue(mapped);

    await processCommentsInBatches([comment]);

    expect(mockEnsureArtists).toHaveBeenCalledWith(['0xabc']);
    expect(mockUpsert).toHaveBeenCalledWith([], 'comment_id');
    expect(mockUpsert).toHaveBeenCalledWith(
      mapped,
      'moment,transaction_hash,log_index'
    );
  });

  it('upserts protocol comments by comment_id', async () => {
    const mapped = [
      {
        moment: 'mid',
        artist_address: '0xabc',
        comment: 'hi',
        commented_at: 'ts',
        comment_id: '0xcid',
        transaction_hash: '0xtx',
        log_index: 2,
      },
    ];
    mockMap.mockResolvedValue(mapped);

    await processCommentsInBatches([comment]);

    expect(mockUpsert).toHaveBeenCalledWith(mapped, 'comment_id');
    expect(mockUpsert).toHaveBeenCalledWith(
      [],
      'moment,transaction_hash,log_index'
    );
  });

  it('continues when a batch throws', async () => {
    mockMap.mockRejectedValue(new Error('fail'));
    await expect(processCommentsInBatches([comment])).resolves.not.toThrow();
  });
});

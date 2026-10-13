import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '@/lib/supabase/client';
import getCollectorsStats from '@/lib/supabase/in_process_transfers/getCollectorsStats';

const makeRow = (overrides = {}) => ({
  artist_id: 'uuid-artist',
  username: 'alice',
  wallets: [{ address: '0xcollector', type: 'payment' }],
  collected_count: 5,
  eth_spent: '0.01',
  usdc_spent: '10',
  ...overrides,
});

describe('getCollectorsStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls rpc with correct params and returns data', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [makeRow()],
      error: null,
    } as any);

    const result = await getCollectorsStats({
      period: 'week',
      limit: 10,
      page: 2,
      artist: 'alice',
      sort_by: 'eth_spent',
      sort_order: 'asc',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_collectors_stats', {
      p_period: 'week',
      p_limit: 10,
      p_page: 2,
      p_artist: 'alice',
      p_sort_by: 'eth_spent',
      p_sort_order: 'asc',
    });

    expect(result.data).toHaveLength(1);
  });

  it('uses defaults when params are omitted', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [],
      error: null,
    } as any);

    await getCollectorsStats({});

    expect(supabase.rpc).toHaveBeenCalledWith('get_collectors_stats', {
      p_period: 'all',
      p_limit: 20,
      p_page: 1,
      p_artist: undefined,
      p_sort_by: 'collected_count',
      p_sort_order: 'desc',
    });
  });

  it('returns empty data when rpc returns no rows', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [],
      error: null,
    } as any);

    const result = await getCollectorsStats({});

    expect(result.data).toEqual([]);
  });

  it('passes undefined for artist when not provided', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [],
      error: null,
    } as any);

    await getCollectorsStats({ artist: undefined });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_collectors_stats',
      expect.objectContaining({ p_artist: undefined })
    );
  });

  it('throws when supabase returns an error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'rpc error' },
    } as any);

    await expect(getCollectorsStats({})).rejects.toMatchObject({
      message: 'rpc error',
    });
  });
});

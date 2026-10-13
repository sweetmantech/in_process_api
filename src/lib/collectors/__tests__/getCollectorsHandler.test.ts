import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/in_process_transfers/getCollectorsStats', () => ({
  default: vi.fn(),
}));

import getCollectorsStats from '@/lib/supabase/in_process_transfers/getCollectorsStats';
import getCollectorsHandler from '@/lib/collectors/getCollectorsHandler';

const BASE_PARAMS = {
  period: 'all' as const,
  limit: 20,
  page: 1,
  artist: undefined as string | undefined,
  sort_by: 'collected_count' as const,
  sort_order: 'desc' as const,
};

const makeRow = (overrides = {}) => ({
  artist_id: 'uuid-artist',
  username: 'alice',
  wallets: [{ address: '0xcollector', type: 'payment' }],
  collected_count: 5,
  eth_spent: '0.01',
  usdc_spent: '10',
  ...overrides,
});

describe('getCollectorsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns collectors and page on success', async () => {
    vi.mocked(getCollectorsStats).mockResolvedValue({
      data: [makeRow()],
    });

    const res = await getCollectorsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.collectors).toHaveLength(1);
    expect(json.page).toBe(1);
    expect(json.total_count).toBeUndefined();
  });

  it('passes all params to getCollectorsStats', async () => {
    vi.mocked(getCollectorsStats).mockResolvedValue({
      data: [],
    });

    await getCollectorsHandler({
      period: 'week',
      limit: 10,
      page: 2,
      artist: 'bob',
      sort_by: 'eth_spent',
      sort_order: 'asc',
    });

    expect(getCollectorsStats).toHaveBeenCalledWith({
      period: 'week',
      limit: 10,
      page: 2,
      artist: 'bob',
      sort_by: 'eth_spent',
      sort_order: 'asc',
    });
  });

  it('returns empty collectors when rpc returns no rows', async () => {
    vi.mocked(getCollectorsStats).mockResolvedValue({
      data: [],
    });

    const res = await getCollectorsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(json.collectors).toEqual([]);
    expect(json.page).toBe(1);
  });

  it('includes artist_id, wallets and username in response', async () => {
    vi.mocked(getCollectorsStats).mockResolvedValue({
      data: [
        makeRow({
          artist_id: 'uuid-charlie',
          wallets: [{ address: '0xabc', type: 'payment' }],
          username: 'charlie',
        }),
      ],
    });

    const res = await getCollectorsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(json.collectors[0].artist_id).toBe('uuid-charlie');
    expect(json.collectors[0].wallets).toEqual([
      { address: '0xabc', type: 'payment' },
    ]);
    expect(json.collectors[0].username).toBe('charlie');
  });

  it('includes eth_spent and usdc_spent in response', async () => {
    vi.mocked(getCollectorsStats).mockResolvedValue({
      data: [makeRow({ eth_spent: '0.5', usdc_spent: '25.0' })],
    });

    const res = await getCollectorsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(json.collectors[0].eth_spent).toBe('0.5');
    expect(json.collectors[0].usdc_spent).toBe('25.0');
  });

  it('propagates error when getCollectorsStats throws', async () => {
    vi.mocked(getCollectorsStats).mockRejectedValue(new Error('DB failed'));

    await expect(getCollectorsHandler(BASE_PARAMS)).rejects.toThrow(
      'DB failed'
    );
  });
});

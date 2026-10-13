import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/in_process_artists/getArtistsCollectorsStats', () => ({
  default: vi.fn(),
}));

import getArtistsCollectorsStats from '@/lib/supabase/in_process_artists/getArtistsCollectorsStats';
import getArtistsCollectorsStatsHandler from '@/lib/artists/getArtistsCollectorsStatsHandler';

const BASE_PARAMS = {
  period: 'all' as const,
  limit: 20,
  page: 1,
  artist: undefined as string | undefined,
  sort_by: 'total_created_count' as const,
  sort_order: 'desc' as const,
};

const makeRow = (overrides = {}) => ({
  artist_id: 'uuid-artist',
  username: 'alice',
  wallets: [{ address: '0xartist', type: 'payment' }],
  total_created_count: 10,
  total_collected_count: 5,
  ...overrides,
});

describe('getArtistsCollectorsStatsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns artists and page on success', async () => {
    vi.mocked(getArtistsCollectorsStats).mockResolvedValue({
      data: [makeRow()],
    });

    const res = await getArtistsCollectorsStatsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.artists).toHaveLength(1);
    expect(json.page).toBe(1);
    expect(json.total_count).toBeUndefined();
  });

  it('passes all params to getArtistsCollectorsStats', async () => {
    vi.mocked(getArtistsCollectorsStats).mockResolvedValue({
      data: [],
    });

    await getArtistsCollectorsStatsHandler({
      period: 'week',
      limit: 10,
      page: 2,
      artist: 'bob',
      sort_by: 'total_collected_count',
      sort_order: 'asc',
    });

    expect(getArtistsCollectorsStats).toHaveBeenCalledWith({
      period: 'week',
      limit: 10,
      page: 2,
      artist: 'bob',
      sort_by: 'total_collected_count',
      sort_order: 'asc',
    });
  });

  it('returns empty artists when rpc returns no rows', async () => {
    vi.mocked(getArtistsCollectorsStats).mockResolvedValue({
      data: [],
    });

    const res = await getArtistsCollectorsStatsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(json.artists).toEqual([]);
    expect(json.page).toBe(1);
  });

  it('includes artist_id, wallets and username in response', async () => {
    vi.mocked(getArtistsCollectorsStats).mockResolvedValue({
      data: [
        makeRow({
          artist_id: 'uuid-charlie',
          wallets: [{ address: '0xabc', type: 'payment' }],
          username: 'charlie',
        }),
      ],
    });

    const res = await getArtistsCollectorsStatsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(json.artists[0].artist_id).toBe('uuid-charlie');
    expect(json.artists[0].wallets).toEqual([
      { address: '0xabc', type: 'payment' },
    ]);
    expect(json.artists[0].username).toBe('charlie');
  });

  it('includes total_created_count and total_collected_count in response', async () => {
    vi.mocked(getArtistsCollectorsStats).mockResolvedValue({
      data: [makeRow({ total_created_count: 42, total_collected_count: 7 })],
    });

    const res = await getArtistsCollectorsStatsHandler(BASE_PARAMS);
    const json = await res.json();

    expect(json.artists[0].total_created_count).toBe(42);
    expect(json.artists[0].total_collected_count).toBe(7);
  });

  it('propagates error when getArtistsCollectorsStats throws', async () => {
    vi.mocked(getArtistsCollectorsStats).mockRejectedValue(
      new Error('DB failed')
    );

    await expect(getArtistsCollectorsStatsHandler(BASE_PARAMS)).rejects.toThrow(
      'DB failed'
    );
  });
});

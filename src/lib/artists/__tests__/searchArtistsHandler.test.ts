import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/in_process_artists/selectArtists', () => ({
  default: vi.fn(),
}));

import selectArtists from '@/lib/supabase/in_process_artists/selectArtists';
import searchArtistsHandler from '@/lib/artists/searchArtistsHandler';

const WALLETS_1 = [{ address: '0xartist1', type: 'external' }];
const WALLETS_2 = [{ address: '0xartist2', type: 'privy' }];

describe('searchArtistsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped artists with username and wallets fields', async () => {
    vi.mocked(selectArtists).mockResolvedValue({
      data: [
        { username: 'alice', handle: 'alice', wallets: WALLETS_1 },
        { username: 'alice2', handle: null, wallets: WALLETS_2 },
      ],
      count: 2,
      error: null,
    } as any);

    const res = await searchArtistsHandler({ query: 'alice', limit: 10 });
    const json = await res.json();

    expect(json).toEqual({
      artists: [
        { username: 'alice', handle: 'alice', wallets: WALLETS_1 },
        { username: 'alice2', handle: null, wallets: WALLETS_2 },
      ],
    });
  });

  it('passes query and limit to selectArtists', async () => {
    vi.mocked(selectArtists).mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    } as any);

    await searchArtistsHandler({ query: 'bob', limit: 25 });

    expect(selectArtists).toHaveBeenCalledWith({ q: 'bob', limit: 25 });
  });

  it('looks up by handle only, ignoring query and limit', async () => {
    vi.mocked(selectArtists).mockResolvedValue({
      data: [
        {
          username: 'Sofractures',
          handle: 'sofractures.eth',
          wallets: WALLETS_1,
        },
      ],
      count: 1,
      error: null,
    } as any);

    const res = await searchArtistsHandler({
      query: 'sof',
      handle: 'sofractures.eth',
      limit: 25,
    });

    expect(selectArtists).toHaveBeenCalledWith({ handle: 'sofractures.eth' });
    expect(await res.json()).toEqual({
      artists: [
        {
          username: 'Sofractures',
          handle: 'sofractures.eth',
          wallets: WALLETS_1,
        },
      ],
    });
  });

  it('returns an empty artists array when no artist has the handle', async () => {
    vi.mocked(selectArtists).mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    } as any);

    const res = await searchArtistsHandler({ handle: 'nobody', limit: 10 });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ artists: [] });
  });

  it('returns an empty artists array when no matches are found', async () => {
    vi.mocked(selectArtists).mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    } as any);

    const res = await searchArtistsHandler({ query: 'nobody', limit: 10 });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ artists: [] });
  });

  it('returns an empty artists array when data is null', async () => {
    vi.mocked(selectArtists).mockResolvedValue({
      data: null,
      count: null,
      error: null,
    } as any);

    const res = await searchArtistsHandler({ query: 'ghost', limit: 10 });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ artists: [] });
  });

  it('throws when supabase returns an error', async () => {
    vi.mocked(selectArtists).mockRejectedValue(new Error('DB failure'));

    await expect(
      searchArtistsHandler({ query: 'alice', limit: 10 })
    ).rejects.toThrow('DB failure');
  });
});

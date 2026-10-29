import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/timeline/invalidateTimelineCache', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_wallets/upsertWallets', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_artists/upsertArtists', () => ({
  upsertArtists: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_artists/selectArtists', () => ({
  default: vi.fn(),
}));

import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import selectArtists from '@/lib/supabase/in_process_artists/selectArtists';
import disconnectWalletHandler from '@/lib/wallets/disconnectWalletHandler';
import { AuthMethod } from '@/types/auth';

const baseArtist = {
  artistId: 'artist-1',
  primaryWallet: '0xabc' as const,
  authMethod: AuthMethod.Privy,
};

describe('disconnectWalletHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears artist from wallet and returns success for non-external wallet', async () => {
    const res = await disconnectWalletHandler({
      artist: {
        ...baseArtist,
        wallets: [{ address: '0xabc', type: 'payment' }],
      },
      address: '0xABC',
    });

    expect(await res.json()).toEqual({ success: true });
    expect(upsertWallets).toHaveBeenCalledWith([
      { address: '0xabc', artist: null },
    ]);
    expect(selectArtists).not.toHaveBeenCalled();
    expect(upsertArtists).not.toHaveBeenCalled();
  });

  it('creates a new artist and reassigns wallet for external wallet', async () => {
    vi.mocked(selectArtists).mockResolvedValueOnce({
      data: [
        {
          username: 'alice',
          bio: 'bio',
          x: 'x_handle',
          instagram: 'ig',
          telegram: 'tg',
          default_collection: 'collection-1',
        },
      ] as any,
      error: null,
      count: 1,
    });
    vi.mocked(upsertArtists)
      .mockResolvedValueOnce([{ id: 'artist-1' }])
      .mockResolvedValueOnce([{ id: 'new-artist-id' }]);

    const res = await disconnectWalletHandler({
      artist: {
        ...baseArtist,
        wallets: [{ address: '0xabc', type: 'external' }],
      },
      address: '0xABC',
    });

    expect(await res.json()).toEqual({ success: true });
    expect(selectArtists).toHaveBeenCalledWith({ ids: ['artist-1'] });
    expect(upsertArtists).toHaveBeenNthCalledWith(1, {
      id: 'artist-1',
      username: null,
      bio: null,
      x: null,
      instagram: null,
      telegram: null,
      default_collection: null,
    });
    expect(upsertArtists).toHaveBeenNthCalledWith(2, {
      username: 'alice',
      bio: 'bio',
      x: 'x_handle',
      instagram: 'ig',
      telegram: 'tg',
      default_collection: 'collection-1',
    });
    expect(upsertWallets).toHaveBeenCalledWith([
      { address: '0xabc', artist: 'new-artist-id' },
    ]);
  });

  it('throws when upsertArtists returns no record for external wallet', async () => {
    vi.mocked(selectArtists).mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    });
    vi.mocked(upsertArtists)
      .mockResolvedValueOnce([{ id: 'artist-1' }])
      .mockResolvedValueOnce([]);

    await expect(
      disconnectWalletHandler({
        artist: {
          ...baseArtist,
          wallets: [{ address: '0xabc', type: 'external' }],
        },
        address: '0xABC',
      })
    ).rejects.toThrow('Failed to update artist');
  });
});

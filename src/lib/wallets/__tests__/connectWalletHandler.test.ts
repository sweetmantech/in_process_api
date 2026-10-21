import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/in_process_wallets/upsertWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/deleteArtist', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/selectArtists', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/upsertArtists', () => ({
  upsertArtists: vi.fn(),
}));

import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import deleteArtist from '@/lib/supabase/in_process_artists/deleteArtist';
import selectArtists from '@/lib/supabase/in_process_artists/selectArtists';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import connectWalletHandler from '@/lib/wallets/connectWalletHandler';
import { AuthMethod } from '@/types/auth';

const artist = {
  artistId: 'artist-1',
  primaryWallet: '0xaaa' as const,
  wallets: [{ address: '0xaaa' as const, type: 'privy' as const }],
  authMethod: AuthMethod.Privy,
};

const profile = (overrides: Record<string, unknown>) => ({
  username: null,
  bio: null,
  x: null,
  instagram: null,
  telegram: null,
  default_collection: null,
  ...overrides,
});

describe('connectWalletHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(selectWallets)
      .mockResolvedValueOnce({
        data: [{ address: '0xbbb', artist_id: 'prior-artist' }],
      } as never)
      .mockResolvedValueOnce({
        data: [{ address: '0xbbb', artist_id: 'prior-artist' }],
      } as never);
  });

  it('moves the prior default collection with the external wallet profile', async () => {
    vi.mocked(selectArtists).mockResolvedValueOnce({
      data: [
        profile({
          id: 'prior-artist',
          username: 'alice',
          default_collection: 'prior-collection',
        }),
        profile({ id: 'artist-1', default_collection: 'current-collection' }),
      ],
      error: null,
      count: 2,
    } as never);

    const res = await connectWalletHandler({
      artist,
      address: '0xBBB',
      clientType: 'external',
    });

    expect(await res.json()).toEqual({ success: true });
    expect(upsertArtists).toHaveBeenNthCalledWith(1, {
      id: 'prior-artist',
      username: null,
      bio: null,
      x: null,
      instagram: null,
      telegram: null,
      default_collection: null,
    });
    expect(upsertArtists).toHaveBeenNthCalledWith(2, {
      id: 'artist-1',
      username: 'alice',
      bio: null,
      x: null,
      instagram: null,
      telegram: null,
      default_collection: 'prior-collection',
    });
    expect(upsertWallets).toHaveBeenCalledWith([
      { address: '0xbbb', artist: 'artist-1', type: 'external' },
    ]);
    expect(deleteArtist).toHaveBeenCalledWith('prior-artist');
  });

  it('keeps the current default collection when the prior artist has none', async () => {
    vi.mocked(selectArtists).mockResolvedValueOnce({
      data: [
        profile({ id: 'prior-artist' }),
        profile({ id: 'artist-1', default_collection: 'current-collection' }),
      ],
      error: null,
      count: 2,
    } as never);

    await connectWalletHandler({
      artist,
      address: '0xBBB',
      clientType: 'external',
    });

    expect(upsertArtists).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: 'artist-1',
        default_collection: 'current-collection',
      })
    );
  });
});

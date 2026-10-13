import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';

vi.mock('@/lib/supabase/in_process_wallets/upsertWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artist_phones/selectPhone', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/ens/resolveAddressToEns', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/farcaster/getFarcasterUsernameByAddress', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/upsertArtists', () => ({
  upsertArtists: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/upsertArtistNames', () => ({
  upsertArtistNames: vi.fn(),
}));

import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import selectPhone from '@/lib/supabase/in_process_artist_phones/selectPhone';
import resolveAddressToEns from '@/lib/ens/resolveAddressToEns';
import getFarcasterUsernameByAddress from '@/lib/farcaster/getFarcasterUsernameByAddress';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import { upsertArtistNames } from '@/lib/supabase/in_process_artists/upsertArtistNames';
import getArtistProfile from '../getArtistProfile';

const ADDRESS = '0xAbcDef0000000000000000000000000000000001' as Address;
const NORMALIZED = ADDRESS.toLowerCase();
const EXISTING_ARTIST = {
  id: 'artist-existing',
  username: 'dwn2erth',
  bio: 'bio',
  instagram: null,
  x: null,
  telegram: null,
};

describe('getArtistProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(selectPhone).mockResolvedValue({
      data: null,
      error: null,
    } as any);
    vi.mocked(getFarcasterUsernameByAddress).mockResolvedValue(null);
    vi.mocked(resolveAddressToEns).mockResolvedValue(null);
    vi.mocked(upsertArtistNames).mockResolvedValue(undefined);
    vi.mocked(selectWallets).mockResolvedValue({ data: [] });
  });

  it('uses upsertArtistNames when a username is resolved', async () => {
    vi.mocked(upsertWallets).mockResolvedValue([
      {
        address: NORMALIZED,
        artist_id: null,
        eoa: null,
        artist: null,
      },
    ]);
    vi.mocked(selectWallets).mockResolvedValue({
      data: [
        {
          address: NORMALIZED,
          artist_id: EXISTING_ARTIST.id,
          type: null,
          artist: EXISTING_ARTIST,
        },
      ],
    });
    vi.mocked(getFarcasterUsernameByAddress).mockResolvedValue('dwn2erth');

    const profile = await getArtistProfile(ADDRESS);

    expect(upsertArtistNames).toHaveBeenCalledWith(
      new Map([[NORMALIZED, 'dwn2erth']])
    );
    expect(upsertArtists).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      id: EXISTING_ARTIST.id,
      username: 'dwn2erth',
      bio: 'bio',
    });
  });

  it('creates a blank artist when no username can be resolved', async () => {
    vi.mocked(upsertWallets).mockResolvedValue([
      {
        address: NORMALIZED,
        artist_id: null,
        eoa: null,
        artist: null,
      },
    ]);
    vi.mocked(upsertArtists).mockResolvedValue([{ id: 'artist-new' }]);

    const profile = await getArtistProfile(ADDRESS);

    expect(upsertArtistNames).not.toHaveBeenCalled();
    expect(upsertArtists).toHaveBeenCalledWith({ username: null });
    expect(upsertWallets).toHaveBeenCalledWith([
      { address: NORMALIZED, artist: 'artist-new' },
    ]);
    expect(profile).toMatchObject({ id: 'artist-new', username: null });
  });

  it('returns existing named profile without resolving username', async () => {
    vi.mocked(upsertWallets).mockResolvedValue([
      {
        address: NORMALIZED,
        artist_id: EXISTING_ARTIST.id,
        eoa: null,
        artist: EXISTING_ARTIST,
      },
    ]);

    const profile = await getArtistProfile(ADDRESS);

    expect(getFarcasterUsernameByAddress).not.toHaveBeenCalled();
    expect(upsertArtistNames).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      id: EXISTING_ARTIST.id,
      username: 'dwn2erth',
    });
  });

  it("returns the EOA's profile for an operator address without creating an artist", async () => {
    const EOA = '0x00000000000000000000000000000000000000e0';
    vi.mocked(upsertWallets)
      .mockResolvedValueOnce([
        { address: NORMALIZED, artist_id: null, eoa: EOA, artist: null },
      ])
      .mockResolvedValueOnce([
        {
          address: EOA,
          artist_id: EXISTING_ARTIST.id,
          eoa: null,
          artist: EXISTING_ARTIST,
        },
      ]);

    const profile = await getArtistProfile(ADDRESS);

    expect(upsertWallets).toHaveBeenNthCalledWith(2, [{ address: EOA }]);
    expect(upsertArtists).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      id: EXISTING_ARTIST.id,
      username: 'dwn2erth',
    });
  });
});

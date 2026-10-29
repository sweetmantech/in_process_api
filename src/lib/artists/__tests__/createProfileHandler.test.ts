import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/timeline/invalidateTimelineCache', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_artists/upsertArtists', () => ({
  upsertArtists: vi.fn(),
}));

import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';
import createProfileHandler from '@/lib/artists/createProfileHandler';

const ARTIST = {
  artistId: '00000000-0000-0000-0000-000000000001',
  primaryWallet: '0x1234567890123456789012345678901234567890' as const,
  wallets: [
    {
      address: '0x1234567890123456789012345678901234567890' as const,
      type: 'privy' as const,
    },
  ],
};

describe('createProfileHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(upsertArtists).mockResolvedValue([{ id: ARTIST.artistId }]);
  });

  it('upserts profile fields for the authenticated artist', async () => {
    const res = await createProfileHandler({
      artist: ARTIST,
      username: 'testartist',
      bio: 'hello',
      instagram: '@insta',
      x: '@x',
      telegram: '@tg',
    });

    expect(await res.json()).toEqual({ success: true });
    expect(upsertArtists).toHaveBeenCalledWith({
      id: ARTIST.artistId,
      username: 'testartist',
      bio: 'hello',
      instagram: '@insta',
      x: '@x',
      telegram: '@tg',
    });
  });

  it('passes null username through to upsertArtists', async () => {
    await createProfileHandler({
      artist: ARTIST,
      username: null,
    });

    expect(upsertArtists).toHaveBeenCalledWith({
      id: ARTIST.artistId,
      username: null,
      bio: undefined,
      instagram: undefined,
      x: undefined,
      telegram: undefined,
    });
  });

  it('throws when upsertArtists fails', async () => {
    vi.mocked(upsertArtists).mockRejectedValue(new Error('db error'));

    await expect(
      createProfileHandler({ artist: ARTIST, username: 'testartist' })
    ).rejects.toThrow('db error');
  });
});

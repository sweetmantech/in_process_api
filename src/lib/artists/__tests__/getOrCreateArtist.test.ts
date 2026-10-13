import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import getOrCreateArtist from '../getOrCreateArtist';

vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_wallets/upsertWallets', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/upsertArtists', () => ({
  upsertArtists: vi.fn(),
}));

import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import upsertWallets from '@/lib/supabase/in_process_wallets/upsertWallets';
import { upsertArtists } from '@/lib/supabase/in_process_artists/upsertArtists';

const ADDRESS = '0x0000000000000000000000000000000000000001' as Address;
const ARTIST_ID = 'artist-uuid-123';
const CREATED_ID = 'artist-uuid-new';

const makeWalletRow = (
  artistId: string,
  walletAddress: string,
  walletType: string,
  username: string | null = null
) => ({
  address: walletAddress,
  artist_id: artistId,
  type: walletType,
  artist: {
    id: artistId,
    username,
    bio: null,
    x: null,
    telegram: null,
    instagram: null,
  },
});

const mockSelectWallets = (
  byAddress: ReturnType<typeof makeWalletRow>[],
  byArtistId: ReturnType<typeof makeWalletRow>[]
) => {
  vi.mocked(selectWallets).mockImplementation(
    async ({ addresses, artistIds }: any) => {
      if (addresses) return { data: byAddress };
      if (artistIds) return { data: byArtistId };
      return { data: [] };
    }
  );
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(upsertArtists).mockResolvedValue([{ id: CREATED_ID }]);
  vi.mocked(upsertWallets).mockResolvedValue([]);
});

describe('getOrCreateArtist', () => {
  describe('new artist (no existing wallet)', () => {
    it('creates artist and wallet, returns ArtistContext', async () => {
      const newRow = makeWalletRow(CREATED_ID, ADDRESS, 'privy');
      mockSelectWallets([], [newRow]);

      const result = await getOrCreateArtist({
        address: ADDRESS,
        type: 'privy',
      });

      expect(upsertArtists).toHaveBeenCalledWith({ username: undefined });
      expect(upsertWallets).toHaveBeenCalledWith([
        { address: ADDRESS, artist: CREATED_ID, type: 'privy' },
      ]);
      expect(result.artistId).toBe(CREATED_ID);
    });

    it('creates artist with artistName when provided', async () => {
      mockSelectWallets([], [makeWalletRow(CREATED_ID, ADDRESS, 'privy')]);

      await getOrCreateArtist({ address: ADDRESS, artistName: 'Alice' });

      expect(upsertArtists).toHaveBeenCalledWith({ username: 'Alice' });
    });

    it('throws when upsertArtists returns empty', async () => {
      mockSelectWallets([], []);
      vi.mocked(upsertArtists).mockResolvedValue([]);

      await expect(getOrCreateArtist({ address: ADDRESS })).rejects.toThrow(
        'Failed to create artist entity'
      );
    });
  });

  describe('existing artist with username', () => {
    it('does not call upsertArtists or upsertWallets', async () => {
      const row = makeWalletRow(ARTIST_ID, ADDRESS, 'external', 'Bob');
      mockSelectWallets([row], [row]);

      await getOrCreateArtist({ address: ADDRESS });

      expect(upsertArtists).not.toHaveBeenCalled();
      expect(upsertWallets).not.toHaveBeenCalled();
    });

    it('does not update username even when artistName is provided', async () => {
      const row = makeWalletRow(ARTIST_ID, ADDRESS, 'external', 'Bob');
      mockSelectWallets([row], [row]);

      await getOrCreateArtist({ address: ADDRESS, artistName: 'NewName' });

      expect(upsertArtists).not.toHaveBeenCalled();
    });
  });

  describe('existing artist without username', () => {
    it('updates username when artistName is provided', async () => {
      const row = makeWalletRow(ARTIST_ID, ADDRESS, 'farcaster', null);
      mockSelectWallets([row], [row]);

      await getOrCreateArtist({ address: ADDRESS, artistName: 'Alice' });

      expect(upsertArtists).toHaveBeenCalledWith({
        id: ARTIST_ID,
        username: 'Alice',
      });
      expect(upsertWallets).not.toHaveBeenCalled();
    });

    it('does not call upsertArtists when artistName is not provided', async () => {
      const row = makeWalletRow(ARTIST_ID, ADDRESS, 'farcaster', null);
      mockSelectWallets([row], [row]);

      await getOrCreateArtist({ address: ADDRESS });

      expect(upsertArtists).not.toHaveBeenCalled();
    });
  });

  describe('primaryWallet selection', () => {
    it('prefers external wallet', async () => {
      const wallets = [
        makeWalletRow(ARTIST_ID, '0xprivy', 'privy', 'Bob'),
        makeWalletRow(ARTIST_ID, '0xexternal', 'external', 'Bob'),
      ];
      mockSelectWallets([wallets[0]], wallets);

      const result = await getOrCreateArtist({ address: ADDRESS });

      expect(result.primaryWallet).toBe('0xexternal');
    });

    it('falls back to privy wallet if no external', async () => {
      const wallets = [
        makeWalletRow(ARTIST_ID, '0xprivy', 'privy', 'Bob'),
        makeWalletRow(ARTIST_ID, '0xfarcaster', 'farcaster', 'Bob'),
      ];
      mockSelectWallets([wallets[0]], wallets);

      const result = await getOrCreateArtist({ address: ADDRESS });

      expect(result.primaryWallet).toBe('0xprivy');
    });

    it('falls back to first wallet if no external or privy', async () => {
      const wallets = [
        makeWalletRow(ARTIST_ID, '0xfarcaster', 'farcaster', 'Bob'),
        makeWalletRow(ARTIST_ID, '0xsmart', 'payment', 'Bob'),
      ];
      mockSelectWallets([wallets[0]], wallets);

      const result = await getOrCreateArtist({ address: ADDRESS });

      expect(result.primaryWallet).toBe('0xfarcaster');
    });

    it('skips smart and operator wallets when falling back', async () => {
      const wallets = [
        makeWalletRow(ARTIST_ID, '0xoperator', 'operator', 'Bob'),
        makeWalletRow(ARTIST_ID, '0xsmart', 'payment', 'Bob'),
        makeWalletRow(ARTIST_ID, '0xlegacy', null as never, 'Bob'),
      ];
      mockSelectWallets([wallets[2]], wallets);

      const result = await getOrCreateArtist({ address: ADDRESS });

      expect(result.primaryWallet).toBe('0xlegacy');
    });

    it('falls back to the first wallet when only smart wallets exist', async () => {
      const wallets = [
        makeWalletRow(ARTIST_ID, '0xoperator', 'operator', 'Bob'),
        makeWalletRow(ARTIST_ID, '0xsmart', 'payment', 'Bob'),
      ];
      mockSelectWallets([wallets[0]], wallets);

      const result = await getOrCreateArtist({ address: ADDRESS });

      expect(result.primaryWallet).toBe('0xoperator');
    });
  });

  describe('return shape', () => {
    it('returns artistId, primaryWallet, and wallets', async () => {
      const wallets = [makeWalletRow(ARTIST_ID, ADDRESS, 'external', 'Bob')];
      mockSelectWallets([wallets[0]], wallets);

      const result = await getOrCreateArtist({ address: ADDRESS });

      expect(result).toEqual({
        artistId: ARTIST_ID,
        primaryWallet: ADDRESS,
        wallets: [{ address: ADDRESS, type: 'external' }],
      });
    });

    it('throws when no wallets found after create', async () => {
      mockSelectWallets([], []);

      await expect(getOrCreateArtist({ address: ADDRESS })).rejects.toThrow(
        `No wallets found for artist ${CREATED_ID}`
      );
    });
  });
});

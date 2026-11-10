import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/consts', () => ({
  ADMIN_ADDRESSES: ['0xaf1452d289e22fbd0dea9d5097353c72a90fac33'],
}));

vi.mock('@/lib/supabase/in_process_wallets/selectWallets', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/emails/lookupArtistEmail', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/privy/getAllEmails', () => ({
  default: vi.fn(),
}));

import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import lookupArtistEmail from '@/lib/emails/lookupArtistEmail';
import getAllEmails from '@/lib/privy/getAllEmails';
import getEmailsHandler from '@/lib/emails/getEmailsHandler';

const ADMIN_ADDRESS = '0xaf1452d289e22fbd0dea9d5097353c72a90fac33';
const NON_ADMIN_ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER_ADDRESS = '0x0000000000000000000000000000000000000002';
const ARTIST_UUID = 'uuid-artist-1234';

describe('getEmailsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('non-admin (normal API key)', () => {
    it('returns own email using callerAddress', async () => {
      vi.mocked(lookupArtistEmail).mockResolvedValue('artist@example.com');

      const res = await getEmailsHandler(NON_ADMIN_ADDRESS);
      const json = await res.json();

      expect(lookupArtistEmail).toHaveBeenCalledWith(NON_ADMIN_ADDRESS);
      expect(json).toEqual({ email: 'artist@example.com' });
    });

    it('returns null email when none is found', async () => {
      vi.mocked(lookupArtistEmail).mockResolvedValue(null);

      const res = await getEmailsHandler(NON_ADMIN_ADDRESS);
      const json = await res.json();

      expect(json).toEqual({ email: null });
    });

    it('ignores artist_address param and returns own email', async () => {
      vi.mocked(lookupArtistEmail).mockResolvedValue('own@example.com');

      const res = await getEmailsHandler(NON_ADMIN_ADDRESS, OTHER_ADDRESS);
      const json = await res.json();

      expect(lookupArtistEmail).toHaveBeenCalledWith(NON_ADMIN_ADDRESS);
      expect(json).toEqual({ email: 'own@example.com' });
    });
  });

  describe('admin with artist_address', () => {
    it('returns email for specified artist', async () => {
      vi.mocked(lookupArtistEmail).mockResolvedValue('artist@example.com');

      const res = await getEmailsHandler(ADMIN_ADDRESS, OTHER_ADDRESS);
      const json = await res.json();

      expect(lookupArtistEmail).toHaveBeenCalledWith(OTHER_ADDRESS);
      expect(json).toEqual({ email: 'artist@example.com' });
    });
  });

  describe('admin list (no artistAddress)', () => {
    it('returns enriched emails with artist_address and username', async () => {
      vi.mocked(getAllEmails).mockResolvedValue({
        emails: [{ address: '0xsocial', email: 'user@example.com' }],
        next_cursor: null,
      } as any);
      vi.mocked(selectWallets)
        .mockResolvedValueOnce({
          data: [
            {
              address: '0xsocial',
              artist_id: ARTIST_UUID,
              artist: { username: 'coolartist' },
            },
          ],
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: [{ artist_id: ARTIST_UUID, address: '0xartist' }],
          error: null,
        } as any);

      const res = await getEmailsHandler(ADMIN_ADDRESS);
      const json = await res.json();

      expect(json.emails).toEqual([
        {
          address: '0xsocial',
          email: 'user@example.com',
          artist_address: '0xartist',
          username: 'coolartist',
        },
      ]);
      expect(json.next_cursor).toBeNull();
    });

    it('returns null artist_address and username when no match', async () => {
      vi.mocked(getAllEmails).mockResolvedValue({
        emails: [{ address: '0xunknown', email: 'unknown@example.com' }],
        next_cursor: null,
      } as any);
      vi.mocked(selectWallets)
        .mockResolvedValueOnce({ data: [], error: null } as any)
        .mockResolvedValueOnce({ data: [], error: null } as any);

      const res = await getEmailsHandler(ADMIN_ADDRESS);
      const json = await res.json();

      expect(json.emails).toEqual([
        {
          address: '0xunknown',
          email: 'unknown@example.com',
          artist_address: null,
          username: null,
        },
      ]);
    });

    it('returns null username when artist has no username', async () => {
      vi.mocked(getAllEmails).mockResolvedValue({
        emails: [{ address: '0xsocial', email: 'user@example.com' }],
        next_cursor: null,
      } as any);
      vi.mocked(selectWallets)
        .mockResolvedValueOnce({
          data: [
            {
              address: '0xsocial',
              artist_id: ARTIST_UUID,
              artist: null,
            },
          ],
          error: null,
        } as any)
        .mockResolvedValueOnce({
          data: [{ artist_id: ARTIST_UUID, address: '0xartist' }],
          error: null,
        } as any);

      const res = await getEmailsHandler(ADMIN_ADDRESS);
      const json = await res.json();

      expect(json.emails[0].username).toBeNull();
    });

    it('passes cursor and limit to getAllEmails', async () => {
      vi.mocked(getAllEmails).mockResolvedValue({
        emails: [],
        next_cursor: null,
      } as any);
      vi.mocked(selectWallets).mockResolvedValue({
        data: [],
        error: null,
      } as any);

      await getEmailsHandler(ADMIN_ADDRESS, undefined, 'cursor-abc', 10);

      expect(getAllEmails).toHaveBeenCalledWith('cursor-abc', 10);
    });
  });
});

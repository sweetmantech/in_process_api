import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/emails/lookupArtistEmail', () => ({
  default: vi.fn(),
}));

import lookupArtistEmail from '@/lib/emails/lookupArtistEmail';
import lookupEmail from '../lookupEmail';

describe('lookupEmail', () => {
  it('returns the email from lookupArtistEmail', async () => {
    vi.mocked(lookupArtistEmail).mockResolvedValue('artist@example.com');

    const res = await lookupEmail('0xArtist');

    expect(lookupArtistEmail).toHaveBeenCalledWith('0xArtist');
    expect(await res.json()).toEqual({ email: 'artist@example.com' });
  });

  it('returns null when no email is found', async () => {
    vi.mocked(lookupArtistEmail).mockResolvedValue(null);

    const res = await lookupEmail('0xArtist');

    expect(await res.json()).toEqual({ email: null });
  });
});

import { describe, it, expect } from 'vitest';
import type { Address } from 'viem';
import groupAdminsByArtist from '../groupAdminsByArtist';

const EOA = '0x00000000000000000000000000000000000000a1' as Address;
const OPERATOR = '0x00000000000000000000000000000000000000c1' as Address;
const OTHER_EOA = '0x00000000000000000000000000000000000000b1' as Address;
const UNKNOWN = '0x00000000000000000000000000000000000000d1' as Address;
const NO_ARTIST = '0x00000000000000000000000000000000000000e1' as Address;

const wallet = (
  address: Address,
  artistId: string | null,
  type: 'privy' | 'operator' | 'smart' | null,
  username: string | null = null
) => ({
  address,
  artist_id: artistId,
  type,
  artist: artistId ? { username } : null,
});

describe('groupAdminsByArtist', () => {
  it('groups an EOA and its operator under one artist, EOA first', () => {
    expect(
      groupAdminsByArtist({
        admins: [OPERATOR, EOA],
        wallets: [
          wallet(EOA, 'artist-1', 'privy', 'bob'),
          wallet(OPERATOR, 'artist-1', 'operator', 'bob'),
        ],
      })
    ).toEqual([
      { artistId: 'artist-1', username: 'bob', addresses: [EOA, OPERATOR] },
    ]);
  });

  it('keeps different artists in separate groups in admin order', () => {
    const groups = groupAdminsByArtist({
      admins: [OTHER_EOA, EOA],
      wallets: [
        wallet(EOA, 'artist-1', 'privy', 'bob'),
        wallet(OTHER_EOA, 'artist-2', null, 'alice'),
      ],
    });
    expect(groups.map((group) => group.artistId)).toEqual([
      'artist-2',
      'artist-1',
    ]);
  });

  it('gives admins without a wallet row or artist their own group', () => {
    expect(
      groupAdminsByArtist({
        admins: [UNKNOWN, NO_ARTIST],
        wallets: [wallet(NO_ARTIST, null, 'operator')],
      })
    ).toEqual([
      { artistId: null, username: null, addresses: [UNKNOWN] },
      { artistId: null, username: null, addresses: [NO_ARTIST] },
    ]);
  });

  it('matches wallet rows case-insensitively and keeps admin casing', () => {
    const mixed = '0x00000000000000000000000000000000000000A1' as Address;
    expect(
      groupAdminsByArtist({
        admins: [mixed],
        wallets: [wallet(EOA, 'artist-1', 'privy')],
      })
    ).toEqual([{ artistId: 'artist-1', username: null, addresses: [mixed] }]);
  });
});

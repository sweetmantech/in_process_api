import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/collection/ensureProcessCollection', () => ({
  default: vi.fn(),
}));
vi.mock(
  '@/lib/supabase/in_process_artists/selectArtistDefaultCollection',
  () => ({
    default: vi.fn(),
  })
);
vi.mock(
  '@/lib/supabase/in_process_artists/linkArtistDefaultCollection',
  () => ({
    default: vi.fn(),
  })
);

import ensureProcessCollection from '@/lib/collection/ensureProcessCollection';
import selectArtistDefaultCollection from '@/lib/supabase/in_process_artists/selectArtistDefaultCollection';
import linkArtistDefaultCollection from '@/lib/supabase/in_process_artists/linkArtistDefaultCollection';
import resolveDefaultCollection from '@/lib/collection/resolveDefaultCollection';

const WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const OPERATOR = '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`;
const OTHER = '0xdddddddddddddddddddddddddddddddddddddddd';

const artist = {
  artistId: 'artist-1',
  primaryWallet: WALLET,
  wallets: [
    { address: WALLET, type: 'privy' as const },
    { address: OPERATOR, type: 'operator' as const },
  ],
};

const processCollection = {
  id: 'process-1',
  address: '0x1111111111111111111111111111111111111111',
  name: 'Process',
  chain_id: 8453,
  created_at: '2026-01-01T00:00:00.000Z',
  uri: 'ar://process',
  protocol: 'in_process',
  creator: WALLET,
  creator_username: null,
  admins: [],
};

const makeDefault = (overrides: Record<string, unknown> = {}) => ({
  id: 'custom-1',
  address: '0x2222222222222222222222222222222222222222',
  name: 'Custom',
  chain_id: 8453,
  created_at: '2026-02-01T00:00:00.000Z',
  uri: 'ar://custom',
  protocol: 'in_process',
  creator: OTHER,
  admins: [{ artist_address: OPERATOR, token_id: 0 }],
  ...overrides,
});

const mockSelect = (collection: unknown) =>
  vi
    .mocked(selectArtistDefaultCollection)
    .mockResolvedValue({ data: { collection }, error: null } as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureProcessCollection).mockResolvedValue(processCollection);
  vi.mocked(linkArtistDefaultCollection).mockResolvedValue({
    error: null,
  } as never);
});

describe('resolveDefaultCollection', () => {
  it('returns the stored default when the artist administers it', async () => {
    const stored = makeDefault();
    mockSelect(stored);

    const result = await resolveDefaultCollection(artist, 8453);

    expect(result).toEqual(stored);
    expect(ensureProcessCollection).not.toHaveBeenCalled();
    expect(linkArtistDefaultCollection).not.toHaveBeenCalled();
  });

  it('accepts a stored default created by one of the artist wallets', async () => {
    const stored = makeDefault({ creator: WALLET, admins: [] });
    mockSelect(stored);

    const result = await resolveDefaultCollection(artist, 8453);

    expect(result).toEqual(stored);
  });

  it('ensures Process and links it when no default is stored', async () => {
    mockSelect(null);

    const result = await resolveDefaultCollection(artist, 8453);

    expect(ensureProcessCollection).toHaveBeenCalledWith(WALLET, 8453);
    expect(linkArtistDefaultCollection).toHaveBeenCalledWith({
      artistId: 'artist-1',
      collectionId: 'process-1',
      expected: null,
    });
    expect(result).toEqual(processCollection);
  });

  it('replaces a stored default the artist no longer administers', async () => {
    mockSelect(makeDefault({ admins: [] }));

    const result = await resolveDefaultCollection(artist, 8453);

    expect(linkArtistDefaultCollection).toHaveBeenCalledWith({
      artistId: 'artist-1',
      collectionId: 'process-1',
      expected: 'custom-1',
    });
    expect(result).toEqual(processCollection);
  });

  it('ignores token-level admin rows', async () => {
    mockSelect(
      makeDefault({ admins: [{ artist_address: OPERATOR, token_id: 3 }] })
    );

    const result = await resolveDefaultCollection(artist, 8453);

    expect(result).toEqual(processCollection);
  });

  it('falls back to Process without overwriting a default on another chain', async () => {
    mockSelect(makeDefault({ chain_id: 84532 }));

    const result = await resolveDefaultCollection(artist, 8453);

    expect(ensureProcessCollection).toHaveBeenCalledWith(WALLET, 8453);
    expect(linkArtistDefaultCollection).not.toHaveBeenCalled();
    expect(result).toEqual(processCollection);
  });

  it('throws when the default lookup fails', async () => {
    vi.mocked(selectArtistDefaultCollection).mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    } as never);

    await expect(resolveDefaultCollection(artist, 8453)).rejects.toEqual({
      message: 'db down',
    });
  });

  it('throws when linking fails', async () => {
    mockSelect(null);
    vi.mocked(linkArtistDefaultCollection).mockResolvedValue({
      error: { message: 'update failed' },
    } as never);

    await expect(resolveDefaultCollection(artist, 8453)).rejects.toEqual({
      message: 'update failed',
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/consts', () => ({ CHAIN_ID: 8453 }));
vi.mock('@/lib/collection/ensureProcessCollection', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_collections/getCollectionsRpc', () => ({
  default: vi.fn(),
}));
vi.mock(
  '@/lib/supabase/in_process_artists/updateArtistDefaultCollection',
  () => ({ default: vi.fn() })
);

import ensureProcessCollection from '@/lib/collection/ensureProcessCollection';
import getCollectionsRpc from '@/lib/supabase/in_process_collections/getCollectionsRpc';
import updateArtistDefaultCollection from '@/lib/supabase/in_process_artists/updateArtistDefaultCollection';
import setDefaultCollectionHandler from '@/lib/collection/setDefaultCollectionHandler';
import { AuthMethod, type AuthResult } from '@/types/auth';

const WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const OTHER = '0xdddddddddddddddddddddddddddddddddddddddd';
const COLLECTION =
  '0x2222222222222222222222222222222222222222' as `0x${string}`;

const artist: AuthResult = {
  artistId: 'artist-1',
  primaryWallet: WALLET,
  wallets: [{ address: WALLET, type: 'privy' }],
  authMethod: AuthMethod.Privy,
};

const makeCollection = (overrides: Record<string, unknown> = {}) => ({
  id: 'custom-1',
  address: COLLECTION,
  name: 'Custom',
  chain_id: 8453,
  created_at: '2026-02-01T00:00:00.000Z',
  uri: 'ar://custom',
  protocol: 'in_process',
  creator: OTHER,
  creator_username: null,
  admins: [{ artist_address: WALLET, token_id: 0 }],
  ...overrides,
});

const processCollection = makeCollection({
  id: 'process-1',
  name: 'Process',
  creator: WALLET,
  admins: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateArtistDefaultCollection).mockResolvedValue({
    error: null,
  } as never);
  vi.mocked(ensureProcessCollection).mockResolvedValue(processCollection);
});

describe('setDefaultCollectionHandler', () => {
  it('saves a collection the artist administers', async () => {
    const collection = makeCollection();
    vi.mocked(getCollectionsRpc).mockResolvedValue({
      data: [collection],
      count: 1,
      error: null,
    });

    const res = await setDefaultCollectionHandler({
      artist,
      collectionAddress: COLLECTION,
    });

    expect(getCollectionsRpc).toHaveBeenCalledWith({
      addresses: [COLLECTION],
      chainId: 8453,
      limit: 1,
    });
    expect(updateArtistDefaultCollection).toHaveBeenCalledWith(
      'artist-1',
      'custom-1'
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(collection);
  });

  it('returns 404 when the collection is not on this chain', async () => {
    vi.mocked(getCollectionsRpc).mockResolvedValue({
      data: [],
      count: 0,
      error: null,
    });

    const res = await setDefaultCollectionHandler({
      artist,
      collectionAddress: COLLECTION,
    });

    expect(res.status).toBe(404);
    expect(updateArtistDefaultCollection).not.toHaveBeenCalled();
  });

  it('returns 403 when the artist is not a collection admin', async () => {
    vi.mocked(getCollectionsRpc).mockResolvedValue({
      data: [makeCollection({ admins: [] })],
      count: 1,
      error: null,
    });

    const res = await setDefaultCollectionHandler({
      artist,
      collectionAddress: COLLECTION,
    });

    expect(res.status).toBe(403);
    expect(updateArtistDefaultCollection).not.toHaveBeenCalled();
  });

  it('resets to the Process collection when the address is null', async () => {
    const res = await setDefaultCollectionHandler({
      artist,
      collectionAddress: null,
    });

    expect(ensureProcessCollection).toHaveBeenCalledWith(WALLET, 8453);
    expect(getCollectionsRpc).not.toHaveBeenCalled();
    expect(updateArtistDefaultCollection).toHaveBeenCalledWith(
      'artist-1',
      'process-1'
    );
    await expect(res.json()).resolves.toEqual(processCollection);
  });

  it('throws when the collection lookup fails', async () => {
    vi.mocked(getCollectionsRpc).mockResolvedValue({
      data: null,
      count: null,
      error: { message: 'rpc failed' },
    });

    await expect(
      setDefaultCollectionHandler({ artist, collectionAddress: COLLECTION })
    ).rejects.toEqual({ message: 'rpc failed' });
  });

  it('throws when saving the default fails', async () => {
    vi.mocked(updateArtistDefaultCollection).mockResolvedValue({
      error: { message: 'update failed' },
    } as never);

    await expect(
      setDefaultCollectionHandler({ artist, collectionAddress: null })
    ).rejects.toEqual({ message: 'update failed' });
  });
});

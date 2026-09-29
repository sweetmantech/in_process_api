import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress, type Address } from 'viem';
import indexMoment from '../indexMoment';

vi.mock('@/lib/consts', () => ({ CHAIN_ID: 8453 }));
vi.mock('@/lib/wallets/ensureWallets', () => ({ ensureWallets: vi.fn() }));
vi.mock('@/lib/supabase/in_process_collections/selectCollections', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_collections/upsertCollections', () => ({
  upsertCollections: vi.fn(),
}));
vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_moments/upsertMoments', () => ({
  upsertMoments: vi.fn(),
}));
vi.mock('../upsertMomentMetadataFromUri', () => ({
  default: vi.fn(),
}));

import { ensureWallets } from '@/lib/wallets/ensureWallets';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import { upsertCollections } from '@/lib/supabase/in_process_collections/upsertCollections';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import { upsertMoments } from '@/lib/supabase/in_process_moments/upsertMoments';
import upsertMomentMetadataFromUri from '../upsertMomentMetadataFromUri';

const CONTRACT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address;
const ARTIST = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as Address;
const TOKEN_ID = '1';
const COLLECTION_ID = 'col-uuid';
const MOMENT_ID = 'moment-uuid';

const baseParams = {
  contractAddress: CONTRACT,
  tokenId: TOKEN_ID,
  artistAddress: ARTIST,
  uri: 'ar://token-meta',
  maxSupply: 100,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(selectCollections).mockResolvedValue([] as never);
  vi.mocked(ensureWallets).mockResolvedValue(undefined as never);
  vi.mocked(upsertCollections).mockResolvedValue([
    { id: COLLECTION_ID },
  ] as never);
  vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
    data: null,
    error: null,
  } as never);
  vi.mocked(upsertMoments).mockResolvedValue([{ id: MOMENT_ID }] as never);
  vi.mocked(upsertMomentMetadataFromUri).mockResolvedValue(undefined);
});

describe('indexMoment', () => {
  it('queries selectCollections by address and chainId first', async () => {
    await indexMoment(baseParams);

    expect(selectCollections).toHaveBeenCalledWith({
      addresses: [getAddress(CONTRACT).toLowerCase()],
      chainId: 8453,
    });
  });

  it('skips collection upsert when selectCollections finds the collection', async () => {
    vi.mocked(selectCollections).mockResolvedValue([
      { id: COLLECTION_ID },
    ] as never);

    await indexMoment(baseParams);

    expect(upsertCollections).not.toHaveBeenCalled();
  });

  it('ensures artist exists with normalized address', async () => {
    await indexMoment(baseParams);
    expect(ensureWallets).toHaveBeenCalledWith([
      getAddress(ARTIST).toLowerCase(),
    ]);
  });

  it('creates a new collection when moment does not exist', async () => {
    await indexMoment(baseParams);
    expect(upsertCollections).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          address: getAddress(CONTRACT).toLowerCase(),
          creator: getAddress(ARTIST).toLowerCase(),
          protocol: 'in_process',
          chain_id: 8453,
          uri: '',
          name: '',
        }),
      ])
    );
  });

  it('skips collection upsert when moment already exists', async () => {
    vi.mocked(selectCollections).mockResolvedValue([
      { id: COLLECTION_ID },
    ] as never);
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [
        {
          id: MOMENT_ID,
          uri: 'ar://old-metadata',
          max_supply: 50,
          created_at: '2024-01-01T00:00:00.000Z',
          collection: { id: COLLECTION_ID },
        },
      ],
      error: null,
    } as never);

    await indexMoment(baseParams);

    expect(upsertCollections).not.toHaveBeenCalled();
  });

  it('upserts moment with channel when provided', async () => {
    await indexMoment({ ...baseParams, channel: 'sms' });

    expect(upsertMoments).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          collection: COLLECTION_ID,
          token_id: Number(TOKEN_ID),
          channel: 'sms',
        }),
      ])
    );
  });

  it('omits channel from upsert when not provided', async () => {
    await indexMoment(baseParams);

    const call = vi.mocked(upsertMoments).mock.calls[0][0][0];
    expect(call).not.toHaveProperty('channel');
  });

  it('updates uri and metadata when moment already exists', async () => {
    const existingId = 'existing-moment-id';
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [
        {
          id: existingId,
          uri: 'ar://old-metadata',
          max_supply: 50,
          created_at: '2024-01-01T00:00:00.000Z',
          collection: { id: COLLECTION_ID },
        },
      ],
      error: null,
    } as never);

    await indexMoment(baseParams);

    expect(ensureWallets).not.toHaveBeenCalled();
    expect(upsertCollections).not.toHaveBeenCalled();
    expect(upsertMoments).toHaveBeenCalledWith([
      expect.objectContaining({
        collection: COLLECTION_ID,
        token_id: Number(TOKEN_ID),
        uri: baseParams.uri,
        max_supply: 50,
        created_at: '2024-01-01T00:00:00.000Z',
      }),
    ]);
    expect(upsertMomentMetadataFromUri).toHaveBeenCalledWith(
      existingId,
      baseParams.uri
    );
  });

  it('returns early without upserting moment when collectionId cannot be resolved', async () => {
    vi.mocked(upsertCollections).mockResolvedValue([] as never);

    await indexMoment(baseParams);

    expect(upsertMoments).not.toHaveBeenCalled();
  });

  it('upserts metadata after moment is created', async () => {
    await indexMoment(baseParams);

    expect(upsertMomentMetadataFromUri).toHaveBeenCalledWith(
      MOMENT_ID,
      baseParams.uri
    );
  });

  it('skips metadata upsert when momentId cannot be resolved', async () => {
    vi.mocked(upsertCollections).mockResolvedValue([] as never);

    await indexMoment(baseParams);

    expect(upsertMomentMetadataFromUri).not.toHaveBeenCalled();
  });
});

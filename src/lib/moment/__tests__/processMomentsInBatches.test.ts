import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../mapMomentsToSupabase', () => ({
  mapMomentsToSupabase: vi.fn().mockReturnValue([]),
}));
vi.mock('../getMomentUris', () => ({
  getMomentUris: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_moments/upsertMoments', () => ({
  upsertMoments: vi.fn(),
}));
vi.mock('../mapMetadataToSupabase', () => ({
  mapMetadataToSupabase: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_metadata/upsertMetadata', () => ({
  upsertMetadata: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_artists/upsertArtistNames', () => ({
  upsertArtistNames: vi.fn(),
}));
vi.mock('@/lib/collection/getCollectionInfoMap', () => ({
  getCollectionInfoMap: vi.fn(),
}));
vi.mock('../triggerMomentMigrations', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/mux/ingestIndexedMomentVideos', () => ({
  default: vi.fn(),
}));

import { processMomentsInBatches } from '../processMomentsInBatches';
import { mapMomentsToSupabase } from '../mapMomentsToSupabase';
import { getMomentUris } from '../getMomentUris';
import { upsertMoments } from '@/lib/supabase/in_process_moments/upsertMoments';
import { mapMetadataToSupabase } from '../mapMetadataToSupabase';
import { upsertMetadata } from '@/lib/supabase/in_process_metadata/upsertMetadata';
import { upsertArtistNames } from '@/lib/supabase/in_process_artists/upsertArtistNames';
import { getCollectionInfoMap } from '@/lib/collection/getCollectionInfoMap';
import triggerMomentMigrations from '../triggerMomentMigrations';
import ingestIndexedMomentVideos from '@/lib/mux/ingestIndexedMomentVideos';

const mockMapMoments = vi.mocked(mapMomentsToSupabase);
const mockGetUris = vi.mocked(getMomentUris);
const mockUpsert = vi.mocked(upsertMoments);
const mockMapMetadata = vi.mocked(mapMetadataToSupabase);
const mockUpsertMetadata = vi.mocked(upsertMetadata);
const mockUpsertArtistNames = vi.mocked(upsertArtistNames);
const mockInfoMap = vi.mocked(getCollectionInfoMap);
const mockTriggerMigrations = vi.mocked(triggerMomentMigrations);

const COLLECTION = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CREATOR = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const inProcessMoment = {
  id: 'moment-1',
  collection: COLLECTION,
  token_id: '1',
  uri: 'ipfs://meta',
  max_supply: '100',
  chain_id: 8453,
  created_at: 1000,
  updated_at: 2000,
  transaction_hash: '0xtx',
};

const upsertedMoment = {
  collection: { address: COLLECTION },
  token_id: 1,
};

describe('processMomentsInBatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUris.mockReturnValue(new Map());
    mockMapMoments.mockReturnValue([
      { collection: 'col-uuid', token_id: 1 },
    ] as any);
    mockUpsert.mockResolvedValue([upsertedMoment] as any);
    mockMapMetadata.mockResolvedValue({
      records: [],
      artistNamesByAddresses: new Map(),
    } as any);
    mockUpsertMetadata.mockResolvedValue(undefined as any);
    mockUpsertArtistNames.mockResolvedValue(undefined as any);
    mockInfoMap.mockResolvedValue(
      new Map([
        [
          `${COLLECTION.toLowerCase()}:8453`,
          { id: 'col-uuid', creator: CREATOR },
        ],
      ])
    );
  });

  it('does nothing for empty array', async () => {
    await processMomentsInBatches([]);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('passes the upserted metadata to ingestIndexedMomentVideos', async () => {
    const records = [{ moment: 'm1', animation_url: 'ar://tx' }];
    mockMapMetadata.mockResolvedValue({
      records,
      artistNamesByAddresses: new Map(),
    } as never);

    await processMomentsInBatches([inProcessMoment as any]);

    expect(vi.mocked(ingestIndexedMomentVideos)).toHaveBeenCalledWith(records);
  });

  it('delegates migration to triggerMomentMigrations', async () => {
    const infoMap = new Map([
      [
        `${COLLECTION.toLowerCase()}:8453`,
        { id: 'col-uuid', creator: CREATOR },
      ],
    ]);
    mockInfoMap.mockResolvedValue(infoMap);

    await processMomentsInBatches([inProcessMoment as any]);

    expect(mockTriggerMigrations).toHaveBeenCalledWith(
      [inProcessMoment],
      infoMap
    );
  });

  it('continues when a batch throws', async () => {
    mockMapMoments.mockRejectedValue(new Error('fail'));

    await expect(
      processMomentsInBatches([inProcessMoment as any])
    ).resolves.not.toThrow();
  });
});

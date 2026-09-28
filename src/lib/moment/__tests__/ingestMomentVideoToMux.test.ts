import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mux/createMuxAssetFromUrl', () => ({ default: vi.fn() }));
vi.mock(
  '@/lib/supabase/in_process_video_playback/insertVideoPlaybackIfAbsent',
  () => ({ default: vi.fn() })
);

import ingestMomentVideoToMux from '../ingestMomentVideoToMux';
import createMuxAssetFromUrl from '@/lib/mux/createMuxAssetFromUrl';
import insertVideoPlaybackIfAbsent from '@/lib/supabase/in_process_video_playback/insertVideoPlaybackIfAbsent';

const mockCreate = vi.mocked(createMuxAssetFromUrl);
const mockInsert = vi.mocked(insertVideoPlaybackIfAbsent);

const MOMENT_ID = 'a0b24c4b-4c92-4eeb-b80e-082f8afde810';
const SOURCE = 'ar://LtPCBrhWC1-jUJmU_saD4fJlux19wUuQJ63JBPFaq9I';

describe('ingestMomentVideoToMux', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ assetId: 'asset1', playbackId: 'play1' });
    mockInsert.mockResolvedValue({ error: null } as never);
  });

  it('creates the Mux asset from the source and records it as preparing', async () => {
    const result = await ingestMomentVideoToMux({
      momentId: MOMENT_ID,
      sourceUri: SOURCE,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      'https://turbo-gateway.com/LtPCBrhWC1-jUJmU_saD4fJlux19wUuQJ63JBPFaq9I',
      `moment:${MOMENT_ID}`
    );
    expect(mockInsert).toHaveBeenCalledWith({
      moment: MOMENT_ID,
      provider: 'mux',
      asset_id: 'asset1',
      playback_id: 'play1',
      status: 'preparing',
      source_uri: SOURCE,
    });
    expect(result).toEqual({
      status: 'created',
      assetId: 'asset1',
      playbackId: 'play1',
    });
  });

  it('skips sources Mux cannot fetch without creating an asset', async () => {
    const result = await ingestMomentVideoToMux({
      momentId: MOMENT_ID,
      sourceUri: 'https://stream.mux.com/deleted.m3u8',
    });

    expect(result).toEqual({
      status: 'skipped',
      reason: 'no fetchable source',
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('throws when the playback row cannot be recorded', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'db down' } } as never);

    await expect(
      ingestMomentVideoToMux({ momentId: MOMENT_ID, sourceUri: SOURCE })
    ).rejects.toThrow('db down');
  });
});

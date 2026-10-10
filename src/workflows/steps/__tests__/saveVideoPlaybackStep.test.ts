import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_video_playback/upsertVideoPlayback', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/mux/findMuxAssetIdFromPlaybackUrl', () => ({
  findMuxAssetIdFromPlaybackUrl: vi.fn(),
}));
vi.mock('@/lib/mux/getMuxAssetAspectRatio', () => ({
  default: vi.fn(),
}));

import saveVideoPlaybackStep from '../saveVideoPlaybackStep';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import upsertVideoPlayback from '@/lib/supabase/in_process_video_playback/upsertVideoPlayback';
import { findMuxAssetIdFromPlaybackUrl } from '@/lib/mux/findMuxAssetIdFromPlaybackUrl';
import getMuxAssetAspectRatio from '@/lib/mux/getMuxAssetAspectRatio';

const mockGetMomentsByAddressAndTokenId = vi.mocked(
  getMomentsByAddressAndTokenId
);
const mockUpsert = vi.mocked(upsertVideoPlayback);
const mockFindAssetId = vi.mocked(findMuxAssetIdFromPlaybackUrl);
const mockGetAspectRatio = vi.mocked(getMuxAssetAspectRatio);

const moment = {
  collectionAddress: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const,
  tokenId: '7',
  chainId: 8453,
};
const PLAYBACK_URL = 'https://stream.mux.com/playback123.m3u8';

const dbMoment = (over: Record<string, unknown> = {}) => ({
  id: 'moment-uuid',
  token_id: 7,
  collection: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
  ...over,
});

describe('saveVideoPlaybackStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [dbMoment()],
      error: null,
    } as never);
    mockFindAssetId.mockResolvedValue('asset123');
    mockGetAspectRatio.mockResolvedValue('9:16');
    mockUpsert.mockResolvedValue({ error: null } as never);
  });

  it('records the Mux asset as ready playback for the moment', async () => {
    const result = await saveVideoPlaybackStep(moment, PLAYBACK_URL);

    expect(mockGetMomentsByAddressAndTokenId).toHaveBeenCalledWith({
      moments: [moment],
      chainId: 8453,
    });
    expect(mockUpsert).toHaveBeenCalledWith({
      moment: 'moment-uuid',
      provider: 'mux',
      asset_id: 'asset123',
      playback_id: 'playback123',
      aspect_ratio: '9:16',
      status: 'ready',
    });
    expect(mockGetAspectRatio).toHaveBeenCalledWith('asset123');
    expect(result).toEqual({
      momentId: 'moment-uuid',
      playbackId: 'playback123',
    });
  });

  it('still records playback when the aspect ratio is unavailable', async () => {
    mockGetAspectRatio.mockResolvedValue(null);

    await saveVideoPlaybackStep(moment, PLAYBACK_URL);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ aspect_ratio: null, status: 'ready' })
    );
  });

  it('ignores moments from other tokens', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [dbMoment({ token_id: 8 })],
      error: null,
    } as never);

    await expect(saveVideoPlaybackStep(moment, PLAYBACK_URL)).rejects.toThrow(
      'Moment not indexed yet'
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('throws so the workflow retries when the moment is not indexed yet', async () => {
    mockGetMomentsByAddressAndTokenId.mockResolvedValue({
      data: [],
      error: null,
    } as never);

    await expect(saveVideoPlaybackStep(moment, PLAYBACK_URL)).rejects.toThrow(
      'Moment not indexed yet'
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('throws when the Mux asset cannot be found', async () => {
    mockFindAssetId.mockResolvedValue(null);

    await expect(saveVideoPlaybackStep(moment, PLAYBACK_URL)).rejects.toThrow(
      'Mux asset not found for playback123'
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('throws when the upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db down' } } as never);

    await expect(saveVideoPlaybackStep(moment, PLAYBACK_URL)).rejects.toThrow(
      'db down'
    );
  });

  it('throws for a non-Mux URL', async () => {
    await expect(
      saveVideoPlaybackStep(moment, 'https://example.com/video.mp4')
    ).rejects.toThrow('Not a Mux playback URL');
    expect(mockGetMomentsByAddressAndTokenId).not.toHaveBeenCalled();
  });
});

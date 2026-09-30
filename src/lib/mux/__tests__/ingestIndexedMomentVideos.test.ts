import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@/lib/supabase/in_process_video_playback/selectVideoPlaybackMomentIds',
  () => ({ default: vi.fn() })
);
vi.mock('@/lib/moment/ingestMomentVideoToMux', () => ({ default: vi.fn() }));

import ingestIndexedMomentVideos from '../ingestIndexedMomentVideos';
import selectVideoPlaybackMomentIds from '@/lib/supabase/in_process_video_playback/selectVideoPlaybackMomentIds';
import ingestMomentVideoToMux from '@/lib/moment/ingestMomentVideoToMux';

const mockSelect = vi.mocked(selectVideoPlaybackMomentIds);
const mockIngest = vi.mocked(ingestMomentVideoToMux);

const video = (moment: string, animation_url: string | null, uri = '') => ({
  moment,
  animation_url,
  content: { mime: 'video/mp4', uri },
});

describe('ingestIndexedMomentVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSelect.mockResolvedValue({ data: [], error: null } as never);
    mockIngest.mockResolvedValue({
      status: 'created',
      assetId: 'a1',
      playbackId: 'p1',
    });
  });

  it('ingests newly indexed videos that did not come through a Mux upload', async () => {
    await ingestIndexedMomentVideos([video('m1', 'ar://tx1')]);

    expect(mockSelect).toHaveBeenCalledWith(['m1']);
    expect(mockIngest).toHaveBeenCalledWith({
      momentId: 'm1',
      sourceUri: 'ar://tx1',
    });
  });

  it('falls back to content.uri when animation_url is empty', async () => {
    await ingestIndexedMomentVideos([video('m1', null, 'ipfs://cid')]);

    expect(mockIngest).toHaveBeenCalledWith({
      momentId: 'm1',
      sourceUri: 'ipfs://cid',
    });
  });

  it('skips Mux uploads, which the Arweave migration records', async () => {
    await ingestIndexedMomentVideos([
      video('m1', 'https://stream.mux.com/abc.m3u8'),
    ]);

    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it('skips moments that already have a playback row (e.g. re-indexed after migration)', async () => {
    mockSelect.mockResolvedValue({
      data: [{ moment: 'm1' }],
      error: null,
    } as never);

    await ingestIndexedMomentVideos([
      video('m1', 'ar://migrated'),
      video('m2', 'ar://new'),
    ]);

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(mockIngest).toHaveBeenCalledWith({
      momentId: 'm2',
      sourceUri: 'ar://new',
    });
  });

  it('ignores non-video metadata', async () => {
    await ingestIndexedMomentVideos([
      {
        moment: 'm1',
        animation_url: 'ar://img',
        content: { mime: 'image/png', uri: 'ar://img' },
      },
    ]);

    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('does not ingest when playback rows cannot be read', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    } as never);

    await ingestIndexedMomentVideos([video('m1', 'ar://tx1')]);

    expect(mockIngest).not.toHaveBeenCalled();
  });

  it('keeps going when one ingest fails', async () => {
    mockIngest.mockRejectedValueOnce(new Error('mux down'));

    await expect(
      ingestIndexedMomentVideos([video('m1', 'ar://a'), video('m2', 'ar://b')])
    ).resolves.toBeUndefined();
    expect(mockIngest).toHaveBeenCalledTimes(2);
  });
});

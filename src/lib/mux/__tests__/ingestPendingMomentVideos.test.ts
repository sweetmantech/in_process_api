import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@/lib/supabase/in_process_video_playback/selectVideoMomentsPendingPlayback',
  () => ({ default: vi.fn() })
);
vi.mock('@/lib/moment/ingestMomentVideoToMux', () => ({ default: vi.fn() }));
vi.mock('@/lib/moment/markVideoPlaybackErrored', () => ({ default: vi.fn() }));

import ingestPendingMomentVideos from '../ingestPendingMomentVideos';
import selectVideoMomentsPendingPlayback from '@/lib/supabase/in_process_video_playback/selectVideoMomentsPendingPlayback';
import ingestMomentVideoToMux from '@/lib/moment/ingestMomentVideoToMux';
import markVideoPlaybackErrored from '@/lib/moment/markVideoPlaybackErrored';

const mockSelect = vi.mocked(selectVideoMomentsPendingPlayback);
const mockIngest = vi.mocked(ingestMomentVideoToMux);
const mockMarkErrored = vi.mocked(markVideoPlaybackErrored);

const rows = (...ids: string[]) =>
  ids.map((id) => ({ moment: id, source_uri: `ar://${id}` }));

const created = { status: 'created', assetId: 'a', playbackId: 'p' } as const;

describe('ingestPendingMomentVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSelect.mockResolvedValue({
      data: rows('m1', 'm2'),
      error: null,
    } as never);
    mockIngest.mockResolvedValue(created);
    mockMarkErrored.mockResolvedValue(undefined);
  });

  it('does nothing when the batch size is 0 (cron turned off)', async () => {
    const summary = await ingestPendingMomentVideos(0);
    expect(summary).toEqual({
      selected: 0,
      created: 0,
      errored: 0,
      retryLater: 0,
      deferred: 0,
    });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('ingests each pending moment', async () => {
    const summary = await ingestPendingMomentVideos(5);

    expect(mockSelect).toHaveBeenCalledWith(5);
    expect(mockIngest).toHaveBeenCalledWith({
      momentId: 'm1',
      sourceUri: 'ar://m1',
    });
    expect(mockIngest).toHaveBeenCalledWith({
      momentId: 'm2',
      sourceUri: 'ar://m2',
    });
    expect(summary).toEqual({
      selected: 2,
      created: 2,
      errored: 0,
      retryLater: 0,
      deferred: 0,
    });
  });

  it('marks unfetchable sources errored so they leave the queue', async () => {
    mockIngest
      .mockResolvedValueOnce({
        status: 'skipped',
        reason: 'no fetchable source',
      })
      .mockResolvedValueOnce(created);

    const summary = await ingestPendingMomentVideos(5);

    expect(mockMarkErrored).toHaveBeenCalledWith('m1', 'ar://m1');
    expect(summary).toMatchObject({ created: 1, errored: 1 });
  });

  it('marks Mux input rejections (400) errored and keeps going', async () => {
    mockIngest
      .mockRejectedValueOnce(
        Object.assign(new Error('bad input'), { status: 400 })
      )
      .mockResolvedValueOnce(created);

    const summary = await ingestPendingMomentVideos(5);

    expect(mockMarkErrored).toHaveBeenCalledWith('m1', 'ar://m1');
    expect(mockIngest).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ created: 1, errored: 1, retryLater: 0 });
  });

  it('stops the run on transient errors and leaves the moment pending', async () => {
    mockIngest.mockRejectedValueOnce(
      Object.assign(new Error('rate limited'), { status: 429 })
    );

    const summary = await ingestPendingMomentVideos(5);

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(mockMarkErrored).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ created: 0, errored: 0, retryLater: 1 });
  });

  it('never marks moments errored on auth errors (bad Mux credentials)', async () => {
    mockIngest.mockRejectedValue(
      Object.assign(new Error('unauthorized'), { status: 401 })
    );

    const summary = await ingestPendingMomentVideos(5);

    expect(mockMarkErrored).not.toHaveBeenCalled();
    expect(summary.retryLater).toBe(1);
  });

  it('stops starting new ingests once the time budget is spent', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    mockIngest.mockImplementation(async () => {
      now += 41_000; // first ingest runs past the 40s budget
      return created;
    });

    const summary = await ingestPendingMomentVideos(5);

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ selected: 2, created: 1, deferred: 1 });
  });

  it('throws when the pending query fails', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    } as never);
    await expect(ingestPendingMomentVideos(5)).rejects.toThrow('db down');
  });
});

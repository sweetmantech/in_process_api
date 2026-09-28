import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@/lib/supabase/in_process_video_playback/insertVideoPlaybackIfAbsent',
  () => ({ default: vi.fn() })
);

import markVideoPlaybackErrored from '../markVideoPlaybackErrored';
import insertVideoPlaybackIfAbsent from '@/lib/supabase/in_process_video_playback/insertVideoPlaybackIfAbsent';

const mockInsert = vi.mocked(insertVideoPlaybackIfAbsent);

describe('markVideoPlaybackErrored', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts an errored row with the source uri', async () => {
    mockInsert.mockResolvedValue({ error: null } as never);

    await markVideoPlaybackErrored('m1', 'https://dead.example/video.mp4');

    expect(mockInsert).toHaveBeenCalledWith({
      moment: 'm1',
      provider: 'mux',
      status: 'errored',
      source_uri: 'https://dead.example/video.mp4',
    });
  });

  it('throws when the insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'db down' } } as never);
    await expect(markVideoPlaybackErrored('m1', 'x')).rejects.toThrow(
      'db down'
    );
  });
});

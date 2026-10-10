import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@/lib/supabase/in_process_video_playback/selectReadyVideoPlayback',
  () => ({ default: vi.fn() })
);

import getMomentVideo from '../getMomentVideo';
import selectReadyVideoPlayback from '@/lib/supabase/in_process_video_playback/selectReadyVideoPlayback';

const mockSelect = vi.mocked(selectReadyVideoPlayback);

describe('getMomentVideo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns provider, playback id and aspect ratio when ready playback exists', async () => {
    mockSelect.mockResolvedValue({
      data: {
        provider: 'mux',
        playback_id: 'playback123',
        aspect_ratio: '9:16',
      },
      error: null,
    } as never);

    await expect(getMomentVideo('moment-id')).resolves.toEqual({
      provider: 'mux',
      playback_id: 'playback123',
      aspect_ratio: '9:16',
    });
    expect(mockSelect).toHaveBeenCalledWith('moment-id');
  });

  it('returns null when there is no ready playback', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null } as never);
    await expect(getMomentVideo('moment-id')).resolves.toBeNull();
  });

  it('returns null without querying when the moment has no DB id', async () => {
    await expect(getMomentVideo(null)).resolves.toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('throws when the query fails', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    } as never);
    await expect(getMomentVideo('moment-id')).rejects.toThrow('db down');
  });
});

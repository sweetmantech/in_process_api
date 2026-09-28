import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@/lib/supabase/in_process_metadata/selectMuxReferencedMetadata',
  () => ({ default: vi.fn() })
);
vi.mock(
  '@/lib/supabase/in_process_video_playback/selectMuxPlaybackIds',
  () => ({ default: vi.fn() })
);

import getReferencedMuxPlaybackIds from '../getReferencedMuxPlaybackIds';
import selectMuxReferencedMetadata from '@/lib/supabase/in_process_metadata/selectMuxReferencedMetadata';
import selectMuxPlaybackIds from '@/lib/supabase/in_process_video_playback/selectMuxPlaybackIds';

const mockMetadata = vi.mocked(selectMuxReferencedMetadata);
const mockPlaybackIds = vi.mocked(selectMuxPlaybackIds);

describe('getReferencedMuxPlaybackIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMetadata.mockResolvedValue({
      data: [
        {
          animation_url: 'https://stream.mux.com/unmigrated1.m3u8',
          content: { uri: 'https://stream.mux.com/unmigrated2/highest.mp4' },
        },
      ],
      error: null,
    } as never);
    mockPlaybackIds.mockResolvedValue(['kept1', 'kept2']);
  });

  it('combines unmigrated metadata references and recorded playback ids', async () => {
    const ids = await getReferencedMuxPlaybackIds();
    expect([...ids].sort()).toEqual([
      'kept1',
      'kept2',
      'unmigrated1',
      'unmigrated2',
    ]);
  });

  it('throws when metadata cannot be read, so cleanup is skipped', async () => {
    mockMetadata.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    } as never);
    await expect(getReferencedMuxPlaybackIds()).rejects.toBeTruthy();
  });

  it('throws when playback ids cannot be read, so cleanup is skipped', async () => {
    mockPlaybackIds.mockRejectedValue(new Error('db down'));
    await expect(getReferencedMuxPlaybackIds()).rejects.toThrow('db down');
  });
});

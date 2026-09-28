import { describe, it, expect, vi, beforeEach } from 'vitest';
import createMuxUploadHandler from '../createMuxUploadHandler';

vi.mock('uuid', () => ({ v4: () => 'test-uuid' }));

vi.mock('@/lib/mux', () => ({
  default: {
    video: {
      uploads: { create: vi.fn() },
    },
  },
}));

import mux from '@/lib/mux';

const mockCreate = vi.mocked(mux.video.uploads.create);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createMuxUploadHandler', () => {
  it('returns uploadURL and uploadId', async () => {
    mockCreate.mockResolvedValue({
      url: 'https://upload.mux.com/url',
      id: 'upload-123',
    } as any);

    const res = await createMuxUploadHandler();
    const body = await res.json();

    expect(body.uploadURL).toBe('https://upload.mux.com/url');
    expect(body.uploadId).toBe('upload-123');
  });

  it('creates upload with correct settings', async () => {
    mockCreate.mockResolvedValue({
      url: 'https://upload.mux.com/url',
      id: 'upload-id',
    } as any);

    await createMuxUploadHandler();

    expect(mockCreate).toHaveBeenCalledWith({
      cors_origin: '*',
      new_asset_settings: {
        passthrough: 'test-uuid',
        playback_policy: ['public'],
        video_quality: 'basic',
        static_renditions: [{ resolution: 'highest' }],
        master_access: 'temporary',
      },
    });
  });
});

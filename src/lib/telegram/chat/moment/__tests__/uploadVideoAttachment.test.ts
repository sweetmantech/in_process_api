import { describe, it, expect, vi, beforeEach } from 'vitest';
import uploadVideoAttachment from '@/lib/telegram/chat/moment/uploadVideoAttachment';

vi.mock('@/lib/supabase/storage/uploadFileToSupabase', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/storage/uploadJsonToSupabase', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/mux/uploadVideoToMux', () => ({ default: vi.fn() }));
vi.mock('@/lib/telegram/chat/attachment/getTelegramFilePath', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/mux/fetchMuxThumbnail', () => ({ default: vi.fn() }));

import uploadFileToSupabase from '@/lib/supabase/storage/uploadFileToSupabase';
import uploadJsonToSupabase from '@/lib/supabase/storage/uploadJsonToSupabase';
import uploadVideoToMux from '@/lib/mux/uploadVideoToMux';
import getTelegramFilePath from '@/lib/telegram/chat/attachment/getTelegramFilePath';
import fetchMuxThumbnail from '@/lib/mux/fetchMuxThumbnail';

const BUFFER = Buffer.from('video data');
const THUMB_BUFFER = Buffer.from('thumb data');
const THUMB_URL =
  'https://supabase.co/storage/v1/object/public/bucket/thumb.jpg';
const META_URL =
  'https://supabase.co/storage/v1/object/public/bucket/meta.json';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTelegramFilePath).mockResolvedValue('videos/file.mp4');
  vi.mocked(uploadVideoToMux).mockResolvedValue({
    playbackUrl: 'https://stream.mux.com/abc.m3u8',
    downloadUrl: 'https://stream.mux.com/abc/highest.mp4',
  } as never);
  vi.mocked(fetchMuxThumbnail).mockResolvedValue(THUMB_BUFFER);
  vi.mocked(uploadFileToSupabase).mockResolvedValue(THUMB_URL);
  vi.mocked(uploadJsonToSupabase).mockResolvedValue(META_URL);
});

const makeAttachment = (overrides: Record<string, unknown> = {}) => ({
  type: 'video',
  fetchData: vi.fn().mockResolvedValue(BUFFER),
  ...overrides,
});

describe('uploadVideoAttachment', () => {
  it('throws when attachment has no fetchData', async () => {
    await expect(
      uploadVideoAttachment({ type: 'video' } as never, 'file-id', 'Video')
    ).rejects.toThrow('Attachment has no fetchData');
  });

  it('returns uri, mimeType, and mediaUri on success', async () => {
    const result = await uploadVideoAttachment(
      makeAttachment() as never,
      'file-id',
      'My Video'
    );

    expect(result).toEqual({
      uri: META_URL,
      mimeType: 'video/mp4',
      mediaUri: 'https://stream.mux.com/abc.m3u8',
    });
  });

  it('uses attachment.mimeType when provided', async () => {
    const result = await uploadVideoAttachment(
      makeAttachment({ mimeType: 'video/quicktime' }) as never,
      'file-id',
      'My Video'
    );

    expect(result.mimeType).toBe('video/quicktime');
  });

  describe('when the Mux thumbnail is available', () => {
    it('fetches the thumbnail for the Mux playback url', async () => {
      await uploadVideoAttachment(
        makeAttachment() as never,
        'file-id',
        'My Video'
      );
      expect(fetchMuxThumbnail).toHaveBeenCalledWith(
        'https://stream.mux.com/abc.m3u8'
      );
    });

    it('uploads the thumbnail to Supabase as a jpeg', async () => {
      await uploadVideoAttachment(
        makeAttachment() as never,
        'file-id',
        'My Video'
      );
      const uploadedFile = vi.mocked(uploadFileToSupabase).mock.calls[0][0];
      expect(uploadedFile.type).toBe('image/jpeg');
      expect(await uploadedFile.text()).toBe('thumb data');
    });

    it('includes image in metadata', async () => {
      await uploadVideoAttachment(
        makeAttachment() as never,
        'file-id',
        'My Video'
      );
      expect(uploadJsonToSupabase).toHaveBeenCalledWith(
        expect.objectContaining({ image: THUMB_URL })
      );
    });
  });

  describe('when the Mux thumbnail is unavailable', () => {
    beforeEach(() => {
      vi.mocked(fetchMuxThumbnail).mockResolvedValue(null);
    });

    it('does not upload any file to Supabase', async () => {
      await uploadVideoAttachment(
        makeAttachment() as never,
        'file-id',
        'My Video'
      );
      expect(uploadFileToSupabase).not.toHaveBeenCalled();
    });

    it('omits image from metadata', async () => {
      await uploadVideoAttachment(
        makeAttachment() as never,
        'file-id',
        'My Video'
      );
      const callArg = vi.mocked(uploadJsonToSupabase).mock
        .calls[0][0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('image');
    });
  });

  it('includes animation_url and content in metadata', async () => {
    await uploadVideoAttachment(
      makeAttachment() as never,
      'file-id',
      'My Video'
    );

    expect(uploadJsonToSupabase).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Video',
        animation_url: 'https://stream.mux.com/abc.m3u8',
        content: {
          mime: 'video/mp4',
          uri: 'https://stream.mux.com/abc/highest.mp4',
        },
      })
    );
  });
});

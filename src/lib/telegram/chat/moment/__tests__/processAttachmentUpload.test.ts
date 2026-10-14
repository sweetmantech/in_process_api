import { describe, it, expect, vi, beforeEach } from 'vitest';
import processAttachmentUpload from '@/lib/telegram/chat/moment/processAttachmentUpload';

vi.mock('../uploadPhotoAttachment', () => ({ default: vi.fn() }));
vi.mock('../uploadVideoAttachment', () => ({ default: vi.fn() }));
vi.mock('../uploadAudioAttachment', () => ({ default: vi.fn() }));

import uploadPhotoAttachment from '@/lib/telegram/chat/moment/uploadPhotoAttachment';
import uploadVideoAttachment from '@/lib/telegram/chat/moment/uploadVideoAttachment';
import uploadAudioAttachment from '@/lib/telegram/chat/moment/uploadAudioAttachment';

const PHOTO_RESULT = {
  uri: 'https://supabase.co/photo',
  mimeType: 'image/jpeg',
  mediaUri: 'https://supabase.co/photo',
};
const VIDEO_RESULT = {
  uri: 'https://supabase.co/meta',
  mimeType: 'video/mp4',
  mediaUri: 'https://mux.com/play',
};
const AUDIO_RESULT = {
  uri: 'https://supabase.co/meta',
  mimeType: 'audio/wav',
  mediaUri: 'https://supabase.co/track.wav',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(uploadPhotoAttachment).mockResolvedValue(PHOTO_RESULT);
  vi.mocked(uploadVideoAttachment).mockResolvedValue(VIDEO_RESULT);
  vi.mocked(uploadAudioAttachment).mockResolvedValue(AUDIO_RESULT);
});

describe('processAttachmentUpload', () => {
  it('calls uploadPhotoAttachment for image type', async () => {
    const attachment = { type: 'image', size: 500 };

    const result = await processAttachmentUpload(
      attachment as never,
      'file-id',
      'My Photo'
    );

    expect(uploadPhotoAttachment).toHaveBeenCalledWith(
      attachment,
      'file-id',
      'My Photo'
    );
    expect(uploadVideoAttachment).not.toHaveBeenCalled();
    expect(uploadAudioAttachment).not.toHaveBeenCalled();
    expect(result).toEqual(PHOTO_RESULT);
  });

  it('calls uploadVideoAttachment for video type', async () => {
    const attachment = { type: 'video', size: 1000 };

    const result = await processAttachmentUpload(
      attachment as never,
      'file-id',
      'My Video'
    );

    expect(uploadVideoAttachment).toHaveBeenCalledWith(
      attachment,
      'file-id',
      'My Video'
    );
    expect(uploadPhotoAttachment).not.toHaveBeenCalled();
    expect(uploadAudioAttachment).not.toHaveBeenCalled();
    expect(result).toEqual(VIDEO_RESULT);
  });

  it('calls uploadAudioAttachment for audio type', async () => {
    const attachment = { type: 'audio', size: 800 };

    const result = await processAttachmentUpload(
      attachment as never,
      'file-id',
      'My Track'
    );

    expect(uploadAudioAttachment).toHaveBeenCalledWith(
      attachment,
      'file-id',
      'My Track'
    );
    expect(uploadPhotoAttachment).not.toHaveBeenCalled();
    expect(uploadVideoAttachment).not.toHaveBeenCalled();
    expect(result).toEqual(AUDIO_RESULT);
  });

  it('rejects unsupported attachment types', async () => {
    await expect(
      processAttachmentUpload(
        { type: 'file', size: 200 } as never,
        'file-id',
        'Doc'
      )
    ).rejects.toThrow('Unsupported attachment type: file');
  });
});

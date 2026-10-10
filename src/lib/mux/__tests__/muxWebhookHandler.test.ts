import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/in_process_video_playback/upsertVideoPlayback', () => ({
  default: vi.fn(),
}));
vi.mock(
  '@/lib/supabase/in_process_video_playback/updateVideoPlaybackAspectRatio',
  () => ({ default: vi.fn() })
);

import muxWebhookHandler from '../muxWebhookHandler';
import upsertVideoPlayback from '@/lib/supabase/in_process_video_playback/upsertVideoPlayback';
import updateVideoPlaybackAspectRatio from '@/lib/supabase/in_process_video_playback/updateVideoPlaybackAspectRatio';

const mockUpsert = vi.mocked(upsertVideoPlayback);
const mockUpdateAspectRatio = vi.mocked(updateVideoPlaybackAspectRatio);
const MOMENT_ID = 'a0b24c4b-4c92-4eeb-b80e-082f8afde810';

const event = (type: string, passthrough?: string) =>
  ({
    type,
    data: {
      id: 'asset1',
      passthrough,
      playback_ids: [{ id: 'play1', policy: 'public' }],
      aspect_ratio: '9:16',
    },
  }) as never;

describe('muxWebhookHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    mockUpsert.mockResolvedValue({ error: null } as never);
    mockUpdateAspectRatio.mockResolvedValue({ error: null } as never);
  });

  it('marks an ingested moment video ready', async () => {
    const res = await muxWebhookHandler(
      event('video.asset.ready', `moment:${MOMENT_ID}`)
    );

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith({
      moment: MOMENT_ID,
      provider: 'mux',
      asset_id: 'asset1',
      playback_id: 'play1',
      aspect_ratio: '9:16',
      status: 'ready',
    });
  });

  it('marks an ingested moment video errored', async () => {
    await muxWebhookHandler(
      event('video.asset.errored', `moment:${MOMENT_ID}`)
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'errored' })
    );
  });

  it('logs why an ingested asset errored', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await muxWebhookHandler({
      type: 'video.asset.errored',
      data: {
        id: 'asset1',
        passthrough: `moment:${MOMENT_ID}`,
        errors: { type: 'invalid_input', messages: ['File is not a video'] },
      },
    } as never);

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        `errored moment=${MOMENT_ID} asset=asset1 playback=null reason="invalid_input: File is not a video"`
      )
    );
  });

  it('records the aspect ratio of a ready direct-upload asset', async () => {
    const res = await muxWebhookHandler(
      event('video.asset.ready', 'some-random-uuid')
    );
    expect(await res.json()).toEqual({ ok: true });
    expect(mockUpdateAspectRatio).toHaveBeenCalledWith('asset1', '9:16');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('ignores errored direct-upload assets', async () => {
    const res = await muxWebhookHandler(
      event('video.asset.errored', 'some-random-uuid')
    );
    expect(await res.json()).toEqual({ ignored: true });
    expect(mockUpdateAspectRatio).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('ignores ready direct-upload assets without an aspect ratio', async () => {
    const res = await muxWebhookHandler({
      type: 'video.asset.ready',
      data: { id: 'asset1', passthrough: 'some-random-uuid' },
    } as never);
    expect(await res.json()).toEqual({ ignored: true });
    expect(mockUpdateAspectRatio).not.toHaveBeenCalled();
  });

  it('throws when the direct-upload aspect ratio cannot be saved so Mux retries', async () => {
    mockUpdateAspectRatio.mockResolvedValue({
      error: { message: 'db down' },
    } as never);
    await expect(
      muxWebhookHandler(event('video.asset.ready', 'some-random-uuid'))
    ).rejects.toThrow('db down');
  });

  it('ignores other event types', async () => {
    const res = await muxWebhookHandler(
      event('video.asset.created', `moment:${MOMENT_ID}`)
    );
    expect(await res.json()).toEqual({ ignored: true });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('throws when the row cannot be updated so Mux retries', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'db down' } } as never);
    await expect(
      muxWebhookHandler(event('video.asset.ready', `moment:${MOMENT_ID}`))
    ).rejects.toThrow('db down');
  });
});

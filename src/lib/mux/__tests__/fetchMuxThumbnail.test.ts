import { describe, it, expect, vi, beforeEach } from 'vitest';
import fetchMuxThumbnail from '../fetchMuxThumbnail';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

describe('fetchMuxThumbnail', () => {
  it('fetches the first-frame thumbnail for the playback id', async () => {
    fetchMock.mockResolvedValue(new Response('jpeg bytes', { status: 200 }));

    const result = await fetchMuxThumbnail('https://stream.mux.com/pb-id.m3u8');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://image.mux.com/pb-id/thumbnail.jpg?time=0'
    );
    expect(result?.toString()).toBe('jpeg bytes');
  });

  it('returns null when the url is not a Mux playback url', async () => {
    const result = await fetchMuxThumbnail('https://example.com/video.mp4');

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null when Mux responds with an error', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }));

    expect(
      await fetchMuxThumbnail('https://stream.mux.com/pb-id.m3u8')
    ).toBeNull();
  });

  it('returns null when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'));

    expect(
      await fetchMuxThumbnail('https://stream.mux.com/pb-id.m3u8')
    ).toBeNull();
  });
});

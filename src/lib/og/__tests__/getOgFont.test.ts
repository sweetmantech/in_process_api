import { describe, it, expect, vi, beforeEach } from 'vitest';
import getOgFont from '@/lib/og/getOgFont';
import { SITE_ORIGINAL_URL } from '@/lib/consts';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

describe('getOgFont', () => {
  it('fetches the font file from the site fonts folder', async () => {
    fetchMock.mockResolvedValue(new Response('font'));

    const font = await getOgFont('Spectral-Italic.ttf');

    expect(fetchMock).toHaveBeenCalledWith(
      `${SITE_ORIGINAL_URL}/fonts/Spectral-Italic.ttf`
    );
    expect(font.byteLength).toBe(4);
  });

  it('throws when the font cannot be fetched', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 404 }));

    await expect(getOgFont('Missing.ttf')).rejects.toThrow('Missing.ttf');
  });
});

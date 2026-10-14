import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/og/getBase64Image', () => ({ default: vi.fn() }));
vi.mock('@/lib/arweave/fetchUri', () => ({ default: vi.fn() }));

import getBase64Image from '@/lib/og/getBase64Image';
import fetchUri from '@/lib/arweave/fetchUri';
import getOgMomentCard from '@/lib/og/getOgMomentCard';
import { MomentType } from '@/types/moment';

const moment = (mime: string, image = 'ar://img') =>
  ({
    metadata: {
      name: 'Fragmentos',
      image,
      content: { mime, uri: 'ar://content' },
    },
    sale: { pricePerToken: '10000000', type: MomentType.Erc20Mint },
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBase64Image).mockResolvedValue('data:image/jpeg;base64,x');
});

describe('getOgMomentCard', () => {
  it('builds a card with the image, name and video flag', async () => {
    const card = await getOgMomentCard(moment('video/mp4'));

    expect(card).toEqual({
      name: 'Fragmentos',
      isVideo: true,
      image: 'data:image/jpeg;base64,x',
      text: null,
    });
    expect(getBase64Image).toHaveBeenCalledWith('ar://img', 244, 376);
  });

  it('falls back to a text excerpt for writing without a preview image', async () => {
    vi.mocked(getBase64Image).mockResolvedValue(null);
    vi.mocked(fetchUri).mockResolvedValue(new Response('hello world'));

    const card = await getOgMomentCard(moment('text/plain'));

    expect(fetchUri).toHaveBeenCalledWith('ar://content');
    expect(card.text).toBe('hello world');
  });

  it('does not fetch text when the image is available', async () => {
    await getOgMomentCard(moment('text/plain'));

    expect(fetchUri).not.toHaveBeenCalled();
  });
});

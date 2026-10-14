import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    __ogOpts: { width: number; height: number };
    status = 200;
    constructor(
      _el: unknown,
      opts: { width: number; height: number; fonts?: unknown[] }
    ) {
      this.__ogOpts = { width: opts.width, height: opts.height };
    }
  },
}));

vi.mock('@/lib/supabase/in_process_moments/getArtistTimeline', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/artists/getArtistProfile', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/stats/getTimelineStats', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/og/getOgFonts', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/og/getOgMomentCard', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/og/getOgFont', () => ({
  default: vi.fn().mockResolvedValue(new ArrayBuffer(3)),
}));

import { ImageResponse } from 'next/og';
import getArtistTimeline from '@/lib/supabase/in_process_moments/getArtistTimeline';
import getArtistProfile from '@/lib/artists/getArtistProfile';
import getTimelineStats from '@/lib/stats/getTimelineStats';
import getOgFonts from '@/lib/og/getOgFonts';
import getOgMomentCard from '@/lib/og/getOgMomentCard';
import getOgArtistHandler from '@/lib/og/getOgArtistHandler';
import { OG_HEIGHT, OG_WIDTH } from '@/lib/og/consts';

const ARTIST = '0x00000000000000000000000000000000000000AB' as const;
const CHAIN_ID = 8453;

const mockTimeline = vi.mocked(getArtistTimeline);
const mockGetOgMomentCard = vi.mocked(getOgMomentCard);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOgFonts).mockResolvedValue({
    archivo: new ArrayBuffer(1),
    spectral: new ArrayBuffer(2),
  });
  vi.mocked(getArtistProfile).mockResolvedValue({
    username: 'alice',
    bio: 'bio',
  } as any);
  vi.mocked(getTimelineStats).mockResolvedValue({
    created_count: 3,
    eth_archived: '0.04',
    usdc_archived: '381',
  });
  mockTimeline.mockResolvedValue({
    data: { moments: [], pagination: {} },
    error: null,
  } as any);
  mockGetOgMomentCard.mockResolvedValue({
    name: 'm',
    isVideo: false,
    image: null,
    text: null,
  });
});

describe('getOgArtistHandler', () => {
  it('returns ImageResponse sized for OG artist card', async () => {
    const res = await getOgArtistHandler({
      artistAddress: ARTIST,
      chainId: CHAIN_ID,
    });

    expect(res).toBeInstanceOf(ImageResponse);
    expect(res).toMatchObject({
      status: 200,
      __ogOpts: { width: OG_WIDTH, height: OG_HEIGHT },
    });
  });

  it('loads the latest three moments for the lowercased artist and chainId', async () => {
    await getOgArtistHandler({ artistAddress: ARTIST, chainId: CHAIN_ID });

    expect(mockTimeline).toHaveBeenCalledWith({
      artist: ARTIST.toLowerCase(),
      limit: 3,
      chainId: CHAIN_ID,
    });
  });

  it('builds a card for each moment', async () => {
    const moments = [{ id: '1' }, { id: '2' }];
    mockTimeline.mockResolvedValue({
      data: { moments, pagination: {} },
      error: null,
    } as any);

    await getOgArtistHandler({ artistAddress: ARTIST, chainId: CHAIN_ID });

    expect(mockGetOgMomentCard).toHaveBeenCalledTimes(2);
    expect(mockGetOgMomentCard.mock.calls[0][0]).toBe(moments[0]);
  });

  it('throws when the timeline query fails instead of rendering an empty card', async () => {
    mockTimeline.mockResolvedValue({
      data: null,
      error: new Error('statement timeout'),
    });

    await expect(
      getOgArtistHandler({ artistAddress: ARTIST, chainId: CHAIN_ID })
    ).rejects.toThrow('statement timeout');
  });

  it('loads profile and stats with the lowercased artist address', async () => {
    await getOgArtistHandler({ artistAddress: ARTIST, chainId: CHAIN_ID });

    expect(getArtistProfile).toHaveBeenCalledWith(ARTIST.toLowerCase());
    expect(getTimelineStats).toHaveBeenCalledWith(ARTIST.toLowerCase());
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/supabase/in_process_moments/getInProcessTimeline', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_moments/getArtistTimeline', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_moments/getCollectionTimeline', () => ({
  default: vi.fn(),
}));

import getInProcessTimeline from '@/lib/supabase/in_process_moments/getInProcessTimeline';
import getArtistTimeline from '@/lib/supabase/in_process_moments/getArtistTimeline';
import getCollectionTimeline from '@/lib/supabase/in_process_moments/getCollectionTimeline';
import getTimelineHandler from '@/lib/timeline/getTimelineHandler';

const BASE_PARAMS = {
  limit: 10,
  page: 1,
  chainId: null as number | null,
  hidden: false,
  mime: undefined as string | undefined,
  period: undefined as string | undefined,
  channel: undefined as string | undefined,
  collection: undefined as string | undefined,
  artist: undefined as string | undefined,
  type: undefined as 'mutual' | 'default' | undefined,
  protocol: undefined as string | undefined,
  curated: false,
};

const MOCK_DATA = {
  moments: [{ id: '1' }],
  pagination: { total: 1, page: 1, limit: 10 },
};

describe('getTimelineHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collection timeline', () => {
    it('calls getCollectionTimeline and returns success', async () => {
      vi.mocked(getCollectionTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      const res = await getTimelineHandler({
        ...BASE_PARAMS,
        collection: '0xcollection',
      });
      const json = await res.json();

      expect(getCollectionTimeline).toHaveBeenCalledOnce();
      expect(getArtistTimeline).not.toHaveBeenCalled();
      expect(getInProcessTimeline).not.toHaveBeenCalled();
      expect(json.status).toBe('success');
      expect(json.moments).toEqual(MOCK_DATA.moments);
      expect(json.pagination).toEqual(MOCK_DATA.pagination);
    });

    it('passes mime to getCollectionTimeline', async () => {
      vi.mocked(getCollectionTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({
        ...BASE_PARAMS,
        collection: '0xcollection',
        mime: 'audio/%',
      });

      expect(getCollectionTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ mime: 'audio/%' })
      );
    });

    it('passes curated to getCollectionTimeline', async () => {
      vi.mocked(getCollectionTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({
        ...BASE_PARAMS,
        collection: '0xcollection',
        curated: true,
      });

      expect(getCollectionTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ curated: true })
      );
    });

    it('returns 500 on DB error', async () => {
      vi.mocked(getCollectionTimeline).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      });

      const res = await getTimelineHandler({
        ...BASE_PARAMS,
        collection: '0xcollection',
      });

      expect(res).toBeInstanceOf(NextResponse);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.status).toBe('error');
    });

    it('returns 500 when data is null', async () => {
      vi.mocked(getCollectionTimeline).mockResolvedValue({
        data: null,
        error: null,
      });

      const res = await getTimelineHandler({
        ...BASE_PARAMS,
        collection: '0xcollection',
      });

      expect(res.status).toBe(500);
    });
  });

  describe('artist timeline', () => {
    it('calls getArtistTimeline and returns success', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      const res = await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
      });
      const json = await res.json();

      expect(getArtistTimeline).toHaveBeenCalledOnce();
      expect(getCollectionTimeline).not.toHaveBeenCalled();
      expect(getInProcessTimeline).not.toHaveBeenCalled();
      expect(json.status).toBe('success');
    });

    it('passes mime to getArtistTimeline', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
        mime: 'video/%',
      });

      expect(getArtistTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ mime: 'video/%' })
      );
    });

    it('passes type to getArtistTimeline', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
        type: 'mutual',
      });

      expect(getArtistTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'mutual' })
      );
    });

    it('passes protocol to getArtistTimeline', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
        protocol: 'in_process',
      });

      expect(getArtistTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ protocol: 'in_process' })
      );
    });

    it('passes curated to getArtistTimeline', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
        curated: true,
      });

      expect(getArtistTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ curated: true })
      );
    });

    it('returns 500 on DB error', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      });

      const res = await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
      });

      expect(res.status).toBe(500);
    });

    it('returns 500 when data is null', async () => {
      vi.mocked(getArtistTimeline).mockResolvedValue({
        data: null,
        error: null,
      });

      const res = await getTimelineHandler({
        ...BASE_PARAMS,
        artist: '0xartist',
      });

      expect(res.status).toBe(500);
    });
  });

  describe('in-process (global) timeline', () => {
    it('calls getInProcessTimeline and returns success', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      const res = await getTimelineHandler(BASE_PARAMS);
      const json = await res.json();

      expect(getInProcessTimeline).toHaveBeenCalledOnce();
      expect(getArtistTimeline).not.toHaveBeenCalled();
      expect(getCollectionTimeline).not.toHaveBeenCalled();
      expect(json.status).toBe('success');
    });

    it('passes mime to getInProcessTimeline', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({ ...BASE_PARAMS, mime: 'image/%' });

      expect(getInProcessTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ mime: 'image/%' })
      );
    });

    it('passes curated=false by default', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler(BASE_PARAMS);

      expect(getInProcessTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ curated: false })
      );
    });

    it('passes curated=true when specified', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      await getTimelineHandler({ ...BASE_PARAMS, curated: true });

      expect(getInProcessTimeline).toHaveBeenCalledWith(
        expect.objectContaining({ curated: true })
      );
    });

    it('returns 500 on DB error', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      });

      const res = await getTimelineHandler(BASE_PARAMS);

      expect(res.status).toBe(500);
      expect(res.headers.get('Vercel-CDN-Cache-Control')).toBeNull();
      expect(res.headers.get('Vercel-Cache-Tag')).toBeNull();
    });

    it('returns 500 when data is null', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: null,
        error: null,
      });

      const res = await getTimelineHandler(BASE_PARAMS);

      expect(res.status).toBe(500);
    });

    it('sets CDN cache headers on success', async () => {
      vi.mocked(getInProcessTimeline).mockResolvedValue({
        data: MOCK_DATA as any,
        error: null,
      });

      const res = await getTimelineHandler(BASE_PARAMS);

      expect(res.headers.get('Vercel-CDN-Cache-Control')).toBe(
        'max-age=60, stale-while-revalidate=300'
      );
      expect(res.headers.get('Vercel-Cache-Tag')).toBe('timeline');
    });
  });
});

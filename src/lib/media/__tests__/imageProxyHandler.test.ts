import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import imageProxyHandler from '@/lib/media/imageProxyHandler';
import { MEDIA_CACHE_TTL_DAYS } from '@/lib/media/mediaCacheConsts';

vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    autoOrient: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    avif: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-data')),
  }));
  return { default: mockSharp };
});

vi.mock('@/lib/arweave/fetchUri');
vi.mock('@/lib/media/resolveMediaCacheUrl', () => ({
  default: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/media/writeMediaCache', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

import fetchUri from '@/lib/arweave/fetchUri';
import resolveMediaCacheUrl from '@/lib/media/resolveMediaCacheUrl';
import writeMediaCache from '@/lib/media/writeMediaCache';

describe('imageProxyHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveMediaCacheUrl).mockResolvedValue(null);
  });

  it('should return processed image with default format (webp)', async () => {
    vi.mocked(fetchUri).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    } as Response);

    const result = await imageProxyHandler({
      url: 'https://example.com/image.jpg',
      width: 800,
      height: undefined,
      quality: 80,
      format: 'webp',
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('image/webp');
    expect(result.headers.get('Cache-Control')).toBe(
      `public, max-age=${MEDIA_CACHE_TTL_DAYS * 24 * 60 * 60}`
    );
    expect(writeMediaCache).toHaveBeenCalled();
    await Promise.resolve();
  });

  it('should redirect when media cache hits', async () => {
    vi.mocked(resolveMediaCacheUrl).mockResolvedValue(
      'https://example.supabase.co/storage/v1/object/public/in_process_files/media-cache/abc.webp'
    );

    const result = await imageProxyHandler({
      url: 'https://example.com/image.jpg',
      width: 420,
      height: undefined,
      quality: 75,
      format: 'webp',
    });

    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toContain('media-cache/abc.webp');
    expect(fetchUri).not.toHaveBeenCalled();
  });

  it('should return avif format when requested', async () => {
    vi.mocked(fetchUri).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    } as Response);

    const result = await imageProxyHandler({
      url: 'https://example.com/image.jpg',
      width: undefined,
      height: undefined,
      quality: 75,
      format: 'avif',
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('image/avif');
  });

  it('should return jpeg format when requested', async () => {
    vi.mocked(fetchUri).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    } as Response);

    const result = await imageProxyHandler({
      url: 'https://example.com/image.jpg',
      width: 400,
      height: 300,
      quality: 90,
      format: 'jpeg',
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('image/jpeg');
  });

  it('should return png format when requested', async () => {
    vi.mocked(fetchUri).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    } as Response);

    const result = await imageProxyHandler({
      url: 'https://example.com/image.png',
      width: undefined,
      height: undefined,
      quality: 80,
      format: 'png',
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('image/png');
  });

  it('should return error when fetch fails with 404', async () => {
    vi.mocked(fetchUri).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const result = await imageProxyHandler({
      url: 'https://example.com/notfound.jpg',
      width: undefined,
      height: undefined,
      quality: 80,
      format: 'webp',
    });

    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(404);
  });

  it('should return error when fetch fails with 500', async () => {
    vi.mocked(fetchUri).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await imageProxyHandler({
      url: 'https://example.com/error.jpg',
      width: undefined,
      height: undefined,
      quality: 80,
      format: 'webp',
    });

    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(500);
  });

  it('should process ICO favicon bytes fetched from ar://', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const ico = Buffer.alloc(6 + 16 + png.length);
    ico.writeUInt16LE(0, 0);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico.writeUInt8(16, 6);
    ico.writeUInt8(16, 7);
    ico.writeUInt32LE(png.length, 14);
    ico.writeUInt32LE(22, 18);
    png.copy(ico, 22);

    vi.mocked(fetchUri).mockResolvedValue({
      ok: true,
      arrayBuffer: () =>
        Promise.resolve(
          ico.buffer.slice(ico.byteOffset, ico.byteOffset + ico.byteLength)
        ),
    } as Response);

    const result = await imageProxyHandler({
      url: 'ar://58qRiy_HS-hFRDLFJcxZkoeO2GT_m1Ig2ZCk4ndzjpI',
      width: 420,
      height: undefined,
      quality: 75,
      format: 'webp',
    });

    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Type')).toBe('image/webp');
  });
});

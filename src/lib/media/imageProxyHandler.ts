import { NextResponse } from 'next/server';
import sharp from 'sharp';
import fetchUri from '@/lib/arweave/fetchUri';
import prepareImageBufferForSharp from '@/lib/media/prepareImageBufferForSharp';
import buildMediaCacheHash from '@/lib/media/buildMediaCacheHash';
import buildMediaCachePath from '@/lib/media/buildMediaCachePath';
import fetchMediaCache from '@/lib/media/fetchMediaCache';
import writeMediaCache from '@/lib/media/writeMediaCache';

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

const imageProxyHandler = async ({
  url,
  width,
  height,
  quality,
  format,
}: {
  url: string;
  width?: number;
  height?: number;
  quality: number;
  format: 'webp' | 'avif' | 'jpeg' | 'png';
}) => {
  const hash = buildMediaCacheHash([url, width, height, quality, format]);
  const path = buildMediaCachePath(hash, format);
  const cached = await fetchMediaCache(path);
  if (cached) {
    return new Response(cached.body, {
      status: 200,
      headers: {
        'Content-Type': CONTENT_TYPES[format],
        'Cache-Control': CACHE_CONTROL,
      },
    });
  }

  const response = await fetchUri(url);

  if (!response.ok) {
    return NextResponse.json(
      { status: 'error', message: `Failed to fetch image: ${response.status}` },
      { status: response.status }
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const sharpInput = await prepareImageBufferForSharp(buffer);

  let pipeline = sharp(sharpInput).autoOrient();

  if (width || height) {
    pipeline = pipeline.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality });
      break;
    case 'png':
      pipeline = pipeline.png({ quality });
      break;
  }

  const outputBuffer = await pipeline.toBuffer();
  const contentType = CONTENT_TYPES[format];

  // Best-effort: do not delay first paint waiting on Storage upload
  void writeMediaCache({
    hash,
    path,
    kind: 'image',
    buffer: outputBuffer,
    contentType,
  });

  return new Response(new Uint8Array(outputBuffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': outputBuffer.length.toString(),
      'Cache-Control': CACHE_CONTROL,
    },
  });
};

export default imageProxyHandler;

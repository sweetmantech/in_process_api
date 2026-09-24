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

vi.mock('@/lib/supabase/in_process_collections/selectCollections', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/moment/resolveMomentInfo', () => ({
  resolveMomentInfo: vi.fn(),
}));
vi.mock('@/lib/protocolSdk/ipfs/token-metadata', () => ({
  fetchTokenMetadata: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_metadata/selectMetadata', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/arweave/getMimeType', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/metadata/normalizeMetadata', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/og/getOgFonts', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/og/getWritingData', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/og/getMomentPreview', () => ({
  default: vi.fn(),
}));

import { ImageResponse } from 'next/og';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import { resolveMomentInfo } from '@/lib/moment/resolveMomentInfo';
import { fetchTokenMetadata } from '@/lib/protocolSdk/ipfs/token-metadata';
import normalizeMetadata from '@/lib/metadata/normalizeMetadata';
import selectMetadata from '@/lib/supabase/in_process_metadata/selectMetadata';
import getMimeType from '@/lib/arweave/getMimeType';
import getOgFonts from '@/lib/og/getOgFonts';
import getWritingData from '@/lib/og/getWritingData';
import getMomentPreview from '@/lib/og/getMomentPreview';
import getOgMomentHandler from '@/lib/og/getOgMomentHandler';
import { OG_HEIGHT, OG_WIDTH } from '@/lib/og/consts';

const COLLECTION = '0x0000000000000000000000000000000000000001' as const;

const mockSelectCollections = vi.mocked(selectCollections);
const mockResolveMomentInfo = vi.mocked(resolveMomentInfo);
const mockFetchTokenMetadata = vi.mocked(fetchTokenMetadata);
const mockNormalizeMetadata = vi.mocked(normalizeMetadata);
const mockGetOgFonts = vi.mocked(getOgFonts);
const mockGetWritingData = vi.mocked(getWritingData);
const mockGetMomentPreview = vi.mocked(getMomentPreview);
const mockSelectMetadata = vi.mocked(selectMetadata);
const mockGetMimeType = vi.mocked(getMimeType);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOgFonts.mockResolvedValue({
    archivo: new ArrayBuffer(1),
    spectral: new ArrayBuffer(2),
  });
});

describe('getOgMomentHandler', () => {
  it('returns ImageResponse sized for OG moment card', async () => {
    mockSelectCollections.mockResolvedValue([
      { protocol: 'in_process', uri: 'col-uri' },
    ] as never);
    mockResolveMomentInfo.mockResolvedValue({ uri: 'moment-uri' } as never);
    mockFetchTokenMetadata.mockResolvedValue({ name: 'm' } as never);
    mockNormalizeMetadata.mockResolvedValue({
      image: 'https://example.com/img.jpg',
      content: { mime: 'image/jpeg' },
    } as never);
    mockGetMomentPreview.mockResolvedValue({
      orientation: 1,
      originalWidth: 100,
      originalHeight: 100,
      shouldRotate: false,
      previewUrl: 'data:image/jpeg;base64,',
    });

    const res = await getOgMomentHandler({
      collectionAddress: COLLECTION,
      tokenId: '1',
      chainId: 8453,
    });

    expect(res).toBeInstanceOf(ImageResponse);
    expect(res).toMatchObject({
      status: 200,
      __ogOpts: { width: OG_WIDTH, height: OG_HEIGHT },
    });
    expect(mockGetMomentPreview).toHaveBeenCalledWith(
      'https://example.com/img.jpg'
    );
    expect(mockGetWritingData).not.toHaveBeenCalled();
  });

  it('uses writing branch for text/plain content', async () => {
    mockSelectCollections.mockResolvedValue([
      { protocol: 'in_process', uri: 'col-uri' },
    ] as never);
    mockResolveMomentInfo.mockResolvedValue({ uri: 'meta-uri' } as never);
    mockFetchTokenMetadata.mockResolvedValue({} as never);
    mockNormalizeMetadata.mockResolvedValue({
      content: { mime: 'text/plain', uri: 'https://example.com/body.txt' },
    } as never);
    mockGetWritingData.mockResolvedValue({
      writingText: 'hello',
      totalLines: 2,
    });

    await getOgMomentHandler({
      collectionAddress: COLLECTION,
      tokenId: '2',
      chainId: 8453,
    });

    expect(mockGetWritingData).toHaveBeenCalledWith(
      'https://example.com/body.txt'
    );
    expect(mockGetMomentPreview).not.toHaveBeenCalled();
  });

  it('uses collection uri for tokenId 0 without resolveMomentInfo', async () => {
    mockSelectCollections.mockResolvedValue([
      { protocol: 'in_process', uri: 'edition-meta-uri' },
    ] as never);
    mockFetchTokenMetadata.mockResolvedValue({} as never);
    mockNormalizeMetadata.mockResolvedValue({
      image: 'https://example.com/cover.jpg',
      content: { mime: 'image/jpeg' },
    } as never);
    mockGetMomentPreview.mockResolvedValue({
      orientation: 1,
      originalWidth: 10,
      originalHeight: 10,
      shouldRotate: false,
      previewUrl: 'data:',
    });

    await getOgMomentHandler({
      collectionAddress: COLLECTION,
      tokenId: '0',
      chainId: 8453,
    });

    expect(mockResolveMomentInfo).not.toHaveBeenCalled();
    expect(mockFetchTokenMetadata).toHaveBeenCalledWith(
      'edition-meta-uri',
      undefined
    );
  });

  it('rewrites ar:// image to Irys gateway when collection is catalog', async () => {
    mockSelectCollections.mockResolvedValue([
      { protocol: 'catalog', uri: 'col-uri' },
    ] as never);
    mockResolveMomentInfo.mockResolvedValue({ uri: 'moment-uri' } as never);
    mockFetchTokenMetadata.mockResolvedValue({} as never);
    mockNormalizeMetadata.mockResolvedValue({
      image: 'ar://tx123',
      content: { mime: 'image/png' },
    } as never);
    mockGetMomentPreview.mockResolvedValue({
      orientation: 1,
      originalWidth: 1,
      originalHeight: 1,
      shouldRotate: false,
      previewUrl: 'data:',
    });

    await getOgMomentHandler({
      collectionAddress: COLLECTION,
      tokenId: '1',
      chainId: 8453,
    });

    expect(mockFetchTokenMetadata).toHaveBeenCalledWith(
      'moment-uri',
      'https://gateway.irys.xyz/mutable/'
    );
    expect(mockGetMomentPreview).toHaveBeenCalledWith(
      'https://gateway.irys.xyz/mutable/tx123'
    );
  });

  it('uses indexed metadata content uri when metadata has no image', async () => {
    mockSelectCollections.mockResolvedValue([
      { protocol: 'zora_media', uri: 'col-uri' },
    ] as never);
    mockResolveMomentInfo.mockResolvedValue({
      id: 'moment-id',
      uri: 'moment-uri',
      contentUri: null,
    } as never);
    const cached = { content: { mime: 'image/jpeg', uri: 'ipfs://content' } };
    mockSelectMetadata.mockResolvedValue(cached as never);
    mockNormalizeMetadata.mockResolvedValue(cached as never);
    mockGetMomentPreview.mockResolvedValue({
      orientation: 1,
      originalWidth: 1,
      originalHeight: 1,
      shouldRotate: false,
      previewUrl: 'data:',
    });

    await getOgMomentHandler({
      collectionAddress: COLLECTION,
      tokenId: '1',
      chainId: 1,
    });

    expect(mockSelectMetadata).toHaveBeenCalledWith('moment-id');
    expect(mockFetchTokenMetadata).not.toHaveBeenCalled();
    expect(mockGetMomentPreview).toHaveBeenCalledWith('ipfs://content');
  });

  it('uses on-chain content uri for unindexed zora media moments', async () => {
    mockSelectCollections.mockResolvedValue([] as never);
    mockResolveMomentInfo.mockResolvedValue({
      id: null,
      uri: 'moment-uri',
      contentUri: 'ipfs://onchain',
    } as never);
    mockFetchTokenMetadata.mockResolvedValue({ name: 'm' } as never);
    mockNormalizeMetadata.mockResolvedValue({ name: 'm' } as never);
    mockGetMimeType.mockResolvedValue('image/png');
    mockGetMomentPreview.mockResolvedValue({
      orientation: 1,
      originalWidth: 1,
      originalHeight: 1,
      shouldRotate: false,
      previewUrl: 'data:',
    });

    await getOgMomentHandler({
      collectionAddress: COLLECTION,
      tokenId: '1',
      chainId: 1,
    });

    expect(mockSelectMetadata).not.toHaveBeenCalled();
    expect(mockGetMomentPreview).toHaveBeenCalledWith('ipfs://onchain');
  });

  it('throws when tokenId is 0 and collection is missing', async () => {
    mockSelectCollections.mockResolvedValue([] as never);

    await expect(
      getOgMomentHandler({
        collectionAddress: COLLECTION,
        tokenId: '0',
        chainId: 8453,
      })
    ).rejects.toThrow('no collection');
  });
});

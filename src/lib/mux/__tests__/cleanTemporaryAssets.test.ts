import { describe, it, expect, vi, beforeEach } from 'vitest';
import cleanTemporaryAssets from '../cleanTemporaryAssets';

vi.mock('@/lib/mux', () => ({
  default: {
    video: {
      assets: {
        list: vi.fn(),
        delete: vi.fn(),
      },
    },
  },
}));

vi.mock('../getReferencedMuxPlaybackIds', () => ({
  default: vi.fn(async () => new Set<string>()),
}));

import mux from '@/lib/mux';
import getReferencedMuxPlaybackIds from '../getReferencedMuxPlaybackIds';

const mockList = vi.mocked(mux.video.assets.list);
const mockDelete = vi.mocked(mux.video.assets.delete);
const mockGetReferencedMuxPlaybackIds = vi.mocked(getReferencedMuxPlaybackIds);

const nowEpoch = 1_700_000_000_000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const makeAssetTs = (offsetMs: number) =>
  String(Math.floor((nowEpoch + offsetMs) / 1000));

const makeAsyncIterable = (items: object[]) => ({
  [Symbol.asyncIterator]: async function* () {
    for (const item of items) yield item;
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.setSystemTime(nowEpoch);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cleanTemporaryAssets', () => {
  it('deletes assets older than 1 hour', async () => {
    mockList.mockReturnValue(
      makeAsyncIterable([
        { id: 'old-asset', created_at: makeAssetTs(-ONE_HOUR_MS - 1) },
      ]) as any
    );
    mockDelete.mockResolvedValue(undefined as any);

    await cleanTemporaryAssets();

    expect(mockDelete).toHaveBeenCalledWith('old-asset');
  });

  it('does not delete assets newer than 1 hour', async () => {
    mockList.mockReturnValue(
      makeAsyncIterable([
        { id: 'new-asset', created_at: makeAssetTs(-ONE_HOUR_MS + 60_000) },
      ]) as any
    );

    await cleanTemporaryAssets();

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes only old assets when mixed', async () => {
    mockList.mockReturnValue(
      makeAsyncIterable([
        { id: 'old-asset', created_at: makeAssetTs(-ONE_HOUR_MS - 1) },
        { id: 'new-asset', created_at: makeAssetTs(-ONE_HOUR_MS + 60_000) },
      ]) as any
    );
    mockDelete.mockResolvedValue(undefined as any);

    await cleanTemporaryAssets();

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDelete).toHaveBeenCalledWith('old-asset');
  });

  it('does not throw when asset list fails', async () => {
    mockList.mockImplementation(() => {
      throw new Error('API error');
    });

    await expect(cleanTemporaryAssets()).resolves.toBeUndefined();
  });

  it('does not delete an old asset still referenced by unmigrated moment metadata', async () => {
    mockGetReferencedMuxPlaybackIds.mockResolvedValue(
      new Set(['referenced-playback-id'])
    );
    mockList.mockReturnValue(
      makeAsyncIterable([
        {
          id: 'old-but-referenced-asset',
          created_at: makeAssetTs(-ONE_HOUR_MS - 1),
          playback_ids: [{ id: 'referenced-playback-id', policy: 'public' }],
        },
      ]) as any
    );

    await cleanTemporaryAssets();

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('deletes an old asset whose playback id is not referenced', async () => {
    mockGetReferencedMuxPlaybackIds.mockResolvedValue(
      new Set(['some-other-playback-id'])
    );
    mockList.mockReturnValue(
      makeAsyncIterable([
        {
          id: 'old-unreferenced-asset',
          created_at: makeAssetTs(-ONE_HOUR_MS - 1),
          playback_ids: [{ id: 'unreferenced-playback-id', policy: 'public' }],
        },
      ]) as any
    );
    mockDelete.mockResolvedValue(undefined as any);

    await cleanTemporaryAssets();

    expect(mockDelete).toHaveBeenCalledWith('old-unreferenced-asset');
  });
});

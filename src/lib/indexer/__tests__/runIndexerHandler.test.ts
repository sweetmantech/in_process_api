import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/indexer/executeIndexers', () => ({ executeIndexers: vi.fn() }));
vi.mock('@/lib/indexer/indexers', () => ({ indexers: [] }));
vi.mock('@/lib/redis/loadCachedTimestamps', () => ({ default: vi.fn() }));
vi.mock('@/lib/redis/saveCachedTimestamps', () => ({ default: vi.fn() }));
vi.mock('@/lib/sleep', () => ({ default: vi.fn() }));
vi.mock('@/lib/timeline/invalidateTimelineCache', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/timeline/getTimelineTotalCount', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/timeline/timelineCache', () => ({
  HOME_TIMELINE_COUNT_PARAMS: { chainId: null, hidden: false, curated: true },
}));
vi.mock('@/lib/consts', () => ({
  INDEX_INTERVAL_MS: 500,
  INDEX_INTERVAL_EMPTY_MS: 1000,
}));

import { executeIndexers } from '@/lib/indexer/executeIndexers';
import { indexers } from '@/lib/indexer/indexers';
import loadCachedTimestamps from '@/lib/redis/loadCachedTimestamps';
import saveCachedTimestamps from '@/lib/redis/saveCachedTimestamps';
import sleep from '@/lib/sleep';
import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';
import getTimelineTotalCount from '@/lib/timeline/getTimelineTotalCount';
import runIndexerHandler from '../runIndexerHandler';

const mockIndexers = indexers as any[];

const makeIndexer = (name: string, maxTs: number) => ({
  indexName: name,
  selectMaxTimestampFn: vi.fn().mockResolvedValue(maxTs),
});

// maxDurationSeconds=1 → deadline = now + 1000 - 2000 = now - 1000 (past) → loop never runs.
const NO_LOOP_DURATION = 1;

// Advances fake time past deadline on first sleep call so the loop runs exactly once.
const advancePastDeadline = (maxDurationSeconds: number) => {
  vi.mocked(sleep).mockImplementationOnce(async () => {
    vi.setSystemTime(Date.now() + maxDurationSeconds * 1000);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockIndexers.length = 0;
  vi.mocked(saveCachedTimestamps).mockResolvedValue(undefined);
  vi.mocked(executeIndexers).mockResolvedValue(false);
  vi.mocked(sleep).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('runIndexerHandler', () => {
  describe('timestamp bootstrap', () => {
    it('uses cached timestamps from Redis without saving when cache exists', async () => {
      vi.mocked(loadCachedTimestamps).mockResolvedValue({ moments: 9000 });

      await runIndexerHandler(NO_LOOP_DURATION);

      expect(saveCachedTimestamps).not.toHaveBeenCalled();
    });

    it('calls selectMaxTimestampFn for each indexer when cache is empty', async () => {
      vi.mocked(loadCachedTimestamps).mockResolvedValue(null);
      const indexer = makeIndexer('moments', 7777);
      mockIndexers.push(indexer);

      await runIndexerHandler(NO_LOOP_DURATION);

      expect(indexer.selectMaxTimestampFn).toHaveBeenCalledOnce();
    });

    it('saves bootstrapped timestamps to Redis', async () => {
      vi.mocked(loadCachedTimestamps).mockResolvedValue(null);
      mockIndexers.push(makeIndexer('moments', 7777));

      await runIndexerHandler(NO_LOOP_DURATION);

      expect(saveCachedTimestamps).toHaveBeenCalledWith(
        expect.objectContaining({ moments: 7777 })
      );
    });

    it('bootstraps multiple indexers independently', async () => {
      vi.mocked(loadCachedTimestamps).mockResolvedValue(null);
      const a = makeIndexer('moments', 1111);
      const b = makeIndexer('sales', 2222);
      mockIndexers.push(a, b);

      await runIndexerHandler(NO_LOOP_DURATION);

      expect(saveCachedTimestamps).toHaveBeenCalledWith(
        expect.objectContaining({ moments: 1111, sales: 2222 })
      );
    });
  });

  describe('run loop', () => {
    const DURATION = 5;

    beforeEach(() => {
      vi.mocked(loadCachedTimestamps).mockResolvedValue({ moments: 5000 });
    });

    it('calls executeIndexers once before deadline is reached', async () => {
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(executeIndexers).toHaveBeenCalledOnce();
    });

    it('saves timestamps after a cycle that returned data', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(true);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(saveCachedTimestamps).toHaveBeenCalledOnce();
    });

    it('does not save timestamps after an empty cycle', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(false);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(saveCachedTimestamps).not.toHaveBeenCalled();
    });

    it('invalidates the timeline cache after a cycle that returned data', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(true);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(invalidateTimelineCache).toHaveBeenCalledOnce();
    });

    it('does not invalidate the timeline cache after an empty cycle', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(false);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(invalidateTimelineCache).not.toHaveBeenCalled();
    });

    it('warms the home timeline count after a cycle that returned data', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(true);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(getTimelineTotalCount).toHaveBeenCalledWith({
        chainId: null,
        hidden: false,
        curated: true,
      });
    });

    it('does not warm the home timeline count after an empty cycle', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(false);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      expect(getTimelineTotalCount).not.toHaveBeenCalled();
    });

    it('sleeps with INDEX_INTERVAL_MS (500) when data was found', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(true);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      const sleepArg = vi.mocked(sleep).mock.calls[0][0];
      expect(sleepArg).toBeLessThanOrEqual(500);
    });

    it('sleeps with INDEX_INTERVAL_EMPTY_MS (1000) when no data was found', async () => {
      vi.mocked(executeIndexers).mockResolvedValue(false);
      advancePastDeadline(DURATION);

      await runIndexerHandler(DURATION);

      const sleepArg = vi.mocked(sleep).mock.calls[0][0];
      expect(sleepArg).toBeLessThanOrEqual(1000);
    });

    it('continues after an error in a cycle without throwing', async () => {
      vi.mocked(executeIndexers).mockRejectedValueOnce(
        new Error('grpc failure')
      );
      advancePastDeadline(DURATION);

      await expect(runIndexerHandler(DURATION)).resolves.not.toThrow();
    });
  });

  describe('return value', () => {
    it('returns a JSON response with ok: true', async () => {
      vi.mocked(loadCachedTimestamps).mockResolvedValue({ moments: 1 });

      const res = await runIndexerHandler(NO_LOOP_DURATION);
      const json = await res.json();

      expect(json).toEqual({ ok: true });
    });
  });
});

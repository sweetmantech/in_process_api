import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/redis/redisClient', () => ({
  default: { get: vi.fn(), set: vi.fn() },
}));
vi.mock('@/lib/supabase/in_process_moments/getInProcessTimelineCount', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/consts', () => ({
  REDIS_TIMELINE_COUNT_VERSION_KEY: 'timeline:count:version',
  TIMELINE_COUNT_TTL_SECONDS: 360,
}));

import redisClient from '@/lib/redis/redisClient';
import getInProcessTimelineCount from '@/lib/supabase/in_process_moments/getInProcessTimelineCount';
import getTimelineTotalCount from '@/lib/timeline/getTimelineTotalCount';

const PARAMS = { chainId: null, hidden: false, curated: true };
const KEY = 'timeline:count:v7:[null,false,null,null,null,true,null]';

const mockGet = vi.mocked(redisClient.get);
const mockSet = vi.mocked(redisClient.set);

describe('getTimelineTotalCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation(async (key) =>
      key === 'timeline:count:version' ? '7' : null
    );
  });

  it('returns the cached count without querying the database', async () => {
    mockGet.mockImplementation(async (key) =>
      key === 'timeline:count:version' ? '7' : '33610'
    );

    await expect(getTimelineTotalCount(PARAMS)).resolves.toBe(33610);
    expect(getInProcessTimelineCount).not.toHaveBeenCalled();
  });

  it('counts and caches under the current version on a miss', async () => {
    vi.mocked(getInProcessTimelineCount).mockResolvedValue({
      data: 33610,
      error: null,
    } as any);

    await expect(getTimelineTotalCount(PARAMS)).resolves.toBe(33610);
    expect(getInProcessTimelineCount).toHaveBeenCalledWith(PARAMS);
    expect(mockSet).toHaveBeenCalledWith(KEY, '33610', { EX: 360 });
  });

  it('uses version 0 when no version is stored', async () => {
    mockGet.mockResolvedValue(null);
    vi.mocked(getInProcessTimelineCount).mockResolvedValue({
      data: 5,
      error: null,
    } as any);

    await getTimelineTotalCount(PARAMS);

    expect(mockSet).toHaveBeenCalledWith(
      'timeline:count:v0:[null,false,null,null,null,true,null]',
      '5',
      { EX: 360 }
    );
  });

  it('returns undefined and caches nothing when the count query fails', async () => {
    vi.mocked(getInProcessTimelineCount).mockResolvedValue({
      data: null,
      error: new Error('timeout'),
    } as any);

    await expect(getTimelineTotalCount(PARAMS)).resolves.toBeUndefined();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('returns undefined when redis fails', async () => {
    mockGet.mockRejectedValue(new Error('redis down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(getTimelineTotalCount(PARAMS)).resolves.toBeUndefined();
  });
});

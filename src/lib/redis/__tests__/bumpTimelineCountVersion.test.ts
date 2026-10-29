import { describe, it, expect, vi } from 'vitest';

vi.mock('../redisClient', () => ({
  default: { incr: vi.fn() },
}));
vi.mock('@/lib/consts', () => ({
  REDIS_TIMELINE_COUNT_VERSION_KEY: 'timeline:count:version',
}));

import bumpTimelineCountVersion from '../bumpTimelineCountVersion';
import redisClient from '../redisClient';

describe('bumpTimelineCountVersion', () => {
  it('increments the version key', async () => {
    await bumpTimelineCountVersion();

    expect(redisClient.incr).toHaveBeenCalledWith('timeline:count:version');
  });
});

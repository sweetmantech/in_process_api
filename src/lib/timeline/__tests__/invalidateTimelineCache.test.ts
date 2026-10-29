import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/functions', () => ({ invalidateByTag: vi.fn() }));
vi.mock('@/lib/redis/bumpTimelineCountVersion', () => ({ default: vi.fn() }));

import { invalidateByTag } from '@vercel/functions';
import bumpTimelineCountVersion from '@/lib/redis/bumpTimelineCountVersion';
import invalidateTimelineCache from '@/lib/timeline/invalidateTimelineCache';

describe('invalidateTimelineCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates the timeline cache tag', async () => {
    vi.mocked(invalidateByTag).mockResolvedValue(undefined);

    await invalidateTimelineCache();

    expect(invalidateByTag).toHaveBeenCalledWith('timeline');
  });

  it('bumps the timeline count version', async () => {
    await invalidateTimelineCache();

    expect(bumpTimelineCountVersion).toHaveBeenCalledOnce();
  });

  it('does not throw when invalidation fails', async () => {
    vi.mocked(invalidateByTag).mockRejectedValue(new Error('429'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invalidateTimelineCache()).resolves.toBeUndefined();
  });

  it('still invalidates the tag when the version bump fails', async () => {
    vi.mocked(bumpTimelineCountVersion).mockRejectedValue(
      new Error('redis down')
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await invalidateTimelineCache();

    expect(invalidateByTag).toHaveBeenCalledWith('timeline');
  });
});

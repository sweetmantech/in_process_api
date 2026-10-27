import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/functions', () => ({ invalidateByTag: vi.fn() }));

import { invalidateByTag } from '@vercel/functions';
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

  it('does not throw when invalidation fails', async () => {
    vi.mocked(invalidateByTag).mockRejectedValue(new Error('429'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invalidateTimelineCache()).resolves.toBeUndefined();
  });
});

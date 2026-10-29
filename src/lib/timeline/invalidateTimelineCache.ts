import { invalidateByTag } from '@vercel/functions';
import bumpTimelineCountVersion from '@/lib/redis/bumpTimelineCountVersion';
import { TIMELINE_CACHE_TAG } from '@/lib/timeline/timelineCache';

const invalidateTimelineCache = async (): Promise<void> => {
  try {
    await bumpTimelineCountVersion();
  } catch (error) {
    console.error('Timeline count invalidation failed:', error);
  }
  try {
    await invalidateByTag(TIMELINE_CACHE_TAG);
  } catch (error) {
    console.error('Timeline cache invalidation failed:', error);
  }
};

export default invalidateTimelineCache;

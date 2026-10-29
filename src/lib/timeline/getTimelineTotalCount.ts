import redisClient from '@/lib/redis/redisClient';
import getInProcessTimelineCount from '@/lib/supabase/in_process_moments/getInProcessTimelineCount';
import getTimelineCountKey from '@/lib/timeline/getTimelineCountKey';
import {
  REDIS_TIMELINE_COUNT_VERSION_KEY,
  TIMELINE_COUNT_TTL_SECONDS,
} from '@/lib/consts';
import type { TimelineCountParams } from '@/types/moment';

const getTimelineTotalCount = async (
  params: TimelineCountParams
): Promise<number | undefined> => {
  try {
    const version =
      (await redisClient.get(REDIS_TIMELINE_COUNT_VERSION_KEY)) ?? '0';
    const key = getTimelineCountKey(version, params);
    const cached = await redisClient.get(key);
    if (cached !== null) return Number(cached);

    const { data, error } = await getInProcessTimelineCount(params);
    if (error || typeof data !== 'number') return undefined;

    await redisClient.set(key, String(data), {
      EX: TIMELINE_COUNT_TTL_SECONDS,
    });
    return data;
  } catch (error) {
    console.error('Timeline count cache failed:', error);
    return undefined;
  }
};

export default getTimelineTotalCount;

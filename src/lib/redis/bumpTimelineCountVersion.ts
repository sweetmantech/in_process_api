import redisClient from './redisClient';
import { REDIS_TIMELINE_COUNT_VERSION_KEY } from '@/lib/consts';

const bumpTimelineCountVersion = async (): Promise<void> => {
  await redisClient.incr(REDIS_TIMELINE_COUNT_VERSION_KEY);
};

export default bumpTimelineCountVersion;

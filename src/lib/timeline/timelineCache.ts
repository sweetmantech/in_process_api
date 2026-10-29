import { IS_TESTNET } from '@/lib/consts';
import type { TimelineCountParams } from '@/types/moment';

export const TIMELINE_CACHE_TAG = 'timeline';

export const HOME_TIMELINE_COUNT_PARAMS: TimelineCountParams = {
  chainId: IS_TESTNET ? 84532 : null,
  hidden: false,
  curated: true,
};

export const TIMELINE_CACHE_HEADERS = {
  'Vercel-CDN-Cache-Control': 'max-age=60, stale-while-revalidate=300',
  'Vercel-Cache-Tag': TIMELINE_CACHE_TAG,
};

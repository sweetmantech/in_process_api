export const TIMELINE_CACHE_TAG = 'timeline';

export const TIMELINE_CACHE_HEADERS = {
  'Vercel-CDN-Cache-Control': 'max-age=60, stale-while-revalidate=300',
  'Vercel-Cache-Tag': TIMELINE_CACHE_TAG,
};

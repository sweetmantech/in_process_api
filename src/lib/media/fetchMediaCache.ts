import getMediaCachePublicUrl from '@/lib/media/getMediaCachePublicUrl';

const fetchMediaCache = async (path: string): Promise<Response | null> => {
  try {
    const response = await fetch(getMediaCachePublicUrl(path));
    return response.ok && response.body ? response : null;
  } catch {
    return null;
  }
};

export default fetchMediaCache;

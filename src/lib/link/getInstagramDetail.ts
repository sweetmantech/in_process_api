import { LinkPreview } from '@/types/link';
import fetchInstagramPost from '@/lib/instagram/fetchInstagramPost';

const getInstagramDetail = async (url: string): Promise<LinkPreview | null> => {
  if (!url.includes('instagram.com')) {
    return null;
  }

  try {
    const item = await fetchInstagramPost(url);
    if (!item) {
      return null;
    }

    // Sidecar (carousel) posts carry their per-slide images in childPosts, not in
    // a top-level `images` field (that field exists in the schema but is unused).
    const carouselImages = item.childPosts
      ?.map((child) => child.displayUrl)
      .filter(Boolean) as string[] | undefined;
    const images = carouselImages?.length
      ? carouselImages
      : item.displayUrl
        ? [item.displayUrl]
        : [];

    // Undocumented failure mode: the actor can return an otherwise-empty item
    // (no error field, no media) for private/removed posts. Treat that as a
    // miss so getDetail() falls through to the generic scraper instead of
    // returning an imageless "success".
    if (!images.length) {
      return null;
    }

    return {
      siteName: 'instagram',
      favicons: [],
      images,
      title: item.ownerUsername
        ? `@${item.ownerUsername} on Instagram`
        : 'Instagram post',
      description: item.caption || '',
      url: item.url || url,
      // Carousel (Sidecar) posts only — lets callers re-host every slide
      // (including video files, which `images` above doesn't carry).
      carouselItems: item.childPosts?.length ? item.childPosts : undefined,
    };
  } catch (error) {
    console.error('Error fetching Instagram detail:', error);
    return null;
  }
};

export default getInstagramDetail;

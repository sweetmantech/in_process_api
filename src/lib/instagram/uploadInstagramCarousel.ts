import fetchInstagramPost from './fetchInstagramPost';
import uploadCarouselSlide, { CarouselItem } from './uploadCarouselSlide';
import uploadJsonToSupabase from '@/lib/supabase/storage/uploadJsonToSupabase';

export const INSTAGRAM_CAROUSEL_MIME =
  'application/vnd.inprocess.carousel+json';

export interface InstagramCarouselContent {
  mime: string;
  uri: string;
  items: CarouselItem[];
}

// Only handles genuine carousel (Sidecar) posts. A single-image/video
// Instagram post has no childPosts and should go through the existing
// single-file content.mime/uri path instead — returns null here.
const uploadInstagramCarousel = async (
  postUrl: string
): Promise<InstagramCarouselContent | null> => {
  const post = await fetchInstagramPost(postUrl);
  if (!post?.childPosts?.length) return null;

  const items = await Promise.all(post.childPosts.map(uploadCarouselSlide));
  const uri = await uploadJsonToSupabase(items);

  return { mime: INSTAGRAM_CAROUSEL_MIME, uri, items };
};

export default uploadInstagramCarousel;

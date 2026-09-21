import uploadRemoteFileToSupabase from './uploadRemoteFileToSupabase';
import { ApifyInstagramChildPost } from './fetchInstagramPost';

export interface CarouselItem {
  type: string;
  url: string;
  preview: string;
}

// Image slides: the image is its own preview (preview === url).
// Video slides: `url` is the re-hosted video file, `preview` is the
// re-hosted poster frame (Instagram's displayUrl for that slide).
const uploadCarouselSlide = async (
  slide: ApifyInstagramChildPost
): Promise<CarouselItem> => {
  if (!slide.displayUrl) {
    throw new Error('Carousel slide is missing displayUrl');
  }
  const preview = await uploadRemoteFileToSupabase(slide.displayUrl);

  if (!slide.videoUrl) {
    return { type: preview.mime, url: preview.url, preview: preview.url };
  }

  const media = await uploadRemoteFileToSupabase(slide.videoUrl);
  return { type: media.mime, url: media.url, preview: preview.url };
};

export default uploadCarouselSlide;

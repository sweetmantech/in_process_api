import { uploadJson } from '@/lib/arweave/uploadJson';
import { CarouselItem } from '@/types/carousel';

export default async function uploadMigratedCarouselStep(
  items: CarouselItem[],
  urlMap: Map<string, string>
): Promise<string> {
  'use step';

  const updated: CarouselItem[] = items.map((item, index) => ({
    type: item.type,
    url: urlMap.get(`content.carousel[${index}].url`) ?? item.url,
    preview: urlMap.get(`content.carousel[${index}].preview`) ?? item.preview,
  }));

  const result = await uploadJson(updated);
  return result.arweave_uri;
}

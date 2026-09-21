import { CarouselItem } from '@/types/carousel';

export default async function fetchCarouselContentStep(
  contentUri: string
): Promise<CarouselItem[]> {
  'use step';

  const response = await fetch(contentUri);
  if (!response.ok) return [];

  return response.json();
}

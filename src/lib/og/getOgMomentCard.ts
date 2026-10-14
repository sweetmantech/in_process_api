import type { TimelineMoment } from '@/types/moment';
import getBase64Image from './getBase64Image';
import formatOgPrice from './formatOgPrice';
import fetchUri from '@/lib/arweave/fetchUri';
import { OG_CARD_IMAGE_HEIGHT, OG_CARD_IMAGE_WIDTH } from './consts';

export interface OgMomentCard {
  name: string;
  price: string | null;
  isVideo: boolean;
  image: string | null;
  text: string | null;
}

const getWritingExcerpt = async (uri: string | undefined) => {
  if (!uri) return null;
  try {
    const res = await fetchUri(uri);
    if (!res.ok) return null;
    return (await res.text()).slice(0, 220);
  } catch {
    return null;
  }
};

const getOgMomentCard = async (
  moment: TimelineMoment
): Promise<OgMomentCard> => {
  const metadata = moment.metadata;
  const mime = metadata?.content?.mime ?? '';
  const isWriting = mime === 'text/plain';

  const image = await getBase64Image(
    metadata?.image,
    OG_CARD_IMAGE_WIDTH * 2,
    OG_CARD_IMAGE_HEIGHT * 2
  );
  const text =
    !image && isWriting
      ? await getWritingExcerpt(metadata?.content?.uri)
      : null;

  return {
    name: metadata?.name ?? '',
    price: formatOgPrice(moment.sale),
    isVideo: mime.startsWith('video'),
    image,
    text,
  };
};

export default getOgMomentCard;

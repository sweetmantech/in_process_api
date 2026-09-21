import { TokenMetadataJson } from '@/lib/protocolSdk/ipfs/types';
import { CarouselItem } from '@/types/carousel';
import { INSTAGRAM_CAROUSEL_MIME } from '@/lib/consts';
import { isNonPermanentUri } from './isNonPermanentUri';

export interface MigrationCandidate {
  key: string;
  value: string;
}

export interface MigrationTargets {
  downloadCandidates: MigrationCandidate[];
  hlsAnimationUrl: string | null;
  hasTargets: boolean;
}

const MUX_HLS_PATTERN = /stream\.mux\.com\/[^/]+\.m3u8/;

// carouselItems is passed in (already fetched via fetchCarouselContentStep)
// rather than fetched here, since this stays a pure function — network I/O
// belongs in a durable workflow step.
const getMigrationTargets = (
  metadata: TokenMetadataJson,
  carouselItems?: CarouselItem[]
): MigrationTargets => {
  const isCarousel = metadata.content?.mime === INSTAGRAM_CAROUSEL_MIME;

  const baseCandidates = [
    { key: 'image', value: metadata.image },
    { key: 'animation_url', value: metadata.animation_url },
    // A carousel's content.uri is always rebuilt from its migrated slides
    // (see uploadMigratedCarouselStep) rather than migrated byte-for-byte,
    // so its slides below are the real targets, not content.uri itself.
    ...(isCarousel ? [] : [{ key: 'content.uri', value: metadata.content?.uri }]),
  ];

  const carouselCandidates = isCarousel
    ? (carouselItems ?? []).flatMap((item, index) => [
        { key: `content.carousel[${index}].url`, value: item.url },
        { key: `content.carousel[${index}].preview`, value: item.preview },
      ])
    : [];

  const allCandidates = [...baseCandidates, ...carouselCandidates].filter(
    (c): c is MigrationCandidate => isNonPermanentUri(c.value)
  );

  const hlsItem = allCandidates.find(
    (c) => c.key === 'animation_url' && MUX_HLS_PATTERN.test(c.value)
  );

  return {
    downloadCandidates: allCandidates.filter((c) => c !== hlsItem),
    hlsAnimationUrl: hlsItem?.value ?? null,
    hasTargets: allCandidates.length > 0,
  };
};

export default getMigrationTargets;

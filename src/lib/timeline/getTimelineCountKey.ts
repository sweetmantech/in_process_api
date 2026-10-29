import type { TimelineCountParams } from '@/types/moment';

const getTimelineCountKey = (
  version: string,
  {
    chainId,
    hidden,
    mime,
    period,
    channel,
    curated,
    protocol,
  }: TimelineCountParams
): string =>
  `timeline:count:v${version}:${JSON.stringify([
    chainId ?? null,
    hidden,
    mime ?? null,
    period ?? null,
    channel ?? null,
    curated,
    protocol ?? null,
  ])}`;

export default getTimelineCountKey;

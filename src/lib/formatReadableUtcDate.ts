import blockTsToISOString from '@/lib/blockTsToISOString';

/** Block timestamp (seconds) -> "2025-09-08 17:23:21 UTC". */
const formatReadableUtcDate = (blockTimestamp: number): string =>
  blockTsToISOString(blockTimestamp)
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, ' UTC');

export default formatReadableUtcDate;

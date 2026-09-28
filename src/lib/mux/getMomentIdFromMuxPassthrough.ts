const MOMENT_PASSTHROUGH = /^moment:([0-9a-f-]{36})$/i;

/** Moment id from a passthrough set by buildMuxMomentPassthrough, else null. */
const getMomentIdFromMuxPassthrough = (
  passthrough: string | undefined
): string | null => passthrough?.match(MOMENT_PASSTHROUGH)?.[1] ?? null;

export default getMomentIdFromMuxPassthrough;

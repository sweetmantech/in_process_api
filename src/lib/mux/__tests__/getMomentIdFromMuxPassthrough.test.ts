import { describe, it, expect } from 'vitest';
import getMomentIdFromMuxPassthrough from '../getMomentIdFromMuxPassthrough';
import buildMuxMomentPassthrough from '../buildMuxMomentPassthrough';

const MOMENT_ID = 'a0b24c4b-4c92-4eeb-b80e-082f8afde810';

describe('getMomentIdFromMuxPassthrough', () => {
  it('round-trips a passthrough built for a moment', () => {
    expect(
      getMomentIdFromMuxPassthrough(buildMuxMomentPassthrough(MOMENT_ID))
    ).toBe(MOMENT_ID);
  });

  it('ignores direct-upload passthroughs (random uuid without prefix)', () => {
    expect(getMomentIdFromMuxPassthrough(MOMENT_ID)).toBeNull();
  });

  it('returns null when there is no passthrough', () => {
    expect(getMomentIdFromMuxPassthrough(undefined)).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import isPermanentMuxError from '../isPermanentMuxError';

const withStatus = (status: number) => Object.assign(new Error(), { status });

describe('isPermanentMuxError', () => {
  it('treats input rejections as permanent', () => {
    expect(isPermanentMuxError(withStatus(400))).toBe(true);
    expect(isPermanentMuxError(withStatus(422))).toBe(true);
  });

  it('treats auth, rate-limit, timeout and server errors as retryable', () => {
    for (const status of [401, 403, 408, 429, 500, 503]) {
      expect(isPermanentMuxError(withStatus(status))).toBe(false);
    }
  });

  it('treats errors without a status as retryable', () => {
    expect(isPermanentMuxError(new Error('network'))).toBe(false);
    expect(isPermanentMuxError(undefined)).toBe(false);
  });
});

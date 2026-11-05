import { describe, it, expect } from 'vitest';
import isHandleTakenError from '@/lib/artists/isHandleTakenError';

describe('isHandleTakenError', () => {
  it('returns true for a unique violation on the handle constraint', () => {
    expect(
      isHandleTakenError({
        code: '23505',
        message:
          'duplicate key value violates unique constraint "in_process_artists_handle_key"',
      })
    ).toBe(true);
  });

  it('returns false for a unique violation on another constraint', () => {
    expect(
      isHandleTakenError({
        code: '23505',
        message:
          'duplicate key value violates unique constraint "in_process_artists_username_key"',
      })
    ).toBe(false);
  });

  it('returns false for other errors', () => {
    expect(isHandleTakenError(new Error('db error'))).toBe(false);
    expect(isHandleTakenError(null)).toBe(false);
  });
});

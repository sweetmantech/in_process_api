import { describe, it, expect } from 'vitest';
import formatReadableUtcDate from '../formatReadableUtcDate';

describe('formatReadableUtcDate', () => {
  it('formats a block timestamp as a readable UTC date', () => {
    expect(formatReadableUtcDate(1757352201)).toBe('2025-09-08 17:23:21 UTC');
  });

  it('formats the epoch', () => {
    expect(formatReadableUtcDate(0)).toBe('1970-01-01 00:00:00 UTC');
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import getMuxIngestBatchSize from '../getMuxIngestBatchSize';

describe('getMuxIngestBatchSize', () => {
  afterEach(() => {
    delete process.env.MUX_INGEST_BATCH_SIZE;
  });

  it('is 0 (off) when unset', () => {
    expect(getMuxIngestBatchSize()).toBe(0);
  });

  it('reads a positive integer', () => {
    process.env.MUX_INGEST_BATCH_SIZE = '5';
    expect(getMuxIngestBatchSize()).toBe(5);
  });

  it('is 0 for invalid or non-positive values', () => {
    for (const v of ['abc', '-3', '0', '2.5']) {
      process.env.MUX_INGEST_BATCH_SIZE = v;
      expect(getMuxIngestBatchSize()).toBe(0);
    }
  });

  it('caps large values at 50', () => {
    process.env.MUX_INGEST_BATCH_SIZE = '1000';
    expect(getMuxIngestBatchSize()).toBe(50);
  });
});

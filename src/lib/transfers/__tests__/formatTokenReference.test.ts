import { describe, it, expect } from 'vitest';
import type { Transfers_t } from '@/types/envio';
import formatTokenReference from '../formatTokenReference';

const makeTransfer = (overrides: Partial<Transfers_t> = {}): Transfers_t =>
  ({
    collection: '0x58dff4859a0f4859cabfa0ad5aadd17b1a499ccc',
    token_id: '20',
    chain_id: 8453,
    ...overrides,
  }) as Transfers_t;

describe('formatTokenReference', () => {
  it('labels token id, truncated collection address, and chain id', () => {
    expect(formatTokenReference(makeTransfer())).toBe(
      '#20 · 0x58df…9ccc · chain 8453'
    );
  });
});

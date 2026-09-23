import { describe, it, expect, vi } from 'vitest';
import type { Transfers_t } from '@/types/envio';

vi.mock('@/lib/consts', () => ({
  SHORT_CHAIN_NAME: { 8453: 'base' },
  SITE_ORIGINAL_URL: 'https://inprocess.world',
}));

import getCollectUrl from '../getCollectUrl';

const makeTransfer = (overrides: Partial<Transfers_t> = {}): Transfers_t =>
  ({
    collection: '0xCollection',
    token_id: '1',
    chain_id: 8453,
    ...overrides,
  }) as Transfers_t;

describe('getCollectUrl', () => {
  it('builds a lowercase collect URL for a known chain', () => {
    expect(getCollectUrl(makeTransfer())).toBe(
      'https://inprocess.world/collect/base:0xcollection/1'
    );
  });

  it('falls back to "base" for an unmapped chain id', () => {
    expect(getCollectUrl(makeTransfer({ chain_id: 999 }))).toBe(
      'https://inprocess.world/collect/base:0xcollection/1'
    );
  });
});

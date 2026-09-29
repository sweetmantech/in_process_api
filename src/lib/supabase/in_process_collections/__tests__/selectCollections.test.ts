import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: Array<[string, unknown[]]> = [];
let result: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock('../../client', () => {
  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'in', 'eq', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return builder;
    };
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return { supabase: builder };
});

import selectCollections from '../selectCollections';

const selectedColumns = () =>
  calls.find(([method]) => method === 'select')?.[1][0] as string;

describe('selectCollections', () => {
  beforeEach(() => {
    calls.length = 0;
    result = { data: [{ id: 'c1' }], error: null };
  });

  it('selects collection columns only by default (no creator join)', async () => {
    await selectCollections({ addresses: ['0xABC'] });

    expect(selectedColumns()).toBe('*');
    expect(calls).toContainEqual(['in', ['address', ['0xabc']]]);
  });

  it('joins the creator wallet and artist when includeCreator is set', async () => {
    await selectCollections({ addresses: ['0xabc'], includeCreator: true });

    expect(selectedColumns()).toContain('creator_wallet:in_process_wallets');
    expect(selectedColumns()).toContain('artist:in_process_artists(username)');
  });

  it('returns the rows', async () => {
    await expect(selectCollections({ addresses: ['0xabc'] })).resolves.toEqual([
      { id: 'c1' },
    ]);
  });

  it('throws on error', async () => {
    result = { data: null, error: { message: 'db down' } };
    await expect(selectCollections({ addresses: ['0xabc'] })).rejects.toEqual({
      message: 'db down',
    });
  });
});

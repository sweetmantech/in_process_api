import { describe, it, expect, vi, beforeEach } from 'vitest';

// Records every builder call on the moments query and resolves with `result`.
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

import selectMoments from '../selectMoments';

describe('selectMoments', () => {
  beforeEach(() => {
    calls.length = 0;
    result = { data: [{ id: 'm1' }], error: null };
  });

  it('filters on collection ids and token ids (the unique index columns)', async () => {
    const { data, error } = await selectMoments({
      collectionIds: ['col-1'],
      tokenIds: [19316, 5],
    });

    expect(calls).toContainEqual(['in', ['collection', ['col-1']]]);
    expect(calls).toContainEqual(['in', ['token_id', [19316, 5]]]);
    expect(calls.some(([, args]) => args[0] === 'collection.address')).toBe(
      false
    );
    expect(data).toEqual([{ id: 'm1' }]);
    expect(error).toBeNull();
  });

  it('applies artist and chain filters on the embedded collection', async () => {
    await selectMoments({ artists: ['0xartist'], chainId: 8453 });

    expect(calls).toContainEqual(['in', ['collection.creator', ['0xartist']]]);
    expect(calls).toContainEqual(['eq', ['collection.chain_id', 8453]]);
  });

  it('returns the query error', async () => {
    result = { data: null, error: { message: 'db down' } };
    const { data, error } = await selectMoments({ collectionIds: ['col-1'] });
    expect(data).toBeNull();
    expect(error).toEqual({ message: 'db down' });
  });
});

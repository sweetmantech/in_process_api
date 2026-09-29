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

vi.mock(
  '@/lib/supabase/in_process_collections/selectCollectionIdsByAddresses',
  () => ({ default: vi.fn() })
);

import selectMoments from '../selectMoments';
import selectCollectionIdsByAddresses from '@/lib/supabase/in_process_collections/selectCollectionIdsByAddresses';

const mockSelectCollectionIds = vi.mocked(selectCollectionIdsByAddresses);

const moments = [
  {
    collectionAddress: '0xABEFBC9FD2F806065B4F3C237D4B59D9A97BCAC7' as const,
    tokenId: '19316',
    chainId: 1,
  },
  {
    collectionAddress: '0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7' as const,
    tokenId: '5',
    chainId: 1,
  },
];

describe('selectMoments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    result = { data: [{ id: 'm1' }], error: null };
    mockSelectCollectionIds.mockResolvedValue({
      data: [{ id: 'col-1' }],
      error: null,
    } as never);
  });

  it('filters moments by resolved collection ids and token ids (index path)', async () => {
    const { data, error } = await selectMoments({ moments });

    expect(mockSelectCollectionIds).toHaveBeenCalledWith(
      ['0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7'],
      undefined
    );
    expect(calls).toContainEqual(['in', ['collection', ['col-1']]]);
    expect(calls).toContainEqual(['in', ['token_id', [19316, 5]]]);
    expect(calls.some(([, args]) => args[0] === 'collection.address')).toBe(
      false
    );
    expect(data).toEqual([{ id: 'm1' }]);
    expect(error).toBeNull();
  });

  it('passes chainId through to the collection lookup', async () => {
    await selectMoments({ moments, chainId: 1 });
    expect(mockSelectCollectionIds).toHaveBeenCalledWith(
      ['0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7'],
      1
    );
  });

  it('returns no moments without querying them when no collection matches', async () => {
    mockSelectCollectionIds.mockResolvedValue({
      data: [],
      error: null,
    } as never);

    const { data, error } = await selectMoments({ moments });

    expect(data).toEqual([]);
    expect(error).toBeNull();
    expect(calls.some(([method]) => method === 'in')).toBe(false);
  });

  it('returns the collection lookup error', async () => {
    mockSelectCollectionIds.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    } as never);

    const { data, error } = await selectMoments({ moments });

    expect(data).toBeNull();
    expect(error).toEqual({ message: 'db down' });
  });

  it('does not look up collections when no moments are given', async () => {
    await selectMoments({ artists: ['0xartist'] });
    expect(mockSelectCollectionIds).not.toHaveBeenCalled();
  });
});

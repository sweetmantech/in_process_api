import { describe, it, expect, vi, beforeEach } from 'vitest';

const range = vi.fn();
vi.mock('@/lib/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq', 'not', 'order']) {
    chain[m] = () => chain;
  }
  chain.range = (...args: unknown[]) => range(...args);
  return { supabase: chain };
});

import selectMuxPlaybackIds from '../selectMuxPlaybackIds';

const rows = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ playback_id: `p${offset + i}` }));

describe('selectMuxPlaybackIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pages past the 1000-row response cap', async () => {
    range
      .mockResolvedValueOnce({ data: rows(1000), error: null })
      .mockResolvedValueOnce({ data: rows(5, 1000), error: null });

    const ids = await selectMuxPlaybackIds();

    expect(ids).toHaveLength(1005);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('throws on error instead of returning a partial list', async () => {
    range.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(selectMuxPlaybackIds()).rejects.toThrow('boom');
  });
});

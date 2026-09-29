import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/in_process_collections/selectCollections', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/supabase/in_process_moments/selectMoments', () => ({
  default: vi.fn(),
}));

import getMomentsByAddressAndTokenId from '../getMomentsByAddressAndTokenId';
import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import selectMoments from '@/lib/supabase/in_process_moments/selectMoments';

const mockSelectCollections = vi.mocked(selectCollections);
const mockSelectMoments = vi.mocked(selectMoments);

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

describe('getMomentsByAddressAndTokenId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectCollections.mockResolvedValue([{ id: 'col-1' }] as never);
    mockSelectMoments.mockResolvedValue({
      data: [{ id: 'm1' }],
      error: null,
    } as never);
  });

  it('resolves collection ids, then selects moments by collection + token ids', async () => {
    const result = await getMomentsByAddressAndTokenId({
      moments,
      limit: 1,
      includeMetadata: true,
    });

    expect(mockSelectCollections).toHaveBeenCalledWith({
      addresses: ['0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7'],
      chainId: undefined,
    });
    expect(mockSelectMoments).toHaveBeenCalledWith({
      collectionIds: ['col-1'],
      tokenIds: [19316, 5],
      chainId: undefined,
      limit: 1,
      includeMetadata: true,
    });
    expect(result).toEqual({ data: [{ id: 'm1' }], error: null });
  });

  it('passes chainId to both lookups', async () => {
    await getMomentsByAddressAndTokenId({ moments, chainId: 1 });

    expect(mockSelectCollections).toHaveBeenCalledWith({
      addresses: ['0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7'],
      chainId: 1,
    });
    expect(mockSelectMoments).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: 1 })
    );
  });

  it('returns no moments without querying them when no collection matches', async () => {
    mockSelectCollections.mockResolvedValue([] as never);

    await expect(getMomentsByAddressAndTokenId({ moments })).resolves.toEqual({
      data: [],
      error: null,
    });
    expect(mockSelectMoments).not.toHaveBeenCalled();
  });

  it('returns nothing for an empty key list instead of selecting every moment', async () => {
    await expect(
      getMomentsByAddressAndTokenId({ moments: [] })
    ).resolves.toEqual({ data: [], error: null });
    expect(mockSelectCollections).not.toHaveBeenCalled();
  });

  it('returns the collection lookup error instead of throwing', async () => {
    mockSelectCollections.mockRejectedValue({ message: 'db down' });

    await expect(getMomentsByAddressAndTokenId({ moments })).resolves.toEqual({
      data: null,
      error: { message: 'db down' },
    });
    expect(mockSelectMoments).not.toHaveBeenCalled();
  });
});

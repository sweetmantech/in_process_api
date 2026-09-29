import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MomentType } from '@/types/moment';

vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/moment/resolveMomentFromDb', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/moment/resolveMomentFromChain', () => ({
  default: vi.fn(),
}));

import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import resolveMomentFromDb from '@/lib/moment/resolveMomentFromDb';
import resolveMomentFromChain from '@/lib/moment/resolveMomentFromChain';
import { resolveMomentInfo } from '@/lib/moment/resolveMomentInfo';

const COLLECTION = '0x0000000000000000000000000000000000000001' as const;
const moment = { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 };

const mockDbMoment = {
  id: 'db-id-1',
  uri: 'ar://metadata-hash',
  collection: { creator: '0xcreator', protocol: 'in_process' },
};

const mockSaleConfig = {
  pricePerToken: '1000',
  saleStart: 0,
  saleEnd: 0,
  maxTokensPerAddress: 0,
  fundsRecipient: COLLECTION,
  type: MomentType.FixedPriceMint,
};

const mockResult = {
  id: 'db-id-1',
  uri: 'ar://metadata-hash',
  owner: '0xcreator',
  saleConfig: mockSaleConfig,
};

describe('resolveMomentInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls resolveMomentFromDb when moment exists in DB', async () => {
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [mockDbMoment],
      error: null,
    } as any);
    vi.mocked(resolveMomentFromDb).mockResolvedValue(mockResult as any);

    const result = await resolveMomentInfo(moment);

    expect(resolveMomentFromDb).toHaveBeenCalledWith(moment, mockDbMoment);
    expect(resolveMomentFromChain).not.toHaveBeenCalled();
    expect(result).toEqual(mockResult);
  });

  it('calls resolveMomentFromChain when moment is not in DB', async () => {
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [],
      error: null,
    } as any);
    const chainResult = {
      id: null,
      uri: 'ar://chain-uri',
      owner: COLLECTION,
      saleConfig: mockSaleConfig,
    };
    vi.mocked(resolveMomentFromChain).mockResolvedValue(chainResult as any);

    const result = await resolveMomentInfo(moment);

    expect(resolveMomentFromChain).toHaveBeenCalledWith(moment);
    expect(resolveMomentFromDb).not.toHaveBeenCalled();
    expect(result).toEqual(chainResult);
  });

  it('calls resolveMomentFromChain when getMomentsByAddressAndTokenId returns null data', async () => {
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: null,
      error: null,
    } as any);
    vi.mocked(resolveMomentFromChain).mockResolvedValue({
      id: null,
      uri: null,
      owner: COLLECTION,
      saleConfig: null,
    } as any);

    await resolveMomentInfo(moment);

    expect(resolveMomentFromChain).toHaveBeenCalledWith(moment);
  });
});

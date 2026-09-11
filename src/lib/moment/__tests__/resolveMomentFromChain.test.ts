import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MomentType } from '@/types/moment';

vi.mock('@/lib/viem/isCatalogContract', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/isSoundContract', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/isZoraMediaContract', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/getCatalogInfo', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/getSoundInfo', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/getZoraMediaInfo', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/viem/getInProcessMomentInfo', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/sales/convertOnChainSaleToApi', () => ({
  convertOnChainSaleToApi: vi.fn(),
}));

import isCatalogContract from '@/lib/viem/isCatalogContract';
import isSoundContract from '@/lib/viem/isSoundContract';
import isZoraMediaContract from '@/lib/viem/isZoraMediaContract';
import getCatalogInfo from '@/lib/viem/getCatalogInfo';
import getSoundInfo from '@/lib/viem/getSoundInfo';
import getZoraMediaInfo from '@/lib/viem/getZoraMediaInfo';
import getInProcessMomentInfo from '@/lib/viem/getInProcessMomentInfo';
import { convertOnChainSaleToApi } from '@/lib/sales/convertOnChainSaleToApi';
import resolveMomentFromChain from '@/lib/moment/resolveMomentFromChain';

const COLLECTION = '0x0000000000000000000000000000000000000001' as const;
const OWNER = '0xowner00000000000000000000000000000000000' as const;

const moment = { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 };

const mockSaleConfig = {
  pricePerToken: '1000',
  saleStart: 0,
  saleEnd: 0,
  maxTokensPerAddress: 0,
  fundsRecipient: COLLECTION,
  type: MomentType.FixedPriceMint,
};

describe('resolveMomentFromChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isZoraMediaContract).mockReturnValue(false);
  });

  describe('zora media contract', () => {
    beforeEach(() => {
      vi.mocked(isZoraMediaContract).mockReturnValue(true);
      vi.mocked(getZoraMediaInfo).mockResolvedValue({
        owner: OWNER,
        tokenUri: 'https://zora-media-uri',
      } as any);
    });

    it('calls getZoraMediaInfo and skips other info lookups', async () => {
      await resolveMomentFromChain(moment);
      expect(getZoraMediaInfo).toHaveBeenCalledWith(moment);
      expect(getCatalogInfo).not.toHaveBeenCalled();
      expect(getSoundInfo).not.toHaveBeenCalled();
      expect(getInProcessMomentInfo).not.toHaveBeenCalled();
    });

    it('returns owner from getZoraMediaInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.owner).toBe(OWNER);
    });

    it('returns tokenUri from getZoraMediaInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.uri).toBe('https://zora-media-uri');
    });

    it('returns saleConfig as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.saleConfig).toBeNull();
    });

    it('returns id as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.id).toBeNull();
    });
  });

  describe('catalog contract', () => {
    beforeEach(() => {
      vi.mocked(isCatalogContract).mockResolvedValue(true);
      vi.mocked(isSoundContract).mockResolvedValue(false);
      vi.mocked(getCatalogInfo).mockResolvedValue({
        owner: OWNER,
        tokenUri: 'ar://catalog-uri',
      } as any);
    });

    it('calls getCatalogInfo', async () => {
      await resolveMomentFromChain(moment);
      expect(getCatalogInfo).toHaveBeenCalledWith(moment);
      expect(getSoundInfo).not.toHaveBeenCalled();
      expect(getInProcessMomentInfo).not.toHaveBeenCalled();
    });

    it('returns owner from getCatalogInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.owner).toBe(OWNER);
    });

    it('returns tokenUri from getCatalogInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.uri).toBe('ar://catalog-uri');
    });

    it('returns saleConfig as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.saleConfig).toBeNull();
    });

    it('returns id as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.id).toBeNull();
    });
  });

  describe('sound contract', () => {
    beforeEach(() => {
      vi.mocked(isCatalogContract).mockResolvedValue(false);
      vi.mocked(isSoundContract).mockResolvedValue(true);
      vi.mocked(getSoundInfo).mockResolvedValue({
        owner: OWNER,
        tokenUri: 'https://sound-uri',
      } as any);
    });

    it('calls getSoundInfo', async () => {
      await resolveMomentFromChain(moment);
      expect(getSoundInfo).toHaveBeenCalledWith(moment);
      expect(getCatalogInfo).not.toHaveBeenCalled();
      expect(getInProcessMomentInfo).not.toHaveBeenCalled();
    });

    it('returns owner from getSoundInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.owner).toBe(OWNER);
    });

    it('returns tokenUri from getSoundInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.uri).toBe('https://sound-uri');
    });

    it('returns saleConfig as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.saleConfig).toBeNull();
    });

    it('returns id as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.id).toBeNull();
    });
  });

  describe('in_process contract', () => {
    beforeEach(() => {
      vi.mocked(isCatalogContract).mockResolvedValue(false);
      vi.mocked(isSoundContract).mockResolvedValue(false);
      vi.mocked(getInProcessMomentInfo).mockResolvedValue({
        saleConfig: {
          pricePerToken: BigInt(500),
          type: MomentType.FixedPriceMint,
        },
        owner: OWNER,
        tokenUri: 'ar://inprocess-uri',
      } as any);
      vi.mocked(convertOnChainSaleToApi).mockReturnValue(mockSaleConfig as any);
    });

    it('calls getInProcessMomentInfo', async () => {
      await resolveMomentFromChain(moment);
      expect(getInProcessMomentInfo).toHaveBeenCalledWith(moment);
      expect(getCatalogInfo).not.toHaveBeenCalled();
      expect(getSoundInfo).not.toHaveBeenCalled();
    });

    it('returns owner from getInProcessMomentInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.owner).toBe(OWNER);
    });

    it('returns tokenUri from getInProcessMomentInfo', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.uri).toBe('ar://inprocess-uri');
    });

    it('converts saleConfig via convertOnChainSaleToApi', async () => {
      await resolveMomentFromChain(moment);
      expect(convertOnChainSaleToApi).toHaveBeenCalled();
      const result = await resolveMomentFromChain(moment);
      expect(result.saleConfig).toEqual(mockSaleConfig);
    });

    it('returns id as null', async () => {
      const result = await resolveMomentFromChain(moment);
      expect(result.id).toBeNull();
    });
  });

  it('runs isCatalogContract, isSoundContract and isZoraMediaContract in parallel', async () => {
    const order: string[] = [];
    vi.mocked(isCatalogContract).mockImplementation(async () => {
      order.push('catalog');
      return false;
    });
    vi.mocked(isSoundContract).mockImplementation(async () => {
      order.push('sound');
      return false;
    });
    vi.mocked(isZoraMediaContract).mockImplementation(() => {
      order.push('zora_media');
      return false;
    });
    vi.mocked(getInProcessMomentInfo).mockResolvedValue({
      saleConfig: {},
      owner: OWNER,
      tokenUri: null,
    } as any);
    vi.mocked(convertOnChainSaleToApi).mockReturnValue(mockSaleConfig as any);

    await resolveMomentFromChain(moment);

    expect(order).toContain('catalog');
    expect(order).toContain('sound');
    expect(order).toContain('zora_media');
  });
});

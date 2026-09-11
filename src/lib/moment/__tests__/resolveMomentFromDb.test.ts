import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MomentType } from '@/types/moment';

vi.mock('@/lib/supabase/in_process_sales/selectSale', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/sales/convertDatabaseSaleToApi', () => ({
  convertDatabaseSaleToApi: vi.fn(),
}));
vi.mock('@/lib/sales/convertOnChainSaleToApi', () => ({
  convertOnChainSaleToApi: vi.fn(),
}));
vi.mock('@/lib/viem/getInProcessMomentInfo', () => ({
  default: vi.fn(),
}));

import selectSale from '@/lib/supabase/in_process_sales/selectSale';
import { convertDatabaseSaleToApi } from '@/lib/sales/convertDatabaseSaleToApi';
import { convertOnChainSaleToApi } from '@/lib/sales/convertOnChainSaleToApi';
import getInProcessMomentInfo from '@/lib/viem/getInProcessMomentInfo';
import resolveMomentFromDb from '@/lib/moment/resolveMomentFromDb';
import type { MomentWithCollection } from '@/lib/supabase/in_process_moments/selectMoments';

const COLLECTION = '0x0000000000000000000000000000000000000001' as const;
const CREATOR = '0xcreator000000000000000000000000000000000' as const;

const moment = { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 };

const makeDbMoment = (
  protocol: string,
  overrides: Partial<MomentWithCollection> = {}
): MomentWithCollection => ({
  id: 'moment-uuid',
  uri: 'ar://metadata-hash',
  token_id: 1,
  max_supply: 0,
  total_minted: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  channel: null,
  collection: {
    id: 'col-uuid',
    address: COLLECTION,
    chain_id: 8453,
    creator: CREATOR,
    protocol,
  },
  ...overrides,
});

const mockSaleConfig = {
  pricePerToken: '1000',
  saleStart: 0,
  saleEnd: 0,
  maxTokensPerAddress: 0,
  fundsRecipient: COLLECTION,
  type: MomentType.FixedPriceMint,
};

describe('resolveMomentFromDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('in_process protocol', () => {
    const dbMoment = makeDbMoment('in_process');

    it('uses DB sale when available', async () => {
      const dbSale = { id: 'sale-1' };
      vi.mocked(selectSale).mockResolvedValue(dbSale as any);
      vi.mocked(convertDatabaseSaleToApi).mockReturnValue(
        mockSaleConfig as any
      );

      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(selectSale).toHaveBeenCalledWith('moment-uuid');
      expect(convertDatabaseSaleToApi).toHaveBeenCalledWith(dbSale);
      expect(getInProcessMomentInfo).not.toHaveBeenCalled();
      expect(result.saleConfig).toEqual(mockSaleConfig);
    });

    it('falls back to onchain when no DB sale', async () => {
      vi.mocked(selectSale).mockResolvedValue(null);
      vi.mocked(getInProcessMomentInfo).mockResolvedValue({
        saleConfig: {},
        owner: CREATOR,
        tokenUri: 'ar://metadata-hash',
      } as any);
      vi.mocked(convertOnChainSaleToApi).mockReturnValue(mockSaleConfig as any);

      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(getInProcessMomentInfo).toHaveBeenCalledWith(moment);
      expect(convertDatabaseSaleToApi).not.toHaveBeenCalled();
      expect(result.saleConfig).toEqual(mockSaleConfig);
    });

    it('returns soldOut from max_supply and total_minted', async () => {
      vi.mocked(selectSale).mockResolvedValue({ id: 'sale-1' } as any);
      vi.mocked(convertDatabaseSaleToApi).mockReturnValue(
        mockSaleConfig as any
      );

      const result = await resolveMomentFromDb(
        moment,
        makeDbMoment('in_process', { max_supply: 10, total_minted: 10 })
      );

      expect(result.soldOut).toBe(true);
    });

    it('returns soldOut false when supply remains', async () => {
      vi.mocked(selectSale).mockResolvedValue(null);
      vi.mocked(getInProcessMomentInfo).mockResolvedValue({
        saleConfig: {},
        owner: CREATOR,
        tokenUri: 'ar://metadata-hash',
      } as any);
      vi.mocked(convertOnChainSaleToApi).mockReturnValue(mockSaleConfig as any);

      const result = await resolveMomentFromDb(
        moment,
        makeDbMoment('in_process', { max_supply: 10, total_minted: 3 })
      );

      expect(result.soldOut).toBe(false);
    });

    it('returns id, uri, owner from dbMoment', async () => {
      vi.mocked(selectSale).mockResolvedValue(null);
      vi.mocked(getInProcessMomentInfo).mockResolvedValue({
        saleConfig: {},
        owner: CREATOR,
        tokenUri: 'ar://metadata-hash',
      } as any);
      vi.mocked(convertOnChainSaleToApi).mockReturnValue(mockSaleConfig as any);

      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(result.id).toBe('moment-uuid');
      expect(result.uri).toBe('ar://metadata-hash');
      expect(result.owner).toBe(CREATOR);
    });
  });

  describe('catalog protocol', () => {
    const dbMoment = makeDbMoment('catalog');

    it('skips sale fetch entirely', async () => {
      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(selectSale).not.toHaveBeenCalled();
      expect(getInProcessMomentInfo).not.toHaveBeenCalled();
      expect(convertDatabaseSaleToApi).not.toHaveBeenCalled();
      expect(result.saleConfig).toBeNull();
      expect(result.soldOut).toBe(false);
    });

    it('returns id, uri, owner from dbMoment', async () => {
      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(result.id).toBe('moment-uuid');
      expect(result.uri).toBe('ar://metadata-hash');
      expect(result.owner).toBe(CREATOR);
    });
  });

  describe('sound.xyz protocol', () => {
    const dbMoment = makeDbMoment('sound.xyz');

    it('skips sale fetch entirely', async () => {
      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(selectSale).not.toHaveBeenCalled();
      expect(getInProcessMomentInfo).not.toHaveBeenCalled();
      expect(convertDatabaseSaleToApi).not.toHaveBeenCalled();
      expect(result.saleConfig).toBeNull();
      expect(result.soldOut).toBe(false);
    });

    it('returns id, uri, owner from dbMoment', async () => {
      const result = await resolveMomentFromDb(moment, dbMoment);

      expect(result.id).toBe('moment-uuid');
      expect(result.uri).toBe('ar://metadata-hash');
      expect(result.owner).toBe(CREATOR);
    });
  });
});

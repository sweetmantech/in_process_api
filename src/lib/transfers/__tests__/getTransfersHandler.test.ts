import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transfer_Type } from '@/types/transfer';

vi.mock('@/lib/transfers/getTransfers', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/moment/findMoments', () => ({
  default: vi.fn(),
}));

import getTransfers from '@/lib/transfers/getTransfers';
import findMoments from '@/lib/moment/findMoments';
import getTransfersHandler from '@/lib/transfers/getTransfersHandler';

const BASE_PARAMS = {
  chainId: 8453,
  limit: 20,
  page: 1,
  type: undefined as Transfer_Type | undefined,
  content_type: undefined as string | undefined,
  artist: undefined as `0x${string}` | undefined,
  collector: undefined as `0x${string}` | undefined,
};

// Raw rows as returned from Supabase (recipient + nested wallet join).
const MOCK_RAW_TRANSFERS = [
  {
    id: '1',
    transferred_at: '2024-01-01T00:00:00Z',
    recipient: '0xaaaa',
    collector: { artist: { username: 'alice' } },
  },
  {
    id: '2',
    transferred_at: '2024-01-02T00:00:00Z',
    recipient: '0xbbbb',
    collector: null,
  },
];

// Normalized shape that clients receive.
const MOCK_NORMALIZED_TRANSFERS = [
  {
    id: '1',
    transferred_at: '2024-01-01T00:00:00Z',
    collector: { address: '0xaaaa', username: 'alice' },
  },
  {
    id: '2',
    transferred_at: '2024-01-02T00:00:00Z',
    collector: { address: '0xbbbb', username: null },
  },
];

describe('getTransfersHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful responses', () => {
    it('returns normalized transfers and pagination', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: MOCK_RAW_TRANSFERS as any,
        count: 2,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.transfers).toEqual(MOCK_NORMALIZED_TRANSFERS);
      expect(json.pagination.total_count).toBe(2);
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(20);
      expect(json.pagination.total_pages).toBe(1);
    });

    it('returns empty transfers array when data is null', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: null as any,
        count: 0,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.transfers).toEqual([]);
    });

    it('uses 0 for total_count when count is null', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: [],
        count: null,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.pagination.total_count).toBe(0);
    });

    it('calculates total_pages correctly', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: MOCK_RAW_TRANSFERS as any,
        count: 45,
      });

      const res = await getTransfersHandler({ ...BASE_PARAMS, limit: 20 });
      const json = await res.json();

      expect(json.pagination.total_pages).toBe(3);
    });

    it('returns total_pages of 0 when total_count is 0', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: [],
        count: 0,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.pagination.total_pages).toBe(0);
    });

    it('normalizes collection.artist from wallet join', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: [
          {
            id: '1',
            recipient: '0xaaaa',
            collector: { artist: { username: 'collector_user' } },
            moment: {
              token_id: 1,
              collection: {
                address: '0xcollection',
                chain_id: 8453,
                protocol: 'in_process',
                name: 'My Collection',
                creator: '0xcreator',
                collection_artist: { artist: { username: 'creator_user' } },
              },
            },
          },
        ] as any,
        count: 1,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.transfers[0].collector).toEqual({
        address: '0xaaaa',
        username: 'collector_user',
      });
      expect(json.transfers[0].moment.collection.artist).toEqual({
        address: '0xcreator',
        username: 'creator_user',
      });
      expect(json.transfers[0].moment.collection.name).toBe('My Collection');
      expect(json.transfers[0].moment.collection.creator).toBeUndefined();
      expect(
        json.transfers[0].moment.collection.collection_artist
      ).toBeUndefined();
      expect(json.transfers[0].moment.sale).toBeNull();
      expect(json.transfers[0].moment.comments).toBe(0);
    });

    it('normalizes moment.comments from supabase count embed', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: [
          {
            id: '1',
            recipient: '0xaaaa',
            collector: null,
            moment: {
              token_id: 1,
              collection: {
                address: '0xcollection',
                chain_id: 8453,
                protocol: 'in_process',
                name: null,
                creator: '0xcreator',
                collection_artist: null,
              },
              comments: [{ count: 7 }],
            },
          },
        ] as any,
        count: 1,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.transfers[0].moment.comments).toBe(7);
    });

    it('normalizes moment.sale from database sale row', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: [
          {
            id: '1',
            recipient: '0xaaaa',
            collector: null,
            moment: {
              token_id: 1,
              collection: {
                address: '0xcollection',
                chain_id: 8453,
                protocol: 'in_process',
                name: null,
                creator: '0xcreator',
                collection_artist: null,
              },
              sale: {
                price_per_token: 0,
                sale_start: 100,
                sale_end: 200,
                max_tokens_per_address: 5,
                funds_recipient: '0xfunds',
                currency: '0x0000000000000000000000000000000000000000',
              },
            },
          },
        ] as any,
        count: 1,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.transfers[0].moment.sale).toEqual({
        pricePerToken: '0',
        saleStart: 100,
        saleEnd: 200,
        maxTokensPerAddress: 5,
        fundsRecipient: '0xfunds',
        type: 'fixedPrice',
      });
    });

    it('keeps fee_recipients inside moment payload', async () => {
      vi.mocked(getTransfers).mockResolvedValue({
        data: [
          {
            id: '1',
            recipient: '0xaaaa',
            collector: null,
            moment: {
              token_id: 1,
              fee_recipients: [
                {
                  artist_address: '0x71ea0189673968499be6386f8febf37a7d3dacdc',
                  percent_allocation: 100,
                },
              ],
            },
          },
        ] as any,
        count: 1,
      });

      const res = await getTransfersHandler(BASE_PARAMS);
      const json = await res.json();

      expect(json.transfers[0].moment.fee_recipients).toEqual([
        {
          artist_address: '0x71ea0189673968499be6386f8febf37a7d3dacdc',
          percent_allocation: 100,
        },
      ]);
      expect(json.transfers[0].moment.token_id).toBe(1);
    });

    it('passes airdrop data through without normalization', async () => {
      const airdropTransfer = {
        id: '1',
        collector: { address: '0xaaaa', username: 'alice' },
        moment: {
          collection: { artist: { address: '0xcreator', username: 'bob' } },
        },
      };

      vi.mocked(getTransfers).mockResolvedValue({
        data: [airdropTransfer] as any,
        count: 1,
      });

      const res = await getTransfersHandler({
        ...BASE_PARAMS,
        type: Transfer_Type.airdrop,
      });
      const json = await res.json();

      expect(json.transfers[0]).toEqual(airdropTransfer);
    });
  });

  describe('passes params to selectTransfers', () => {
    it('passes all base params', async () => {
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler(BASE_PARAMS);

      expect(getTransfers).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: 8453,
          limit: 20,
          page: 1,
        })
      );
    });

    it('passes artist filter', async () => {
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler({
        ...BASE_PARAMS,
        artist: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      });

      expect(getTransfers).toHaveBeenCalledWith(
        expect.objectContaining({
          artist: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        })
      );
    });

    it('passes collector filter', async () => {
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler({
        ...BASE_PARAMS,
        collector: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
      });

      expect(getTransfers).toHaveBeenCalledWith(
        expect.objectContaining({
          collector: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        })
      );
    });

    it('passes type=airdrop filter', async () => {
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler({
        ...BASE_PARAMS,
        type: Transfer_Type.airdrop,
      });

      expect(getTransfers).toHaveBeenCalledWith(
        expect.objectContaining({ type: Transfer_Type.airdrop })
      );
    });

    it('passes type=payment filter', async () => {
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler({
        ...BASE_PARAMS,
        type: Transfer_Type.payment,
      });

      expect(getTransfers).toHaveBeenCalledWith(
        expect.objectContaining({ type: Transfer_Type.payment })
      );
    });
  });

  describe('moment pre-resolve', () => {
    it('resolves momentId via findMoments when collection and tokenId are provided', async () => {
      vi.mocked(findMoments).mockResolvedValue({
        data: [{ id: 'moment-uuid-123' }] as any,
        error: null,
      });
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler({
        ...BASE_PARAMS,
        collection: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        tokenId: 1,
      });

      expect(getTransfers).toHaveBeenCalledWith(
        expect.objectContaining({ momentId: 'moment-uuid-123' })
      );
    });

    it('does not call findMoments when collection and tokenId are absent', async () => {
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler(BASE_PARAMS);

      expect(findMoments).not.toHaveBeenCalled();
    });

    it('omits momentId if findMoments returns no rows', async () => {
      vi.mocked(findMoments).mockResolvedValue({ data: [], error: null });
      vi.mocked(getTransfers).mockResolvedValue({ data: [], count: 0 });

      await getTransfersHandler({
        ...BASE_PARAMS,
        collection: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        tokenId: 1,
      });

      const call = vi.mocked(getTransfers).mock.calls[0][0] as any;
      expect(call.momentId).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws when selectTransfers throws', async () => {
      vi.mocked(getTransfers).mockRejectedValue(new Error('DB failure'));

      await expect(getTransfersHandler(BASE_PARAMS)).rejects.toThrow(
        'DB failure'
      );
    });
  });
});

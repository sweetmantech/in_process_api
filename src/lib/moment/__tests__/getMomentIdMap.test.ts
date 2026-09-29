import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/moment/findMoments', () => ({
  default: vi.fn(),
}));

import { getMomentIdMap } from '../getMomentIdMap';
import findMoments from '@/lib/moment/findMoments';
import type {
  InProcess_Admins_t,
  InProcess_Airdrops_t,
  InProcess_Comments_t,
  Primary_Sales_t,
  Transfers_t,
} from '@/types/envio';

const mockSelectMoments = vi.mocked(findMoments);

const adminEntity = (): InProcess_Admins_t => ({
  id: '1',
  admin: '0xadmin0000000000000000000000000000000001',
  collection: '0xCOL',
  token_id: '3',
  chain_id: 8453,
  permission: 1,
  updated_at: 1700000000,
});

const transferEntity = (): Transfers_t => ({
  id: 'envio-tx-1',
  collection: '0xCOL',
  token_id: '3',
  chain_id: 8453,
  recipient: '0xrecipient00000000000000000000000000000001',
  quantity: '1',
  value: '1',
  currency: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  transaction_hash: '0xabc',
  transferred_at: 1700000000,
});

const airdropEntity = (): InProcess_Airdrops_t => ({
  id: 'a1',
  recipient: '0xr',
  collection: '0xCOL',
  token_id: '3',
  amount: '1',
  chain_id: 8453,
  updated_at: 1700000000,
});

const commentEntity = (): InProcess_Comments_t => ({
  id: 'c1',
  collection: '0xCOL',
  sender: '0xs',
  token_id: '3',
  comment: 'hi',
  chain_id: 8453,
  commented_at: 1700000000,
  transaction_hash: '0xt',
});

const primarySaleEntity = (): Primary_Sales_t => ({
  id: 's1',
  collection: '0xCOL',
  token_id: '3',
  sale_start: null,
  sale_end: null,
  max_tokens_per_address: null,
  price_per_token: '1',
  funds_recipient: '0xf',
  currency: '0xUSDC',
  chain_id: 8453,
  transaction_hash: '0xt',
  created_at: 1700000000,
});

const momentRow = (
  id: string,
  address: string,
  chainId: number,
  tokenId: string
) => ({
  id,
  token_id: tokenId,
  collection: { address, chain_id: chainId },
});

describe('getMomentIdMap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty map for empty input without calling findMoments', async () => {
    const result = await getMomentIdMap([]);
    expect(result.size).toBe(0);
    expect(mockSelectMoments).not.toHaveBeenCalled();
  });

  it('returns map keyed by lowercase collection:chainId:tokenId (admins)', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('moment-uuid', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    const result = await getMomentIdMap([adminEntity()]);
    expect(result.get('0xcol:8453:3')).toBe('moment-uuid');
  });

  it('requests moments from findMoments with collectionAddress, tokenId, chainId', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('m1', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    await getMomentIdMap([adminEntity()]);

    expect(mockSelectMoments).toHaveBeenCalledWith({
      moments: [
        {
          collectionAddress: '0xCOL',
          tokenId: '3',
          chainId: 8453,
        },
      ],
    });
  });

  it('works for Transfers_t (Envio unified transfers)', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('moment-from-transfer', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    const result = await getMomentIdMap([transferEntity()]);
    expect(result.get('0xcol:8453:3')).toBe('moment-from-transfer');
    expect(mockSelectMoments).toHaveBeenCalledWith({
      moments: [
        {
          collectionAddress: '0xCOL',
          tokenId: '3',
          chainId: 8453,
        },
      ],
    });
  });

  it('works for Primary_Sales_t', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('sale-m', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    const result = await getMomentIdMap([primarySaleEntity()]);
    expect(result.get('0xcol:8453:3')).toBe('sale-m');
  });

  it('works for InProcess_Airdrops_t', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('air-m', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    const result = await getMomentIdMap([airdropEntity()]);
    expect(result.get('0xcol:8453:3')).toBe('air-m');
  });

  it('works for InProcess_Comments_t', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('com-m', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    const result = await getMomentIdMap([commentEntity()]);
    expect(result.get('0xcol:8453:3')).toBe('com-m');
  });

  it('passes one moments[] entry per entity when triplets repeat (no upstream dedupe)', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [momentRow('one', '0xCOL', 8453, '3')],
      error: null,
    } as never);

    await getMomentIdMap([transferEntity(), transferEntity()]);

    expect(mockSelectMoments).toHaveBeenCalledWith({
      moments: [
        { collectionAddress: '0xCOL', tokenId: '3', chainId: 8453 },
        { collectionAddress: '0xCOL', tokenId: '3', chainId: 8453 },
      ],
    });
  });

  it('ignores moments not in the requested entities', async () => {
    mockSelectMoments.mockResolvedValue({
      data: [
        momentRow('mom-1', '0xcol', 8453, '3'),
        momentRow('mom-2', '0xother', 8453, '99'),
      ],
      error: null,
    } as never);

    const result = await getMomentIdMap([adminEntity()]);
    expect(result.size).toBe(1);
    expect(result.has('0xother:8453:99')).toBe(false);
  });

  it('throws when findMoments returns an error', async () => {
    mockSelectMoments.mockResolvedValue({
      data: null,
      error: new Error('db error'),
    } as never);

    await expect(getMomentIdMap([adminEntity()])).rejects.toThrow('db error');
  });
});

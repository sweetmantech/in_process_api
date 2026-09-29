import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/consts', () => ({
  CHAIN_ID: 8453,
  IS_TESTNET: false,
  ADMIN_ADDRESSES: [],
}));

vi.mock('@/authMiddleware', () => ({
  authMiddleware: vi.fn(),
}));

vi.mock('@/lib/moment/getMomentsByAddressAndTokenId', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/supabase/in_process_admins/selectAdmins', () => ({
  default: vi.fn(),
}));

import { authMiddleware } from '@/authMiddleware';
import getMomentsByAddressAndTokenId from '@/lib/moment/getMomentsByAddressAndTokenId';
import selectAdmins from '@/lib/supabase/in_process_admins/selectAdmins';
import validateUpdateSaleBody from '@/lib/moment/validateUpdateSaleBody';

const CALLER = '0xcaller000000000000000000000000000000000';
const COLLECTION = '0x0000000000000000000000000000000000000001';

const makeRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/sale', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

const validMoment = {
  collectionAddress: COLLECTION,
  tokenId: '1',
  chainId: 8453,
};

const mockMomentRow = {
  token_id: 1,
  collection: {
    id: 'collection-uuid',
    address: COLLECTION,
    chain_id: 8453,
    creator: CALLER,
  },
};

describe('validateUpdateSaleBody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authMiddleware).mockResolvedValue({
      primaryWallet: CALLER,
    } as any);
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [mockMomentRow],
      error: null,
    } as any);
    vi.mocked(selectAdmins).mockResolvedValue([
      { artist_address: CALLER },
    ] as any);
  });

  it('returns 401 when auth fails', async () => {
    vi.mocked(authMiddleware).mockResolvedValue(
      NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    );

    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, pricePerToken: '1000' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it('returns 400 when no sale fields are provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when moment is missing', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ pricePerToken: '1000' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when saleStart is not a number', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, saleStart: 'not-a-timestamp' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when saleStart is negative', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, saleStart: -1 })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 500 when getMomentsByAddressAndTokenId errors', async () => {
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: null,
      error: { message: 'DB error' },
    } as any);

    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, pricePerToken: '1000' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(500);
  });

  it('returns 403 when moment is not found', async () => {
    vi.mocked(getMomentsByAddressAndTokenId).mockResolvedValue({
      data: [],
      error: null,
    } as any);

    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, pricePerToken: '1000' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns 403 when caller is not in admins list', async () => {
    vi.mocked(selectAdmins).mockResolvedValue([] as any);

    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, pricePerToken: '1000' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it('returns validated data with callerAddress when pricePerToken is provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, pricePerToken: '1000' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).artist.primaryWallet).toBe(CALLER);
    expect((result as any).pricePerToken).toBe('1000');
    expect((result as any).saleStart).toBeUndefined();
  });

  it('returns validated data with callerAddress when saleStart is provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, saleStart: 1748736000 })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).artist.primaryWallet).toBe(CALLER);
    expect((result as any).saleStart).toBe(1748736000);
    expect((result as any).pricePerToken).toBeUndefined();
  });

  it('returns validated data when both pricePerToken and saleStart are provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({
        moment: validMoment,
        pricePerToken: '500',
        saleStart: 1748736000,
      })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).pricePerToken).toBe('500');
    expect((result as any).saleStart).toBe(1748736000);
  });

  it('returns validated data when saleEnd is provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, saleEnd: 1780272000 })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).saleEnd).toBe(1780272000);
  });

  it('returns 400 when saleEnd is not a number', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, saleEnd: 'not-a-timestamp' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns validated data when maxTokensPerAddress is provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, maxTokensPerAddress: 5 })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).maxTokensPerAddress).toBe(5);
  });

  it('returns 400 when maxTokensPerAddress is negative', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, maxTokensPerAddress: -1 })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns validated data when fundsRecipient is provided', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, fundsRecipient: COLLECTION })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).fundsRecipient).toBe(COLLECTION);
  });

  it('includes parsed moment in validated data', async () => {
    const result = await validateUpdateSaleBody(
      makeRequest({ moment: validMoment, pricePerToken: '1000' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).moment.tokenId).toBe('1');
    expect((result as any).moment.chainId).toBe(8453);
  });
});

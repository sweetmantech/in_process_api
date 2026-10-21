import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/authMiddleware', () => ({
  authMiddleware: vi.fn(),
}));

import { authMiddleware } from '@/authMiddleware';
import validateSetDefaultCollection from '@/lib/collection/validateSetDefaultCollection';
import { AuthMethod } from '@/types/auth';

const authResult = {
  primaryWallet: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
  wallets: [],
  artistId: 'artist-1',
  authMethod: AuthMethod.Privy,
};

const makeRequest = (body?: string) =>
  new NextRequest('http://localhost/api/collections/default', {
    method: 'PUT',
    body,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authMiddleware).mockResolvedValue(authResult);
});

describe('validateSetDefaultCollection', () => {
  it('returns the artist and a lowercased collection address', async () => {
    const result = await validateSetDefaultCollection(
      makeRequest(
        JSON.stringify({
          collectionAddress: '0x06a701Ae65582B92Af48cDff45a8B20DcA3714cA',
        })
      )
    );

    expect(result).toEqual({
      artist: authResult,
      collectionAddress: '0x06a701ae65582b92af48cdff45a8b20dca3714ca',
    });
  });

  it('accepts null to reset the default', async () => {
    const result = await validateSetDefaultCollection(
      makeRequest(JSON.stringify({ collectionAddress: null }))
    );

    expect(result).toEqual({ artist: authResult, collectionAddress: null });
  });

  it('returns 400 for an invalid address', async () => {
    const result = await validateSetDefaultCollection(
      makeRequest(JSON.stringify({ collectionAddress: '0x123' }))
    );

    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when the body is missing', async () => {
    const result = await validateSetDefaultCollection(makeRequest());

    expect((result as NextResponse).status).toBe(400);
  });

  it('returns the auth error response when unauthorized', async () => {
    const unauthorized = NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
    vi.mocked(authMiddleware).mockResolvedValue(unauthorized);

    const result = await validateSetDefaultCollection(
      makeRequest(JSON.stringify({ collectionAddress: null }))
    );

    expect(result).toBe(unauthorized);
  });
});

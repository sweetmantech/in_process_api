import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/authMiddleware', () => ({
  authMiddleware: vi.fn(),
}));

import { authMiddleware } from '@/authMiddleware';
import validateCreateDefaultCollection from '@/lib/collection/validateCreateDefaultCollection';
import { AuthMethod } from '@/types/auth';

const ACCOUNT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

const makeRequest = () =>
  new NextRequest('http://localhost/api/collections/default', {
    method: 'GET',
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateCreateDefaultCollection', () => {
  it('returns the authenticated artist', async () => {
    const authResult = {
      primaryWallet: ACCOUNT,
      wallets: [],
      artistId: 'artist-1',
      authMethod: AuthMethod.Privy,
    };
    vi.mocked(authMiddleware).mockResolvedValue(authResult);

    const result = await validateCreateDefaultCollection(makeRequest());

    expect(result).toEqual(authResult);
  });

  it('returns auth error response when unauthorized', async () => {
    const unauthorized = NextResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
    vi.mocked(authMiddleware).mockResolvedValue(unauthorized);

    const result = await validateCreateDefaultCollection(makeRequest());

    expect(result).toBe(unauthorized);
  });
});

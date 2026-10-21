import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/collection/resolveDefaultCollection', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/consts', () => ({
  CHAIN_ID: 8453,
}));

import resolveDefaultCollection from '@/lib/collection/resolveDefaultCollection';
import createDefaultCollectionHandler from '@/lib/collection/createDefaultCollectionHandler';
import { AuthMethod, type AuthResult } from '@/types/auth';

const ACCOUNT = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;
const CONTRACT = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

const artist: AuthResult = {
  artistId: 'artist-1',
  primaryWallet: ACCOUNT,
  wallets: [{ address: ACCOUNT, type: 'privy' }],
  authMethod: AuthMethod.Privy,
};

const collectionItem = {
  id: 'collection-1',
  address: CONTRACT,
  name: 'Process',
  chain_id: 8453,
  created_at: '2026-01-01T00:00:00.000Z',
  uri: 'ar://process',
  protocol: 'in_process',
  creator: ACCOUNT.toLowerCase(),
  admins: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveDefaultCollection).mockResolvedValue(collectionItem);
});

describe('createDefaultCollectionHandler', () => {
  it('returns the resolved default collection as JSON', async () => {
    const result = await createDefaultCollectionHandler(artist);

    expect(resolveDefaultCollection).toHaveBeenCalledWith(artist, 8453);
    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual(collectionItem);
  });
});

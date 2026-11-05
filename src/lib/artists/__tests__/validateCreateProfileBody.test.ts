import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/authMiddleware', () => ({
  authMiddleware: vi.fn(),
}));

import { authMiddleware } from '@/authMiddleware';
import validateCreateProfileBody from '@/lib/artists/validateCreateProfileBody';

const ARTIST = {
  artistId: '00000000-0000-0000-0000-000000000001',
  primaryWallet: '0x1234567890123456789012345678901234567890' as const,
  wallets: ['0x1234567890123456789012345678901234567890' as const],
};

const makeRequest = (body: unknown): NextRequest =>
  new NextRequest('http://localhost/api/profile', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

describe('validateCreateProfileBody', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authMiddleware).mockResolvedValue(ARTIST as any);
  });

  it('returns artist and profile fields', async () => {
    const result = await validateCreateProfileBody(
      makeRequest({
        username: 'testartist',
        bio: 'hello',
        instagram: '@insta',
        x: '@x',
        telegram: '@tg',
      })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({
      artist: ARTIST,
      username: 'testartist',
      bio: 'hello',
      instagram: '@insta',
      x: '@x',
      telegram: '@tg',
    });
  });

  it('transforms empty username to null', async () => {
    const result = await validateCreateProfileBody(
      makeRequest({ username: '' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).username).toBeNull();
  });

  it('accepts an empty body', async () => {
    const result = await validateCreateProfileBody(makeRequest({}));

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ artist: ARTIST });
  });

  it('returns 400 for invalid username type', async () => {
    const result = await validateCreateProfileBody(
      makeRequest({ username: 123 })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('trims and lowercases handle', async () => {
    const result = await validateCreateProfileBody(
      makeRequest({ handle: '  Sofractures.ETH ' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).handle).toBe('sofractures.eth');
  });

  it('transforms empty handle to null', async () => {
    const result = await validateCreateProfileBody(
      makeRequest({ handle: '  ' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).handle).toBeNull();
  });

  it('leaves handle undefined when omitted', async () => {
    const result = await validateCreateProfileBody(
      makeRequest({ username: 'testartist' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).not.toHaveProperty('handle');
  });

  it.each(['ab', 'bad handle', 'manage', '0xabc'])(
    'returns 400 for invalid handle %s',
    async (handle) => {
      const result = await validateCreateProfileBody(makeRequest({ handle }));

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(400);
    }
  );

  it('forwards auth middleware response', async () => {
    vi.mocked(authMiddleware).mockResolvedValue(
      NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    );

    const result = await validateCreateProfileBody(makeRequest({}));

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});

import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import validateSearchArtistsQuery from '@/lib/artists/validateSearchArtistsQuery';

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/artists/search');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
};

describe('validateSearchArtistsQuery', () => {
  it('returns validated data with default limit when query is provided', () => {
    const result = validateSearchArtistsQuery(makeRequest({ query: 'alice' }));

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).query).toBe('alice');
    expect((result as any).limit).toBe(10);
  });

  it('trims whitespace around query', () => {
    const result = validateSearchArtistsQuery(
      makeRequest({ query: '  bob  ' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).query).toBe('bob');
  });

  it('parses limit as integer when provided', () => {
    const result = validateSearchArtistsQuery(
      makeRequest({ query: 'carol', limit: '25' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).limit).toBe(25);
  });

  it('accepts handle without query, trimmed and lowercased', () => {
    const result = validateSearchArtistsQuery(
      makeRequest({ handle: '  Sofractures.ETH ' })
    );

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as any).handle).toBe('sofractures.eth');
    expect((result as any).query).toBeUndefined();
  });

  it.each(['ab', 'bad handle', '../admin', 'manage', '0xabc'])(
    'returns 400 for invalid handle %s',
    (handle) => {
      const result = validateSearchArtistsQuery(makeRequest({ handle }));

      expect(result).toBeInstanceOf(NextResponse);
      expect((result as NextResponse).status).toBe(400);
    }
  );

  it('returns 400 when query is missing', () => {
    const result = validateSearchArtistsQuery(makeRequest());

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when query is empty string', () => {
    const result = validateSearchArtistsQuery(makeRequest({ query: '' }));

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when query is only whitespace', () => {
    const result = validateSearchArtistsQuery(makeRequest({ query: '   ' }));

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when limit exceeds 50', () => {
    const result = validateSearchArtistsQuery(
      makeRequest({ query: 'dan', limit: '51' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });

  it('returns 400 when limit is less than 1', () => {
    const result = validateSearchArtistsQuery(
      makeRequest({ query: 'eve', limit: '0' })
    );

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(400);
  });
});

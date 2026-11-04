import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import validateTimelineQuery from '@/lib/timeline/validateTimelineQuery';

const makeRequest = (params: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/timeline');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
};

describe('validateTimelineQuery', () => {
  describe('mime (content_type)', () => {
    it('returns undefined mime when content_type not provided', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).mime).toBeUndefined();
    });

    it('returns "video/%" when content_type=video', () => {
      const result = validateTimelineQuery(
        makeRequest({ content_type: 'video' })
      );
      expect((result as any).mime).toBe('video/%');
    });

    it('returns "image/%" when content_type=image', () => {
      const result = validateTimelineQuery(
        makeRequest({ content_type: 'image' })
      );
      expect((result as any).mime).toBe('image/%');
    });
  });

  describe('defaults', () => {
    it('defaults limit to 100', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).limit).toBe(100);
    });

    it('caps limit at 100', () => {
      const result = validateTimelineQuery(makeRequest({ limit: '200' }));
      expect((result as any).limit).toBe(100);
    });

    it('defaults page to 1', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).page).toBe(1);
    });

    it('returns undefined for optional params when not provided', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).collection).toBeUndefined();
      expect((result as any).artist).toBeUndefined();
      expect((result as any).period).toBeUndefined();
      expect((result as any).channel).toBeUndefined();
      expect((result as any).type).toBeUndefined();
    });

    it('defaults hidden to false', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).hidden).toBe(false);
    });

    it('defaults curated to false', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).curated).toBe(false);
    });
  });

  describe('curated param', () => {
    it('returns true when curated=true', () => {
      const result = validateTimelineQuery(makeRequest({ curated: 'true' }));
      expect((result as any).curated).toBe(true);
    });

    it('returns false when curated=false', () => {
      const result = validateTimelineQuery(makeRequest({ curated: 'false' }));
      expect((result as any).curated).toBe(false);
    });

    it('returns false when curated is absent', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).curated).toBe(false);
    });
  });

  describe('future param', () => {
    it('defaults to true when absent', () => {
      const result = validateTimelineQuery(makeRequest());
      expect((result as any).future).toBe(true);
    });

    it('returns false when future=false', () => {
      const result = validateTimelineQuery(makeRequest({ future: 'false' }));
      expect((result as any).future).toBe(false);
    });

    it('returns true when future=true', () => {
      const result = validateTimelineQuery(makeRequest({ future: 'true' }));
      expect((result as any).future).toBe(true);
    });
  });

  describe('chain_id param', () => {
    it('returns null when chain_id not provided (prod default — all prod chains)', () => {
      const result = validateTimelineQuery(makeRequest());
      // IS_TESTNET=false in test env → null signals "all prod chains" to the RPC
      expect((result as any).chainId).toBeNull();
    });

    it('returns the provided chain_id when explicitly set to Base', () => {
      const result = validateTimelineQuery(makeRequest({ chain_id: '8453' }));
      expect((result as any).chainId).toBe(8453);
    });

    it('returns chain_id=1 when explicitly set to Ethereum mainnet', () => {
      const result = validateTimelineQuery(makeRequest({ chain_id: '1' }));
      expect((result as any).chainId).toBe(1);
    });
  });

  describe('type param', () => {
    it('accepts "mutual"', () => {
      const result = validateTimelineQuery(makeRequest({ type: 'mutual' }));
      expect((result as any).type).toBe('mutual');
    });

    it('accepts "default"', () => {
      const result = validateTimelineQuery(makeRequest({ type: 'default' }));
      expect((result as any).type).toBe('default');
    });

    it('returns 400 for invalid type', async () => {
      const { NextResponse } = await import('next/server');
      const result = validateTimelineQuery(makeRequest({ type: 'invalid' }));
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as typeof NextResponse.prototype).status).toBe(400);
    });
  });

  describe('protocol param', () => {
    it('accepts in_process', () => {
      const result = validateTimelineQuery(
        makeRequest({ protocol: 'in_process' })
      );
      expect((result as any).protocol).toBe('in_process');
    });

    it('accepts sound.xyz', () => {
      const result = validateTimelineQuery(
        makeRequest({ protocol: 'sound.xyz' })
      );
      expect((result as any).protocol).toBe('sound.xyz');
    });

    it('returns 400 for invalid protocol', async () => {
      const { NextResponse } = await import('next/server');
      const result = validateTimelineQuery(
        makeRequest({ protocol: 'unknown' })
      );
      expect(result).toBeInstanceOf(NextResponse);
      expect((result as typeof NextResponse.prototype).status).toBe(400);
    });
  });
});

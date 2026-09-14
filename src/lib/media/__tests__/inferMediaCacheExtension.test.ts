import { describe, it, expect } from 'vitest';
import inferMediaCacheExtension from '@/lib/media/inferMediaCacheExtension';

describe('inferMediaCacheExtension', () => {
  it('maps video content types to extensions', () => {
    expect(inferMediaCacheExtension('ar://abc', 'video/mp4')).toBe('mp4');
    expect(inferMediaCacheExtension('ar://abc', 'video/quicktime')).toBe('mov');
  });

  it('reads extension from the uri when content type is missing', () => {
    expect(inferMediaCacheExtension('https://x.test/file.MOV')).toBe('mov');
    expect(
      inferMediaCacheExtension('https://x.test/a/b/video.webm?sig=1')
    ).toBe('webm');
  });

  it('returns fallback when uri and content type are unknown', () => {
    expect(inferMediaCacheExtension('ar://abc')).toBe('bin');
    expect(inferMediaCacheExtension('ar://abc', null, 'mp4')).toBe('mp4');
  });
});

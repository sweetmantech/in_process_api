import { describe, it, expect } from 'vitest';
import getMuxIngestUrl from '../getMuxIngestUrl';

const CID = 'bafybeie5sudnmfqbxclp2yml5xbafpz32cgth75nkxi4exrbmaiicn2xze';

describe('getMuxIngestUrl', () => {
  it('maps ar:// to the turbo gateway', () => {
    expect(
      getMuxIngestUrl('ar://LtPCBrhWC1-jUJmU_saD4fJlux19wUuQJ63JBPFaq9I')
    ).toBe(
      'https://turbo-gateway.com/LtPCBrhWC1-jUJmU_saD4fJlux19wUuQJ63JBPFaq9I'
    );
  });

  it('maps ipfs:// to our IPFS gateway', () => {
    expect(getMuxIngestUrl(`ipfs://${CID}`)).toBe(
      `https://magic.decentralized-content.com/ipfs/${CID}`
    );
  });

  it('rewrites third-party IPFS gateway URLs (e.g. fleek) to our gateway', () => {
    expect(getMuxIngestUrl(`https://ipfs.fleek.co/ipfs/${CID}`)).toBe(
      `https://magic.decentralized-content.com/ipfs/${CID}`
    );
  });

  it('keeps other https URLs', () => {
    expect(getMuxIngestUrl('https://example.com/video.mp4')).toBe(
      'https://example.com/video.mp4'
    );
  });

  it('returns null for deleted legacy Mux URLs', () => {
    expect(getMuxIngestUrl('https://stream.mux.com/abc.m3u8')).toBeNull();
  });

  it('returns null for URLs Mux cannot fetch', () => {
    expect(getMuxIngestUrl('data:video/mp4;base64,AAAA')).toBeNull();
    expect(getMuxIngestUrl('http://example.com/video.mp4')).toBeNull();
  });
});

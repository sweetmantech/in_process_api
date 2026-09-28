import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/consts', () => ({
  CHAIN_ID: 8453,
  IS_TESTNET: false,
}));

vi.mock('@/lib/supabase/in_process_collections/selectCollections', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/moment/resolveMomentInfo', () => ({
  resolveMomentInfo: vi.fn(),
}));

vi.mock('@/lib/moment/getMomentVideo', () => ({ default: vi.fn() }));
vi.mock('@/lib/moment/getMetadata', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/moment/getMomentAdmins', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/metadata/normalizeMetadata', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/arweave/getMimeType', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/viem/getZoraMediaInfo', () => ({
  default: vi.fn(),
}));

import selectCollections from '@/lib/supabase/in_process_collections/selectCollections';
import { resolveMomentInfo } from '@/lib/moment/resolveMomentInfo';
import getMetadata from '@/lib/moment/getMetadata';
import getMomentVideo from '@/lib/moment/getMomentVideo';
import getMomentAdmins from '@/lib/moment/getMomentAdmins';
import normalizeMetadata from '@/lib/metadata/normalizeMetadata';
import getMimeType from '@/lib/arweave/getMimeType';
import getZoraMediaInfo from '@/lib/viem/getZoraMediaInfo';
import getMomentHandler from '@/lib/moment/getMomentHandler';
import { MomentType } from '@/types/moment';

const COLLECTION = '0x0000000000000000000000000000000000000001' as const;
const OWNER = '0x000000000000000000000000000000000000beef';
const ADMIN = '0x000000000000000000000000000000000000cafe';

const moment = { collectionAddress: COLLECTION, tokenId: '1', chainId: 8453 };

const mockCollection = {
  id: 'collection-uuid',
  address: COLLECTION,
  chain_id: 8453,
  protocol: 'in_process',
};

const mockSaleConfig = {
  pricePerToken: '1000',
  saleStart: 0,
  saleEnd: 0,
  maxTokensPerAddress: 0,
  fundsRecipient: COLLECTION,
  type: MomentType.FixedPriceMint,
};

const mockResolved = {
  id: 'moment-id',
  uri: 'ar://meta-hash',
  contentUri: 'ar://content-hash',
  owner: OWNER,
  saleConfig: mockSaleConfig,
  soldOut: false,
};

const rawMetadata = {
  name: 'Track',
  image: 'ipfs://img',
  description: 'a song',
  content: { mime: 'audio/mpeg', uri: 'ar://content-hash' },
};

const normalizedMetadata = {
  name: 'Track',
  image: 'https://cdn.example/img',
  description: 'a song',
  external_url: '',
  content: { mime: 'audio/mpeg', uri: 'ar://content-hash' },
};

describe('getMomentHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(selectCollections).mockResolvedValue([mockCollection] as any);
    vi.mocked(resolveMomentInfo).mockResolvedValue(mockResolved as any);
    vi.mocked(getMetadata).mockResolvedValue(rawMetadata as any);
    vi.mocked(getMomentAdmins).mockResolvedValue([ADMIN] as any);
    vi.mocked(normalizeMetadata).mockResolvedValue(normalizedMetadata as any);
    vi.mocked(getMimeType).mockResolvedValue('audio/mpeg');
    vi.mocked(getMomentVideo).mockResolvedValue(null);
  });

  it('includes ready video playback for the moment', async () => {
    vi.mocked(getMomentVideo).mockResolvedValue({
      provider: 'mux',
      playback_id: 'playback123',
    });

    const json = await (await getMomentHandler(moment)).json();

    expect(getMomentVideo).toHaveBeenCalledWith('moment-id');
    expect(json.video).toEqual({ provider: 'mux', playback_id: 'playback123' });
  });

  it('returns null video when the moment has no ready playback', async () => {
    const json = await (await getMomentHandler(moment)).json();
    expect(json.video).toBeNull();
  });

  it('returns moment info with metadata on success', async () => {
    const res = await getMomentHandler(moment);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toMatchObject({
      id: 'moment-id',
      uri: 'ar://meta-hash',
      contentUri: 'ar://content-hash',
      owner: OWNER,
      sale: mockSaleConfig,
      soldOut: false,
      protocol: 'in_process',
      admins: [ADMIN],
      metadata: normalizedMetadata,
    });
  });

  it('queries selectCollections with the moment address and chainId', async () => {
    await getMomentHandler(moment);
    expect(selectCollections).toHaveBeenCalledWith({
      addresses: [COLLECTION],
      chainId: 8453,
    });
  });

  it('returns 404 when uri cannot be resolved', async () => {
    vi.mocked(resolveMomentInfo).mockResolvedValue({
      id: null,
      uri: null,
      contentUri: null,
      owner: null,
      saleConfig: null,
      soldOut: false,
    } as any);

    const res = await getMomentHandler(moment);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Invalid moment URI provided');
    expect(getMetadata).not.toHaveBeenCalled();
    expect(getMomentAdmins).not.toHaveBeenCalled();
  });

  it('passes the resolved id and uri to getMetadata', async () => {
    await getMomentHandler(moment);
    expect(getMetadata).toHaveBeenCalledWith('moment-id', 'ar://meta-hash');
  });

  it('passes collection, owner, moment, and protocol to getMomentAdmins', async () => {
    await getMomentHandler(moment);
    expect(getMomentAdmins).toHaveBeenCalledWith({
      collection: mockCollection,
      owner: OWNER,
      moment,
      protocol: 'in_process',
    });
  });

  it('falls back to null collection when selectCollections returns null', async () => {
    vi.mocked(selectCollections).mockResolvedValue([] as any);

    const res = await getMomentHandler(moment);
    const json = await res.json();
    expect(json.protocol).toBeNull();
    expect(getMomentAdmins).toHaveBeenCalledWith({
      collection: null,
      owner: OWNER,
      moment,
      protocol: null,
    });
  });

  it('normalizes metadata and applies contentUri as animation_url and content', async () => {
    await getMomentHandler(moment);

    expect(normalizeMetadata).toHaveBeenCalledWith(rawMetadata);
    expect(getMimeType).toHaveBeenCalledWith('ar://content-hash');

    const json = await (await getMomentHandler(moment)).json();
    expect(json.metadata.animation_url).toBe('ar://content-hash');
    expect(json.metadata.content).toEqual({
      mime: 'audio/mpeg',
      uri: 'ar://content-hash',
    });
  });

  it('skips getMimeType when contentUri is absent', async () => {
    vi.mocked(resolveMomentInfo).mockResolvedValue({
      ...mockResolved,
      contentUri: null,
    } as any);

    await getMomentHandler(moment);

    expect(normalizeMetadata).toHaveBeenCalledWith(rawMetadata);
    expect(getMimeType).not.toHaveBeenCalled();
  });

  it('returns null metadata when getMetadata resolves null', async () => {
    vi.mocked(getMetadata).mockResolvedValue(null as any);

    const res = await getMomentHandler(moment);
    const json = await res.json();
    expect(json.metadata).toBeNull();
    expect(normalizeMetadata).not.toHaveBeenCalled();
  });

  it('propagates errors from resolveMomentInfo', async () => {
    vi.mocked(resolveMomentInfo).mockRejectedValue(new Error('resolve failed'));
    await expect(getMomentHandler(moment)).rejects.toThrow('resolve failed');
  });

  describe('zora_media protocol', () => {
    const CREATOR = '0x7a6f726121030cadf9923333d5b6f29277024027';
    const ADMIN_A = '0x000000000000000000000000000000000000aaaa';
    const ON_CHAIN_OWNER = '0x000000000000000000000000000000000000bbbb';

    beforeEach(() => {
      vi.mocked(selectCollections).mockResolvedValue([
        { ...mockCollection, protocol: 'zora_media' },
      ] as any);
      vi.mocked(resolveMomentInfo).mockResolvedValue({
        ...mockResolved,
        owner: CREATOR,
      } as any);
    });

    it('uses momentAdmins[0] as owner when admins are present', async () => {
      vi.mocked(getMomentAdmins).mockResolvedValue([ADMIN_A] as any);

      const res = await getMomentHandler(moment);
      const json = await res.json();

      expect(json.owner).toBe(ADMIN_A);
      expect(json.protocol).toBe('zora_media');
      expect(getZoraMediaInfo).not.toHaveBeenCalled();
    });

    it('falls back to onchain owner when admins list is empty', async () => {
      vi.mocked(getMomentAdmins).mockResolvedValue([] as any);
      vi.mocked(getZoraMediaInfo).mockResolvedValue({
        owner: ON_CHAIN_OWNER,
        tokenUri: 'https://zora-media-uri',
        contentUri: null,
      } as any);

      const res = await getMomentHandler(moment);
      const json = await res.json();

      expect(json.owner).toBe(ON_CHAIN_OWNER);
      expect(getZoraMediaInfo).toHaveBeenCalledWith(moment);
    });

    it('falls back to resolved owner when admins are empty and onchain owner is null', async () => {
      vi.mocked(getMomentAdmins).mockResolvedValue([] as any);
      vi.mocked(getZoraMediaInfo).mockResolvedValue({
        owner: null,
        tokenUri: 'https://zora-media-uri',
        contentUri: null,
      } as any);

      const res = await getMomentHandler(moment);
      const json = await res.json();

      expect(json.owner).toBe(CREATOR);
    });
  });

  it('does not call getZoraMediaInfo for non-zora_media protocols', async () => {
    vi.mocked(getMomentAdmins).mockResolvedValue([] as any);

    await getMomentHandler(moment);

    expect(getZoraMediaInfo).not.toHaveBeenCalled();
  });
});

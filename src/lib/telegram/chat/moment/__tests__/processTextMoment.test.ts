import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Address } from 'viem';
import processTextMoment from '@/lib/telegram/chat/moment/processTextMoment';

vi.mock('../createMomentFromText', () => ({ default: vi.fn() }));
vi.mock('@/lib/telegram/chat/messaging/sendReadyMessage', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/telegram/chat/messaging/sendArtistCollage', () => ({
  default: vi.fn(),
}));
vi.mock(
  '@/lib/telegram/chat/collection/clearSelectedCollectionAddress',
  () => ({ default: vi.fn() })
);
vi.mock('@/lib/telegram/chat/collection/getCollectionAddress', () => ({
  default: vi.fn(),
}));

import createMomentFromText from '@/lib/telegram/chat/moment/createMomentFromText';
import sendReadyMessage from '@/lib/telegram/chat/messaging/sendReadyMessage';
import sendArtistCollage from '@/lib/telegram/chat/messaging/sendArtistCollage';
import clearSelectedCollectionAddress from '@/lib/telegram/chat/collection/clearSelectedCollectionAddress';
import getCollectionAddress from '@/lib/telegram/chat/collection/getCollectionAddress';

const ARTIST_ADDRESS = '0x0000000000000000000000000000000000000123' as Address;
const ARTIST_CONTEXT = {
  artistId: 'artist-uuid-123',
  primaryWallet: ARTIST_ADDRESS,
  wallets: [{ address: ARTIST_ADDRESS, type: 'external' as const }],
};
const CONTENT = 'a text body';
const MOMENT = {
  contractAddress: '0xContract' as Address,
  tokenId: '7',
};

const makeThread = () => ({
  post: vi.fn().mockResolvedValue(undefined),
  startTyping: vi.fn().mockResolvedValue(undefined),
  channelId: 'telegram:chat-text',
  _stateAdapter: {
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCollectionAddress).mockResolvedValue({
    collectionAddress: null,
    explicitSelection: false,
  });
  vi.mocked(createMomentFromText).mockResolvedValue({
    contractAddress: MOMENT.contractAddress,
    tokenId: MOMENT.tokenId,
  } as never);
  vi.mocked(sendReadyMessage).mockResolvedValue(undefined);
  vi.mocked(sendArtistCollage).mockResolvedValue(undefined);
  vi.mocked(clearSelectedCollectionAddress).mockResolvedValue(undefined);
});

describe('processTextMoment', () => {
  it('posts the in-progress message and starts typing before minting', async () => {
    const thread = makeThread();

    await processTextMoment(thread as never, CONTENT, ARTIST_CONTEXT);

    expect(getCollectionAddress).toHaveBeenCalledWith(thread, ARTIST_CONTEXT);
    expect(thread.post).toHaveBeenCalledWith(
      'Posting your moment to In Process, this may take a minute...'
    );
    expect(thread.startTyping).toHaveBeenCalled();
    expect(createMomentFromText).toHaveBeenCalledWith(
      CONTENT,
      ARTIST_CONTEXT,
      undefined
    );
  });

  it('mints into the selected collection and clears the selection', async () => {
    const existing = '0x0000000000000000000000000000000000000abc' as Address;
    const thread = makeThread();
    vi.mocked(getCollectionAddress).mockResolvedValue({
      collectionAddress: existing,
      explicitSelection: true,
    });

    await processTextMoment(thread as never, CONTENT, ARTIST_CONTEXT);

    expect(createMomentFromText).toHaveBeenCalledWith(
      CONTENT,
      ARTIST_CONTEXT,
      existing
    );
    expect(clearSelectedCollectionAddress).toHaveBeenCalledWith(thread);
  });

  it('sends ready message and artist collage after mint', async () => {
    const thread = makeThread();

    await processTextMoment(thread as never, CONTENT, ARTIST_CONTEXT);

    expect(sendReadyMessage).toHaveBeenCalledWith(
      thread,
      MOMENT.contractAddress.toString(),
      MOMENT.tokenId
    );
    expect(sendArtistCollage).toHaveBeenCalledWith(thread, ARTIST_ADDRESS);
  });
});

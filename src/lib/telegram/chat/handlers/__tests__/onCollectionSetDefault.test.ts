import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress } from 'viem';

vi.mock('@/lib/collection/setArtistDefaultCollection', () => ({
  default: vi.fn(),
}));
vi.mock('../getArtistByTelegram', () => ({ default: vi.fn() }));

import setArtistDefaultCollection from '@/lib/collection/setArtistDefaultCollection';
import getArtistByTelegram from '../getArtistByTelegram';
import { registerOnCollectionSetDefault } from '../onCollectionSetDefault';
import { COLLECTION_SET_DEFAULT_ACTION_ID } from '@/lib/telegram/chat/consts';

const COL_ADDRESS = '0x0000000000000000000000000000000000000001';
const WALLET = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`;

const artist = {
  artistId: 'artist-1',
  username: 'artist',
  primaryWallet: WALLET,
  wallets: [{ address: WALLET, type: 'privy' as const }],
};

const register = () => {
  const handler = { fn: (_event: unknown) => Promise.resolve() };
  const bot = {
    onAction: vi.fn((_, fn: (event: unknown) => Promise<void>) => {
      handler.fn = fn;
    }),
  };
  registerOnCollectionSetDefault(bot as never);
  return { bot, handler };
};

const makeEvent = (overrides: Record<string, unknown> = {}) => ({
  value: COL_ADDRESS,
  user: { userName: 'u1' },
  thread: { post: vi.fn().mockResolvedValue(undefined) },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getArtistByTelegram).mockResolvedValue(artist as never);
});

describe('registerOnCollectionSetDefault', () => {
  it('registers under COLLECTION_SET_DEFAULT_ACTION_ID', () => {
    const { bot } = register();
    expect(bot.onAction).toHaveBeenCalledWith(
      COLLECTION_SET_DEFAULT_ACTION_ID,
      expect.any(Function)
    );
  });

  it('sets the default collection and confirms with its name', async () => {
    vi.mocked(setArtistDefaultCollection).mockResolvedValue({
      status: 'updated',
      collection: { name: 'Custom' },
    } as never);
    const { handler } = register();
    const event = makeEvent();
    await handler.fn(event);

    expect(getArtistByTelegram).toHaveBeenCalledWith('u1');
    expect(setArtistDefaultCollection).toHaveBeenCalledWith(
      artist,
      getAddress(COL_ADDRESS)
    );
    expect(event.thread.post).toHaveBeenCalledWith(
      '✅ "Custom" is now your default collection.'
    );
  });

  it('reports when the collection is not found', async () => {
    vi.mocked(setArtistDefaultCollection).mockResolvedValue({
      status: 'not_found',
    });
    const { handler } = register();
    const event = makeEvent();
    await handler.fn(event);
    expect(event.thread.post).toHaveBeenCalledWith(
      'That collection could not be found.'
    );
  });

  it('reports when the artist is not a collection admin', async () => {
    vi.mocked(setArtistDefaultCollection).mockResolvedValue({
      status: 'not_admin',
    });
    const { handler } = register();
    const event = makeEvent();
    await handler.fn(event);
    expect(event.thread.post).toHaveBeenCalledWith(
      'Only collection admins can set it as the default.'
    );
  });

  it('exits when value is not an address', async () => {
    const { handler } = register();
    const event = makeEvent({ value: 'nope' });
    await handler.fn(event);
    expect(setArtistDefaultCollection).not.toHaveBeenCalled();
    expect(event.thread.post).not.toHaveBeenCalled();
  });

  it('exits when the telegram user is not linked to an artist', async () => {
    vi.mocked(getArtistByTelegram).mockResolvedValue(null);
    const { handler } = register();
    const event = makeEvent();
    await handler.fn(event);
    expect(setArtistDefaultCollection).not.toHaveBeenCalled();
    expect(event.thread.post).not.toHaveBeenCalled();
  });
});

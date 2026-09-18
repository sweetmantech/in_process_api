import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAddress } from 'viem';
import { Actions, Button, Card, CardText } from 'chat';

import { registerOnCollectionSelect } from '../onCollectionSelect';
import {
  COLLECTION_SELECT_ACTION_ID,
  COLLECTION_SELECTION_CANCEL_ACTION_ID,
} from '@/lib/telegram/chat/consts';

const COL_ADDRESS = '0x0000000000000000000000000000000000000001';

const makeBot = () => {
  const handler = { fn: (_event: unknown) => Promise.resolve() };
  const bot = {
    onAction: vi.fn((_, fn: (event: unknown) => Promise<void>) => {
      handler.fn = fn;
    }),
  };
  return { bot, handler };
};

const makeEvent = (
  overrides: {
    value?: string;
    userName?: string | null;
    thread?: {
      post: ReturnType<typeof vi.fn>;
      id: string;
      channelId: string;
      _stateAdapter: { set: ReturnType<typeof vi.fn> };
    } | null;
  } = {}
) => {
  const post = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockResolvedValue(undefined);
  return {
    value: COL_ADDRESS,
    user: { userName: 'u1' },
    thread: {
      post,
      id: 'telegram:1',
      channelId: 'telegram:1',
      _stateAdapter: { set },
    },
    ...overrides,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerOnCollectionSelect', () => {
  it('registers under COLLECTION_SELECT_ACTION_ID', () => {
    const { bot } = makeBot();
    registerOnCollectionSelect(bot as never);
    expect(bot.onAction).toHaveBeenCalledWith(
      COLLECTION_SELECT_ACTION_ID,
      expect.any(Function)
    );
  });

  it('stores the collection and posts instructions for the next moment', async () => {
    const { bot, handler } = makeBot();
    registerOnCollectionSelect(bot as never);
    const event = makeEvent();
    await handler.fn(event);

    const normalized = getAddress(COL_ADDRESS);
    expect(event.thread?._stateAdapter.set).toHaveBeenCalledWith(
      'telegram:1:selected_collection_address',
      normalized,
      undefined
    );
    const text = `Next moment will be created in this collection:\n\`${normalized}\`\n\nSend a photo, video, YouTube link, or plain text to create.`;
    expect(event.thread?.post).toHaveBeenCalledWith(
      Card({
        children: [
          CardText(text),
          Actions([
            Button({
              id: COLLECTION_SELECTION_CANCEL_ACTION_ID,
              label: 'Cancel',
            }),
          ]),
        ],
      })
    );
  });

  it('exits when thread is null', async () => {
    const { bot, handler } = makeBot();
    registerOnCollectionSelect(bot as never);
    await handler.fn({ ...makeEvent(), thread: null });
  });

  it('exits when value is empty', async () => {
    const { bot, handler } = makeBot();
    registerOnCollectionSelect(bot as never);
    const event = makeEvent({ value: '' });
    await handler.fn(event);
    expect(event.thread?.post).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Address } from 'viem';
import processMediaThread from '@/lib/telegram/chat/moment/processMediaThread';

vi.mock('../processGroupMedia', () => ({ default: vi.fn() }));
vi.mock('../getOrCreateUngroupedBurstId', () => ({ default: vi.fn() }));
vi.mock('@/lib/telegram/chat/attachment/extractTelegramFileIds', () => ({
  default: vi.fn(),
}));
vi.mock('@/lib/telegram/chat/attachment/isTooBigForTelegram', () => ({
  default: vi.fn(),
  TOO_BIG_MESSAGE: '⚠️ Too big',
}));

import processGroupMedia from '@/lib/telegram/chat/moment/processGroupMedia';
import getOrCreateUngroupedBurstId from '@/lib/telegram/chat/moment/getOrCreateUngroupedBurstId';
import extractTelegramFileIds from '@/lib/telegram/chat/attachment/extractTelegramFileIds';
import isTooBigForTelegram from '@/lib/telegram/chat/attachment/isTooBigForTelegram';

const ARTIST_ADDRESS = '0xabc' as Address;

const makeThread = () => ({
  post: vi.fn().mockResolvedValue(undefined),
});

const makeMessage = (raw: Record<string, unknown> = {}) => ({
  raw,
  attachments: [],
  text: '',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(extractTelegramFileIds).mockReturnValue({
    fileId: 'file-123',
    thumbFileId: 'thumb-456',
  });
  vi.mocked(isTooBigForTelegram).mockReturnValue(false);
  vi.mocked(processGroupMedia).mockResolvedValue(undefined);
  vi.mocked(getOrCreateUngroupedBurstId).mockResolvedValue('burst-1');
});

describe('processMediaThread', () => {
  describe('when attachment is too big', () => {
    it('posts the TOO_BIG_MESSAGE and returns early', async () => {
      vi.mocked(isTooBigForTelegram).mockReturnValue(true);
      const thread = makeThread();

      await processMediaThread(
        thread as never,
        makeMessage() as never,
        { type: 'image', size: 999 } as never,
        '',
        ARTIST_ADDRESS
      );

      expect(thread.post).toHaveBeenCalledWith('⚠️ Too big');
      expect(getOrCreateUngroupedBurstId).not.toHaveBeenCalled();
      expect(processGroupMedia).not.toHaveBeenCalled();
    });
  });

  describe('single attachment (no media_group_id)', () => {
    it('synthesizes a burst id and calls processGroupMedia with it', async () => {
      const thread = makeThread();
      const attachment = { type: 'image', size: 500 };

      await processMediaThread(
        thread as never,
        makeMessage() as never,
        attachment as never,
        'My Title',
        ARTIST_ADDRESS
      );

      expect(getOrCreateUngroupedBurstId).toHaveBeenCalledWith(thread);
      expect(processGroupMedia).toHaveBeenCalledWith(
        thread,
        attachment,
        'file-123',
        'My Title',
        ARTIST_ADDRESS,
        'burst-1'
      );
    });

    it('passes an empty title when text is empty', async () => {
      const thread = makeThread();

      await processMediaThread(
        thread as never,
        makeMessage() as never,
        { type: 'image', size: 500 } as never,
        '',
        ARTIST_ADDRESS
      );

      const [, , , title] = vi.mocked(processGroupMedia).mock.calls[0];
      expect(title).toBe('');
    });
  });

  describe('media group messages (media_group_id present)', () => {
    it('calls processGroupMedia with the real media_group_id, skipping burst synthesis', async () => {
      const thread = makeThread();
      const attachment = { type: 'image', size: 500 };
      const date = Math.floor(Date.now() / 1000) - 10;

      await processMediaThread(
        thread as never,
        makeMessage({ media_group_id: 'grp-1', date }) as never,
        attachment as never,
        'My Title',
        ARTIST_ADDRESS
      );

      expect(getOrCreateUngroupedBurstId).not.toHaveBeenCalled();
      expect(processGroupMedia).toHaveBeenCalledWith(
        thread,
        attachment,
        'file-123',
        'My Title',
        ARTIST_ADDRESS,
        'grp-1'
      );
    });
  });
});

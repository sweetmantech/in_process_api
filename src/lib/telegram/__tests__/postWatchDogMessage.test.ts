import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/telegram/watchDogBotClient', () => ({
  telegramWatchDogBotClient: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

import { telegramWatchDogBotClient } from '@/lib/telegram/watchDogBotClient';
import { postWatchDogMessage } from '../postWatchDogMessage';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('postWatchDogMessage', () => {
  it('sends the text to the given chat id', async () => {
    await postWatchDogMessage('-5577113678', 'hello');

    expect(telegramWatchDogBotClient.sendMessage).toHaveBeenCalledWith(
      '-5577113678',
      'hello'
    );
  });

  it('swallows errors from the underlying client', async () => {
    vi.mocked(telegramWatchDogBotClient.sendMessage).mockRejectedValueOnce(
      new Error('boom')
    );
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(
      postWatchDogMessage('-5577113678', 'hello')
    ).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'postWatchDogMessage failed:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});

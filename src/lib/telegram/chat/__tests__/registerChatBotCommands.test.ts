import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/telegram/client', () => ({
  telegramChatBotClient: {
    setMyCommands: vi.fn().mockResolvedValue(true),
    setChatMenuButton: vi.fn().mockResolvedValue(true),
  },
}));

import { telegramChatBotClient } from '@/lib/telegram/client';
import registerChatBotCommands, {
  TELEGRAM_CHAT_BOT_COMMANDS,
} from '../registerChatBotCommands';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerChatBotCommands', () => {
  it('registers every command exposed by commandsHandler', async () => {
    await registerChatBotCommands();

    expect(telegramChatBotClient.setMyCommands).toHaveBeenCalledWith([
      ...TELEGRAM_CHAT_BOT_COMMANDS,
    ]);
  });

  it('sets the default menu button to the commands list', async () => {
    await registerChatBotCommands();

    expect(telegramChatBotClient.setChatMenuButton).toHaveBeenCalledWith({
      menu_button: { type: 'commands' },
    });
  });
});

import { Chat } from 'chat';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createRedisState } from '@chat-adapter/state-redis';
import { validateTelegramChatEnv } from './validateEnv';
import { registerChatBotCommands } from './registerChatBotCommands';

export function createTelegramChatBot() {
  validateTelegramChatEnv();

  const telegramAdapter = createTelegramAdapter({
    botToken: process.env.TELEGRAM_CHAT_BOT_TOKEN,
    secretToken: process.env.TELEGRAM_CHAT_WEBHOOK_SECRET_TOKEN,
    mode: 'webhook',
  });
  // The adapter defaults persistMessageHistory to true, which writes every
  // message to Redis (msg-history:<chatId>) forever. Nothing in this repo
  // reads that history back (no LLM context use), so it's pure write waste.
  // Field is typed readonly upstream but is a plain mutable class field at
  // runtime — force it off here instead of forking the adapter.
  (
    telegramAdapter as { persistMessageHistory: boolean }
  ).persistMessageHistory = false;

  const bot = new Chat({
    userName: process.env.TELEGRAM_CHAT_BOT_USERNAME!,
    adapters: { telegram: telegramAdapter },
    // Shared across all serverless instances so dedup locks (media group
    // batching, burst synthesis) are actually atomic, not per-process.
    state: createRedisState({
      url: process.env.REDIS_URL,
      keyPrefix: 'in-process-chat-bot',
    }),
    onLockConflict: 'force',
  });

  return { bot, telegramAdapter };
}

export type { TelegramChatBot } from '@/types/telegram';

const { bot: telegramChatBot, telegramAdapter } = createTelegramChatBot();

// The chat SDK's Telegram adapter has no concept of registered slash
// commands, so Telegram never shows the persistent menu button unless we
// tell it to via the raw bot API client. Runs once per cold start.
registerChatBotCommands().catch((error) => {
  console.error('Failed to register Telegram chat bot commands:', error);
});

export { telegramAdapter };
export default telegramChatBot;

import type { Thread } from 'chat';
import type { TelegramThreadState } from './telegramThreadState';

/**
 * The raw Redis state adapter (@chat-adapter/state-redis) has no concept of
 * "thread" — its get/set/delete/getList/setIfNotExists/appendToList all key
 * purely off the string we pass in, shared across every chat in the bot.
 * Prefixing with the thread's own id is what makes a key like
 * 'selected_collection_address' actually per-conversation instead of a
 * single global value every Telegram user reads and writes.
 */
const scopeThreadStateKey = (
  thread: Thread<TelegramThreadState>,
  key: string
): string => `${thread.id}:${key}`;

export default scopeThreadStateKey;

import type { Thread } from 'chat';
import {
  TELEGRAM_SELECTED_COLLECTION_KEY,
  TELEGRAM_PENDING_EMAIL_KEY,
  TELEGRAM_PENDING_CODE_KEY,
  TELEGRAM_PENDING_TEXT_KEY,
} from './consts';
import type { TelegramThreadState } from './telegramThreadState';
import scopeThreadStateKey from './scopeThreadStateKey';

export {
  TELEGRAM_SELECTED_COLLECTION_KEY,
  TELEGRAM_PENDING_EMAIL_KEY,
  TELEGRAM_PENDING_CODE_KEY,
  TELEGRAM_PENDING_TEXT_KEY,
};

/** Subset of chat `StateAdapter` methods used by Telegram thread flows. */
export type StateAdapter = {
  get: (key: string) => Promise<unknown | null>;
  set: (key: string, value: unknown, ttlMs?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
  getList: <T = unknown>(key: string) => Promise<T[]>;
  setIfNotExists: (
    key: string,
    value: unknown,
    ttlMs?: number
  ) => Promise<boolean>;
  appendToList: (
    key: string,
    value: unknown,
    options?: { maxLength?: number; ttlMs?: number }
  ) => Promise<void>;
};

type ThreadWithPrivateState = Thread<TelegramThreadState> & {
  _stateAdapter: StateAdapter;
};

// The chat SDK's raw state adapter (see @chat-adapter/state-redis) stores
// every key in one shared Redis instance with no per-thread namespacing —
// its own Thread.state/setState avoid this by prefixing with `thread.id`,
// but that only supports a single merged JSON blob (no TTL-per-key, no
// atomic setIfNotExists, no list ops), which the media-group/pending-auth
// flows below need. So we prefix every key ourselves before delegating to
// the raw adapter, keeping the same primitives but scoped per Telegram chat.
export default function getStateAdapter(
  thread: Thread<TelegramThreadState>
): StateAdapter {
  const raw = (thread as unknown as ThreadWithPrivateState)._stateAdapter;
  const scoped = (key: string) => scopeThreadStateKey(thread, key);

  return {
    get: (key) => raw.get(scoped(key)),
    set: (key, value, ttlMs) => raw.set(scoped(key), value, ttlMs),
    delete: (key) => raw.delete(scoped(key)),
    getList: <T = unknown>(key: string) => raw.getList<T>(scoped(key)),
    setIfNotExists: (key, value, ttlMs) =>
      raw.setIfNotExists(scoped(key), value, ttlMs),
    appendToList: (key, value, options) =>
      raw.appendToList(scoped(key), value, options),
  };
}

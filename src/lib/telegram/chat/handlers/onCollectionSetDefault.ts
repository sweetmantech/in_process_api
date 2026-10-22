import { getAddress, isAddress } from 'viem';
import type { ActionEvent, ActionHandler } from 'chat';
import type { TelegramChatBot } from '@/lib/telegram/chat/bot';
import { COLLECTION_SET_DEFAULT_ACTION_ID } from '@/lib/telegram/chat/consts';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import setArtistDefaultCollection from '@/lib/collection/setArtistDefaultCollection';
import getArtistByTelegram from './getArtistByTelegram';

async function handleCollectionSetDefault(
  event: ActionEvent<TelegramThreadState>
): Promise<void> {
  const address = event.value?.trim();
  if (!address || !isAddress(address)) return;

  const thread = event.thread;
  if (!thread) return;

  const telegramUsername = event.user.userName;
  if (!telegramUsername) return;

  const artist = await getArtistByTelegram(telegramUsername);
  if (!artist) return;

  const result = await setArtistDefaultCollection(artist, getAddress(address));
  if (result.status === 'not_found') {
    await thread.post('That collection could not be found.');
    return;
  }
  if (result.status === 'not_admin') {
    await thread.post('Only collection admins can set it as the default.');
    return;
  }

  await thread.post(
    `✅ "${result.collection.name}" is now your default collection.`
  );
}

export function registerOnCollectionSetDefault(bot: TelegramChatBot) {
  bot.onAction(
    COLLECTION_SET_DEFAULT_ACTION_ID,
    handleCollectionSetDefault as ActionHandler
  );
}

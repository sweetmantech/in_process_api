import { getAddress, isAddress } from 'viem';
import type { ActionEvent, ActionHandler } from 'chat';
import { Actions, Button, Card, CardText } from 'chat';
import type { TelegramChatBot } from '@/lib/telegram/chat/bot';
import {
  COLLECTION_SELECT_ACTION_ID,
  COLLECTION_SELECTION_CANCEL_ACTION_ID,
  COLLECTION_SET_DEFAULT_ACTION_ID,
} from '@/lib/telegram/chat/consts';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import setSelectedCollectionAddress from '@/lib/telegram/chat/collection/setSelectedCollectionAddress';

async function handleCollectionSelect(
  event: ActionEvent<TelegramThreadState>
): Promise<void> {
  const address = event.value?.trim();
  if (!address || !isAddress(address)) return;

  const thread = event.thread;
  if (!thread) return;

  const normalized = getAddress(address);
  await setSelectedCollectionAddress(thread, normalized);

  const text = `Next moment will be created in this collection:\n\`${normalized}\`\n\nSend a photo, video, YouTube link, or plain text to create.\n\nTap "Set as default" to make this your default collection.`;
  await thread.post(
    Card({
      children: [
        CardText(text),
        Actions([
          Button({
            id: COLLECTION_SET_DEFAULT_ACTION_ID,
            label: 'Set as default',
            value: normalized,
          }),
          Button({
            id: COLLECTION_SELECTION_CANCEL_ACTION_ID,
            label: 'Cancel',
          }),
        ]),
      ],
    })
  );
}

export function registerOnCollectionSelect(bot: TelegramChatBot) {
  bot.onAction(
    COLLECTION_SELECT_ACTION_ID,
    handleCollectionSelect as ActionHandler
  );
}

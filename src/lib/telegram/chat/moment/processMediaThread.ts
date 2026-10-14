import type { Thread, Message, Attachment } from 'chat';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import type { ArtistContext } from '@/types/artist';
import extractTelegramFileIds from '@/lib/telegram/chat/attachment/extractTelegramFileIds';
import isTooBigForTelegram, {
  TOO_BIG_MESSAGE,
} from '@/lib/telegram/chat/attachment/isTooBigForTelegram';
import processGroupMedia from './processGroupMedia';
import getOrCreateUngroupedBurstId from './getOrCreateUngroupedBurstId';

const processMediaThread = async (
  thread: Thread<TelegramThreadState>,
  message: Message,
  attachment: Attachment,
  text: string,
  artist: ArtistContext | null
): Promise<void> => {
  if (!artist) return;
  if (isTooBigForTelegram(attachment)) {
    await thread.post(TOO_BIG_MESSAGE);
    return;
  }

  const { fileId } = extractTelegramFileIds(message, attachment);
  const title = text || '';
  const raw = message.raw as { media_group_id?: string };
  const groupId =
    raw.media_group_id ?? (await getOrCreateUngroupedBurstId(thread));

  await processGroupMedia(thread, attachment, fileId, title, artist, groupId);
};

export default processMediaThread;

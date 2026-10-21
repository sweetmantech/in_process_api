import type { Thread } from 'chat';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import type { ArtistContext } from '@/types/artist';
import createMomentFromText from './createMomentFromText';
import sendReadyMessage from '@/lib/telegram/chat/messaging/sendReadyMessage';
import sendArtistCollage from '@/lib/telegram/chat/messaging/sendArtistCollage';
import clearSelectedCollectionAddress from '@/lib/telegram/chat/collection/clearSelectedCollectionAddress';
import getCollectionAddress from '@/lib/telegram/chat/collection/getCollectionAddress';
import postMomentPending from './postMomentPending';

const processTextMoment = async (
  thread: Thread<TelegramThreadState>,
  content: string,
  artist: ArtistContext
): Promise<void> => {
  const { collectionAddress, explicitSelection } = await getCollectionAddress(
    thread,
    artist
  );
  await postMomentPending(thread);
  await thread.startTyping();
  const { contractAddress, tokenId } = await createMomentFromText(
    content,
    artist,
    collectionAddress ?? undefined
  );
  if (explicitSelection) {
    await clearSelectedCollectionAddress(thread);
  }
  await sendReadyMessage(thread, contractAddress, tokenId);
  await sendArtistCollage(thread, artist.primaryWallet);
};

export default processTextMoment;

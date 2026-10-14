import type { Thread } from 'chat';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import type { ArtistContext } from '@/types/artist';
import fetchTelegramFile from '@/lib/telegram/chat/attachment/fetchTelegramFile';
import processAttachmentUpload from './processAttachmentUpload';
import mintWithNonceRetry from './mintWithNonceRetry';
import sendReadyMessage from '@/lib/telegram/chat/messaging/sendReadyMessage';
import sendArtistCollage from '@/lib/telegram/chat/messaging/sendArtistCollage';
import type { PendingMediaGroupAsset } from '@/types/telegram';
import clearSelectedCollectionAddress from '@/lib/telegram/chat/collection/clearSelectedCollectionAddress';
import getCollectionAddress from '@/lib/telegram/chat/collection/getCollectionAddress';
import getStateAdapter from '@/lib/telegram/chat/stateAdapter';
import buildCreateBatchInput from './buildCreateBatchInput';
import type { Attachment } from 'chat';

const createMomentsFromGroup = async (
  thread: Thread<TelegramThreadState>,
  mediaGroupId: string,
  artist: ArtistContext
): Promise<void> => {
  const stateAdapter = getStateAdapter(thread);
  const pending = (await stateAdapter.getList(
    `media_group_assets:${mediaGroupId}`
  )) as PendingMediaGroupAsset[];

  if (pending.length === 0) return;

  const { collectionAddress, explicitSelection } = await getCollectionAddress(
    thread,
    artist.primaryWallet
  );

  await thread.startTyping();
  const typingInterval = setInterval(() => void thread.startTyping(), 4000);
  try {
    const uploaded = await Promise.all(
      pending.map(async (asset) => {
        const { buffer } = await fetchTelegramFile(asset.fileId);
        const attachment: Attachment = {
          type: asset.attachmentType,
          mimeType: asset.mimeType,
          fetchData: () => Promise.resolve(buffer),
        };
        return processAttachmentUpload(attachment, asset.fileId, asset.name);
      })
    );

    const batchInput = buildCreateBatchInput(
      pending,
      uploaded,
      collectionAddress,
      artist.primaryWallet
    );

    const { contractAddress, tokenIds } = await mintWithNonceRetry(
      thread,
      batchInput
    );
    if (explicitSelection) {
      await clearSelectedCollectionAddress(thread);
    }
    await sendReadyMessage(thread, contractAddress.toString(), tokenIds);
    await sendArtistCollage(thread, artist.primaryWallet);
  } finally {
    clearInterval(typingInterval);
  }
};

export default createMomentsFromGroup;

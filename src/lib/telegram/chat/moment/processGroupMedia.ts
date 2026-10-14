import { after } from 'next/server';
import type { Thread, Attachment } from 'chat';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import type { ArtistContext } from '@/types/artist';
import createMomentsFromGroup from './createMomentsFromGroup';
import getStateAdapter from '@/lib/telegram/chat/stateAdapter';
import postMomentPending from './postMomentPending';
import { MEDIA_GROUP_WINDOW_MS } from '@/lib/telegram/chat/consts';

import type { PendingMediaGroupAsset } from '@/types/telegram';

const ASSETS_TTL_MS = 5 * 60 * 1_000;

const processGroupMedia = async (
  thread: Thread<TelegramThreadState>,
  attachment: Attachment,
  fileId: string,
  name: string,
  artist: ArtistContext,
  mediaGroupId: string
): Promise<void> => {
  const stateAdapter = getStateAdapter(thread);
  const activityKey = `media_group_activity:${mediaGroupId}`;

  const isFirst = await stateAdapter.setIfNotExists(
    `media_group:${mediaGroupId}`,
    true,
    60_000
  );
  if (isFirst) await postMomentPending(thread);

  await stateAdapter.appendToList(
    `media_group_assets:${mediaGroupId}`,
    {
      fileId,
      name,
      mimeType: attachment.mimeType,
      attachmentType: attachment.type,
    } satisfies PendingMediaGroupAsset,
    { ttlMs: ASSETS_TTL_MS }
  );

  // Every arrival slides the quiet-period deadline forward.
  await stateAdapter.set(activityKey, Date.now(), ASSETS_TTL_MS);

  after(async () => {
    // Wait until no new attachment has landed for MEDIA_GROUP_WINDOW_MS.
    for (;;) {
      const lastActivity = (await stateAdapter.get(activityKey)) as
        | number
        | null;
      const wait =
        (lastActivity ?? Date.now()) + MEDIA_GROUP_WINDOW_MS - Date.now();
      if (wait <= 0) break;
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }

    const acquired = await stateAdapter.setIfNotExists(
      `media_group_processed:${mediaGroupId}`,
      true,
      60_000
    );
    if (!acquired) return;
    await createMomentsFromGroup(thread, mediaGroupId, artist).catch((err) => {
      console.error('[processGroupMedia] createMomentsFromGroup error:', err);
      void thread.post(
        `❌ ${err instanceof Error ? err.message : 'Something went wrong.'}`
      );
    });
  });
};

export default processGroupMedia;

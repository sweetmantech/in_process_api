import { getAddress, isAddress, type Address } from 'viem';
import type { Thread } from 'chat';
import type { TelegramThreadState } from '@/lib/telegram/chat/telegramThreadState';
import type { ArtistContext } from '@/types/artist';
import getSelectedCollectionAddress from './getSelectedCollectionAddress';
import resolveDefaultCollection from '@/lib/collection/resolveDefaultCollection';
import { CHAIN_ID } from '@/lib/consts';

type ResolvedMomentCollection = {
  collectionAddress: Address | null;
  explicitSelection: boolean;
};

async function getCollectionAddress(
  thread: Thread<TelegramThreadState>,
  artist: ArtistContext
): Promise<ResolvedMomentCollection> {
  const selected = await getSelectedCollectionAddress(thread);
  if (selected) {
    return { collectionAddress: selected, explicitSelection: true };
  }

  const collection = await resolveDefaultCollection(artist, CHAIN_ID);
  if (!isAddress(collection.address)) {
    return { collectionAddress: null, explicitSelection: false };
  }

  return {
    collectionAddress: getAddress(collection.address),
    explicitSelection: false,
  };
}

export default getCollectionAddress;

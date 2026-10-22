import type { Address } from 'viem';
import type { ArtistContext } from '@/types/artist';
import { CHAIN_ID } from '@/lib/consts';
import isArtistCollectionAdmin from '@/lib/collection/isArtistCollectionAdmin';
import getCollectionsRpc, {
  type RpcCollection,
} from '@/lib/supabase/in_process_collections/getCollectionsRpc';
import updateArtistDefaultCollection from '@/lib/supabase/in_process_artists/updateArtistDefaultCollection';

export type SetArtistDefaultCollectionResult =
  | { status: 'updated'; collection: RpcCollection }
  | { status: 'not_found' }
  | { status: 'not_admin' };

const setArtistDefaultCollection = async (
  artist: ArtistContext,
  collectionAddress: Address
): Promise<SetArtistDefaultCollectionResult> => {
  const { data, error } = await getCollectionsRpc({
    addresses: [collectionAddress],
    chainId: CHAIN_ID,
    limit: 1,
  });
  if (error) throw error;

  const collection = data?.[0];
  if (!collection) return { status: 'not_found' };
  if (!isArtistCollectionAdmin(collection, artist.wallets)) {
    return { status: 'not_admin' };
  }

  const { error: updateError } = await updateArtistDefaultCollection(
    artist.artistId,
    collection.id
  );
  if (updateError) throw updateError;

  return { status: 'updated', collection };
};

export default setArtistDefaultCollection;

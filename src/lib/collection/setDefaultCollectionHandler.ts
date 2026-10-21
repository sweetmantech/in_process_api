import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import type { AuthResult } from '@/types/auth';
import { CHAIN_ID } from '@/lib/consts';
import ensureProcessCollection from '@/lib/collection/ensureProcessCollection';
import isArtistCollectionAdmin from '@/lib/collection/isArtistCollectionAdmin';
import getCollectionsRpc, {
  type RpcCollection,
} from '@/lib/supabase/in_process_collections/getCollectionsRpc';
import updateArtistDefaultCollection from '@/lib/supabase/in_process_artists/updateArtistDefaultCollection';

const setDefaultCollectionHandler = async ({
  artist,
  collectionAddress,
}: {
  artist: AuthResult;
  collectionAddress: Address | null;
}): Promise<NextResponse> => {
  let collection: RpcCollection | undefined;
  if (collectionAddress) {
    const { data, error } = await getCollectionsRpc({
      addresses: [collectionAddress],
      chainId: CHAIN_ID,
      limit: 1,
    });
    if (error) throw error;
    collection = data?.[0];
    if (!collection) {
      return NextResponse.json(
        { message: 'Collection not found' },
        { status: 404 }
      );
    }
    if (!isArtistCollectionAdmin(collection, artist.wallets)) {
      return NextResponse.json(
        { message: 'Only collection admins can set it as the default' },
        { status: 403 }
      );
    }
  } else {
    collection = await ensureProcessCollection(artist.primaryWallet, CHAIN_ID);
  }

  const { error } = await updateArtistDefaultCollection(
    artist.artistId,
    collection.id
  );
  if (error) throw error;

  return NextResponse.json(collection);
};

export default setDefaultCollectionHandler;

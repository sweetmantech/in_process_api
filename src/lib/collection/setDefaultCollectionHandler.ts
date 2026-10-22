import { NextResponse } from 'next/server';
import type { Address } from 'viem';
import type { AuthResult } from '@/types/auth';
import { CHAIN_ID } from '@/lib/consts';
import ensureProcessCollection from '@/lib/collection/ensureProcessCollection';
import setArtistDefaultCollection from '@/lib/collection/setArtistDefaultCollection';
import updateArtistDefaultCollection from '@/lib/supabase/in_process_artists/updateArtistDefaultCollection';

const setDefaultCollectionHandler = async ({
  artist,
  collectionAddress,
}: {
  artist: AuthResult;
  collectionAddress: Address | null;
}): Promise<NextResponse> => {
  if (collectionAddress) {
    const result = await setArtistDefaultCollection(artist, collectionAddress);
    if (result.status === 'not_found') {
      return NextResponse.json(
        { message: 'Collection not found' },
        { status: 404 }
      );
    }
    if (result.status === 'not_admin') {
      return NextResponse.json(
        { message: 'Only collection admins can set it as the default' },
        { status: 403 }
      );
    }
    return NextResponse.json(result.collection);
  }

  const collection = await ensureProcessCollection(
    artist.primaryWallet,
    CHAIN_ID
  );
  const { error } = await updateArtistDefaultCollection(
    artist.artistId,
    collection.id
  );
  if (error) throw error;

  return NextResponse.json(collection);
};

export default setDefaultCollectionHandler;

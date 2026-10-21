import type { ArtistContext } from '@/types/artist';
import type { RpcCollection } from '@/lib/supabase/in_process_collections/getCollectionsRpc';
import ensureProcessCollection from '@/lib/collection/ensureProcessCollection';
import isArtistCollectionAdmin from '@/lib/collection/isArtistCollectionAdmin';
import selectArtistDefaultCollection from '@/lib/supabase/in_process_artists/selectArtistDefaultCollection';
import linkArtistDefaultCollection from '@/lib/supabase/in_process_artists/linkArtistDefaultCollection';

export type DefaultCollection = Omit<RpcCollection, 'creator_username'>;

const resolveDefaultCollection = async (
  artist: Pick<ArtistContext, 'artistId' | 'primaryWallet' | 'wallets'>,
  chainId: number
): Promise<DefaultCollection> => {
  const { data, error } = await selectArtistDefaultCollection(artist.artistId);
  if (error) throw error;
  const current = (data?.collection ?? null) as DefaultCollection | null;
  const sameChain = !current || Number(current.chain_id) === chainId;

  if (
    current &&
    sameChain &&
    isArtistCollectionAdmin(current, artist.wallets)
  ) {
    return current;
  }

  const processCollection = await ensureProcessCollection(
    artist.primaryWallet,
    chainId
  );

  if (sameChain) {
    const { error: linkError } = await linkArtistDefaultCollection({
      artistId: artist.artistId,
      collectionId: processCollection.id,
      expected: current?.id ?? null,
    });
    if (linkError) throw linkError;
  }

  return processCollection;
};

export default resolveDefaultCollection;

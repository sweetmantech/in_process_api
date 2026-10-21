import type { ArtistWallet } from '@/types/artist';
import type { RpcCollection } from '@/lib/supabase/in_process_collections/getCollectionsRpc';

const isArtistCollectionAdmin = (
  collection: Pick<RpcCollection, 'creator' | 'admins'>,
  wallets: ArtistWallet[]
): boolean => {
  const addresses = new Set(wallets.map((w) => w.address.toLowerCase()));
  if (addresses.has(collection.creator.toLowerCase())) return true;
  return collection.admins.some(
    (admin) =>
      Number(admin.token_id) === 0 &&
      addresses.has(admin.artist_address.toLowerCase())
  );
};

export default isArtistCollectionAdmin;

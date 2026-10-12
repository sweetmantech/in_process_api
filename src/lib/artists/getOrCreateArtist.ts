import { Address } from 'viem';
import upsertWallets from '../supabase/in_process_wallets/upsertWallets';
import selectWallets from '../supabase/in_process_wallets/selectWallets';
import { upsertArtists } from '../supabase/in_process_artists/upsertArtists';
import type { ArtistContext } from '@/types/artist';
import { WalletType } from '@/types/wallets';
import isSmartWalletType from '../wallets/isSmartWalletType';

const getOrCreateArtist = async ({
  artistName,
  address,
  type,
}: {
  artistName?: string;
  address: Address;
  type?: WalletType;
}): Promise<ArtistContext> => {
  const { data: matched } = await selectWallets({ addresses: [address] });
  let artistId = matched?.[0]?.artist_id ?? null;

  const existingUsername = matched?.[0]?.artist?.username;
  const username = existingUsername || artistName;
  if (!artistId || (artistName && !existingUsername)) {
    const [created] = await upsertArtists(
      artistId ? { id: artistId, username } : { username }
    );
    if (!created) throw new Error('Failed to create artist entity');
    if (!artistId) {
      artistId = created.id;
      await upsertWallets([{ address, artist: artistId, type }]);
    }
  }

  const { data: allWallets } = await selectWallets({ artistIds: [artistId] });
  if (!allWallets?.length)
    throw new Error(`No wallets found for artist ${artistId}`);

  const externalWallet = allWallets.find((w) => w.type === 'external')?.address;
  const privyWallet = allWallets.find((w) => w.type === 'privy')?.address;
  const eoaWallet = allWallets.find((w) => !isSmartWalletType(w.type));

  return {
    artistId,
    primaryWallet:
      (externalWallet as Address) ||
      (privyWallet as Address) ||
      ((eoaWallet ?? allWallets[0]).address as Address),
    wallets: allWallets.map((w) => ({
      address: w.address as Address,
      type: w.type as WalletType,
    })),
  };
};

export default getOrCreateArtist;

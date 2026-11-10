import { Address } from 'viem';
import upsertWallets from '../supabase/in_process_wallets/upsertWallets';
import selectWallets from '../supabase/in_process_wallets/selectWallets';
import { upsertArtists } from '../supabase/in_process_artists/upsertArtists';
import type { ArtistContext } from '@/types/artist';
import { WalletType } from '@/types/wallets';
import getPrimaryWallet from '../wallets/getPrimaryWallet';

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

  const { data: foundWallets } = await selectWallets({ artistIds: [artistId] });
  if (!foundWallets?.length)
    throw new Error(`No wallets found for artist ${artistId}`);

  const untyped = matched?.[0]?.type === null ? matched[0] : undefined;
  const filled = foundWallets.map((w) =>
    untyped && w.address === untyped.address ? { ...w, type: type ?? null } : w
  );
  const shouldFillType =
    !!type &&
    !!untyped &&
    !foundWallets.some((w) => w.type === type) &&
    getPrimaryWallet(filled) === getPrimaryWallet(foundWallets);
  if (shouldFillType) await upsertWallets([{ address: untyped.address, type }]);
  const allWallets = shouldFillType ? filled : foundWallets;

  return {
    artistId,
    primaryWallet: getPrimaryWallet(allWallets) as Address,
    wallets: allWallets.map((w) => ({
      address: w.address as Address,
      type: w.type as WalletType,
    })),
  };
};

export default getOrCreateArtist;

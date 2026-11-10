import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import getEmailByWalletAddress from '@/lib/privy/getEmailByWalletAddress';
import isPrivyWalletAddress from '@/lib/privy/isPrivyWalletAddress';

const lookupArtistEmail = async (
  artistAddress: string
): Promise<string | null> => {
  const { data: walletRows } = await selectWallets({
    addresses: [artistAddress.toLowerCase()],
  });

  const artistId = walletRows?.[0]?.artist_id;
  if (!artistId) return null;

  const { data: artistWalletRows } = await selectWallets({
    artistIds: [artistId],
  });

  const candidateWallets = (artistWalletRows ?? [])
    .filter((w) => w.type === 'privy' || w.type == null)
    .map((w) => w.address);

  for (const candidateWallet of candidateWallets) {
    const isPrivy = await isPrivyWalletAddress(candidateWallet);
    if (!isPrivy) continue;

    return await getEmailByWalletAddress(candidateWallet);
  }

  return null;
};

export default lookupArtistEmail;

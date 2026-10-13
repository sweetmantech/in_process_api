import { Address } from 'viem';
import selectWallets from '@/lib/supabase/in_process_wallets/selectWallets';
import { getArtistSmartAccount } from '@/lib/coinbase/getArtistSmartAccount';

const getArtistSmartWallet = async (artistId: string): Promise<Address> => {
  const { data } = await selectWallets({
    artistIds: [artistId],
    type: 'payment',
  });
  const existing = data?.[0]?.address as Address | undefined;
  if (existing) return existing;

  const smartAccount = await getArtistSmartAccount({ artistId });
  return smartAccount.address.toLowerCase() as Address;
};

export default getArtistSmartWallet;
